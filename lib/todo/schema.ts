/**
 * MODULE TO-DO — TYPES & HELPERS PURS (partagés client + serveur).
 * ===============================================================
 * Version base (multi-foyer) : tâches et courses viennent de Postgres
 * (cf. lib/db/schema.ts), scopées au foyer. L'identifiant est un `id` (UUID).
 * Aucun import serveur ici (fichier importé par le composant client).
 */

/*
 * ⚠ `formatQuantite` est IMPORTÉ du module Repas, pas recopié. Les deux modules
 * manipulent les mêmes quantités — une recette verse ses ingrédients dans la
 * liste de courses — et deux façons d'écrire « 1/2 » finiraient par diverger.
 * Le fichier visé est pur et n'importe rien : aucun cycle possible.
 */
import { formatQuantite, JOURS } from '@/lib/repas/schema';

// Valeurs métier de référence (listes fixes du module).
export const STATUT_FAIT = 'Fait';
export const STATUTS_DEFAUT = ['À faire', 'En cours', 'Fait'];
export const PRIORITES_DEFAUT = ['Haute', 'Moyenne', 'Basse'];
export const RECURRENCES_DEFAUT = ['Aucune', 'Hebdomadaire', 'Mensuelle', 'Annuelle'];

/** Récurrences qui engendrent une occurrence suivante (comparaison en minuscules). */
export const RECURRENCES_ACTIVES = ['hebdomadaire', 'mensuelle', 'annuelle'];

/** Jours du mois proposés au choix (texte, « 1 » à « 31 »). */
export const JOURS_MOIS = Array.from({ length: 31 }, (_, i) => String(i + 1));

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
  // Jour fixé de la récurrence (nom du jour ou numéro du mois selon `recurrence`,
  // vide si non fixé — voir `prochaineOccurrenceLabel`).
  recurrenceJour: string;
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

  /*
   * ⚠ LES FRACTIONS D'ABORD, ET DANS CET ORDRE. Les recettes acceptent « 1/2 »
   * depuis le 27/08/2026, et ces quantités arrivent telles quelles dans la liste
   * de courses. L'expression décimale seule y lisait « 1 » suivi de l'unité
   * « /2 » : deux demi-citrons donnaient « 2 /2 », une quantité qui ne veut rien
   * dire et qu'aucun message n'aurait signalée.
   *
   * « 1 1/2 » se teste avant « 1/2 », sans quoi le nombre entier serait pris
   * pour la quantité entière et « 1/2 » deviendrait une unité.
   */
  const mixte = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (mixte) {
    const d = Number(mixte[3]);
    if (d !== 0) {
      return { n: Number(mixte[1]) + Number(mixte[2]) / d, unite: mixte[4].trim() };
    }
  }
  const fraction = s.match(/^(\d+)\s*\/\s*(\d+)\s*(.*)$/);
  if (fraction) {
    const d = Number(fraction[2]);
    if (d !== 0) return { n: Number(fraction[1]) / d, unite: fraction[3].trim() };
  }

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
    // ⚠ Remise en forme par `formatQuantite` : une somme de fractions doit se
    // relire comme une fraction. « 1/4 » + « 1/4 » vaut « 1/2 », pas « 0,5 ».
    return `${formatQuantite(da.n + db.n)}${da.unite ? ' ' + da.unite : ''}`;
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

/** Formate un objet Date local en label jj/mm/aaaa. */
function versLabel(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const jj = String(d.getDate()).padStart(2, '0');
  return `${jj}/${mm}/${d.getFullYear()}`;
}

/**
 * Prochaine occurrence d'une tâche récurrente. Renvoie le label jj/mm/aaaa à
 * stocker.
 *
 * ⚠ `recurrenceJour` PRIME sur un simple décalage de date quand il est fixé
 * (02/09/2026) : une tâche « tous les lundis » doit retomber sur un lundi
 * même si l'échéance initiale a été saisie un autre jour, ou si une occurrence
 * a été traitée en retard — sans quoi +7 jours depuis une date décalée dérive
 * peu à peu du jour voulu. Sans `recurrenceJour` (tâches créées avant cette
 * fonctionnalité), on garde l'ancien calcul par simple décalage.
 */
export function prochaineOccurrenceLabel(
  baseISO: string | null,
  recurrence: string,
  recurrenceJour = '',
): string {
  const iso = baseISO ?? aujourdhuiISO();
  const [a, m, j] = iso.split('-').map(Number);
  const d = new Date(a, m - 1, j);
  const rec = recurrence.trim().toLowerCase();
  const jourFixe = recurrenceJour.trim();

  if (rec === 'hebdomadaire' && jourFixe) {
    const cible = (JOURS as readonly string[]).indexOf(jourFixe);
    if (cible !== -1) {
      // Lundi = 0 … Dimanche = 6, aligné sur JOURS (comme lib/repas).
      const actuel = (d.getDay() + 6) % 7;
      let ecart = cible - actuel;
      if (ecart <= 0) ecart += 7; // toujours la PROCHAINE occurrence, jamais le jour même.
      d.setDate(d.getDate() + ecart);
      return versLabel(d);
    }
  }

  if (rec === 'mensuelle' && jourFixe) {
    const numero = Number(jourFixe);
    if (Number.isInteger(numero) && numero >= 1 && numero <= 31) {
      // Mois suivant, jour choisi — `setDate(1)` d'abord pour ne pas déborder
      // sur le mois d'après (même piège que `decalerMois`, lib/agenda/schema).
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      // Le jour choisi peut dépasser la longueur du mois (31 en février) : on
      // se cale sur le dernier jour du mois plutôt que de déborder sur le
      // mois suivant, où la date perdrait tout rapport avec le jour demandé.
      const dernierJour = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
      d.setDate(Math.min(numero, dernierJour));
      return versLabel(d);
    }
  }

  switch (rec) {
    case 'hebdomadaire': d.setDate(d.getDate() + 7); break;
    case 'mensuelle': d.setMonth(d.getMonth() + 1); break;
    case 'annuelle': d.setFullYear(d.getFullYear() + 1); break;
  }
  return versLabel(d);
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
    recurrenceJour: string;
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
    recurrenceJour: r.recurrenceJour ?? '',
    note: r.note,
    enRetard: !!echeance && r.statut !== STATUT_FAIT && echeance < todayISO,
  };
}

/** Ordre de tri d'une priorité (Haute d'abord). Inconnu = au milieu. */
export function rangPriorite(priorite: string): number {
  const i = ['haute', 'moyenne', 'basse'].indexOf(priorite.toLowerCase());
  return i === -1 ? 1.5 : i;
}
