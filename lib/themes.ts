/**
 * REGISTRE DES 9 THÈMES — transposition fidèle de la Phase G des Apps Script.
 * ==========================================================================
 * Valeurs hex reprises de `Contexte/Budget/00_Constantes.gs` (le Budget porte le
 * socle le plus complet), avec UNE divergence assumée côté app : le fond `PAGE`
 * des thèmes CLAIRS est plus franchement teinté que dans les Sheets, pour que les
 * coloris se distinguent nettement à l'écran (les tableurs restent, eux, très
 * clairs). Le reste des rôles (accents, cartes, statuts) suit la charte. Ne pas
 * « améliorer » les autres couleurs sans raison : elles cadrent avec les classeurs.
 *
 * Les rôles (INK, HEAD, PAGE…) sont volontairement identiques d'un thème à
 * l'autre : seules les valeurs changent. Un composant ne référence donc
 * JAMAIS une couleur, seulement un rôle — via `var(--ink)`, `var(--head)`, etc.
 */

export const ROLES = [
  'INK', 'INK2', 'MUTED', 'GHOST',
  'PAGE', 'CELL',
  'HEAD', 'BLOCK', 'SOFT', 'PARAM',
  'LINK_BG', 'LINK_TX',
  'LINE', 'LINE2', 'CARD_BD', 'FIELD_BG',
  'OVER', 'OVER_TX', 'OVER_BG',
  'OK_TX', 'OK_BG',
] as const;

export type Role = (typeof ROLES)[number];
export type IdTheme = keyof typeof THEMES;

type Theme = { NOM: string } & Record<Role, string>;

export const THEMES = {
  rose: {
    NOM: '🌸 Rose / Bleu',
    INK: '#3f3b36', INK2: '#6b655c', MUTED: '#8f887e', GHOST: '#cfc8bd',
    PAGE: '#fbe9f0', CELL: '#ffffff',
    HEAD: '#edc6d3', BLOCK: '#cbe8d5', SOFT: '#f7ecc4', PARAM: '#f9edc8',
    LINK_BG: '#eef1f6', LINK_TX: '#2e4a7a',
    LINE: '#e7ded3', LINE2: '#d9cdbf', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#e07d97', OVER_TX: '#a5384f', OVER_BG: '#f7c9d5',
    OK_TX: '#3f8b5f', OK_BG: '#dcefe3',
  },
  ocean: {
    NOM: '🌊 Bleu / Océan',
    INK: '#223a44', INK2: '#4a6470', MUTED: '#647d8a', GHOST: '#b6ccd4',
    PAGE: '#e3f0f6', CELL: '#ffffff',
    HEAD: '#bfe0e6', BLOCK: '#cdeae1', SOFT: '#d9edf3', PARAM: '#dcefef',
    LINK_BG: '#e6f1f6', LINK_TX: '#1f6f8b',
    LINE: '#d7e7eb', LINE2: '#c4d9de', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#d9748a', OVER_TX: '#9c3a4c', OVER_BG: '#f1cdd4',
    OK_TX: '#2f8f7d', OK_BG: '#d2ece3',
  },
  sauge: {
    NOM: '🌿 Vert / Sauge',
    INK: '#37413a', INK2: '#5b675b', MUTED: '#757e73', GHOST: '#c6cec2',
    PAGE: '#e9f3df', CELL: '#ffffff',
    HEAD: '#cfe0c2', BLOCK: '#dbead0', SOFT: '#eef0d6', PARAM: '#ecefda',
    LINK_BG: '#edf2ea', LINK_TX: '#4c6f3a',
    LINE: '#e2e6d5', LINE2: '#d2d8c3', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#cf7d84', OVER_TX: '#9c4340', OVER_BG: '#efd0c8',
    OK_TX: '#4a8f52', OK_BG: '#dcecc9',
  },
  terracotta: {
    NOM: '🍂 Terracotta / Ambre',
    INK: '#43352c', INK2: '#6b574a', MUTED: '#9a8574', GHOST: '#d8c6b6',
    PAGE: '#fbe6d2', CELL: '#ffffff',
    HEAD: '#f0c9a8', BLOCK: '#f3d9b0', SOFT: '#f6e3bf', PARAM: '#f7e6c4',
    LINK_BG: '#f6ece0', LINK_TX: '#a65a3a',
    LINE: '#ecdcc9', LINE2: '#ddc9b2', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#d06a6a', OVER_TX: '#9c3a34', OVER_BG: '#f2c7bd',
    OK_TX: '#5f8f4f', OK_BG: '#e2ebc8',
  },
  lila: {
    NOM: '🪻 Lila / Rose',
    INK: '#3b3340', INK2: '#64596b', MUTED: '#7d7086', GHOST: '#cfc6d6',
    PAGE: '#efe4f8', CELL: '#ffffff',
    HEAD: '#e0c6ea', BLOCK: '#ddd0ee', SOFT: '#efe1f2', PARAM: '#ece0f2',
    LINK_BG: '#efe9f6', LINK_TX: '#6a4a8a',
    LINE: '#e6dcec', LINE2: '#d6c9de', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#d06a90', OVER_TX: '#9c3a5c', OVER_BG: '#f4cdd8',
    OK_TX: '#5f8f6f', OK_BG: '#dcecdf',
  },
  rouge: {
    NOM: '🌹 Rouge / Grenade',
    INK: '#43302f', INK2: '#6e514e', MUTED: '#946f6b', GHOST: '#dcc4c0',
    PAGE: '#fbe2e0', CELL: '#ffffff',
    HEAD: '#f0b4bf', BLOCK: '#f6cdd4', SOFT: '#f7d5db', PARAM: '#f7d9de',
    LINK_BG: '#f6e6e2', LINK_TX: '#a5384f',
    LINE: '#eccfc9', LINE2: '#ddbcb4', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#cf5560', OVER_TX: '#9c2f3c', OVER_BG: '#f4c4cc',
    OK_TX: '#5f8f4f', OK_BG: '#e2ecc8',
  },
  marron: {
    NOM: '🤎 Marron / Beige',
    INK: '#3f342a', INK2: '#6b5a48', MUTED: '#8c7860', GHOST: '#d8cab4',
    PAGE: '#f0e4cd', CELL: '#ffffff',
    HEAD: '#ddc4a0', BLOCK: '#e6d6bc', SOFT: '#ece0c6', PARAM: '#ede2c8',
    LINK_BG: '#efe8dc', LINK_TX: '#7a5a3a',
    LINE: '#e6dcc9', LINE2: '#d6c6ac', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#c07a6a', OVER_TX: '#9c4a3a', OVER_BG: '#eccdc0',
    OK_TX: '#6f8a4a', OK_BG: '#e4e8c6',
  },
  gris: {
    NOM: '🩶 Nuance de gris',
    INK: '#2f3236', INK2: '#565b60', MUTED: '#7a7f84', GHOST: '#c4c8cc',
    PAGE: '#e6e9ee', CELL: '#ffffff',
    HEAD: '#d3d7db', BLOCK: '#dde0e3', SOFT: '#e4e6e8', PARAM: '#e6e8ea',
    LINK_BG: '#e8eaec', LINK_TX: '#4a5560',
    LINE: '#e2e4e6', LINE2: '#d0d3d6', CARD_BD: '#ffffff', FIELD_BG: '#ffffff',
    OVER: '#b57f86', OVER_TX: '#8c4a52', OVER_BG: '#e4d6d7',
    OK_TX: '#5f766a', OK_BG: '#dce4de',
  },
  nuit: {
    NOM: '🌙 Sombre / Nuit',
    INK: '#e8e6e1', INK2: '#b9c2cc', MUTED: '#8b95a1', GHOST: '#5a6472',
    PAGE: '#1f2430', CELL: '#232a33',
    HEAD: '#3a4560', BLOCK: '#2b3a44', SOFT: '#34303a', PARAM: '#2f3542',
    LINK_BG: '#26303f', LINK_TX: '#8fc4ea',
    LINE: '#3a3f4a', LINE2: '#454b58', CARD_BD: '#3a3f4a', FIELD_BG: '#2a3038',
    OVER: '#e07d97', OVER_TX: '#ff9db0', OVER_BG: '#4a2b34',
    OK_TX: '#7fd3a0', OK_BG: '#24402f',
  },
} satisfies Record<string, Theme>;

/** Ordre d'affichage dans le sélecteur (miroir du menu 🎨 Thème des Sheets). */
export const THEME_ORDRE: IdTheme[] = [
  'rose', 'ocean', 'sauge', 'terracotta', 'lila', 'rouge', 'marron', 'gris', 'nuit',
];

export const THEME_DEFAUT: IdTheme = 'rose';

/** Seul thème sombre du registre — sert à basculer `color-scheme`. */
export const THEMES_SOMBRES: IdTheme[] = ['nuit'];

/** `INK` -> `--ink`, `LINK_TX` -> `--link-tx`. Accepte aussi les rôles de module. */
export function nomVariable(role: string): string {
  return '--' + role.toLowerCase().replace(/_/g, '-');
}

/**
 * Produit le CSS de TOUS les thèmes, en blocs `[data-theme="..."]`.
 * Généré depuis le registre plutôt qu'écrit à la main : impossible qu'un thème
 * oublie un rôle, et ajouter un coloris ne demande de toucher qu'à ce fichier.
 */
export function cssDesThemes(): string {
  return THEME_ORDRE.map((id) => {
    const theme = THEMES[id];
    const vars = ROLES.map((r) => `  ${nomVariable(r)}: ${theme[r]};`).join('\n');
    const scheme = THEMES_SOMBRES.includes(id) ? 'dark' : 'light';
    return `[data-theme="${id}"] {\n${vars}\n  color-scheme: ${scheme};\n}`;
  }).join('\n\n');
}
