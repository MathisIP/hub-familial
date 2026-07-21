/**
 * MODULE TO-DO — SCHÉMA & HELPERS PURS.
 * =====================================
 * Disposition RÉELLE des onglets (relevée le 21/07/2026), calquée sur les
 * Apps Script — voir `Contexte/ToDo/`. Aucun accès réseau ici : ce fichier est
 * partagé serveur ↔ client (affichage), donc pas de `server-only`.
 *
 * Onglet Tâches — en-têtes ligne 1, données ligne 2+ :
 *   A Statut · B Tâche · C Assigné à · D Catégorie · E Priorité
 *   F Échéance (jj/mm/aaaa) · G Récurrence · H Note
 * Onglet Courses — en-têtes ligne 1, données ligne 2+ :
 *   A Fait (case) · B Article · C Rayon
 * Onglet Paramètres — en-têtes ligne 4, listes ligne 5+ :
 *   A Statuts · B Personnes · C Priorités · D Récurrences · E Catégories · F Rayons
 */

// Colonnes 1-indexées (comme l'API Sheets et les Apps Script).
export const COL_TACHE = {
  STATUT: 1, TACHE: 2, ASSIGNE: 3, CATEGORIE: 4,
  PRIORITE: 5, ECHEANCE: 6, RECURRENCE: 7, NOTE: 8,
} as const;

export const COL_COURSE = { FAIT: 1, ARTICLE: 2, RAYON: 3 } as const;

export const LIGNE_DONNEES_TACHES = 2;
export const LIGNE_DONNEES_COURSES = 2;
export const LIGNE_DONNEES_PARAMS = 5; // les 4 premières lignes sont des titres

// Valeurs métier de référence (repli si l'onglet Paramètres est illisible).
export const STATUT_FAIT = 'Fait';
export const STATUTS_DEFAUT = ['À faire', 'En cours', 'Fait'];
export const PRIORITES_DEFAUT = ['Haute', 'Moyenne', 'Basse'];
export const RECURRENCES_DEFAUT = ['Aucune', 'Hebdomadaire', 'Mensuelle', 'Annuelle'];

/** Récurrences qui engendrent une occurrence suivante (comparaison en minuscules). */
export const RECURRENCES_ACTIVES = ['hebdomadaire', 'mensuelle', 'annuelle'];

export type Tache = {
  ligne: number; // n° de ligne réel dans le Sheet — sert d'adresse aux écritures
  statut: string;
  tache: string;
  assigne: string;
  categorie: string;
  priorite: string;
  echeance: string | null; // ISO aaaa-mm-jj, ou null
  echeanceLabel: string; // tel qu'affiché (jj/mm/aaaa)
  recurrence: string;
  note: string;
  enRetard: boolean;
};

export type Course = {
  ligne: number;
  fait: boolean;
  article: string;
  rayon: string;
};

export type Parametres = {
  statuts: string[];
  personnes: string[];
  priorites: string[];
  recurrences: string[];
  categories: string[];
  rayons: string[];
};

export type DonneesTodo = {
  taches: Tache[];
  courses: Course[];
  parametres: Parametres;
};

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Vrai si la cellule d'une case à cocher vaut coché. */
export function estCoche(v: unknown): boolean {
  return v === true || v === 'TRUE' || v === 'VRAI';
}

/** Accepte « jj/mm/aaaa » ou « aaaa-mm-jj » → ISO « aaaa-mm-jj » (ou null). */
export function versISO(texte: string): string | null {
  const t = texte.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

/** ISO « aaaa-mm-jj » → « jj/mm/aaaa » pour l'écriture dans le Sheet. */
export function versLabelFR(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : iso;
}

/** Date du jour au format ISO, en heure locale. */
export function aujourdhuiISO(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${jj}`;
}

/**
 * Prochaine occurrence d'une tâche récurrente — réplique fidèle de
 * `prochaineDate_` (Apps Script). Renvoie le label jj/mm/aaaa à écrire.
 * ⚠ Nécessaire côté app car le déclencheur onEdit des Sheets NE se déclenche
 * PAS sur les écritures API : sans ceci, cocher « Fait » une tâche récurrente
 * depuis l'app ne régénérerait jamais la suivante.
 */
export function prochaineOccurrenceLabel(baseISO: string | null, recurrence: string): string {
  const iso = baseISO ?? aujourdhuiISO();
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  switch (recurrence.trim().toLowerCase()) {
    case 'hebdomadaire': d.setDate(d.getDate() + 7); break;
    case 'mensuelle': d.setMonth(d.getMonth() + 1); break;
    case 'annuelle': d.setFullYear(d.getFullYear() + 1); break;
  }
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${jj}/${mm}/${d.getFullYear()}`;
}

/** Construit une Tâche depuis une ligne brute + son n° de ligne. */
export function ligneVersTache(brute: unknown[], ligne: number, todayISO: string): Tache {
  const echeanceLabel = S(brute[COL_TACHE.ECHEANCE - 1]);
  const echeance = versISO(echeanceLabel);
  const statut = S(brute[COL_TACHE.STATUT - 1]);
  return {
    ligne,
    statut,
    tache: S(brute[COL_TACHE.TACHE - 1]),
    assigne: S(brute[COL_TACHE.ASSIGNE - 1]),
    categorie: S(brute[COL_TACHE.CATEGORIE - 1]),
    priorite: S(brute[COL_TACHE.PRIORITE - 1]),
    echeance,
    echeanceLabel,
    recurrence: S(brute[COL_TACHE.RECURRENCE - 1]) || 'Aucune',
    note: S(brute[COL_TACHE.NOTE - 1]),
    enRetard: !!echeance && statut !== STATUT_FAIT && echeance < todayISO,
  };
}

/** Construit une Course depuis une ligne brute + son n° de ligne. */
export function ligneVersCourse(brute: unknown[], ligne: number): Course {
  return {
    ligne,
    fait: estCoche(brute[COL_COURSE.FAIT - 1]),
    article: S(brute[COL_COURSE.ARTICLE - 1]),
    rayon: S(brute[COL_COURSE.RAYON - 1]),
  };
}

/** Ordre de tri d'une priorité (Haute d'abord). Inconnu = au milieu. */
export function rangPriorite(priorite: string): number {
  const i = ['haute', 'moyenne', 'basse'].indexOf(priorite.toLowerCase());
  return i === -1 ? 1.5 : i;
}
