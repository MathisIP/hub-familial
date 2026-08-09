import 'server-only';
import { and, desc, eq, gte, lte, ne, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  comptes as tComptes,
  budgetCategories as tCats,
  transactions as tTx,
  echeances as tEch,
  type LigneCompte,
  type LigneBudgetCategorie,
  type LigneTransaction,
} from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  MOIS_FR,
  TYPE_DEPENSE,
  TYPE_REVENU,
  TYPE_VIREMENT,
  aujourdhuiISO,
  aujourdhuiLabel,
  formatEuro,
  joursJusqua,
  versISO,
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
async function chargerTables(foyerId: string, cleMois: string) {
  const d = db();
  const debutMois = `${cleMois}-01`;
  const finMois = `${cleMois}-32`; // borne haute textuelle : les dates sont en aaaa-mm-jj

  const [comptesRows, catsRows, echRows, deltas, txMois, txRecentes, annees] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
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
      .where(eq(tTx.foyerId, foyerId))
      .groupBy(tTx.type, tTx.compte, tTx.dest),

    // Le mois affiché, pour les KPI et le réel par catégorie.
    d
      .select()
      .from(tTx)
      .where(and(eq(tTx.foyerId, foyerId), gte(tTx.dateIso, debutMois), lte(tTx.dateIso, finMois))),

    // Les dernières opérations, toutes périodes confondues.
    d
      .select()
      .from(tTx)
      .where(eq(tTx.foyerId, foyerId))
      .orderBy(desc(tTx.dateIso), desc(tTx.creeLe))
      .limit(NB_TX_RECENTES),

    // Années présentes, pour le sélecteur — sans rapatrier une ligne par opération.
    d
      .selectDistinct({ annee: sql<string>`substring(${tTx.dateIso} from 1 for 4)` })
      .from(tTx)
      .where(eq(tTx.foyerId, foyerId)),
  ]);

  comptesRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  return { comptesRows, catsRows, echRows, deltas, txMois, txRecentes, annees };
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

/** Ligne de base -> transaction d'affichage. Partagé par le tableau de bord et l'historique. */
function versTransaction(t: LigneTransaction): Transaction {
  return {
    date: t.date,
    type: t.type,
    compte: t.compte,
    dest: t.dest,
    categorie: t.categorie,
    libelle: t.libelle,
    montant: formatEuro(r2(t.montant)),
  };
}

export async function chargerBudget(selection?: SelectionMois): Promise<DonneesBudget> {
  const foyerId = await idFoyerCourant();
  const sel = normaliserSelection(selection);
  const cle = `${sel.annee}-${String(sel.mois).padStart(2, '0')}`; // aaaa-mm
  const { comptesRows, catsRows, echRows, deltas, txMois, txRecentes, annees } =
    await chargerTables(foyerId, cle);

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
  const transactions: Transaction[] = txRecentes.map(versTransaction);

  // Échéances à venir (ou sans date), plus proche d'abord.
  const auj = aujourdhuiISO();
  const echeances: Echeance[] = echRows
    .map((e): Echeance => ({
      libelle: e.libelle,
      date: e.date,
      dateISO: e.dateIso,
      recurrence: e.recurrence || 'Aucune',
      note: e.note,
      joursRestants: e.dateIso ? joursJusqua(e.dateIso) : null,
    }))
    .filter((e) => e.dateISO === null || e.dateISO >= auj)
    .sort((a, b) => (a.dateISO ?? '9999').localeCompare(b.dateISO ?? '9999'));

  const txAnnees = annees
    .map((a) => Number(a.annee))
    .filter((n) => Number.isFinite(n));

  return {
    periode: `${MOIS_FR[sel.mois - 1]} ${sel.annee}`,
    selection: sel,
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
  const foyerId = await idFoyerCourant();
  const d = db();
  const [comptesRows, catsRows, agregats] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tCats).where(eq(tCats.foyerId, foyerId)),
    d
      .select({
        type: tTx.type,
        compte: tTx.compte,
        dest: tTx.dest,
        total: sql<number>`sum(${tTx.montant})`,
      })
      .from(tTx)
      .where(eq(tTx.foyerId, foyerId))
      .groupBy(tTx.type, tTx.compte, tTx.dest),
  ]);
  comptesRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());

  const { soldes } = soldesComptes(comptesRows, deltasDepuisAgregats(agregats));
  return {
    soldes,
    soldesHorsEpargne: soldes.filter((s) => !estEpargne(s.compte)),
    parametres: construireParametres(comptesRows, catsRows),
  };
}

/** Listes déroulantes de la saisie seules. */
export async function chargerParametresSaisie(): Promise<ParametresSaisie> {
  const foyerId = await idFoyerCourant();
  const d = db();
  const [comptesRows, catsRows] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tCats).where(eq(tCats.foyerId, foyerId)),
  ]);
  comptesRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  return construireParametres(comptesRows, catsRows);
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
  const foyerId = await idFoyerCourant();
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
  const existants = new Set(dejaLa.map((x) => x.nom.trim().toLowerCase()));
  const collision = propres.find((c) => existants.has(c.nom.toLowerCase()));
  if (collision) {
    throw new ErreurValidation(`Un compte « ${collision.nom} » existe déjà. Choisis un autre nom.`);
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
  const foyerId = await idFoyerCourant();
  const d = db();
  const [comptesRows, txRows] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tTx).where(eq(tTx.foyerId, foyerId)),
  ]);
  comptesRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());

  const deltas = calculerDeltas(txRows);
  return comptesRows.map((c) => {
    const lien = txRows.filter((t) => t.compte === c.nom || t.dest === c.nom);
    return {
      id: c.id,
      nom: c.nom,
      soldeCourant: r2(c.soldeInitial + (deltas.get(c.nom) ?? 0)),
      nbOperations: lien.length,
      nbVirements: lien.filter((t) => t.type === TYPE_VIREMENT).length,
    };
  });
}

/** Le compte demandé, s'il appartient bien au foyer courant. */
async function compteDuFoyer(id: string): Promise<LigneCompte> {
  const foyerId = await idFoyerCourant();
  const [c] = await db()
    .select()
    .from(tComptes)
    .where(and(eq(tComptes.foyerId, foyerId), eq(tComptes.id, id)))
    .limit(1);
  // Même message qu'un compte inexistant : ne pas révéler qu'il existe ailleurs.
  if (!c) throw new ErreurValidation('Compte introuvable.');
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
  if (autres.some((a) => a.id !== compte.id && a.nom.trim().toLowerCase() === nom.toLowerCase())) {
    throw new ErreurValidation(`Un autre compte s'appelle déjà « ${nom} ».`);
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
  const foyerId = await idFoyerCourant();
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
    .where(and(eq(tTx.foyerId, foyerId), gte(tTx.dateIso, debut), lte(tTx.dateIso, fin)))
    .orderBy(desc(tTx.dateIso), desc(tTx.creeLe))
    .limit(limite + 1);

  return {
    transactions: lignes.slice(0, limite).map(versTransaction),
    tronque: lignes.length > limite,
  };
}
