/**
 * BUDGET FAMILIAL — CONSTANTES PARTAGÉES & THÈMES DE COULEURS (source de vérité)
 * =============================================================================
 * Ce fichier regroupe TOUTES les constantes utilisées par plusieurs modules :
 * la charte de couleurs (désormais MULTI-THÈMES), les libellés de mois et les
 * formats monétaires.
 *
 * POURQUOI CE FICHIER ?
 * Apps Script ne connaît qu'UN SEUL espace de noms global pour tout le projet.
 * En centralisant ici, chaque constante n'est déclarée qu'UNE seule fois.
 * RÈGLE : ne redéclarer AUCUNE de ces variables ailleurs dans le projet.
 *
 * PHASE H (2026-07-17) — ce fichier porte aussi le registre `LANGUES` (I18N) :
 * mêmes principes que THEMES ci-dessous, voir le bloc dédié plus bas.
 *
 * ------------------------------------------------------------------------------
 * PHASE G (2026-07-17) — SÉLECTEUR DE THÈME
 * ------------------------------------------------------------------------------
 * La palette n'est plus figée : elle est choisie parmi le registre `THEMES`
 * ci-dessous via le menu « 🌸 Budget ▸ 🎨 Thème ». Le choix est mémorisé dans
 * les propriétés du document (clé THEME_PROP) et RELU à chaque exécution du
 * script : toutes les fonctions de design lisent les MÊMES variables globales
 * (PAGE, INK, HEAD, WASH, PIE, TABCOL…), qui sont simplement (ré)affectées par
 * `chargerPalette_()` selon le thème actif.
 *
 *   · Chaque thème définit EXACTEMENT les mêmes rôles (mêmes clés) — seules les
 *     valeurs hex changent. On ne touche jamais à la structure ni au code métier.
 *   · `appliquerTheme(id)` mémorise le choix, recharge la palette, puis recolore
 *     tout le classeur SANS reconstruire la 🌸 Vue d'ensemble (donut et formules
 *     FILTER préservés — voir appliquerThemeBudget_ dans 04_Design.gs).
 *   · Rôle CELL : fond de base des cellules (blanc pour les thèmes clairs =
 *     comportement inchangé ; foncé pour le thème 🌙 Nuit). Peint sur toute la
 *     grille par base_() → le thème sombre reste lisible (texte clair sur fond
 *     foncé au lieu de texte clair sur blanc).
 */

/* ============================================================================
 *  REGISTRE DES THÈMES
 *  Ajouter un thème = ajouter une entrée ici avec les MÊMES clés. Rien d'autre.
 * ============================================================================ */
var THEMES = {

  /* --- 🌸 Rose / Bleu — thème PAR DÉFAUT (valeurs historiques, inchangées) --- */
  rose: {
    NOM: "🌸 Rose / Bleu",
    INK: "#3f3b36", INK2: "#6b655c", MUTED: "#8f887e", GHOST: "#cfc8bd",
    PAGE: "#f7f3ed", CELL: "#ffffff",
    HEAD: "#edc6d3", BLOCK: "#cbe8d5", SOFT: "#f7ecc4", PARAM: "#f9edc8",
    LINK_BG: "#eef1f6", LINK_TX: "#2e4a7a",
    LINE: "#e7ded3", LINE2: "#d9cdbf", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#cbe8d5", "#f6cfd9", "#f3e0a2", "#dccdf0"],
    ACCT_FILL: ["#d7e7f6", "#d3eddd", "#fbdcce", "#e7d8f4"],
    ACCT_TOP:  ["#7fb0e0", "#6cc39a", "#ef9d76", "#a689d6"],
    PIE: ["#8fb8e0", "#ef9d76", "#6cc6b8", "#b6d284", "#b096d8", "#e8bd5a",
          "#8fbde6", "#c9bfab", "#df85a0", "#edaabf", "#b6ad9c"],
    OVER: "#e07d97", OVER_TX: "#a5384f", OVER_BG: "#f7c9d5",
    OK_TX: "#3f8b5f", OK_BG: "#dcefe3",
    HEAT_LO: "#fbf0e6", HEAT_HI: "#ec9569", AMBER_BG: "#f7e3b0",
    TABCOL: {
      VUE_ENSEMBLE: "#e6a3b3", TABLEAU_BORD: "#a6d5b6",
      VUE_ANNUELLE: "#c9b6e4", EPARGNE: "#f0cf8b", TRANSACTIONS: "#a7c5e6",
      IMPORT_CSV: "#dcd6ca", PARAMETRES: "#d7d0c6", ECHEANCES: "#f3b89d",
      LISEZMOI: "#d7d0c6"
    }
  },

  /* --- 🌊 Bleu / Océan — camaïeu de bleus et verts d'eau, frais et apaisant --- */
  ocean: {
    NOM: "🌊 Bleu / Océan",
    INK: "#223a44", INK2: "#4a6470", MUTED: "#647d8a", GHOST: "#b6ccd4",
    PAGE: "#eef4f7", CELL: "#ffffff",
    HEAD: "#bfe0e6", BLOCK: "#cdeae1", SOFT: "#d9edf3", PARAM: "#dcefef",
    LINK_BG: "#e6f1f6", LINK_TX: "#1f6f8b",
    LINE: "#d7e7eb", LINE2: "#c4d9de", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#cdeae1", "#cbe3f2", "#c0e4e2", "#d7e1f1"],
    ACCT_FILL: ["#cfe6f6", "#d0eee5", "#d2e9f3", "#dce4f5"],
    ACCT_TOP:  ["#4f9fd0", "#37b2a4", "#4fa8c4", "#7f9ad6"],
    PIE: ["#4f9fd0", "#38b2a3", "#79c3e0", "#7fc6a6", "#5bbcd6", "#9bcfc0",
          "#6aa9d8", "#3f8fb0", "#86b8e2", "#57c1b3", "#a7c9e6"],
    OVER: "#d9748a", OVER_TX: "#9c3a4c", OVER_BG: "#f1cdd4",
    OK_TX: "#2f8f7d", OK_BG: "#d2ece3",
    HEAT_LO: "#e9f4f4", HEAT_HI: "#3f9fb0", AMBER_BG: "#ffe1a6",
    TABCOL: {
      VUE_ENSEMBLE: "#7fc9d6", TABLEAU_BORD: "#8fd0c0",
      VUE_ANNUELLE: "#a9bfe0", EPARGNE: "#8ecfe0", TRANSACTIONS: "#9cc4e6",
      IMPORT_CSV: "#cdd8da", PARAMETRES: "#c3d2d6", ECHEANCES: "#8fd0c8",
      LISEZMOI: "#c3d2d6"
    }
  },

  /* --- 🌿 Vert / Sauge — verts tendres et beiges naturels, ambiance botanique --- */
  sauge: {
    NOM: "🌿 Vert / Sauge",
    INK: "#37413a", INK2: "#5b675b", MUTED: "#757e73", GHOST: "#c6cec2",
    PAGE: "#f4f6ee", CELL: "#ffffff",
    HEAD: "#cfe0c2", BLOCK: "#dbead0", SOFT: "#eef0d6", PARAM: "#ecefda",
    LINK_BG: "#edf2ea", LINK_TX: "#4c6f3a",
    LINE: "#e2e6d5", LINE2: "#d2d8c3", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#d3e6c8", "#e7ecc9", "#cfe6d6", "#e3ddc6"],
    ACCT_FILL: ["#dcebd0", "#d3e8dd", "#ece2c8", "#dfe6cf"],
    ACCT_TOP:  ["#7faa63", "#6cc39a", "#c2a86a", "#93b06a"],
    PIE: ["#7fae5f", "#5fae86", "#a9c47a", "#8dc9a0", "#c2b06a", "#6fb894",
          "#9bbf6a", "#57a06f", "#bcd08a", "#79c0a2", "#c9c197"],
    OVER: "#cf7d84", OVER_TX: "#9c4340", OVER_BG: "#efd0c8",
    OK_TX: "#4a8f52", OK_BG: "#dcecc9",
    HEAT_LO: "#f1f3e1", HEAT_HI: "#9aab55", AMBER_BG: "#f0e0a0",
    TABCOL: {
      VUE_ENSEMBLE: "#a9cf94", TABLEAU_BORD: "#9cd0b0",
      VUE_ANNUELLE: "#d6c99a", EPARGNE: "#e0d488", TRANSACTIONS: "#b6d69a",
      IMPORT_CSV: "#d4d3c4", PARAMETRES: "#cdd0c2", ECHEANCES: "#c2cf8a",
      LISEZMOI: "#cdd0c2"
    }
  },

  /* --- 🍂 Terracotta / Ambre — corail, ambre, sable ; ambiance chaude et cosy --- */
  terracotta: {
    NOM: "🍂 Terracotta / Ambre",
    INK: "#43352c", INK2: "#6b574a", MUTED: "#9a8574", GHOST: "#d8c6b6",
    PAGE: "#faf1e8", CELL: "#ffffff",
    HEAD: "#f0c9a8", BLOCK: "#f3d9b0", SOFT: "#f6e3bf", PARAM: "#f7e6c4",
    LINK_BG: "#f6ece0", LINK_TX: "#a65a3a",
    LINE: "#ecdcc9", LINE2: "#ddc9b2", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#f3d3b0", "#f6d9c0", "#f1e2b0", "#ecd0bd"],
    ACCT_FILL: ["#f6d8bf", "#f2e0bd", "#f7ddc9", "#eed6c8"],
    ACCT_TOP:  ["#e08a5a", "#d6a94e", "#d97b57", "#c69370"],
    PIE: ["#e0855a", "#d98b4f", "#e8a86a", "#cf9a5f", "#e6b877", "#c9784f",
          "#dba46a", "#b56a45", "#eab98a", "#d0925a", "#c7a582"],
    OVER: "#d06a6a", OVER_TX: "#9c3a34", OVER_BG: "#f2c7bd",
    OK_TX: "#5f8f4f", OK_BG: "#e2ebc8",
    HEAT_LO: "#fbeede", HEAT_HI: "#d9743f", AMBER_BG: "#f5d99a",
    TABCOL: {
      VUE_ENSEMBLE: "#eaa985", TABLEAU_BORD: "#e6c07f",
      VUE_ANNUELLE: "#d99a72", EPARGNE: "#e6c268", TRANSACTIONS: "#eeb98f",
      IMPORT_CSV: "#dccbb6", PARAMETRES: "#d6c6b2", ECHEANCES: "#e0956a",
      LISEZMOI: "#d6c6b2"
    }
  },

  /* --- 🪻 Lila / Rose — lavande et mauve, accents rosés, doux et poudré --- */
  lila: {
    NOM: "🪻 Lila / Rose",
    INK: "#3b3340", INK2: "#64596b", MUTED: "#7d7086", GHOST: "#cfc6d6",
    PAGE: "#f6f2f8", CELL: "#ffffff",
    HEAD: "#e0c6ea", BLOCK: "#ddd0ee", SOFT: "#efe1f2", PARAM: "#ece0f2",
    LINK_BG: "#efe9f6", LINK_TX: "#6a4a8a",
    LINE: "#e6dcec", LINE2: "#d6c9de", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#ddd0ee", "#f4cfe2", "#e9d6f0", "#d8cff0"],
    ACCT_FILL: ["#e2d6f4", "#f0d6e6", "#e0d0ee", "#d9d2f2"],
    ACCT_TOP:  ["#9a7fd0", "#d67faa", "#b07fd0", "#8f8fd6"],
    PIE: ["#a77fd0", "#df85a8", "#8f8fd6", "#c79ae0", "#e0a0c8", "#9b8fd8",
          "#b77fc0", "#d68fb8", "#8a7fd0", "#c9a0e0", "#b6a6d6"],
    OVER: "#d06a90", OVER_TX: "#9c3a5c", OVER_BG: "#f4cdd8",
    OK_TX: "#5f8f6f", OK_BG: "#dcecdf",
    HEAT_LO: "#f4edf6", HEAT_HI: "#b07fc0", AMBER_BG: "#f4dca8",
    TABCOL: {
      VUE_ENSEMBLE: "#d3a6dd", TABLEAU_BORD: "#b6a6e0",
      VUE_ANNUELLE: "#c0a6e0", EPARGNE: "#d6b0d0", TRANSACTIONS: "#b6b6e6",
      IMPORT_CSV: "#d5cdda", PARAMETRES: "#cdc6d4", ECHEANCES: "#e6a6c4",
      LISEZMOI: "#cdc6d4"
    }
  },

  /* --- 🌹 Rouge / Grenade — rouges et framboise adoucis, chaleureux --- */
  rouge: {
    NOM: "🌹 Rouge / Grenade",
    INK: "#43302f", INK2: "#6e514e", MUTED: "#946f6b", GHOST: "#dcc4c0",
    PAGE: "#faf0ee", CELL: "#ffffff",
    HEAD: "#f0b4bf", BLOCK: "#f6cdd4", SOFT: "#f7d5db", PARAM: "#f7d9de",
    LINK_BG: "#f6e6e2", LINK_TX: "#a5384f",
    LINE: "#eccfc9", LINE2: "#ddbcb4", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#f5cdd6", "#f6d0cb", "#f2d8c6", "#f0c9d6"],
    ACCT_FILL: ["#f6d2cd", "#f3dcc4", "#f7d8cc", "#eecfd6"],
    ACCT_TOP:  ["#d65563", "#dc6a5a", "#d05570", "#c85a7a"],
    PIE: ["#d6505f", "#e07060", "#d95f7a", "#c74f57", "#e08a80", "#c23f52",
          "#d86a80", "#b0384a", "#e0909a", "#cf5f70", "#c07a82"],
    OVER: "#cf5560", OVER_TX: "#9c2f3c", OVER_BG: "#f4c4cc",
    OK_TX: "#5f8f4f", OK_BG: "#e2ecc8",
    HEAT_LO: "#fbeee8", HEAT_HI: "#cf3f4a", AMBER_BG: "#f5d99a",
    TABCOL: {
      VUE_ENSEMBLE: "#e79098", TABLEAU_BORD: "#eaa885",
      VUE_ANNUELLE: "#e0967f", EPARGNE: "#e6b878", TRANSACTIONS: "#eeab9f",
      IMPORT_CSV: "#dcc8c2", PARAMETRES: "#d6c2bc", ECHEANCES: "#e07a6a",
      LISEZMOI: "#d6c2bc"
    }
  },

  /* --- 🤎 Marron / Beige — bruns et beiges naturels, cosy et feutré --- */
  marron: {
    NOM: "🤎 Marron / Beige",
    INK: "#3f342a", INK2: "#6b5a48", MUTED: "#8c7860", GHOST: "#d8cab4",
    PAGE: "#f6f0e6", CELL: "#ffffff",
    HEAD: "#ddc4a0", BLOCK: "#e6d6bc", SOFT: "#ece0c6", PARAM: "#ede2c8",
    LINK_BG: "#efe8dc", LINK_TX: "#7a5a3a",
    LINE: "#e6dcc9", LINE2: "#d6c6ac", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#e3d4b8", "#ecdcc0", "#d9c9a8", "#e0cdbc"],
    ACCT_FILL: ["#e6d6bc", "#dfd6c0", "#ecd8c0", "#ddd0c2"],
    ACCT_TOP:  ["#b08d5a", "#a89a6a", "#c08a5a", "#97836b"],
    PIE: ["#b08d5a", "#c0a06a", "#a89a6a", "#cbb07a", "#97826a", "#bfa585",
          "#8f7a5a", "#d0b98a", "#a68f6a", "#c2a06a", "#b0a088"],
    OVER: "#c07a6a", OVER_TX: "#9c4a3a", OVER_BG: "#eccdc0",
    OK_TX: "#6f8a4a", OK_BG: "#e4e8c6",
    HEAT_LO: "#f5eede", HEAT_HI: "#b0894a", AMBER_BG: "#f0d9a0",
    TABCOL: {
      VUE_ENSEMBLE: "#d4b483", TABLEAU_BORD: "#cdba8a",
      VUE_ANNUELLE: "#c2a678", EPARGNE: "#dcc07a", TRANSACTIONS: "#d6c29a",
      IMPORT_CSV: "#d4cbb8", PARAMETRES: "#cdc4b0", ECHEANCES: "#c99a6a",
      LISEZMOI: "#cdc4b0"
    }
  },

  /* --- 🩶 Nuance de gris — camaïeu de gris épuré (signaux très désaturés) --- */
  gris: {
    NOM: "🩶 Nuance de gris",
    INK: "#2f3236", INK2: "#565b60", MUTED: "#7a7f84", GHOST: "#c4c8cc",
    PAGE: "#f2f3f4", CELL: "#ffffff",
    HEAD: "#d3d7db", BLOCK: "#dde0e3", SOFT: "#e4e6e8", PARAM: "#e6e8ea",
    LINK_BG: "#e8eaec", LINK_TX: "#4a5560",
    LINE: "#e2e4e6", LINE2: "#d0d3d6", CARD_BD: "#ffffff", FIELD_BG: "#ffffff",
    WASH: ["#dde1e4", "#e6e3df", "#d6dade", "#e2dfe2"],
    ACCT_FILL: ["#e0e3e6", "#dbe0e0", "#e4e0dc", "#dfe0e4"],
    ACCT_TOP:  ["#8f9aa2", "#9a9a92", "#a09aa0", "#8f959c"],
    PIE: ["#8a939b", "#b0b6bb", "#6f767c", "#c6cacd", "#9aa0a5", "#7f868c",
          "#babfc3", "#61686e", "#a6acb1", "#8f959a", "#cfd2d5"],
    OVER: "#b57f86", OVER_TX: "#8c4a52", OVER_BG: "#e4d6d7",
    OK_TX: "#5f766a", OK_BG: "#dce4de",
    HEAT_LO: "#f4f5f6", HEAT_HI: "#8a9199", AMBER_BG: "#ebe3cc",
    TABCOL: {
      VUE_ENSEMBLE: "#b6bcc2", TABLEAU_BORD: "#aeb4b0",
      VUE_ANNUELLE: "#b2b0bc", EPARGNE: "#c0bca8", TRANSACTIONS: "#aab4be",
      IMPORT_CSV: "#cccdce", PARAMETRES: "#c4c5c6", ECHEANCES: "#c0b2b2",
      LISEZMOI: "#c4c5c6"
    }
  },

  /* --- 🌙 Sombre / Nuit — mode sombre pastel : fonds foncés, accents lumineux ---
   * ⚠ Encres INVERSÉES (texte clair sur fond foncé). CELL foncé + peinture de
   * toute la grille par base_() → les onglets de données restent lisibles.
   * À valider à l'œil (contrastes) — c'est le thème le plus délicat. */
  nuit: {
    NOM: "🌙 Sombre / Nuit",
    INK: "#e8e6e1", INK2: "#b9c2cc", MUTED: "#8b95a1", GHOST: "#5a6472",
    PAGE: "#1f2430", CELL: "#232a33",
    HEAD: "#3a4560", BLOCK: "#2b3a44", SOFT: "#34303a", PARAM: "#2f3542",
    LINK_BG: "#26303f", LINK_TX: "#8fc4ea",
    LINE: "#3a3f4a", LINE2: "#454b58", CARD_BD: "#3a3f4a", FIELD_BG: "#2a3038",
    WASH: ["#2f4a45", "#4a2f3e", "#4a4230", "#3b3350"],
    ACCT_FILL: ["#263c50", "#244035", "#45332a", "#362a48"],
    ACCT_TOP:  ["#5aa0cf", "#4bb89d", "#e0955f", "#a689d6"],
    PIE: ["#6fb2e0", "#f0a074", "#5fc9b8", "#a9d284", "#c0a6e6", "#f0cf7a",
          "#8fc4ea", "#d0c2a6", "#ef92ad", "#f0b0c4", "#c0b6a6"],
    OVER: "#e07d97", OVER_TX: "#ff9db0", OVER_BG: "#4a2b34",
    OK_TX: "#7fd3a0", OK_BG: "#24402f",
    HEAT_LO: "#232a33", HEAT_HI: "#4b7f86", AMBER_BG: "#4a3f22",
    TABCOL: {
      VUE_ENSEMBLE: "#7d5a86", TABLEAU_BORD: "#3f7a63",
      VUE_ANNUELLE: "#5a5a8a", EPARGNE: "#8a7a3f", TRANSACTIONS: "#3f6a9a",
      IMPORT_CSV: "#4a4f58", PARAMETRES: "#4a4f58", ECHEANCES: "#8a5a4a",
      LISEZMOI: "#4a4f58"
    }
  }

};

// Ordre d'affichage dans le menu 🎨 Thème (le 1er est le défaut ; Nuit en dernier).
var THEME_ORDRE = ["rose", "ocean", "sauge", "terracotta", "lila", "rouge", "marron", "gris", "nuit"];

// Clé de la propriété de document où le thème choisi est mémorisé.
var THEME_PROP = "THEME";

/* ============================================================================
 *  VARIABLES DE PALETTE (globales) — (ré)affectées par chargerPalette_()
 *  Toutes les fonctions de design lisent CES variables. Ne pas les initialiser
 *  ici : c'est chargerPalette_() (appelé plus bas) qui leur donne leur valeur
 *  selon le thème actif.
 * ============================================================================ */
var PAGE, CELL, INK, INK2, MUTED, GHOST, LINE, LINE2, HEAD, BLOCK, SOFT, PARAM,
    LINK_BG, LINK_TX, CARD_BD, FIELD_BG, WASH, ACCT_FILL, ACCT_TOP, OVER,
    OVER_TX, OVER_BG, OK_TX, OK_BG, HEAT_LO, HEAT_HI, AMBER_BG, PIE, TABCOL;

// Blanc pur constant (indépendant du thème) — pour les usages « toujours blanc ».
var WHITE = "#ffffff";

/* ------------------------- Formats monétaires ------------------------- */
var EUR  = '#,##0.00" €"';   // deux décimales
var EUR0 = '#,##0" €"';      // sans décimale

/* ------------------------- Libellés de mois ------------------------- */
// Majuscules — utilisés par les sélecteurs de la 🌸 Vue d'ensemble (module Dynamique).
var MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
            "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];

// Minuscules — utilisés dans les e-mails de récap (module Automatisations).
var MOIS_FR = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet",
               "août", "septembre", "octobre", "novembre", "décembre"];

/* ============================================================================
 *  MOTEUR DE THÈME
 * ============================================================================ */

/** Renvoie l'id du thème actif (ex. "rose"), en repli sûr sur "rose".
 *  Enveloppé dans un try/catch : dans le contexte du déclencheur simple onOpen,
 *  PropertiesService peut être indisponible — on ne doit jamais faire échouer le
 *  chargement (le menu se construit sans couleur de toute façon). */
function getThemeId_() {
  try {
    var v = PropertiesService.getDocumentProperties().getProperty(THEME_PROP);
    return (v && THEMES[v]) ? v : "rose";
  } catch (e) {
    return "rose";
  }
}

/** (Ré)affecte toutes les variables de palette globales selon le thème `id`
 *  (ou le thème actif si `id` est absent). Sûr : repli sur "rose". */
function chargerPalette_(id) {
  var T;
  try { T = THEMES[(id && THEMES[id]) ? id : getThemeId_()]; } catch (e) { T = null; }
  if (!T) { T = THEMES["rose"]; }
  PAGE = T.PAGE; CELL = T.CELL; INK = T.INK; INK2 = T.INK2; MUTED = T.MUTED;
  GHOST = T.GHOST; LINE = T.LINE; LINE2 = T.LINE2; HEAD = T.HEAD; BLOCK = T.BLOCK;
  SOFT = T.SOFT; PARAM = T.PARAM; LINK_BG = T.LINK_BG; LINK_TX = T.LINK_TX;
  CARD_BD = T.CARD_BD; FIELD_BG = T.FIELD_BG; WASH = T.WASH; ACCT_FILL = T.ACCT_FILL;
  ACCT_TOP = T.ACCT_TOP; OVER = T.OVER; OVER_TX = T.OVER_TX; OVER_BG = T.OVER_BG;
  OK_TX = T.OK_TX; OK_BG = T.OK_BG; HEAT_LO = T.HEAT_LO; HEAT_HI = T.HEAT_HI;
  AMBER_BG = T.AMBER_BG; PIE = T.PIE; TABCOL = T.TABCOL;
}

// Charge la palette du thème actif dès l'évaluation du script (à chaque exécution).
chargerPalette_();

/**
 * Applique un thème : mémorise le choix, recharge la palette, puis recolore tout
 * le classeur SANS reconstruire la 🌸 Vue d'ensemble (donut + formules FILTER
 * préservés). Instantané et ré-exécutable : on peut changer de thème autant de
 * fois qu'on veut (au fil des saisons, ou par lassitude).
 */
function appliquerTheme(id) {
  var ui = SpreadsheetApp.getUi();
  if (!THEMES[id]) { ui.alert("Thème inconnu : " + id); return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    PropertiesService.getDocumentProperties().setProperty(THEME_PROP, id);
  } catch (e) {
    ui.alert("Impossible d'enregistrer le thème (autorisation ?) : " + e.message);
    return;
  }
  chargerPalette_(id);                 // globales -> nouvelles couleurs, MAINTENANT
  ss.toast("Application du thème " + THEMES[id].NOM + "…", "🎨 Thème", 5);
  try {
    appliquerThemeBudget_();           // recoloration non destructive (04_Design.gs)
  } catch (e) {
    ui.alert("Le thème est enregistré mais la recoloration a rencontré un souci :\n\n" +
             (e && e.message ? e.message : e) +
             "\n\nRelance « 🎨 Thème ▸ " + THEMES[id].NOM + " » ou restaure via l'historique.");
    return;
  }
  ss.toast("Thème " + THEMES[id].NOM + " appliqué ✓", "🎨 Thème", 4);
}

/* --- Enrobages nommés pour le menu (un par thème : le menu appelle par nom) --- */
function themeRose()       { appliquerTheme("rose"); }
function themeOcean()      { appliquerTheme("ocean"); }
function themeSauge()      { appliquerTheme("sauge"); }
function themeTerracotta() { appliquerTheme("terracotta"); }
function themeLila()       { appliquerTheme("lila"); }
function themeRouge()      { appliquerTheme("rouge"); }
function themeMarron()     { appliquerTheme("marron"); }
function themeGris()       { appliquerTheme("gris"); }
function themeNuit()       { appliquerTheme("nuit"); }

/* ============================================================================
 *  PHASE H (2026-07-17) — CADRE DE LOCALISATION (I18N)
 * ============================================================================
 * Même patron que le registre THEMES ci-dessus : un registre `LANGUES`, un
 * choix mémorisé en propriété de document, une fonction qui recharge les
 * globales à chaque exécution.
 *
 *   · `LANGUES[langue].ONGLETS[cle]` — nom RÉEL de l'onglet dans cette langue.
 *     Décision Mathis (2026-07-17) : RENOMMAGE COMPLET des onglets (pas un
 *     simple affichage) → changer de langue renomme réellement les feuilles.
 *   · `LANGUES[langue].UI[cle]` — libellé d'interface (menus, alertes, toasts).
 *   · `nomOnglet_(cle)` — nom de l'onglet CANONIQUE `cle` dans la langue active.
 *   · `t_(cle)` — libellé d'interface `cle` dans la langue active.
 *
 * ⚠️ RÈGLE D'OR (corollaire du §4.1 du cahier) : à partir de maintenant, le
 * code du Budget n'écrit PLUS JAMAIS un nom d'onglet ou un texte d'interface
 * en dur : toujours `nomOnglet_('CLE')` / `t_('CLE')`. C'est ce qui permettra
 * d'ajouter EN puis ES sans retoucher au reste du code — seul ce registre
 * grandit.
 *
 * ÉTAT (2026-07-17) : cadre posé + **fr** = référence complète (valeurs
 * historiques, comportement 100 % inchangé). **en** / **es** = à compléter
 * (prochaine étape du chantier Phase H — cf. cahier §2).
 * ============================================================================ */

var LANGUES = {

  /* --- 🇫🇷 Français — langue PAR DÉFAUT (valeurs historiques, inchangées) --- */
  fr: {
    NOM: "🇫🇷 Français",
    ONGLETS: {
      VUE_ENSEMBLE:  "🌸 Vue d'ensemble",
      TABLEAU_BORD:  "Tableau de bord",
      VUE_ANNUELLE:  "Vue annuelle",
      EPARGNE:       "Épargne",
      TRANSACTIONS:  "Transactions",
      IMPORT_CSV:    "Import CSV",
      PARAMETRES:    "Paramètres",
      ECHEANCES:     "Échéances",
      LISEZMOI:      "Lisez-moi",
      REPONSES_FORM: "Réponses au formulaire 1"
    },
    UI: {
      MENU_TITRE: "🌸 Budget",
      MENU_THEME: "🎨 Thème",
      MENU_LANGUE: "🌍 Langue",
      MENU_CONFIG: "⚙️ Configuration"
    }
  }

  /* en: { NOM: "🇬🇧 English", ONGLETS: {...}, UI: {...} }  ← à compléter (prochaine étape)  */
  /* es: { NOM: "🇪🇸 Español", ONGLETS: {...}, UI: {...} }  ← à compléter (ensuite)          */

};

// Ordre d'affichage dans le menu 🌍 Langue (grandira avec en/es).
var LANGUE_ORDRE = ["fr"];

// Clé de la propriété de document où la langue choisie est mémorisée.
var LANGUE_PROP = "LANGUE";

/** Renvoie l'id de la langue active (ex. "fr"), en repli sûr sur "fr". */
function getLangue_() {
  try {
    var v = PropertiesService.getDocumentProperties().getProperty(LANGUE_PROP);
    return (v && LANGUES[v]) ? v : "fr";
  } catch (e) {
    return "fr";
  }
}

/** Nom RÉEL (actuel) de l'onglet canonique `cle` dans la langue active.
 *  Repli sûr sur le français si la langue active ou la clé est incomplète. */
function nomOnglet_(cle) {
  var L = LANGUES[getLangue_()];
  if (L && L.ONGLETS && L.ONGLETS[cle]) { return L.ONGLETS[cle]; }
  return LANGUES.fr.ONGLETS[cle];
}

/** Libellé d'interface `cle` dans la langue active (menus, alertes, toasts).
 *  Repli sûr sur le français, puis sur la clé elle-même si rien n'est trouvé. */
function t_(cle) {
  var L = LANGUES[getLangue_()];
  if (L && L.UI && L.UI[cle] !== undefined) { return L.UI[cle]; }
  return (LANGUES.fr.UI && LANGUES.fr.UI[cle] !== undefined) ? LANGUES.fr.UI[cle] : cle;
}

/**
 * Change la langue active : mémorise le choix, puis RENOMME chaque onglet
 * (recherché sous son nom dans N'IMPORTE QUELLE langue du registre) vers son
 * nom dans la nouvelle langue. Ré-exécutable sans risque (idempotent : si
 * l'onglet porte déjà le bon nom, rien ne change).
 * ⚠ Ne touche à AUCUNE donnée ni formule : uniquement au nom des feuilles.
 */
function appliquerLangue(id) {
  var ui = SpreadsheetApp.getUi();
  if (!LANGUES[id]) { ui.alert("Langue inconnue : " + id); return; }
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  try {
    PropertiesService.getDocumentProperties().setProperty(LANGUE_PROP, id);
  } catch (e) {
    ui.alert("Impossible d'enregistrer la langue (autorisation ?) : " + e.message);
    return;
  }
  renommerOngletsSelonLangue_(ss, id);
  ss.toast(LANGUES[id].NOM + " appliqué ✓ — rouvre la feuille pour voir le menu traduit.",
           "🌍 Langue", 5);
}

/** Renomme chaque onglet canonique vers son nom dans la langue `id`,
 *  en le retrouvant quel que soit son nom actuel (n'importe quelle langue
 *  du registre). Ne crée ni ne supprime aucun onglet. */
function renommerOngletsSelonLangue_(ss, id) {
  var cible = LANGUES[id].ONGLETS;
  Object.keys(cible).forEach(function (cle) {
    var nouveauNom = cible[cle];
    var actuel = null;
    // Cherche l'onglet sous son nom dans CHAQUE langue connue (fr, en, es…).
    for (var i = 0; i < LANGUE_ORDRE.length && !actuel; i++) {
      var nomPossible = LANGUES[LANGUE_ORDRE[i]].ONGLETS[cle];
      var sh = ss.getSheetByName(nomPossible);
      if (sh) { actuel = sh; }
    }
    if (actuel && actuel.getName() !== nouveauNom) {
      try { actuel.setName(nouveauNom); } catch (e) { /* nom déjà pris, on ignore */ }
    }
  });
}

/* --- Enrobage nommé pour le menu (un par langue disponible) --- */
function langueFr() { appliquerLangue("fr"); }
