/**
 * CALENDRIER ÉDITORIAL — TYPES & HELPERS PURS (partagés client + serveur).
 * =========================================================================
 * Le contenu des posts est dans posts.ts (constante figée). Ici : uniquement
 * ce qui décrit l'état de suivi, modifiable en base par le foyer.
 */

export const STATUTS_EDITORIAL = ['À faire', 'En cours', 'Prêt', 'Publié'] as const;
export type StatutEditorial = (typeof STATUTS_EDITORIAL)[number];

/**
 * Format d'une publication.
 *
 * ⚠ QUATRE FORMATS DEPUIS LE 08/09/2026, plus deux. Le plan S2-S4 distingue le
 * MÉDIUM (typographie, dessin, film) et pas seulement le contenant : un
 * carrousel typographique et un carrousel dessiné n'ont ni le même coût de
 * production ni le même effet. Les deux anciennes valeurs restent acceptées
 * pour les posts de la semaine 1, écrits avant cette distinction.
 */
export const FORMATS_POST = {
  ct: 'Carrousel texte',
  cd: 'Carrousel dessins',
  rt: 'Reel texte',
  rf: 'Reel filmé',
  Reel: 'Reel',
  Carrousel: 'Carrousel',
} as const;
export type FormatPost = keyof typeof FORMATS_POST;

/** Famille d'un format, pour les filtres et la pastille de couleur. */
export function familleFormat(f: FormatPost): 'reel' | 'carrousel' {
  return f === 'rt' || f === 'rf' || f === 'Reel' ? 'reel' : 'carrousel';
}

/** Contenu fixe d'un post (posts.ts). */
export type ContenuPost = {
  numero: number;
  semaine: string;
  date: string; // jj/mm/aaaa
  jour: string; // « Lun », « Mer »…
  jourNumero: string;
  mois: string;
  format: FormatPost;
  pilier: string;
  hook: string;
  visuel: string; // déroulé/script, texte multi-lignes
  legende: string;
  cta: string; // l'appel à l'action, tel qu'il est écrit dans la légende
  /** Type d'action visée (« Partage DM », « Commentaire »…) — sert au repérage. */
  ctaType: string;
  hashtags: string;
  /** Ce qu'il y a à produire (tournage, illustrations, montage). Vide si rien. */
  production: string;
  /** Pourquoi cette publication est là, à cette place. Vide si évident. */
  pourquoi: string;
  note: string; // « À surveiller », vide si aucune
  /**
   * Publication dont le contenu est arrêté et ne doit pas être retouché
   * (scénario déjà tourné, engagement pris). Affichée en lecture seule.
   */
  verrouille: boolean;
};

/** État de suivi d'un post, tenu par le foyer (editorial_posts). */
export type EtatPost = {
  numero: number;
  statut: StatutEditorial;
  visuelUrl: string;
  vues: number | null;
  interactions: number | null;
  enregistrements: number | null;
  partages: number | null;
};

/** Poste complet = contenu fixe + état de suivi (défauts si jamais touché). */
export type Post = ContenuPost & EtatPost;

/** État par défaut d'un post jamais modifié (aucune ligne en base). */
export function etatParDefaut(numero: number): EtatPost {
  return {
    numero,
    statut: 'À faire',
    visuelUrl: '',
    vues: null,
    interactions: null,
    enregistrements: null,
    partages: null,
  };
}
