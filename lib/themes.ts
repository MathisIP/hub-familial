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

/** Thème CLAIR généré depuis l'accent, l'accent profond et la teinte de page. */
function themeClair(nom: string, acc: string, deep: string, page: string): Theme {
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

/** Thème SOMBRE généré depuis l'accent clair de la gamme. */
function themeSombre(nom: string, acc: string, deep: string): Theme {
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

export const THEMES = {
  /* --- 🪸 Corail — thème clair PAR DÉFAUT (réglé à la main) --- */
  corail: {
    NOM: '🪸 Corail',
    INK: '#39292C', INK2: '#7B6067', MUTED: '#B9979C', GHOST: '#E4C8C5',
    PAGE: '#FFF5F3', CELL: '#FFFFFF',
    HEAD: '#FFE7E4', BLOCK: '#FFF0EE', SOFT: '#FFEDEB', PARAM: '#FDECEA',
    LINK_BG: '#FFECEC', LINK_TX: '#E23A5C',
    LINE: '#FBE2E0', LINE2: '#F6D2CF', CARD_BD: '#FFFFFF', FIELD_BG: '#FFFFFF',
    OVER: '#FF7A66', OVER_TX: '#C7362F', OVER_BG: '#FBE4E0',
    OK_TX: '#2FA36A', OK_BG: '#E5F3EA',
    ACC: '#FF5C7A', ACC_DEEP: '#E23A5C', ON_ACC: '#FFFFFF',
    GLOW: 'rgba(255,92,122,.30)', GLOW2: 'rgba(255,92,122,.18)',
  },
  /* --- 🌙 Corail nuit (réglé à la main) --- */
  nuit: {
    NOM: '🪸 Corail',
    INK: '#F7EBE9', INK2: '#CFB0AD', MUTED: '#987C79', GHOST: '#5A4744',
    PAGE: '#171012', CELL: '#241719',
    HEAD: '#33191D', BLOCK: '#1E1416', SOFT: '#2A1B1D', PARAM: '#2A1B1D',
    LINK_BG: '#2E1A1D', LINK_TX: '#FF7A90',
    LINE: '#3A2528', LINE2: '#48302F', CARD_BD: '#3A2528', FIELD_BG: '#1E1416',
    OVER: '#FF7A66', OVER_TX: '#FF8A78', OVER_BG: '#3A211D',
    OK_TX: '#6FD69E', OK_BG: '#1E3327',
    ACC: '#FF7A90', ACC_DEEP: '#FF5C7A', ON_ACC: '#2A1013',
    GLOW: 'rgba(255,122,144,.42)', GLOW2: 'rgba(255,122,144,.24)',
  },

  /* --- 🔮 Améthyste (violet) --- */
  amethyste: themeClair('🔮 Améthyste', '#B840E0', '#9A1FD0', '#FAF4FE'),
  'amethyste-nuit': themeSombre('🔮 Améthyste', '#B840E0', '#9A1FD0'),

  /* --- 🐬 Lagon (cyan / bleu) --- */
  lagon: themeClair('🐬 Lagon', '#12B0D6', '#0C8CAE', '#F0FAFD'),
  'lagon-nuit': themeSombre('🐬 Lagon', '#12B0D6', '#0C8CAE'),

  /* --- 🌿 Menthe (vert frais) --- */
  menthe: themeClair('🌿 Menthe', '#14C08F', '#0E9670', '#F0FCF7'),
  'menthe-nuit': themeSombre('🌿 Menthe', '#14C08F', '#0E9670'),

  /* --- 🍯 Ambre (orange chaud) --- */
  ambre: themeClair('🍯 Ambre', '#EE9327', '#C56E17', '#FEF7EE'),
  'ambre-nuit': themeSombre('🍯 Ambre', '#EE9327', '#C56E17'),

  /* --- 🌌 Indigo (bleu-violet) --- */
  indigo: themeClair('🌌 Indigo', '#5566FF', '#3A47E0', '#F3F4FE'),
  'indigo-nuit': themeSombre('🌌 Indigo', '#5566FF', '#3A47E0'),
} satisfies Record<string, Theme>;

/** Ordre d'itération pour générer le CSS (toutes les variantes). */
export const THEME_ORDRE = Object.keys(THEMES) as IdTheme[];

export const THEME_DEFAUT: IdTheme = 'corail';

/** Thèmes sombres — sert à basculer `color-scheme` et le mode clair/sombre. */
export const THEMES_SOMBRES: IdTheme[] = THEME_ORDRE.filter(
  (k) => k === 'nuit' || k.endsWith('-nuit'),
);

/**
 * FAMILLES DE COULEUR — chaque famille a une variante CLAIRE et une SOMBRE.
 * Le sélecteur d'apparence choisit la *couleur* (la famille) ; la bascule ☀/🌙
 * choisit le *mode* (clair/sombre). Le thème appliqué = couleur × mode.
 */
export const FAMILLES = [
  { id: 'corail', nom: 'Corail', emoji: '🪸', clair: 'corail', sombre: 'nuit' },
  { id: 'amethyste', nom: 'Améthyste', emoji: '🔮', clair: 'amethyste', sombre: 'amethyste-nuit' },
  { id: 'lagon', nom: 'Lagon', emoji: '🐬', clair: 'lagon', sombre: 'lagon-nuit' },
  { id: 'menthe', nom: 'Menthe', emoji: '🌿', clair: 'menthe', sombre: 'menthe-nuit' },
  { id: 'ambre', nom: 'Ambre', emoji: '🍯', clair: 'ambre', sombre: 'ambre-nuit' },
  { id: 'indigo', nom: 'Indigo', emoji: '🌌', clair: 'indigo', sombre: 'indigo-nuit' },
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
