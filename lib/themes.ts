/**
 * REGISTRE DES THÈMES — refonte « Corail » + 5 gammes (25→29/07/2026).
 * ====================================================================
 * Système : une teinte principale par GAMME (famille de couleur), déclinée en
 * CLAIR et SOMBRE. Les composants ne référencent jamais une couleur en dur,
 * seulement un rôle via `var(--ink)`, `var(--acc)`, etc. — changer de thème ne
 * recolore donc rien à la main.
 *
 * Corail (défaut) est réglé à la main (look validé). Les 5 autres gammes
 * (Améthyste, Lagon, Menthe, Ambre, Indigo) sont GÉNÉRÉES à partir de leur
 * accent par `themeClair()` / `themeSombre()`, reproduisant les rapports de
 * Corail — couleurs exactes reprises de la maquette `maquettes/direction4-couleurs.html`.
 *
 * Rôles : historiques (INK, PAGE, LINK_TX…) + refonte `ACC` / `ACC_DEEP` /
 * `ON_ACC` (marque + texte dessus) et `GLOW` / `GLOW2` (halos doux). Typo :
 * titres Fraunces, corps Quicksand (next/font, variables --police-titre/-corps).
 */

export const ROLES = [
  'INK', 'INK2', 'MUTED', 'GHOST',
  'PAGE', 'CELL',
  'HEAD', 'BLOCK', 'SOFT', 'PARAM',
  'LINK_BG', 'LINK_TX',
  'LINE', 'LINE2', 'CARD_BD', 'FIELD_BG',
  'OVER', 'OVER_TX', 'OVER_BG',
  'OK_TX', 'OK_BG',
  'ACC', 'ACC_DEEP', 'ON_ACC', 'GLOW', 'GLOW2',
] as const;

export type Role = (typeof ROLES)[number];
export type IdTheme = keyof typeof THEMES;

type Theme = { NOM: string } & Record<Role, string>;

/* --------------------------- Utilitaires couleur --------------------------- */

type Rgb = [number, number, number];

function versRgb(hex: string): Rgb {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
}

function versHex(rgb: Rgb): string {
  const c = (n: number) => Math.round(Math.max(0, Math.min(255, n))).toString(16).padStart(2, '0');
  return `#${c(rgb[0])}${c(rgb[1])}${c(rgb[2])}`;
}

/** Mélange sRGB (comme `color-mix in srgb`) : `poids` = part de `a` (0..1). */
function melange(a: string, b: string, poids: number): string {
  const A = versRgb(a);
  const B = versRgb(b);
  return versHex([0, 1, 2].map((i) => A[i] * poids + B[i] * (1 - poids)) as Rgb);
}

/** Halo semi-transparent depuis une couleur pleine. */
function halo(a: string, alpha: number): string {
  const [r, g, b] = versRgb(a);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

/* ----------------------------- Fabriques thème ----------------------------- */

/**
 * Thème CLAIR généré depuis l'accent, l'accent profond et la teinte de page.
 *
 * ⚠ EXPORTÉE BIEN QU'INUTILISÉE AUJOURD'HUI : c'est le point d'extension du
 * système. Le catalogue est réduit à une gamme, pas le mécanisme — et
 * supprimer la fabrique obligerait à la réécrire le jour où une seconde gamme
 * arrivera.
 */
export function themeClair(nom: string, acc: string, deep: string, page: string): Theme {
  const W = '#FFFFFF';
  // Page très subtile (mêmes rapports que Corail) : à peine teintée d'accent
  // par-dessus la teinte de la maquette. Les cartes blanches ressortent grâce à
  // l'ombre douce + les bordures, pas à un fond saturé.
  const pageProf = melange(acc, page, 0.05);
  return {
    NOM: nom,
    INK: melange(deep, '#241F27', 0.12), INK2: melange(deep, '#585460', 0.30),
    MUTED: melange(acc, '#8C8792', 0.22), GHOST: melange(acc, W, 0.34),
    PAGE: pageProf, CELL: W,
    HEAD: melange(acc, W, 0.16), BLOCK: melange(acc, W, 0.10),
    SOFT: melange(acc, W, 0.12), PARAM: melange(acc, W, 0.11),
    LINK_BG: melange(acc, W, 0.13), LINK_TX: deep,
    LINE: melange(acc, W, 0.17), LINE2: melange(acc, W, 0.27),
    CARD_BD: W, FIELD_BG: W,
    OVER: '#FF7A66', OVER_TX: '#C7362F', OVER_BG: '#FBE4E0',
    OK_TX: '#2FA36A', OK_BG: '#E5F3EA',
    ACC: acc, ACC_DEEP: deep, ON_ACC: W,
    GLOW: halo(acc, 0.30), GLOW2: halo(acc, 0.18),
  };
}

/** Thème SOMBRE généré depuis l'accent. Même rôle d'extension que `themeClair`. */
export function themeSombre(nom: string, acc: string, deep: string): Theme {
  const accClair = melange(acc, '#FFFFFF', 0.80); // accent éclairci pour fond sombre
  return {
    NOM: nom,
    INK: melange(acc, '#F6EEF2', 0.06), INK2: melange(acc, '#B7ADBA', 0.24),
    MUTED: melange(acc, '#8A8290', 0.20), GHOST: melange(acc, '#4A4450', 0.22),
    PAGE: melange(acc, '#100D12', 0.06), CELL: melange(acc, '#1B171E', 0.10),
    HEAD: melange(acc, '#1E1622', 0.24), BLOCK: melange(acc, '#17131A', 0.10),
    SOFT: melange(acc, '#1C1720', 0.14), PARAM: melange(acc, '#1C1720', 0.14),
    LINK_BG: melange(acc, '#1C1720', 0.18), LINK_TX: accClair,
    LINE: melange(acc, '#2A2430', 0.18), LINE2: melange(acc, '#332C39', 0.26),
    CARD_BD: melange(acc, '#2A2430', 0.18), FIELD_BG: melange(acc, '#17131A', 0.10),
    OVER: '#FF7A66', OVER_TX: '#FF8A78', OVER_BG: '#3A211D',
    OK_TX: '#6FD69E', OK_BG: '#1E3327',
    ACC: accClair, ACC_DEEP: acc, ON_ACC: melange(deep, '#120910', 0.30),
    GLOW: halo(accClair, 0.42), GLOW2: halo(accClair, 0.24),
  };
}

/* --------------------------------- Thèmes ---------------------------------- */

/**
 * ⚠ UN SEUL THÈME DEPUIS LE 25/08/2026 — et c'est un alignement, pas un
 * appauvrissement. L'application portait six gammes colorées (Corail,
 * Améthyste, Lagon, Menthe, Ambre, Indigo) héritées d'une direction
 * artistique antérieure au site vitrine. Le site ayant sa charte — chaux le
 * jour, encre la nuit, indigo pour la marque — laisser l'application dans une
 * palette étrangère faisait deux produits d'un seul.
 *
 * ⚠ LES VALEURS SONT CELLES DE `app/vitrine-ds.css`, recopiées rôle par rôle.
 * Quand l'une bouge, les deux doivent bouger : ce sont les mêmes couleurs vues
 * de deux systèmes différents. Le site nomme `--fond`, l'application `PAGE` ;
 * c'est la seule différence.
 *
 * ⚠ LE MÉCANISME RESTE ENTIER. `themeClair()` / `themeSombre()` demeurent
 * exportés : ajouter une gamme reste une ligne. Il n'y en a simplement plus
 * qu'une de proposée.
 */
export const THEMES = {
  /* --- Chaux — thème CLAIR par défaut ---
     La chaux #E7E9E4 est un gris légèrement verdi, volontairement plus froid
     qu'un crème : le crème chaud à accent terracotta est un interdit explicite
     de la charte. */
  chaux: {
    NOM: 'Chaux',
    // Hiérarchie de texte : INK > INK2 > MUTED > GHOST.
    // ⚠ INK2 (#454E5C, ~7:1) est PLUS SOMBRE que MUTED (#5A6472, 4,91:1) —
    // ce n'est pas une inversion. La charte réserve #5A6472 au texte ≥ 16 px et
    // impose #454E5C en dessous : un libellé de 13 px n'a pas droit au gris
    // clair, il n'a pas la marge de contraste pour.
    INK: '#141C26', INK2: '#454E5C', MUTED: '#5A6472', GHOST: '#98A0A9',
    PAGE: '#E7E9E4', CELL: '#F2F3F0',
    HEAD: '#DDE0DA', BLOCK: '#EDEEEA', SOFT: '#F2F3F0', PARAM: '#DDE0DA',
    LINK_BG: '#E4E3F7', LINK_TX: '#4338CA',
    LINE: '#CDD1CB', LINE2: '#BCC1BA', CARD_BD: '#DDE0DA', FIELD_BG: '#F2F3F0',
    OVER: '#B03A34', OVER_TX: '#B03A34', OVER_BG: '#F2E2E0',
    /*
     * ⚠ ÉCART VOLONTAIRE AVEC LE SITE : #2A6B4F au lieu de son `--positif`
     * #2F7A59. Mesuré, le vert du site tombe à **4,24:1** sur la chaux — sous
     * le seuil AA de 4,5 que la charte s'impose pourtant elle-même. Assombri
     * jusqu'à 5,18:1, teinte inchangée.
     *
     * ⚠ LE SITE A LE MÊME DÉFAUT et il n'est pas corrigé : `--positif` sur
     * `--fond` y est aussi à 4,24:1. À reprendre dans `app/vitrine-ds.css`.
     */
    OK_TX: '#2A6B4F', OK_BG: '#E0EDE6',
    ACC: '#4338CA', ACC_DEEP: '#3730A3', ON_ACC: '#F2F3F0',
    // ⚠ HALOS ÉTEINTS EN JOUR, valeur nulle et non « presque nulle ».
    // La charte est explicite : « en jour, --halo vaut none — un halo sur fond
    // clair n'a aucun sens ». Les rôles restent définis pour que le CSS des
    // composants n'ait pas à savoir quel thème est actif.
    GLOW: 'rgba(67,56,202,0)', GLOW2: 'rgba(67,56,202,0)',
  },

  /* --- Encre — thème SOMBRE ---
     L'encre #141C26 est un bleu-ardoise, PAS un noir : le noir absolu à accent
     fluo est l'autre interdit explicite de la charte. */
  encre: {
    NOM: 'Encre',
    // En nuit, la charte fond --texte-doux et --texte-petit sur la même valeur
    // (#A8B2BE, déjà à 7,99:1) : la distinction n'a plus lieu d'être.
    INK: '#F2F3F0', INK2: '#A8B2BE', MUTED: '#8391A0', GHOST: '#55636F',
    PAGE: '#141C26', CELL: '#1E2A38',
    HEAD: '#24313F', BLOCK: '#1A2432', SOFT: '#24313F', PARAM: '#24313F',
    LINK_BG: '#232145', LINK_TX: '#8B85F5',
    LINE: '#2E3B49', LINE2: '#3B4857', CARD_BD: '#2E3B49', FIELD_BG: '#1A2432',
    OVER: '#E8756E', OVER_TX: '#E8756E', OVER_BG: '#3A2320',
    OK_TX: '#6FBF97', OK_BG: '#1C3329',
    ACC: '#8B85F5', ACC_DEEP: '#6D66E8', ON_ACC: '#141C26',
    // ⚠ Le seul halo que la charte tolère, et seulement en nuit.
    GLOW: 'rgba(139,133,245,.34)', GLOW2: 'rgba(139,133,245,.18)',
  },
} satisfies Record<string, Theme>;

/** Ordre d'itération pour générer le CSS (toutes les variantes). */
export const THEME_ORDRE = Object.keys(THEMES) as IdTheme[];

export const THEME_DEFAUT: IdTheme = 'chaux';

/** Thèmes sombres — sert à basculer `color-scheme` et le mode clair/sombre. */
export const THEMES_SOMBRES: IdTheme[] = THEME_ORDRE.filter(
  (k) => k === 'encre' || k.endsWith('-nuit'),
);

/**
 * FAMILLES DE COULEUR — chaque famille a une variante CLAIRE et une SOMBRE.
 * Le sélecteur d'apparence choisit la *couleur* (la famille) ; la bascule ☀/🌙
 * choisit le *mode* (clair/sombre). Le thème appliqué = couleur × mode.
 */
/**
 * ⚠ UNE SEULE FAMILLE, ET ELLE DOIT LE RESTER AU MINIMUM. Tous les replis du
 * système pointent sur `FAMILLES[0]` : une liste vide, ou une famille privée
 * de sa variante sombre, casserait la bascule jour/nuit sans message d'erreur.
 *
 * Le sélecteur d'apparence n'affiche donc plus qu'une pastille. Le mécanisme
 * est intact — ajouter une gamme, c'est ajouter une ligne ici et deux entrées
 * dans `THEMES`.
 *
 * ⚠ Pas d'emoji : la charte du site les interdit, et l'application la rejoint.
 */
export const FAMILLES = [
  { id: 'nestync', nom: 'Nestync', emoji: '', clair: 'chaux', sombre: 'encre' },
] as const satisfies readonly {
  id: string;
  nom: string;
  emoji: string;
  clair: IdTheme;
  sombre: IdTheme;
}[];

export type IdFamille = (typeof FAMILLES)[number]['id'];

/** La famille de couleur dont fait partie un thème (clair OU sombre). */
export function familleDeTheme(id: IdTheme) {
  return FAMILLES.find((f) => f.clair === id || f.sombre === id) ?? FAMILLES[0];
}

/** Le thème d'une famille, dans le mode voulu. */
export function themeDeFamille(famille: IdFamille, sombre: boolean): IdTheme {
  const f = FAMILLES.find((x) => x.id === famille) ?? FAMILLES[0];
  return sombre ? f.sombre : f.clair;
}

/** Vrai si le thème est une variante sombre. */
export function estSombre(id: IdTheme): boolean {
  return THEMES_SOMBRES.includes(id);
}

/** `INK` -> `--ink`, `LINK_TX` -> `--link-tx`, `ACC_DEEP` -> `--acc-deep`. */
export function nomVariable(role: string): string {
  return '--' + role.toLowerCase().replace(/_/g, '-');
}

/**
 * Produit le CSS de TOUS les thèmes, en blocs `[data-theme="..."]`.
 * Généré depuis le registre : impossible qu'un thème oublie un rôle.
 */
export function cssDesThemes(): string {
  return THEME_ORDRE.map((id) => {
    const theme = THEMES[id];
    const vars = ROLES.map((r) => `  ${nomVariable(r)}: ${theme[r]};`).join('\n');
    const scheme = THEMES_SOMBRES.includes(id) ? 'dark' : 'light';
    return `[data-theme="${id}"] {\n${vars}\n  color-scheme: ${scheme};\n}`;
  }).join('\n\n');
}
