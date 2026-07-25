import 'server-only';
import { eq } from 'drizzle-orm';
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

/** Toutes les tables du budget pour le foyer, triées comme à l'affichage. */
async function chargerTables(foyerId: string) {
  const d = db();
  const [comptesRows, catsRows, txRows, echRows] = await Promise.all([
    d.select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    d.select().from(tCats).where(eq(tCats.foyerId, foyerId)),
    d.select().from(tTx).where(eq(tTx.foyerId, foyerId)),
    d.select().from(tEch).where(eq(tEch.foyerId, foyerId)),
  ]);
  comptesRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  catsRows.sort((a, b) => a.ordre - b.ordre || a.creeLe.getTime() - b.creeLe.getTime());
  return { comptesRows, catsRows, txRows, echRows };
}

export async function chargerBudget(selection?: SelectionMois): Promise<DonneesBudget> {
  const foyerId = await idFoyerCourant();
  const { comptesRows, catsRows, txRows, echRows } = await chargerTables(foyerId);
  const sel = normaliserSelection(selection);
  const cle = `${sel.annee}-${String(sel.mois).padStart(2, '0')}`; // aaaa-mm

  // Soldes (toutes transactions) + patrimoine.
  const { soldes, patrimoineNum } = soldesComptes(comptesRows, calculerDeltas(txRows));

  // KPIs du mois + réel par catégorie (dépenses du mois).
  let revenus = 0;
  let depenses = 0;
  const reelParCat = new Map<string, number>();
  for (const t of txRows) {
    if (t.dateIso?.slice(0, 7) !== cle) continue;
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

  // Transactions récentes (plus récente d'abord).
  const txTriees = [...txRows].sort((a, b) => {
    const k = (b.dateIso ?? '').localeCompare(a.dateIso ?? '');
    return k !== 0 ? k : b.creeLe.getTime() - a.creeLe.getTime();
  });
  const transactions: Transaction[] = txTriees.slice(0, NB_TX_RECENTES).map((t) => ({
    date: t.date,
    type: t.type,
    compte: t.compte,
    dest: t.dest,
    categorie: t.categorie,
    libelle: t.libelle,
    montant: formatEuro(r2(t.montant)),
  }));

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

  const txAnnees = txRows
    .map((t) => (t.dateIso ? Number(t.dateIso.slice(0, 4)) : NaN))
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

/** Chargement léger pour l'accueil : soldes (toutes transactions) + listes de saisie. */
export async function chargerAccueilBudget(): Promise<AccueilBudget> {
  const foyerId = await idFoyerCourant();
  const { comptesRows, catsRows, txRows } = await chargerTables(foyerId);
  const { soldes } = soldesComptes(comptesRows, calculerDeltas(txRows));
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
