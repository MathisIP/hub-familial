/**
 * CALENDRIER ÉDITORIAL — TYPES & HELPERS PURS (partagés client + serveur).
 * =========================================================================
 * Le contenu des posts est dans posts.ts (constante figée). Ici : uniquement
 * ce qui décrit l'état de suivi, modifiable en base par le foyer.
 */

export const STATUTS_EDITORIAL = ['À faire', 'En cours', 'Prêt', 'Publié'] as const;
export type StatutEditorial = (typeof STATUTS_EDITORIAL)[number];

/** Format d'une publication. */
export type FormatPost = 'Reel' | 'Carrousel';

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
  cta: string;
  hashtags: string;
  note: string; // « À surveiller », vide si aucune
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
