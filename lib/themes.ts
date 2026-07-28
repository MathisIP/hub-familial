/**
 * REGISTRE DES THÈMES — refonte « Corail » (25/07/2026).
 * ======================================================
 * Nouveau système : une teinte principale **Corail**, déclinée en CLAIR (défaut)
 * et SOMBRE. Les composants ne référencent jamais une couleur en dur, seulement un
 * rôle via `var(--ink)`, `var(--acc)`, etc. — changer de thème ne recolore donc
 * rien à la main.
 *
 * En plus des rôles historiques (INK, PAGE, LINK_TX…), la refonte ajoute
 * `ACC` / `ACC_DEEP` / `ON_ACC` (couleur de marque corail + texte dessus) et
 * `GLOW` / `GLOW2` (halos néon doux). Typo : titres Fraunces, corps Quicksand
 * (chargées via next/font dans le layout ; variables --police-titre/-corps).
 *
 * Les 5 autres gammes validées en maquette (Améthyste, Lagon, Menthe, Ambre,
 * Indigo) seront ajoutées ici comme thèmes supplémentaires — il suffira d'ajouter
 * une entrée avec les mêmes rôles. Pour l'instant : Corail clair + Corail sombre.
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

export const THEMES = {
  /* --- 🪸 Corail — thème clair PAR DÉFAUT --- */
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
  /* --- 🌙 Sombre — Corail nuit --- */
  nuit: {
    NOM: '🌙 Sombre',
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
} satisfies Record<string, Theme>;

/** Ordre d'affichage dans le sélecteur (clair d'abord, sombre ensuite). */
export const THEME_ORDRE: IdTheme[] = ['corail', 'nuit'];

export const THEME_DEFAUT: IdTheme = 'corail';

/** Thèmes sombres — sert à basculer `color-scheme`. */
export const THEMES_SOMBRES: IdTheme[] = ['nuit'];

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
