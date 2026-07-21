import 'server-only';
import { lireBatch, lireBrut, ecrirePlage } from '@/lib/google/sheets';
import { ErreurValidation } from '@/lib/erreurs';
import { nomOnglet, plage } from '@/lib/i18n';
import {
  COL_TX,
  MOIS_FR,
  SOURCE_APP,
  TYPE_VIREMENT,
  aujourdhuiISO,
  aujourdhuiLabel,
  joursJusqua,
  parseEuro,
  versISO,
  type DonneesBudget,
  type Echeance,
  type Kpis,
  type LigneCategorie,
  type NouvelleTransaction,
  type ParametresSaisie,
  type SelectionMois,
  type Solde,
  type Transaction,
} from '@/lib/budget/schema';

/**
 * SERVICE BUDGET (serveur uniquement) — lecture seule.
 * Lit le moteur « Tableau de bord » (déjà calculé), les Transactions et les
 * Échéances en un seul aller-retour, et repère les blocs par leur libellé.
 */

const CL = 'BUDGET' as const;
const NB_TX_RECENTES = 12;

function pl(
  onglet: 'TABLEAU_BORD' | 'TRANSACTIONS' | 'ECHEANCES' | 'VUE_ENSEMBLE' | 'PARAMETRES',
  a1: string,
): string {
  return plage(nomOnglet(CL, onglet), a1);
}

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Valeur (col B) de la 1re ligne dont la col A commence par un des préfixes. */
function valeurParLibelle(matrice: unknown[][], ...prefixes: string[]): string {
  for (const ligne of matrice) {
    const a = S(ligne[0]).toLowerCase();
    if (prefixes.some((p) => a.startsWith(p.toLowerCase()))) return S(ligne[1]);
  }
  return '';
}

/** Index de la 1re ligne dont la col A contient `texte` (insensible casse). */
function indexLigne(matrice: unknown[][], texte: string): number {
  const t = texte.toLowerCase();
  return matrice.findIndex((l) => S(l[0]).toLowerCase().includes(t));
}

function extraireKpis(tb: unknown[][]): Kpis {
  return {
    revenus: valeurParLibelle(tb, 'Revenus du mois') || '—',
    depenses: valeurParLibelle(tb, 'Dépenses du mois') || '—',
    reste: valeurParLibelle(tb, 'Reste du mois') || '—',
    patrimoine: valeurParLibelle(tb, 'TOTAL FOYER') || '—',
  };
}

/** Bloc « Dépenses par catégorie » : de l'en-tête (Catégorie|Réel|Budget|Écart) à TOTAL. */
function extraireCategories(tb: unknown[][]): LigneCategorie[] {
  const debut = tb.findIndex(
    (l) => S(l[0]).toLowerCase() === 'catégorie' && S(l[1]).toLowerCase() === 'réel',
  );
  if (debut === -1) return [];
  const cats: LigneCategorie[] = [];
  for (let i = debut + 1; i < tb.length; i++) {
    const l = tb[i];
    const cat = S(l[0]);
    if (!cat || cat.toUpperCase().startsWith('TOTAL')) break;
    const reelNum = parseEuro(l[1]);
    const budgetNum = parseEuro(l[2]);
    cats.push({
      categorie: cat,
      reel: S(l[1]),
      budget: S(l[2]),
      ecart: S(l[3]),
      reelNum,
      budgetNum,
      depasse: budgetNum > 0 && reelNum > budgetNum,
    });
  }
  return cats;
}

/** Bloc « Soldes des comptes » : de l'en-tête (Compte|Solde) à TOTAL FOYER. */
function extraireSoldes(tb: unknown[][]): Solde[] {
  const entete = indexLigne(tb, 'soldes des comptes');
  const debut = entete === -1 ? -1 : tb.findIndex((l, i) => i > entete && S(l[0]).toLowerCase() === 'compte');
  if (debut === -1) return [];
  const soldes: Solde[] = [];
  for (let i = debut + 1; i < tb.length; i++) {
    const compte = S(tb[i][0]);
    if (!compte || compte.toUpperCase().startsWith('TOTAL')) break;
    soldes.push({ compte, solde: S(tb[i][1]) });
  }
  return soldes;
}

function extraireTransactions(tx: unknown[][]): Transaction[] {
  const lignes = tx
    .filter((l) => S(l[COL_TX.DATE - 1]) !== '' || S(l[COL_TX.LIBELLE - 1]) !== '')
    .map((l) => ({
      date: S(l[COL_TX.DATE - 1]),
      type: S(l[COL_TX.TYPE - 1]),
      compte: S(l[COL_TX.COMPTE - 1]),
      dest: S(l[COL_TX.DEST - 1]),
      categorie: S(l[COL_TX.CATEGORIE - 1]),
      libelle: S(l[COL_TX.LIBELLE - 1]),
      montant: S(l[COL_TX.MONTANT - 1]),
    }));
  return lignes.slice(-NB_TX_RECENTES).reverse();
}

function extraireEcheances(ec: unknown[][]): Echeance[] {
  const auj = aujourdhuiISO();
  return ec
    .filter((l) => S(l[0]) !== '')
    .map((l): Echeance => {
      const dateISO = versISO(S(l[1]));
      return {
        libelle: S(l[0]),
        date: S(l[1]),
        dateISO,
        recurrence: S(l[2]) || 'Aucune',
        note: S(l[3]),
        joursRestants: dateISO ? joursJusqua(dateISO) : null,
      };
    })
    .filter((e) => e.dateISO === null || e.dateISO >= auj) // à venir (ou sans date)
    .sort((a, b) => (a.dateISO ?? '9999').localeCompare(b.dateISO ?? '9999'));
}

/**
 * Listes déroulantes de la saisie, lues dans l'onglet Paramètres :
 *   A = Comptes · D = Types · F = Catégories de dépenses · I = Catégories de revenus.
 */
function extraireParametres(par: unknown[][]): ParametresSaisie {
  const colonne = (i: number) =>
    par.map((l) => S(l[i])).filter((v) => v !== '');
  return {
    comptes: colonne(0), // A
    types: colonne(3), // D
    categoriesDepense: colonne(5), // F
    categoriesRevenu: colonne(8), // I
  };
}

/**
 * Chargement léger pour l'accueil : soldes des comptes + listes de la saisie,
 * en un seul aller-retour (pas tout le dashboard). `soldesHorsEpargne` exclut
 * le(s) compte(s) d'épargne (nom contenant « épargne »).
 */
export type AccueilBudget = {
  soldes: Solde[];
  soldesHorsEpargne: Solde[];
  parametres: ParametresSaisie;
};

/** Listes de la saisie seules (lecture légère, plus résiliente que tout le dashboard). */
export async function chargerParametresSaisie(): Promise<ParametresSaisie> {
  const [par] = await lireBatch(CL, [pl('PARAMETRES', 'A4:I20')]);
  return extraireParametres(par);
}

export async function chargerAccueilBudget(): Promise<AccueilBudget> {
  const [tb, par] = await lireBatch(CL, [
    pl('TABLEAU_BORD', 'A1:D42'),
    pl('PARAMETRES', 'A4:I20'),
  ]);
  const soldes = extraireSoldes(tb);
  const estEpargne = (nom: string) => nom.toLowerCase().includes('épargne') || nom.toLowerCase().includes('epargne');
  return {
    soldes,
    soldesHorsEpargne: soldes.filter((s) => !estEpargne(s.compte)),
    parametres: extraireParametres(par),
  };
}

/** Année/mois sélectionnés dans le moteur (B3/B4, cellules au format masqué). */
async function lireSelection(): Promise<SelectionMois> {
  const brut = await lireBrut(CL, pl('TABLEAU_BORD', 'B3:B4'));
  const annee = Number(brut[0]?.[0]) || new Date().getFullYear();
  const mois = Number(brut[1]?.[0]) || new Date().getMonth() + 1;
  return { annee, mois: Math.min(Math.max(mois, 1), 12) };
}

/** Années proposées au sélecteur : de 2025 à l'an prochain, sélection incluse. */
function anneesDisponibles(selection: number): number[] {
  const fin = Math.max(new Date().getFullYear() + 1, selection);
  const debut = Math.min(2025, selection);
  const liste: number[] = [];
  for (let a = debut; a <= fin; a++) liste.push(a);
  return liste;
}

export async function chargerBudget(): Promise<DonneesBudget> {
  // Deux lectures : le gros du dashboard en FORMATTED (affichage fidèle au Sheet),
  // et la sélection moteur en UNFORMATTED (B3/B4 sont au format masqué).
  const [[tb, tx, ec, vue, par], selection] = await Promise.all([
    lireBatch(CL, [
      pl('TABLEAU_BORD', 'A1:D42'),
      pl('TRANSACTIONS', 'A2:H'),
      pl('ECHEANCES', 'A2:D'),
      pl('VUE_ENSEMBLE', 'B2:B3'),
      pl('PARAMETRES', 'A4:I20'),
    ]),
    lireSelection(),
  ]);

  // Période affichée : sous-titre de la vitrine (« Juillet 2026 · foyer … »), en B3.
  const sousTitre = S(vue[1]?.[0]) || S(vue[0]?.[0]);
  const periode = sousTitre.split('·')[0].trim() || `${MOIS_FR[selection.mois - 1]} ${selection.annee}`;

  return {
    periode,
    selection,
    anneesDisponibles: anneesDisponibles(selection.annee),
    kpis: extraireKpis(tb),
    categories: extraireCategories(tb),
    soldes: extraireSoldes(tb),
    transactions: extraireTransactions(tx),
    echeances: extraireEcheances(ec),
    parametres: extraireParametres(par),
  };
}

/**
 * Change le mois affiché en écrivant les cellules moteur B3 (année) / B4 (mois) —
 * ce qui déclenche le recalcul des formules du tableur. Réplique aussi ce que
 * ferait le déclencheur onEdit `majSousTitre_` (qui ne s'exécute PAS sur écriture
 * API) : met à jour le sous-titre de la vitrine, en préservant le suffixe.
 *
 * ⚠ Le mois sélectionné est un état PARTAGÉ du classeur : le changer depuis l'app
 * le change pour tout le monde (comme le ferait le sélecteur natif du Sheet).
 */
export async function changerMois(annee: number, mois: number): Promise<SelectionMois> {
  if (!Number.isInteger(mois) || mois < 1 || mois > 12) {
    throw new ErreurValidation('Mois invalide (attendu 1–12).');
  }
  if (!Number.isInteger(annee) || annee < 2000 || annee > 2100) {
    throw new ErreurValidation('Année invalide.');
  }

  // Cellules moteur (nombres) → recalcul automatique des formules dépendantes.
  await ecrirePlage(CL, pl('TABLEAU_BORD', 'B3:B4'), [[annee], [mois]]);

  // Sous-titre de la vitrine : « Mois Année » + suffixe existant (« · foyer … »).
  const [cur] = await lireBatch(CL, [pl('VUE_ENSEMBLE', 'B3')]);
  const actuel = S(cur[0]?.[0]);
  const i = actuel.indexOf('·');
  const suffixe = i === -1 ? '' : ` ${actuel.slice(i)}`;
  await ecrirePlage(CL, pl('VUE_ENSEMBLE', 'B3'), [[`${MOIS_FR[mois - 1]} ${annee}${suffixe}`]]);

  return { annee, mois };
}

/** Prochaine ligne libre de Transactions, repérée par la colonne Type (toujours remplie). */
async function prochaineLigneTx(): Promise<number> {
  const [col] = await lireBatch(CL, [pl('TRANSACTIONS', 'B2:B')]);
  let derniere = 1; // en-tête = ligne 1
  col.forEach((l, i) => {
    if (S(l[0]) !== '') derniere = 2 + i;
  });
  return derniere + 1;
}

/**
 * Ajoute une transaction, en répliquant la logique du formulaire Google
 * (06_Formulaire.gs) : pour un virement interne, la catégorie est vidée et la
 * destination conservée ; sinon l'inverse. Écrit à la ligne libre calculée
 * (pas d'`append`, cf. règle d'architecture) : Date · Type · Compte · Dest ·
 * Catégorie · Libellé · Montant · Source. Renvoie le n° de ligne écrit.
 */
export async function ajouterTransaction(input: NouvelleTransaction): Promise<number> {
  const type = S(input.type);
  if (!type) throw new ErreurValidation('Le type est requis.');
  if (!Number.isFinite(input.montant) || input.montant <= 0) {
    throw new ErreurValidation('Le montant doit être un nombre positif.');
  }
  const compte = S(input.compte);
  if (!compte) throw new ErreurValidation('Le compte est requis.');

  let dest = S(input.dest);
  let categorie = S(input.categorie);
  if (type === TYPE_VIREMENT) {
    categorie = '';
    if (!dest) throw new ErreurValidation('Un virement interne exige un compte de destination.');
  } else {
    dest = '';
  }

  const dateLabel = S(input.dateLabel) || aujourdhuiLabel();
  const ligne = await prochaineLigneTx();
  await ecrirePlage(CL, pl('TRANSACTIONS', `A${ligne}:H${ligne}`), [[
    dateLabel,
    type,
    compte,
    dest,
    categorie,
    S(input.libelle),
    input.montant,
    SOURCE_APP,
  ]]);
  return ligne;
}
