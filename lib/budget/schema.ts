/**
 * MODULE BUDGET — SCHÉMA & HELPERS PURS (partagés serveur ↔ client).
 * ==================================================================
 * Le Budget est un tableau de bord **calculé par le tableur**. L'app N'RE­CALCULE
 * rien : elle lit les valeurs déjà agrégées de l'onglet « Tableau de bord »
 * (moteur) — principe « Sheets = source de vérité ». On repère les valeurs par
 * leur LIBELLÉ (scan de la colonne A), pas par un n° de ligne figé, pour rester
 * robuste si la disposition bouge.
 *
 * Onglet Transactions — en-têtes ligne 1, données ligne 2+ :
 *   A Date · B Type · C Compte · D Compte destination · E Catégorie
 *   F Libellé · G Montant · H Note
 * Onglet Échéances — en-têtes ligne 1, données ligne 2+ :
 *   A Échéance · B Date · C Récurrence · D Note
 */

export const COL_TX = {
  DATE: 1, TYPE: 2, COMPTE: 3, DEST: 4, CATEGORIE: 5, LIBELLE: 6, MONTANT: 7, NOTE: 8,
} as const;

export const TYPE_DEPENSE = 'Dépense';
export const TYPE_REVENU = 'Revenu';
export const TYPE_VIREMENT = 'Virement interne';

/** Étiquette de source écrite en colonne H (comme « Formulaire » côté Sheets). */
export const SOURCE_APP = 'App';

/** Noms de mois EXACTS du moteur (Budget/00_Constantes.gs) — l'ordre = le n° de mois. */
export const MOIS_FR = [
  'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre',
] as const;

/** Mois sélectionné dans le moteur (mois : 1–12). */
export type SelectionMois = { annee: number; mois: number };

/** Listes déroulantes de la saisie, lues dans l'onglet Paramètres. */
export type ParametresSaisie = {
  comptes: string[];
  types: string[];
  categoriesDepense: string[];
  categoriesRevenu: string[];
};

/** Entrée d'une nouvelle transaction (avant écriture). */
export type NouvelleTransaction = {
  type: string;
  montant: number;
  compte: string;
  dest?: string;
  categorie?: string;
  libelle?: string;
  dateLabel?: string; // jj/mm/aaaa ; vide = aujourd'hui
};

export type Kpis = {
  revenus: string; // chaînes formatées telles que le tableur les calcule
  depenses: string;
  reste: string;
  patrimoine: string;
};

export type LigneCategorie = {
  categorie: string;
  reel: string; // affichage
  budget: string;
  ecart: string;
  reelNum: number; // pour les jauges
  budgetNum: number;
  depasse: boolean; // réel > budget
};

export type Solde = { compte: string; solde: string };

export type Transaction = {
  date: string;
  type: string;
  compte: string;
  dest: string;
  categorie: string;
  libelle: string;
  montant: string; // formaté (tableur)
};

export type Echeance = {
  libelle: string;
  date: string;
  dateISO: string | null;
  recurrence: string;
  note: string;
  joursRestants: number | null; // null si pas de date
};

export type DonneesBudget = {
  periode: string; // ex. « Juillet 2026 »
  selection: SelectionMois; // mois/année pilotant le moteur
  anneesDisponibles: number[]; // pour le sélecteur de mois
  kpis: Kpis;
  categories: LigneCategorie[];
  soldes: Solde[];
  transactions: Transaction[]; // récentes, plus récente d'abord
  echeances: Echeance[]; // à venir, plus proche d'abord
  parametres: ParametresSaisie; // listes déroulantes de la saisie
};

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/**
 * Parse un montant affiché à la française (« 5 691,86 € », « -166 € ») en nombre.
 * Enlève tout sauf chiffres/signe/séparateurs ; gère « . » milliers + « , » décimale.
 */
export function parseEuro(v: unknown): number {
  if (typeof v === 'number') return v;
  let x = S(v).replace(/[^\d,.\-]/g, '');
  if (x.includes(',') && x.includes('.')) x = x.replace(/\./g, '').replace(',', '.');
  else if (x.includes(',')) x = x.replace(',', '.');
  const n = parseFloat(x);
  return Number.isNaN(n) ? 0 : n;
}

const FMT_EURO = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export function formatEuro(n: number): string {
  return FMT_EURO.format(n);
}

/** jj/mm/aaaa ou aaaa-mm-jj → ISO (aaaa-mm-jj), sinon null. */
export function versISO(texte: string): string | null {
  const t = texte.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

export function aujourdhuiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Date du jour au format jj/mm/aaaa (pour écrire dans la colonne Date). */
export function aujourdhuiLabel(): string {
  const d = new Date();
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

/** Nombre de jours entiers entre aujourd'hui et une date ISO (négatif = passé). */
export function joursJusqua(iso: string): number {
  const [a, m, j] = iso.split('-').map(Number);
  const cible = new Date(a, m - 1, j).getTime();
  const now = new Date();
  const auj = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((cible - auj) / 86400000);
}
