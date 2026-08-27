/**
 * MODULE TO-DO — TYPES & HELPERS PURS (partagés client + serveur).
 * ===============================================================
 * Version base (multi-foyer) : tâches et courses viennent de Postgres
 * (cf. lib/db/schema.ts), scopées au foyer. L'identifiant est un `id` (UUID).
 * Aucun import serveur ici (fichier importé par le composant client).
 */

// Valeurs métier de référence (listes fixes du module).
export const STATUT_FAIT = 'Fait';
export const STATUTS_DEFAUT = ['À faire', 'En cours', 'Fait'];
export const PRIORITES_DEFAUT = ['Haute', 'Moyenne', 'Basse'];
export const RECURRENCES_DEFAUT = ['Aucune', 'Hebdomadaire', 'Mensuelle', 'Annuelle'];

/** Récurrences qui engendrent une occurrence suivante (comparaison en minuscules). */
export const RECURRENCES_ACTIVES = ['hebdomadaire', 'mensuelle', 'annuelle'];

export type Tache = {
  id: string;
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
  id: string;
  fait: boolean;
  article: string;
  quantite: string; // texte libre : « 400 g », « 2 »… (vide = non chiffré)
  rayon: string;
};

/** Sépare une quantité texte « 400 g » en { n, unite }. n=null si non chiffré. */
export function decouperQuantite(q: string): { n: number | null; unite: string } {
  const s = (q ?? '').trim();
  const m = s.match(/^(\d+(?:[.,]\d+)?)\s*(.*)$/);
  if (!m) return { n: null, unite: s };
  const n = parseFloat(m[1].replace(',', '.'));
  return { n: Number.isFinite(n) ? n : null, unite: m[2].trim() };
}

/**
 * Somme deux quantités texte : si les deux sont chiffrées et de même unité, on
 * additionne (« 400 g » + « 200 g » → « 600 g ») ; sinon on les liste. Sert au
 * regroupement d'un même article ajouté plusieurs fois (pas de ligne en double).
 */
export function sommeQuantites(a: string, b: string): string {
  const A = (a ?? '').trim();
  const B = (b ?? '').trim();
  if (!A) return B;
  if (!B) return A;
  const da = decouperQuantite(A);
  const db = decouperQuantite(B);
  if (da.n != null && db.n != null && da.unite.toLowerCase() === db.unite.toLowerCase()) {
    const n = Math.round((da.n + db.n) * 100) / 100;
    return `${String(n).replace('.', ',')}${da.unite ? ' ' + da.unite : ''}`;
  }
  return `${A} + ${B}`;
}

/**
 * RAYONS DE COURSES — liste FIXE, identique pour tous les foyers.
 *
 * ⚠ Elle était auparavant DÉRIVÉE des articles déjà saisis, en saisie libre.
 * Deux conséquences : un foyer qui démarre n'avait aucun rayon proposé, et une
 * faute de frappe (« Epicerie » sans accent) créait un rayon de plus — qui
 * apparaissait ensuite comme suggestion, donc se propageait. La liste se
 * nourrissait de ses propres erreurs, et deux membres du même foyer rangeaient
 * le même produit à deux endroits.
 *
 * ⚠ « Autre » EST UNE VRAIE CATÉGORIE, pas une invitation à écrire. C'est ce qui
 * permet de fermer la liste sans bloquer personne : ce qui n'entre nulle part a
 * une place nommée, au lieu de créer un rayon d'un seul article.
 *
 * L'ordre est celui d'un magasin, pas l'alphabet : c'est lui qui rend la liste
 * utile une fois sur place.
 */
export const RAYONS = [
  'Fruits & légumes',
  'Boucherie',
  'Poissonnerie',
  'Crèmerie',
  'Frais',
  'Surgelés',
  'Épicerie',
  'Boulangerie',
  'Boissons',
  'Hygiène',
  'Entretien',
  'Bébé',
  'Animaux',
  'Autre',
] as const;

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

/** Accepte « jj/mm/aaaa » ou « aaaa-mm-jj » → ISO « aaaa-mm-jj » (ou null). */
export function versISO(texte: string): string | null {
  const t = texte.trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
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
 * `prochaineDate_` (Apps Script). Renvoie le label jj/mm/aaaa à stocker.
 * Historiquement nécessaire car l'onEdit des Sheets ne s'exécutait pas sur les
 * écritures API ; on conserve la logique en base, appliquée par le service.
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

/** Construit une Tâche (échéance ISO + retard) depuis une ligne de base. */
export function construireTache(
  r: {
    id: string;
    statut: string;
    tache: string;
    assigne: string;
    categorie: string;
    priorite: string;
    echeance: string;
    recurrence: string;
    note: string;
  },
  todayISO: string,
): Tache {
  const echeanceLabel = (r.echeance ?? '').trim();
  const echeance = versISO(echeanceLabel);
  return {
    id: r.id,
    statut: r.statut,
    tache: r.tache,
    assigne: r.assigne,
    categorie: r.categorie,
    priorite: r.priorite,
    echeance,
    echeanceLabel,
    recurrence: r.recurrence || 'Aucune',
    note: r.note,
    enRetard: !!echeance && r.statut !== STATUT_FAIT && echeance < todayISO,
  };
}

/** Ordre de tri d'une priorité (Haute d'abord). Inconnu = au milieu. */
export function rangPriorite(priorite: string): number {
  const i = ['haute', 'moyenne', 'basse'].indexOf(priorite.toLowerCase());
  return i === -1 ? 1.5 : i;
}
