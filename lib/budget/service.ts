import 'server-only';
import { and, desc, eq, gte, inArray, lte, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  comptes as tComptes,
  comptesAcces as tAcces,
  budgetCategories as tCats,
  transactions as tTx,
  echeances as tEch,
  membres as tMembres,
  type LigneCompte,
  type LigneBudgetCategorie,
  type LigneTransaction,
} from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  accesComptes,
  comptesAutorises,
  contexteAcces,
  exigerComptesAccessibles,
  filtrerComptes,
  PARTAGE_FOYER,
  PARTAGE_RESTREINT,
  type AccesComptes,
} from '@/lib/budget/acces';
import {
  MOIS_FR,
  TYPE_DEPENSE,
  TYPE_REVENU,
  TYPE_VIREMENT,
  aujourdhuiISO,
  aujourdhuiLabel,
  formatEuro,
  joursJusqua,
  parseEuro,
  versISO,
  type ChampsEcheance,
  type CompteGere,
  type DonneesBudget,
  type Echeance,
  type LigneCategorie,
  type NouvelleTransaction,
  type ParametresSaisie,
  type SelectionMois,
  type Solde,
  type Transaction,
} from '@/lib/budget/schema';

/**
 * SERVICE BUDGET (serveur uniquement) — Postgres, scopé au FOYER courant.
 * ======================================================================
 * ⚠ Différence majeure avec les autres modules : le tableur ne calcule plus rien.
 * Le dashboard (soldes des comptes, KPIs du mois, réel vs budget par catégorie)
 * est RECALCULÉ ici à partir des tables source (comptes + solde initial,
 * catégories + budget mensuel, transactions, échéances).
 *
 * Modèle (relevé du classeur) :
 *   · solde d'un compte = solde_initial + Σ(revenus) − Σ(dépenses) − Σ(virements
 *     sortants) + Σ(virements entrants), TOUTES transactions confondues ;
 *   · patrimoine (TOTAL FOYER) = somme des soldes ;
 *   · KPIs du mois = Σ revenus / Σ dépenses du mois sélectionné, reste = diff. ;
 *   · réel d'une catégorie = Σ dépenses de cette catégorie sur le mois.
 * Le mois sélectionné est un simple filtre d'affichage (plus d'état partagé).
 */

const NB_TX_RECENTES = 12;
const r2 = (n: number) => Math.round(n * 100) / 100;

/** Ce qui remplace le nom d'un compte qu'on n'a pas le droit de voir. */
export const COMPTE_MASQUE = '•••';

/**
 * Restreint une requête sur les transactions aux comptes visibles.
 *
 * ⚠ `compte OU dest`, jamais « et ». Un virement relie deux comptes : quand un
 * seul est visible, la ligne DOIT être conservée. L'écarter ferait bouger le
 * solde d'un compte visible sans aucune opération pour l'expliquer — un budget
 * qui ne tombe plus juste est pire qu'un nom masqué. C'est l'autre côté du
 * virement qu'on cache (cf. `versTransaction`), pas le mouvement d'argent.
 */
function filtreVisibilite(acces: AccesComptes) {
  if (acces.complet) return undefined;
  // Aucun compte visible : `inArray` sur une liste vide est invalide en SQL.
  if (acces.noms.length === 0) return sql`false`;
  return or(inArray(tTx.compte, acces.noms), inArray(tTx.dest, acces.noms));
}

function moisCourant(): SelectionMois {
  const d = new Date();
  return { annee: d.getFullYear(), mois: d.getMonth() + 1 };
}

function normaliserSelection(sel?: SelectionMois): SelectionMois {
  if (sel && Number.isInteger(sel.mois) && sel.mois >= 1 && sel.mois <= 12 && sel.annee > 1900) {
    return { annee: sel.annee, mois: sel.mois };
  }
  return moisCourant();
}

function anneesDisponibles(sel: number, txAnnees: number[]): number[] {
  const nowY = new Date().getFullYear();
  const bornes = [2025, sel, nowY, nowY + 1, ...txAnnees];
  const debut = Math.min(...bornes);
  const fin = Math.max(...bornes);
  const liste: number[] = [];
  for (let a = debut; a <= fin; a++) liste.push(a);
  return liste;
}

/** Deltas de solde par nom de compte, à partir de toutes les transactions. */
function calculerDeltas(txRows: LigneTransaction[]): Map<string, number> {
  const deltas = new Map<string, number>();
  const add = (nom: string, v: number) => nom && deltas.set(nom, (deltas.get(nom) ?? 0) + v);
  for (const t of txRows) {
    if (t.type === TYPE_REVENU) add(t.compte, t.montant);
    else if (t.type === TYPE_DEPENSE) add(t.compte, -t.montant);
    else if (t.type === TYPE_VIREMENT) {
      add(t.compte, -t.montant);
      add(t.dest, t.montant);
    }
  }
  return deltas;
}

function soldesComptes(
  comptesRows: LigneCompte[],
  deltas: Map<string, number>,
): { soldes: Solde[]; patrimoineNum: number } {
  let patrimoine = 0;
  const soldes = comptesRows.map((c) => {
    const n = r2(c.soldeInitial + (deltas.get(c.nom) ?? 0));
    patrimoine += n;
    return { compte: c.nom, solde: formatEuro(n) };
  });
  return { soldes, patrimoineNum: r2(patrimoine) };
}

function construireParametres(
  comptesRows: LigneCompte[],
  catsRows: LigneBudgetCategorie[],
): ParametresSaisie {
  return {
    comptes: comptesRows.map((c) => c.nom),
    types: [TYPE_DEPENSE, TYPE_REVENU, TYPE_VIREMENT],
    categoriesDepense: catsRows.filter((c) => c.type === 'depense').map((c) => c.nom),
    categoriesRevenu: catsRows.filter((c) => c.type === 'revenu').map((c) => c.nom),
  };
}

/**
 * Tables du budget, **sans jamais charger l'historique complet**.
 *
 * ⚠ POURQUOI CE N'EST PLUS UN SIMPLE `SELECT *`. La version précédente lisait
 * TOUTES les transactions du foyer à chaque affichage, sans filtre de date. Le
 * coût de la page grandissait donc linéairement avec l'ancienneté du foyer, et
 * sans limite. Mesuré : ~3 ms à 50 transactions, **~97 ms à 10 000** — plus le
 * transfert des lignes et leur parcours en mémoire. Invisible la première année,
 * pénible la cinquième, et cela ne s'améliore jamais tout seul.
 *
 * Ce dont la page a réellement besoin :
 *  · les **soldes** → une somme par compte, que Postgres calcule (4 lignes au
 *    retour au lieu de 10 000). C'est le seul chiffre qui porte sur tout
 *    l'historique, et c'est justement celui qu'il ne faut pas calculer en JS ;
 *  · les **KPI et le réel par catégorie** → le mois affiché uniquement ;
 *  · les **dernières opérations** → les 12 plus récentes ;
 *  · les **années disponibles** → les années distinctes, pas les lignes.
 *
 * ⚠ Rien n'est rendu inaccessible : `chargerTransactions()` sert l'historique
 * complet d'une période à la demande. On borne les requêtes, on ne cache pas les
 * données.
 */
async function chargerTables(foyerId: string, utilisateurId: string, cleMois: string) {
  const d = db();
  const debutMois = `${cleMois}-01`;
  const finMois = `${cleMois}-32`; // borne haute textuelle : les dates sont en aaaa-mm-jj

  // Les comptes visibles conditionnent les 4 requêtes sur les transactions : il
  // faut donc les connaître d'abord. Les deux lectures partent EN PARALLÈLE —
  // une requête concurrente de plus ne coûte pas un aller-retour de plus.
  const [comptesRows, autorises] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    comptesAutorises(foyerId, utilisateurId),
  ]);
  const acces = filtrerComptes(comptesRows, autorises);
  const visibles = filtreVisibilite(acces);

  const [catsRows, echRows, deltas, txMois, txRecentes, annees] = await Promise.all([
    d.select().from(tCats).where(eq(tCats.foyerId, foyerId)),
    d.select().from(tEch).where(eq(tEch.foyerId, foyerId)),

    // Soldes : agrégés par (type, compte, dest) — quelques lignes, quel que soit
    // le nombre d'opérations. C'est le cœur du gain.
    d
      .select({
        type: tTx.type,
        compte: tTx.compte,
        dest: tTx.dest,
        total: sql<number>`sum(${tTx.montant})`,
      })
      .from(tTx)
      .where(and(eq(tTx.foyerId, foyerId), visibles))
      .groupBy(tTx.type, tTx.compte, tTx.dest),

    // Le mois affiché, pour les KPI et le réel par catégorie.
    d
      .select()
      .from(tTx)
      .where(
        and(eq(tTx.foyerId, foyerId), gte(tTx.dateIso, debutMois), lte(tTx.dateIso, finMois), visibles),
      ),

    // Les dernières opérations, toutes périodes confondues.
    d
      .select()
      .from(tTx)
      .where(and(eq(tTx.foyerId, foyerId), visibles))
      .orderBy(desc(tTx.dateIso), desc(tTx.creeLe))
      .limit(NB_TX_RECENTES),

    // Années présentes, pour le sélecteur — sans rapatrier une ligne par opération.
    d
      .selectDistinct({ annee: sql<string>`substring(${tTx.dateIso} from 1 for 4)` })
      .from(tTx)
      .where(and(eq(tTx.foyerId, foyerId), visibles)),
  ]);

  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  const comptesVisibles = [...acces.comptes].sort(
    (a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime(),
  );
  return { comptesRows: comptesVisibles, catsRows, echRows, deltas, txMois, txRecentes, annees, acces };
}

/**
 * Deltas de solde par compte, à partir des sommes agrégées par Postgres.
 *
 * Même règle métier que `calculerDeltas` (qui reste utilisée par la gestion des
 * comptes, sur des volumes bornés) : revenu +, dépense −, virement source −
 * et destination +. Ici les montants sont déjà additionnés par le moteur.
 */
function deltasDepuisAgregats(
  lignes: { type: string; compte: string; dest: string; total: number }[],
): Map<string, number> {
  const deltas = new Map<string, number>();
  const add = (nom: string, v: number) => nom && deltas.set(nom, (deltas.get(nom) ?? 0) + Number(v));
  for (const l of lignes) {
    const total = Number(l.total) || 0;
    if (l.type === TYPE_REVENU) add(l.compte, total);
    else if (l.type === TYPE_DEPENSE) add(l.compte, -total);
    else if (l.type === TYPE_VIREMENT) {
      add(l.compte, -total);
      add(l.dest, total);
    }
  }
  return deltas;
}

/**
 * Ligne de base -> transaction d'affichage. Partagé par le tableau de bord et
 * l'historique.
 *
 * `acces` masque le côté d'un virement dont le compte n'est pas visible : la
 * ligne reste (le mouvement d'argent est réel et explique le solde), seul le nom
 * de l'autre compte disparaît.
 */
function versTransaction(t: LigneTransaction, acces?: AccesComptes): Transaction {
  const visible = (nom: string) => !acces || acces.complet || nom === '' || acces.noms.includes(nom);
  return {
    date: t.date,
    type: t.type,
    compte: visible(t.compte) ? t.compte : COMPTE_MASQUE,
    dest: visible(t.dest) ? t.dest : COMPTE_MASQUE,
    categorie: t.categorie,
    libelle: t.libelle,
    montant: formatEuro(r2(t.montant)),
  };
}

export async function chargerBudget(selection?: SelectionMois): Promise<DonneesBudget> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const sel = normaliserSelection(selection);
  const cle = `${sel.annee}-${String(sel.mois).padStart(2, '0')}`; // aaaa-mm
  const { comptesRows, catsRows, echRows, deltas, txMois, txRecentes, annees, acces } =
    await chargerTables(foyerId, utilisateurId, cle);

  // Soldes sur TOUT l'historique — mais additionné par Postgres, pas en mémoire.
  const { soldes, patrimoineNum } = soldesComptes(comptesRows, deltasDepuisAgregats(deltas));

  // KPIs du mois + réel par catégorie : seules les opérations du mois affiché
  // ont été rapatriées, plus besoin de filtrer.
  let revenus = 0;
  let depenses = 0;
  const reelParCat = new Map<string, number>();
  for (const t of txMois) {
    if (t.type === TYPE_REVENU) revenus += t.montant;
    else if (t.type === TYPE_DEPENSE) {
      depenses += t.montant;
      reelParCat.set(t.categorie, (reelParCat.get(t.categorie) ?? 0) + t.montant);
    }
  }

  const categories: LigneCategorie[] = catsRows
    .filter((c) => c.type === 'depense')
    .map((c) => {
      const reelNum = r2(reelParCat.get(c.nom) ?? 0);
      const budgetNum = r2(c.budgetMensuel);
      return {
        categorie: c.nom,
        reel: formatEuro(reelNum),
        budget: formatEuro(budgetNum),
        ecart: formatEuro(r2(budgetNum - reelNum)),
        reelNum,
        budgetNum,
        depasse: budgetNum > 0 && reelNum > budgetNum,
      };
    });

  // Déjà triées et limitées par la base : rien à retrier ici.
  const transactions: Transaction[] = txRecentes.map((t) => versTransaction(t, acces));

  // Échéances à venir (ou sans date), plus proche d'abord.
  //
  // ⚠ Une échéance rattachée à un compte hérite de SA visibilité : « prêt auto »
  // sur un compte masqué n'a pas à apparaître, sinon le libellé et la date
  // racontent le compte qu'on cache. Sans compte (`compteId` vide), elle est
  // commune au foyer et reste visible de tous.
  const nomParCompte = new Map(comptesRows.map((c) => [c.id, c.nom]));
  const auj = aujourdhuiISO();
  const echeances: Echeance[] = echRows
    .filter((e) => !e.compteId || nomParCompte.has(e.compteId))
    .map((e): Echeance => ({
      id: e.id,
      libelle: e.libelle,
      date: e.date,
      dateISO: e.dateIso,
      recurrence: e.recurrence || 'Aucune',
      note: e.note,
      montant: e.montant ?? null,
      joursRestants: e.dateIso ? joursJusqua(e.dateIso) : null,
      compteId: e.compteId ?? '',
      compte: e.compteId ? (nomParCompte.get(e.compteId) ?? '') : '',
    }))
    .filter((e) => e.dateISO === null || e.dateISO >= auj)
    .sort((a, b) => (a.dateISO ?? '9999').localeCompare(b.dateISO ?? '9999'));

  const txAnnees = annees
    .map((a) => Number(a.annee))
    .filter((n) => Number.isFinite(n));

  return {
    periode: `${MOIS_FR[sel.mois - 1]} ${sel.annee}`,
    selection: sel,
    // ⚠ Vue partielle : les jauges réel/budget compareraient MES dépenses au
    // budget du FOYER. La vue masque donc la comparaison plutôt que d'afficher
    // une jauge fausse (cf. VueBudget).
    vuePartielle: !acces.complet,
    anneesDisponibles: anneesDisponibles(sel.annee, txAnnees),
    kpis: {
      revenus: formatEuro(r2(revenus)),
      depenses: formatEuro(r2(depenses)),
      reste: formatEuro(r2(revenus - depenses)),
      patrimoine: formatEuro(patrimoineNum),
    },
    categories,
    soldes,
    transactions,
    echeances,
    parametres: construireParametres(comptesRows, catsRows),
  };
}

/* ----------------------------- ACCUEIL / SAISIE ----------------------------- */

export type AccueilBudget = {
  soldes: Solde[];
  soldesHorsEpargne: Solde[];
  parametres: ParametresSaisie;
};

const estEpargne = (nom: string) => /épargne|epargne/i.test(nom);

/**
 * Chargement léger pour l'ACCUEIL : soldes + listes de saisie.
 *
 * ⚠ « Léger » ne l'était pas : cette fonction rapatriait elle aussi **toutes les
 * transactions du foyer**, et elle sert la page la plus consultée de l'app. Elle
 * ne demande plus que les sommes agrégées — trois requêtes bornées, dont aucune
 * ne grandit avec l'ancienneté du foyer.
 */
export async function chargerAccueilBudget(): Promise<AccueilBudget> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const d = db();
  const [comptesRows, catsRows, autorises] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tCats).where(eq(tCats.foyerId, foyerId)),
    comptesAutorises(foyerId, utilisateurId),
  ]);
  const acces = filtrerComptes(comptesRows, autorises);
  const visibles = [...acces.comptes].sort(
    (a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime(),
  );
  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());

  const agregats = await d
    .select({
      type: tTx.type,
      compte: tTx.compte,
      dest: tTx.dest,
      total: sql<number>`sum(${tTx.montant})`,
    })
    .from(tTx)
    .where(and(eq(tTx.foyerId, foyerId), filtreVisibilite(acces)))
    .groupBy(tTx.type, tTx.compte, tTx.dest);

  const { soldes } = soldesComptes(visibles, deltasDepuisAgregats(agregats));
  return {
    soldes,
    soldesHorsEpargne: soldes.filter((s) => !estEpargne(s.compte)),
    parametres: construireParametres(visibles, catsRows),
  };
}

/** Listes déroulantes de la saisie seules — comptes visibles uniquement. */
export async function chargerParametresSaisie(): Promise<ParametresSaisie> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const d = db();
  const [comptesRows, catsRows, autorises] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tCats).where(eq(tCats.foyerId, foyerId)),
    comptesAutorises(foyerId, utilisateurId),
  ]);
  const visibles = [...filtrerComptes(comptesRows, autorises).comptes].sort(
    (a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime(),
  );
  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  return construireParametres(visibles, catsRows);
}

/**
 * Ajoute une transaction (dépense / revenu / virement). Réplique la logique du
 * formulaire Google : virement → catégorie vidée + destination requise ; sinon
 * destination vidée. Renvoie l'id créé.
 */
export async function ajouterTransaction(input: NouvelleTransaction): Promise<string> {
  const type = (input.type ?? '').trim();
  if (!type) throw new ErreurValidation('Le type est requis.');
  if (!Number.isFinite(input.montant) || input.montant <= 0) {
    throw new ErreurValidation('Le montant doit être un nombre positif.');
  }
  const compte = (input.compte ?? '').trim();
  if (!compte) throw new ErreurValidation('Le compte est requis.');

  let dest = (input.dest ?? '').trim();
  let categorie = (input.categorie ?? '').trim();
  if (type === TYPE_VIREMENT) {
    categorie = '';
    if (!dest) throw new ErreurValidation('Un virement interne exige un compte de destination.');
  } else {
    dest = '';
  }

  const dateLabel = (input.dateLabel ?? '').trim() || aujourdhuiLabel();
  const { foyerId } = await contexteAcces();

  // ⚠ La saisie envoie un NOM de compte en texte libre : sans ce contrôle, on
  // pourrait imputer une opération à un compte qu'on n'a pas le droit de voir —
  // et en déduire l'existence par la réponse du serveur.
  exigerComptesAccessibles([compte, dest], await accesComptes());

  const [row] = await db()
    .insert(tTx)
    .values({
      foyerId,
      date: dateLabel,
      dateIso: versISO(dateLabel),
      type,
      compte,
      dest,
      categorie,
      libelle: (input.libelle ?? '').trim(),
      montant: r2(input.montant),
      note: '',
    })
    .returning({ id: tTx.id });
  return row.id;
}

/* --------------------- INITIALISATION DES COMPTES --------------------- */

export type NouveauCompte = { nom: string; solde: number };

/**
 * Le foyer a-t-il déjà déclaré ses comptes ?
 * Sans compte, le Budget n'a rien à afficher : on propose alors l'initialisation.
 */
export async function comptesExistants(): Promise<number> {
  const foyerId = await idFoyerCourant();
  const lignes = await db()
    .select({ id: tComptes.id })
    .from(tComptes)
    .where(eq(tComptes.foyerId, foyerId));
  return lignes.length;
}

/**
 * Crée des comptes avec leur solde ACTUEL.
 *
 * Ce solde est enregistré comme `solde_initial` : le module recalcule ensuite
 * solde = solde_initial + Σ transactions. Saisir l'état réel du compte au moment
 * du démarrage est donc ce qui rend tous les soldes justes par la suite.
 */
export async function creerComptes(entrees: NouveauCompte[]): Promise<number> {
  const foyerId = await idFoyerCourant();

  const propres = entrees
    .map((c) => ({ nom: (c.nom ?? '').trim(), solde: Number(c.solde) }))
    .filter((c) => c.nom !== '');

  if (propres.length === 0) throw new ErreurValidation('Indique au moins un compte.');
  if (propres.some((c) => !Number.isFinite(c.solde))) {
    throw new ErreurValidation('Chaque solde doit être un nombre (0 si le compte est vide).');
  }

  const doublon = propres.find((c, i) =>
    propres.some((a, j) => j < i && a.nom.toLowerCase() === c.nom.toLowerCase()),
  );
  if (doublon) throw new ErreurValidation(`Deux comptes portent le même nom : « ${doublon.nom} ».`);

  // `ordre` reprend après les comptes déjà présents (ajout ultérieur possible).
  const dejaLa = await db()
    .select({ nom: tComptes.nom, ordre: tComptes.ordre })
    .from(tComptes)
    .where(eq(tComptes.foyerId, foyerId));

  // ⚠ Le doublon avec un compte DÉJÀ EN BASE est le plus dangereux : les soldes
  // sont rapprochés par NOM, donc deux comptes homonymes se verraient attribuer
  // les mêmes opérations — le même argent compté deux fois dans le patrimoine.
  //
  // ⚠ L'unicité se vérifie sur TOUT le foyer, comptes masqués compris : la
  // relâcher pour cause d'invisibilité fabriquerait précisément ces homonymes.
  // En contrepartie, le message ne NOMME plus le compte en conflit — il
  // révélerait un compte qu'on n'a pas le droit de voir.
  const existants = new Set(dejaLa.map((x) => x.nom.trim().toLowerCase()));
  const collision = propres.find((c) => existants.has(c.nom.toLowerCase()));
  if (collision) {
    throw new ErreurValidation(`Le nom « ${collision.nom} » n'est pas disponible.`);
  }

  const depart = dejaLa.reduce((m, x) => Math.max(m, x.ordre), 0) + 1;

  await db().insert(tComptes).values(
    propres.map((c, i) => ({
      foyerId,
      nom: c.nom,
      soldeInitial: r2(c.solde),
      ordre: depart + i,
    })),
  );
  return propres.length;
}

/* ---------------------------------------------------------------------------
 * GESTION DES COMPTES (renommer / corriger le solde / supprimer)
 *
 * ⚠ Contrainte structurante : une transaction désigne son compte par son NOM
 * (`transactions.compte` / `transactions.dest` sont du texte, pas des clés
 * étrangères). Deux conséquences dont tout ce bloc découle :
 *   · RENOMMER un compte doit réécrire ses transactions dans le même geste,
 *     sinon elles deviennent orphelines : le compte repart de son solde initial
 *     et l'argent disparaît du patrimoine, sans la moindre erreur visible.
 *   · SUPPRIMER un compte laisserait ces mêmes orphelines derrière lui.
 * ------------------------------------------------------------------------- */

/** Les comptes du foyer avec leur solde réel et de quoi avertir avant suppression. */
export async function chargerComptesGestion(): Promise<CompteGere[]> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const d = db();
  const [comptesRows, txRows, autorises] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tTx).where(eq(tTx.foyerId, foyerId)),
    comptesAutorises(foyerId, utilisateurId),
  ]);
  const acces = filtrerComptes(comptesRows, autorises);
  const visibles = [...acces.comptes].sort(
    (a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime(),
  );

  // ⚠ Les deltas se calculent sur TOUTES les transactions, y compris celles des
  // comptes masqués : un virement venu d'un compte invisible fait bel et bien
  // varier le solde d'un compte visible. Seule la LISTE rendue est filtrée.
  const deltas = calculerDeltas(txRows);
  return visibles.map((c) => {
    const lien = txRows.filter((t) => t.compte === c.nom || t.dest === c.nom);
    return {
      id: c.id,
      nom: c.nom,
      soldeCourant: r2(c.soldeInitial + (deltas.get(c.nom) ?? 0)),
      nbOperations: lien.length,
      nbVirements: lien.filter((t) => t.type === TYPE_VIREMENT).length,
      restreint: c.partage === PARTAGE_RESTREINT,
    };
  });
}

/**
 * Le compte demandé, s'il appartient au foyer courant ET que la personne y a
 * accès. Renommer ou supprimer un compte qu'on ne voit pas doit être aussi
 * impossible que le lire — sans quoi l'écriture révèle ce que la lecture cache.
 */
async function compteDuFoyer(id: string): Promise<LigneCompte> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const d = db();
  const [[c], autorises] = await Promise.all([
    d
      .select()
      .from(tComptes)
      .where(and(eq(tComptes.foyerId, foyerId), eq(tComptes.id, id)))
      .limit(1),
    comptesAutorises(foyerId, utilisateurId),
  ]);
  // Même message qu'un compte inexistant : ne pas révéler qu'il existe ailleurs,
  // ni qu'il existe mais nous est masqué.
  if (!c) throw new ErreurValidation('Compte introuvable.');
  if (c.partage === PARTAGE_RESTREINT && !autorises.has(c.id)) {
    throw new ErreurValidation('Compte introuvable.');
  }
  return c;
}

/**
 * Renomme un compte et/ou corrige son solde.
 *
 * `soldeCourant` = ce que la personne lit sur son relevé. On en déduit le
 * `solde_initial` à rebours (`voulu − Σ opérations`) pour que la correction
 * porte sur ce qu'elle voit, sans avoir à comprendre le modèle de calcul.
 */
export async function modifierCompte(input: {
  id: string;
  nom: string;
  soldeCourant: number;
}): Promise<void> {
  const foyerId = await idFoyerCourant();
  const compte = await compteDuFoyer(input.id);

  const nom = (input.nom ?? '').trim();
  if (nom === '') throw new ErreurValidation('Le nom du compte ne peut pas être vide.');
  if (!Number.isFinite(input.soldeCourant)) {
    throw new ErreurValidation('Le solde doit être un nombre (0 si le compte est vide).');
  }

  const d = db();
  const autres = await d
    .select({ id: tComptes.id, nom: tComptes.nom })
    .from(tComptes)
    .where(eq(tComptes.foyerId, foyerId));
  // Unicité sur tout le foyer, comptes masqués compris (cf. `creerComptes`), et
  // message neutre pour ne pas révéler un compte qu'on n'a pas le droit de voir.
  if (autres.some((a) => a.id !== compte.id && a.nom.trim().toLowerCase() === nom.toLowerCase())) {
    throw new ErreurValidation(`Le nom « ${nom} » n'est pas disponible.`);
  }

  // Le delta est celui du nom ACTUEL : on le calcule avant de renommer quoi que ce soit.
  const txRows = await d.select().from(tTx).where(eq(tTx.foyerId, foyerId));
  const delta = calculerDeltas(txRows).get(compte.nom) ?? 0;
  const soldeInitial = r2(input.soldeCourant - delta);

  await d.transaction(async (tx) => {
    if (nom !== compte.nom) {
      // Les deux colonnes, sinon un virement garderait l'ancien nom d'un côté.
      await tx
        .update(tTx)
        .set({ compte: nom })
        .where(and(eq(tTx.foyerId, foyerId), eq(tTx.compte, compte.nom)));
      await tx
        .update(tTx)
        .set({ dest: nom })
        .where(and(eq(tTx.foyerId, foyerId), eq(tTx.dest, compte.nom)));
    }
    await tx
      .update(tComptes)
      .set({ nom, soldeInitial })
      .where(and(eq(tComptes.foyerId, foyerId), eq(tComptes.id, compte.id)));
  });
}

/**
 * Supprime un compte et les opérations qui le désignent.
 *
 * Les garder produirait des orphelines : invisibles dans les soldes (plus aucun
 * compte ne porte ce nom) mais toujours comptées dans les dépenses par
 * catégorie — un tableau de bord qui ne tombe plus juste.
 *
 * ⚠ LES VIREMENTS SONT CONVERTIS, PAS SUPPRIMÉS. Un virement relie DEUX comptes :
 * l'effacer purement et simplement ferait remonter le solde du compte survivant
 * du montant transféré, comme si l'argent n'en était jamais sorti. (Vérifié :
 * supprimer un compte ayant reçu 300 € gonflait l'émetteur de 300 €.) On les
 * retombe donc sur le compte qui survit — un virement sortant devient un revenu
 * pour son destinataire, un virement entrant devient une dépense pour sa source.
 * **Le solde des autres comptes est ainsi rigoureusement préservé**, ce qui est
 * la seule attente raisonnable quand on ferme un compte.
 *
 * `confirme` reste exigé dès qu'il y a un historique : les opérations propres au
 * compte, elles, disparaissent bel et bien. L'appelant doit avoir montré les
 * compteurs de `chargerComptesGestion()` avant de demander cette confirmation.
 */
export async function supprimerCompte(input: { id: string; confirme?: boolean }): Promise<void> {
  const foyerId = await idFoyerCourant();
  const compte = await compteDuFoyer(input.id);
  const d = db();
  const nom = compte.nom;

  const txRows = await d.select().from(tTx).where(eq(tTx.foyerId, foyerId));
  const liees = txRows.filter((t) => t.compte === nom || t.dest === nom);

  if (liees.length > 0 && !input.confirme) {
    throw new ErreurValidation(
      `« ${nom} » porte ${liees.length} opération(s). Les supprimer avec le compte demande une confirmation.`,
    );
  }

  await d.transaction(async (tx) => {
    if (liees.length > 0) {
      // Virement SORTANT du compte supprimé → le destinataire a bien reçu :
      // devient un revenu chez lui. (`ne(dest, '')` : sans destinataire réel,
      // il n'y a personne à préserver, la ligne sera supprimée plus bas.)
      // ⚠ `compte = dest` et `dest = ''` dans le MÊME update : Postgres évalue
      // toutes les expressions SET sur l'ANCIENNE ligne, `compte` reçoit donc
      // bien l'ancien destinataire et non une chaîne vide. Ne pas « corriger »
      // en scindant en deux requêtes, ce serait faux.
      await tx
        .update(tTx)
        .set({ type: TYPE_REVENU, compte: sql`${tTx.dest}`, dest: '' })
        .where(
          and(
            eq(tTx.foyerId, foyerId),
            eq(tTx.type, TYPE_VIREMENT),
            eq(tTx.compte, nom),
            ne(tTx.dest, ''),
          ),
        );

      // Virement ENTRANT vers le compte supprimé → l'argent est bien sorti de la
      // source : devient une dépense chez elle. Le champ `compte` ne bouge pas.
      await tx
        .update(tTx)
        .set({ type: TYPE_DEPENSE, dest: '' })
        .where(
          and(
            eq(tTx.foyerId, foyerId),
            eq(tTx.type, TYPE_VIREMENT),
            eq(tTx.dest, nom),
            ne(tTx.compte, ''),
          ),
        );

      // Ce qui désigne encore le compte lui appartient en propre : on l'efface.
      await tx.delete(tTx).where(and(eq(tTx.foyerId, foyerId), eq(tTx.compte, nom)));
      await tx.delete(tTx).where(and(eq(tTx.foyerId, foyerId), eq(tTx.dest, nom)));
    }
    await tx
      .delete(tComptes)
      .where(and(eq(tComptes.foyerId, foyerId), eq(tComptes.id, compte.id)));
  });
}

/* ------------------------------- HISTORIQUE -------------------------------
 * Borner les requêtes de la page ne doit pas rendre l'historique inaccessible :
 * ce sont deux choses différentes. Le tableau de bord se charge vite parce
 * qu'il ne rapatrie que ce qu'il affiche ; l'historique complet reste
 * consultable **à la demande**, sur la période que la personne choisit.
 * -------------------------------------------------------------------------- */

/** Périodes d'historique proposées. Bornées : jamais « tout depuis toujours ». */
export const PERIODES_HISTORIQUE = ['mois', 'annee'] as const;
export type PeriodeHistorique = (typeof PERIODES_HISTORIQUE)[number];

/**
 * Toutes les opérations d'un mois ou d'une **année entière**, plus récente
 * d'abord.
 *
 * ⚠ `limite` est un garde-fou, pas une restriction de principe : une année
 * compte quelques centaines d'opérations pour un foyer ordinaire, mais rien
 * n'empêche une saisie automatisée d'en produire beaucoup plus. Sans plafond,
 * une seule page pourrait rapatrier des dizaines de milliers de lignes — ce que
 * cette refonte cherche précisément à éviter.
 */
export async function chargerTransactions(
  periode: PeriodeHistorique,
  selection?: SelectionMois,
  limite = 2000,
): Promise<{ transactions: Transaction[]; tronque: boolean }> {
  const { foyerId } = await contexteAcces();
  const acces = await accesComptes();
  const sel = normaliserSelection(selection);
  const an = String(sel.annee);
  const [debut, fin] =
    periode === 'annee'
      ? [`${an}-01-01`, `${an}-12-31`]
      : [
          `${an}-${String(sel.mois).padStart(2, '0')}-01`,
          `${an}-${String(sel.mois).padStart(2, '0')}-32`,
        ];

  // `limite + 1` : une ligne de plus suffit à savoir qu'il y en avait davantage,
  // sans avoir à compter la table.
  const lignes = await db()
    .select()
    .from(tTx)
    .where(
      and(
        eq(tTx.foyerId, foyerId),
        gte(tTx.dateIso, debut),
        lte(tTx.dateIso, fin),
        filtreVisibilite(acces),
      ),
    )
    .orderBy(desc(tTx.dateIso), desc(tTx.creeLe))
    .limit(limite + 1);

  return {
    transactions: lignes.slice(0, limite).map((t) => versTransaction(t, acces)),
    tronque: lignes.length > limite,
  };
}

/* ---------------------------------------------------------------------------
 * ÉCHÉANCES — ajouter / modifier / supprimer
 *
 * ⚠ Ce CRUD n'existait pas : les échéances s'affichaient sans qu'aucun écran ne
 * permette d'en créer une. Elles ne pouvaient venir que d'une écriture SQL
 * directe — autant dire de nulle part pour un vrai foyer, qui voyait une section
 * vide sans comprendre pourquoi.
 *
 * La visibilité est HÉRITÉE du compte rattaché : pas de réglage propre, pas
 * d'écran de plus. Sans compte, l'échéance est commune au foyer.
 * ------------------------------------------------------------------------- */

/**
 * Le compte rattaché doit exister ET être accessible, sinon on refuse.
 *
 * ⚠ OBLIGATOIRE. Une échéance est un prélèvement à venir : sans compte, rien ne
 * dit d'où l'argent sortira, et le tableau de bord affichait des lignes qu'on ne
 * pouvait rattacher à aucun solde. Les échéances antérieures gardent `null` et
 * s'affichent « compte non précisé » — on ne réécrit pas des données existantes,
 * mais on n'en crée plus de nouvelles dans cet état.
 */
async function compteRattacheValide(brut: string | null | undefined): Promise<string> {
  const v = (brut ?? '').trim();
  if (!v) {
    throw new ErreurValidation(
      'Choisis le compte sur lequel cette échéance sera prélevée.',
    );
  }
  const acces = await accesComptes();
  const cible = acces.comptes.find((c) => c.id === v);
  // Même message qu'un compte inexistant : ne pas révéler un compte masqué.
  if (!cible) throw new ErreurValidation('Compte introuvable.');
  return cible.id;
}

function champsEcheance(c: ChampsEcheance, compteId: string | null) {
  const libelle = (c.libelle ?? '').trim();
  if (!libelle) throw new ErreurValidation("Le libellé de l'échéance est requis.");
  const dateLabel = (c.dateLabel ?? '').trim();
  const dateIso = dateLabel ? versISO(dateLabel) : null;
  if (dateLabel && !dateIso) {
    throw new ErreurValidation('La date doit être au format jj/mm/aaaa.');
  }
  /*
   * ⚠ VIDE DONNE `null`, PAS `0`. Beaucoup d'échéances sont de simples rappels
   * de date sans montant ; les enregistrer à zéro afficherait « 0,00 € » partout
   * et rendrait indiscernable ce qui est gratuit de ce qu'on n'a pas chiffré.
   *
   * ⚠ ET UNE SAISIE SANS AUCUN CHIFFRE EST REFUSÉE. `parseEuro` renvoie `0` sur
   * ce qu'il ne sait pas lire : une faute de frappe se serait enregistrée en
   * « 0,00 € » sans le moindre signal, et c'est précisément le genre de valeur
   * fausse qu'on ne relit jamais.
   */
  const brutMontant = (c.montant ?? '').trim();
  if (brutMontant && !/\d/.test(brutMontant)) {
    throw new ErreurValidation('Le montant doit être un nombre (par exemple 45,90).');
  }

  return {
    libelle,
    date: dateLabel,
    dateIso,
    recurrence: (c.recurrence ?? 'Aucune').trim() || 'Aucune',
    note: (c.note ?? '').trim(),
    montant: brutMontant ? parseEuro(brutMontant) : null,
    compteId,
  };
}

export async function ajouterEcheance(c: ChampsEcheance): Promise<string> {
  const { foyerId } = await contexteAcces();
  const compteId = await compteRattacheValide(c.compteId);
  const [row] = await db()
    .insert(tEch)
    .values({ foyerId, ...champsEcheance(c, compteId) })
    .returning({ id: tEch.id });
  return row.id;
}

/**
 * L'échéance demandée, si elle appartient au foyer ET que son compte rattaché
 * est accessible — sinon modifier une échéance invisible en révélerait le
 * contenu par la réponse du serveur.
 */
async function echeanceAccessible(id: string): Promise<{ id: string }> {
  const { foyerId } = await contexteAcces();
  const [e] = await db()
    .select({ id: tEch.id, compteId: tEch.compteId })
    .from(tEch)
    .where(and(eq(tEch.foyerId, foyerId), eq(tEch.id, id)))
    .limit(1);
  if (!e) throw new ErreurValidation('Échéance introuvable.');
  if (e.compteId) {
    const acces = await accesComptes();
    if (!acces.comptes.some((c) => c.id === e.compteId)) {
      throw new ErreurValidation('Échéance introuvable.');
    }
  }
  return { id: e.id };
}

export async function modifierEcheance(id: string, c: ChampsEcheance): Promise<void> {
  await echeanceAccessible(id);
  const { foyerId } = await contexteAcces();
  const compteId = await compteRattacheValide(c.compteId);
  await db()
    .update(tEch)
    .set(champsEcheance(c, compteId))
    .where(and(eq(tEch.foyerId, foyerId), eq(tEch.id, id)));
}

export async function supprimerEcheance(id: string): Promise<void> {
  await echeanceAccessible(id);
  const { foyerId } = await contexteAcces();
  await db().delete(tEch).where(and(eq(tEch.foyerId, foyerId), eq(tEch.id, id)));
}

/* ---------------------------------------------------------------------------
 * PARTAGE DES COMPTES — qui voit quoi
 *
 * ⚠ Écran d'ADMINISTRATION, pas de lecture : il ne renvoie ni solde ni
 * opération, seulement des noms de comptes et la liste des personnes
 * autorisées. C'est ce qui permet au propriétaire de régler le partage d'un
 * compte SANS en devenir lecteur — la condition pour que le cas colocation ait
 * un sens (celui qui a créé le foyer n'a pas à lire les comptes de ses colocs).
 * ------------------------------------------------------------------------- */

/** Réglage de partage d'un compte, tel que l'écran du propriétaire l'affiche. */
export type ComptePartage = {
  id: string;
  nom: string;
  restreint: boolean;
  utilisateurIds: string[]; // personnes autorisées quand `restreint`
};

/**
 * Le propriétaire seul règle les partages — comme le reste de la gestion du
 * foyer (inviter, retirer, renommer). Le rôle est relu ici plutôt qu'importé de
 * [lib/membres.ts] pour ne pas tirer toute la pile e-mail dans le module Budget.
 */
async function exigerProprietaireDuFoyer(): Promise<{ foyerId: string }> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const [m] = await db()
    .select({ role: tMembres.role })
    .from(tMembres)
    .where(and(eq(tMembres.foyerId, foyerId), eq(tMembres.utilisateurId, utilisateurId)))
    .limit(1);
  if (m?.role !== 'proprietaire') {
    throw new ErreurValidation(
      'Seul le propriétaire du foyer peut régler la visibilité des comptes.',
    );
  }
  return { foyerId };
}

/** Tous les comptes du foyer avec leur partage. Noms seulement, aucun montant. */
export async function chargerPartageComptes(): Promise<ComptePartage[]> {
  const { foyerId } = await exigerProprietaireDuFoyer();
  const d = db();
  const [comptesRows, accesRows] = await Promise.all([
    d
      .select({ id: tComptes.id, nom: tComptes.nom, partage: tComptes.partage, ordre: tComptes.ordre, creeLe: tComptes.creeLe })
      .from(tComptes)
      .where(eq(tComptes.foyerId, foyerId)),
    d
      .select({ compteId: tAcces.compteId, utilisateurId: tAcces.utilisateurId })
      .from(tAcces)
      .where(eq(tAcces.foyerId, foyerId)),
  ]);
  comptesRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());

  const parCompte = new Map<string, string[]>();
  for (const a of accesRows) {
    parCompte.set(a.compteId, [...(parCompte.get(a.compteId) ?? []), a.utilisateurId]);
  }
  return comptesRows.map((c) => ({
    id: c.id,
    nom: c.nom,
    restreint: c.partage === PARTAGE_RESTREINT,
    utilisateurIds: parCompte.get(c.id) ?? [],
  }));
}

/**
 * Définit qui voit un compte.
 *
 * `restreint = false` → visible de tout le foyer, et la liste d'accès est vidée
 * (la garder ferait resurgir un ancien réglage à la prochaine restriction, sans
 * que personne ne l'ait redemandé).
 *
 * ⚠ Les identifiants reçus sont vérifiés comme membres DU FOYER : la route les
 * reçoit du client, et rien n'empêcherait sinon d'autoriser un inconnu.
 */
export async function definirPartageCompte(input: {
  compteId: string;
  restreint: boolean;
  utilisateurIds: string[];
}): Promise<void> {
  const { foyerId } = await exigerProprietaireDuFoyer();
  const d = db();

  const [compte] = await d
    .select({ id: tComptes.id })
    .from(tComptes)
    .where(and(eq(tComptes.foyerId, foyerId), eq(tComptes.id, input.compteId)))
    .limit(1);
  if (!compte) throw new ErreurValidation('Compte introuvable.');

  const membresRows = await d
    .select({ utilisateurId: tMembres.utilisateurId })
    .from(tMembres)
    .where(eq(tMembres.foyerId, foyerId));
  const duFoyer = new Set(membresRows.map((m) => m.utilisateurId));
  const retenus = [...new Set(input.utilisateurIds)].filter((id) => duFoyer.has(id));

  if (input.restreint && retenus.length === 0) {
    throw new ErreurValidation('Choisis au moins une personne, sinon plus personne ne verrait ce compte.');
  }

  await d.transaction(async (tx) => {
    await tx
      .update(tComptes)
      .set({ partage: input.restreint ? PARTAGE_RESTREINT : PARTAGE_FOYER })
      .where(and(eq(tComptes.foyerId, foyerId), eq(tComptes.id, compte.id)));
    await tx.delete(tAcces).where(and(eq(tAcces.foyerId, foyerId), eq(tAcces.compteId, compte.id)));
    if (input.restreint && retenus.length > 0) {
      await tx
        .insert(tAcces)
        .values(retenus.map((utilisateurId) => ({ foyerId, compteId: compte.id, utilisateurId })));
    }
  });
}
