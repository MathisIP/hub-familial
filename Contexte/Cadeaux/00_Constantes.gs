/**
 * SUIVI CADEAUX — CONSTANTES PARTAGÉES & THÈMES DE COULEURS (source de vérité)
 * ==========================================================================
 * Rappel Apps Script : tous les fichiers .gs partagent UN SEUL espace de noms
 * global → ne jamais redéclarer ces variables ailleurs.
 *
 * Ce fichier porte DEUX registres jumeaux, sur le même patron que le Budget :
 *   · PHASE G (2026-07-17) — REGISTRE `THEMES` (sélecteur de thème) : la charte
 *     est un registre de 9 coloris. Le choix est mémorisé dans la propriété de
 *     document `THEME` et relu à chaque exécution ; toutes les fonctions de mise
 *     en forme lisent les MÊMES globales (INK, HEAD, COUL_STATUT…), (ré)affectées
 *     par `chargerPalette_()`.
 *       - Menu « 🎁 Cadeaux ▸ 🎨 Thème » → applique un coloris INSTANTANÉMENT.
 *       - Rôle CELL : fond de base des cellules (blanc en clair, foncé en 🌙 Nuit)
 *         peint par base_() → mode sombre lisible.
 *       - En 🌙 Nuit, les pastilles de statut deviennent des tons FONCÉS (texte clair = INK).
 *   · PHASE H (2026-07-17) — REGISTRE `LANGUES` (I18N) : noms d'onglets et
 *     libellés d'interface par langue. `nomOnglet_(cle)` / `t_(cle)` lisent la
 *     langue active ; `appliquerLangue(id)` RENOMME les onglets (renommage complet).
 *
 * ⚠ Les STATUTS (clés de COUL_STATUT : Idée / À acheter / Commandé / Reçu / Emballé)
 *   sont des DONNÉES saisies par l'utilisateur, pas des noms d'onglets : ils restent
 *   hors du cadre I18N (même logique que les types de transaction du Budget —
 *   cf. cahier §2 Phase H, point ouvert). TABCOL, lui, est keyé par clé canonique
 *   (APERCU, CADEAUX…) → couleur d'onglet retrouvée via nomOnglet_(cle).
 */

/* ============================================================================
 *  PHASE G — REGISTRE DES THÈMES — 9 coloris, MÊMES clés partout (seules les hex
 *  changent). Socle : INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX,
 *  LINK_BG. Cadeaux : COUL_STATUT{Idée, À acheter, Commandé, Reçu, Emballé} (fond
 *  par statut), COUL_OFFERT_BG / COUL_TXT_GRIS (ligne « Offert » grisée),
 *  COUL_OCCASION_PROCHE (occasion < 30 j). ⚠ En 🌙 Nuit : toutes ces pastilles sont
 *  FONCÉES (texte clair = INK).
 * ============================================================================ */
var THEMES = {

  rose: {
    NOM: "🌸 Rose / Bleu",
    INK: "#3f3b36", INK2: "#6b655c", MUTED: "#8f887e",
    PAGE: "#f7f3ed", CELL: "#ffffff", HEAD: "#edc6d3",
    LINE: "#e7ded3", LINE2: "#d9cdbf", LINK_TX: "#2e4a7a", LINK_BG: "#eef1f6",
    COUL_STATUT: { "Idée": "#ede7f3", "À acheter": "#fbefd4", "Commandé": "#dce8f6", "Reçu": "#e9f4ed", "Emballé": "#f6cfd9" },
    COUL_OFFERT_BG: "#f1efea", COUL_TXT_GRIS: "#b8b2a8", COUL_OCCASION_PROCHE: "#fbefd4",
    TABCOL: { APERCU: "#e6a3b3", CADEAUX: "#c9b6e4", OCCASIONS: "#a7c5e6", PARAMETRES: "#d7d0c6", LISEZMOI: "#d7d0c6" }
  },

  ocean: {
    NOM: "🌊 Bleu / Océan",
    INK: "#223a44", INK2: "#4a6470", MUTED: "#647d8a",
    PAGE: "#eef4f7", CELL: "#ffffff", HEAD: "#bfe0e6",
    LINE: "#d7e7eb", LINE2: "#c4d9de", LINK_TX: "#1f6f8b", LINK_BG: "#e6f1f6",
    COUL_STATUT: { "Idée": "#e0e0f0", "À acheter": "#cfe9e2", "Commandé": "#cbe3f2", "Reçu": "#d3ece0", "Emballé": "#f1cdd4" },
    COUL_OFFERT_BG: "#e6ecef", COUL_TXT_GRIS: "#93a1a8", COUL_OCCASION_PROCHE: "#cfe9e2",
    TABCOL: { APERCU: "#7fc9d6", CADEAUX: "#a9bfe0", OCCASIONS: "#9cc4e6", PARAMETRES: "#c3d2d6", LISEZMOI: "#c3d2d6" }
  },

  sauge: {
    NOM: "🌿 Vert / Sauge",
    INK: "#37413a", INK2: "#5b675b", MUTED: "#757e73",
    PAGE: "#f4f6ee", CELL: "#ffffff", HEAD: "#cfe0c2",
    LINE: "#e2e6d5", LINE2: "#d2d8c3", LINK_TX: "#4c6f3a", LINK_BG: "#edf2ea",
    COUL_STATUT: { "Idée": "#e4e0ee", "À acheter": "#eef0d6", "Commandé": "#cfe6d6", "Reçu": "#dcecd0", "Emballé": "#efd0c8" },
    COUL_OFFERT_BG: "#eceee6", COUL_TXT_GRIS: "#98a08e", COUL_OCCASION_PROCHE: "#eef0d6",
    TABCOL: { APERCU: "#a9cf94", CADEAUX: "#c0b6d6", OCCASIONS: "#b6d69a", PARAMETRES: "#cdd0c2", LISEZMOI: "#cdd0c2" }
  },

  terracotta: {
    NOM: "🍂 Terracotta / Ambre",
    INK: "#43352c", INK2: "#6b574a", MUTED: "#9a8574",
    PAGE: "#faf1e8", CELL: "#ffffff", HEAD: "#f0c9a8",
    LINE: "#ecdcc9", LINE2: "#ddc9b2", LINK_TX: "#a65a3a", LINK_BG: "#f6ece0",
    COUL_STATUT: { "Idée": "#ece2ee", "À acheter": "#f6e3bf", "Commandé": "#f3d9c0", "Reçu": "#e2ecc8", "Emballé": "#f2c7bd" },
    COUL_OFFERT_BG: "#efe7dd", COUL_TXT_GRIS: "#a8968a", COUL_OCCASION_PROCHE: "#f6e3bf",
    TABCOL: { APERCU: "#eaa985", CADEAUX: "#d8b0a0", OCCASIONS: "#eeb98f", PARAMETRES: "#d6c6b2", LISEZMOI: "#d6c6b2" }
  },

  lila: {
    NOM: "🪻 Lila / Rose",
    INK: "#3b3340", INK2: "#64596b", MUTED: "#7d7086",
    PAGE: "#f6f2f8", CELL: "#ffffff", HEAD: "#e0c6ea",
    LINE: "#e6dcec", LINE2: "#d6c9de", LINK_TX: "#6a4a8a", LINK_BG: "#efe9f6",
    COUL_STATUT: { "Idée": "#e6dcf2", "À acheter": "#f4e2c0", "Commandé": "#d8cff0", "Reçu": "#d9ecdc", "Emballé": "#f4cdd8" },
    COUL_OFFERT_BG: "#eee9f0", COUL_TXT_GRIS: "#9a90a2", COUL_OCCASION_PROCHE: "#f4e2c0",
    TABCOL: { APERCU: "#d3a6dd", CADEAUX: "#cbaad6", OCCASIONS: "#b6b6e6", PARAMETRES: "#cdc6d4", LISEZMOI: "#cdc6d4" }
  },

  rouge: {
    NOM: "🌹 Rouge / Grenade",
    INK: "#43302f", INK2: "#6e514e", MUTED: "#946f6b",
    PAGE: "#faf0ee", CELL: "#ffffff", HEAD: "#f0b4bf",
    LINE: "#eccfc9", LINE2: "#ddbcb4", LINK_TX: "#a5384f", LINK_BG: "#f6e6e2",
    COUL_STATUT: { "Idée": "#ece0ee", "À acheter": "#f7dcc4", "Commandé": "#f0d6d0", "Reçu": "#e2ecc8", "Emballé": "#f4c4cc" },
    COUL_OFFERT_BG: "#efe6e2", COUL_TXT_GRIS: "#a8948e", COUL_OCCASION_PROCHE: "#f7dcc4",
    TABCOL: { APERCU: "#e79098", CADEAUX: "#e0a0b0", OCCASIONS: "#eeab9f", PARAMETRES: "#d6c2bc", LISEZMOI: "#d6c2bc" }
  },

  marron: {
    NOM: "🤎 Marron / Beige",
    INK: "#3f342a", INK2: "#6b5a48", MUTED: "#8c7860",
    PAGE: "#f6f0e6", CELL: "#ffffff", HEAD: "#ddc4a0",
    LINE: "#e6dcc9", LINE2: "#d6c6ac", LINK_TX: "#7a5a3a", LINK_BG: "#efe8dc",
    COUL_STATUT: { "Idée": "#e6e0ee", "À acheter": "#ecdcc0", "Commandé": "#d6dcc0", "Reçu": "#dde6cc", "Emballé": "#eccdc0" },
    COUL_OFFERT_BG: "#ece5da", COUL_TXT_GRIS: "#a08d76", COUL_OCCASION_PROCHE: "#ecdcc0",
    TABCOL: { APERCU: "#d4b483", CADEAUX: "#c9b6a0", OCCASIONS: "#d6c29a", PARAMETRES: "#cdc4b0", LISEZMOI: "#cdc4b0" }
  },

  gris: {
    NOM: "🩶 Nuance de gris",
    INK: "#2f3236", INK2: "#565b60", MUTED: "#7a7f84",
    PAGE: "#f2f3f4", CELL: "#ffffff", HEAD: "#d3d7db",
    LINE: "#e2e4e6", LINE2: "#d0d3d6", LINK_TX: "#4a5560", LINK_BG: "#e8eaec",
    COUL_STATUT: { "Idée": "#e4e2ea", "À acheter": "#ebe3cc", "Commandé": "#dbe1e6", "Reçu": "#dce4de", "Emballé": "#e6d6d7" },
    COUL_OFFERT_BG: "#e6e6e6", COUL_TXT_GRIS: "#9a9ea2", COUL_OCCASION_PROCHE: "#ebe3cc",
    TABCOL: { APERCU: "#b6bcc2", CADEAUX: "#b8b4c0", OCCASIONS: "#aab4be", PARAMETRES: "#c4c5c6", LISEZMOI: "#c4c5c6" }
  },

  nuit: {
    NOM: "🌙 Sombre / Nuit",
    INK: "#e8e6e1", INK2: "#b9c2cc", MUTED: "#8b95a1",
    PAGE: "#1f2430", CELL: "#232a33", HEAD: "#3a4560",
    LINE: "#3a3f4a", LINE2: "#454b58", LINK_TX: "#8fc4ea", LINK_BG: "#26303f",
    COUL_STATUT: { "Idée": "#362a48", "À acheter": "#4a4230", "Commandé": "#26364a", "Reçu": "#24402f", "Emballé": "#4a2b34" },
    COUL_OFFERT_BG: "#2f333c", COUL_TXT_GRIS: "#6a7078", COUL_OCCASION_PROCHE: "#4a4230",
    TABCOL: { APERCU: "#7d5a86", CADEAUX: "#5a5a8a", OCCASIONS: "#3f6a9a", PARAMETRES: "#4a4f58", LISEZMOI: "#4a4f58" }
  }

};

var THEME_ORDRE = ["rose", "ocean", "sauge", "terracotta", "lila", "rouge", "marron", "gris", "nuit"];
var THEME_PROP  = "THEME";

/* ---- Variables de palette (globales) — (ré)affectées par chargerPalette_() ---- */
var INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX, LINK_BG,
    COUL_STATUT, COUL_OFFERT_BG, COUL_TXT_GRIS, COUL_OCCASION_PROCHE, TABCOL;

/* ============================================================================
 *  MOTEUR DE THÈME (Phase G)
 * ============================================================================ */

/** Id du thème actif (repli sûr "rose"). try/catch : ne jamais casser onOpen. */
function getThemeId_() {
  try {
    var v = PropertiesService.getDocumentProperties().getProperty(THEME_PROP);
    return (v && THEMES[v]) ? v : "rose";
  } catch (e) {
    return "rose";
  }
}

/** (Ré)affecte les variables de palette globales selon `id` (ou le thème actif). */
function chargerPalette_(id) {
  var T;
  try { T = THEMES[(id && THEMES[id]) ? id : getThemeId_()]; } catch (e) { T = null; }
  if (!T) { T = THEMES["rose"]; }
  INK = T.INK; INK2 = T.INK2; MUTED = T.MUTED; PAGE = T.PAGE; CELL = T.CELL;
  HEAD = T.HEAD; LINE = T.LINE; LINE2 = T.LINE2; LINK_TX = T.LINK_TX; LINK_BG = T.LINK_BG;
  COUL_STATUT = T.COUL_STATUT; COUL_OFFERT_BG = T.COUL_OFFERT_BG;
  COUL_TXT_GRIS = T.COUL_TXT_GRIS; COUL_OCCASION_PROCHE = T.COUL_OCCASION_PROCHE;
  TABCOL = T.TABCOL;
}

// Charge la palette du thème actif dès l'évaluation du script (à chaque exécution).
chargerPalette_();

/**
 * Applique un thème : mémorise le choix, recharge la palette, puis re-formate
 * tout le classeur (configurerCadeauxCore_) + régénère le Lisez-moi. Instantané,
 * ré-exécutable, sans toucher aux données.
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
  chargerPalette_(id);
  ss.toast("Application du thème " + THEMES[id].NOM + "…", "🎨 Thème", 5);
  try {
    appliquerThemeCadeaux_();          // re-formatage non destructif (02_Design.gs)
  } catch (e) {
    ui.alert("Le thème est enregistré mais la mise en forme a rencontré un souci :\n\n" +
             (e && e.message ? e.message : e) +
             "\n\nRelance « 🎨 Thème ▸ " + THEMES[id].NOM + " » ou restaure via l'historique.");
    return;
  }
  ss.toast("Thème " + THEMES[id].NOM + " appliqué ✓", "🎨 Thème", 4);
}

/* --- Enrobages nommés pour le menu (un par thème) --- */
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
 *  PHASE H — CADRE DE LOCALISATION (I18N)
 *  Même patron que Budget_familial/00_Constantes.gs. Résumé :
 *   · `LANGUES[langue].ONGLETS[cle]` — nom RÉEL de l'onglet dans cette langue.
 *   · `nomOnglet_(cle)` / `t_(cle)` — accès à la langue active.
 *   · `appliquerLangue(id)` — mémorise + RENOMME les onglets (renommage complet).
 *  ÉTAT : cadre + 🇫🇷 fr = référence complète (comportement inchangé).
 *  🇬🇧 en / 🇪🇸 es : à compléter (même étape que sur le Budget).
 *  ⚠ Les statuts (Idée / À acheter / Commandé / Reçu / Emballé) sont des DONNÉES,
 *  pas des noms d'onglets : ils restent hors du cadre I18N (cf. commentaire plus haut).
 * ============================================================================ */

var LANGUES = {
  fr: {
    NOM: "🇫🇷 Français",
    ONGLETS: {
      LISEZMOI:   "Lisez-moi",
      APERCU:     "Aperçu",
      CADEAUX:    "Cadeaux",
      OCCASIONS:  "Occasions",
      PARAMETRES: "Paramètres"
    },
    UI: {
      MENU_TITRE: "🎁 Cadeaux",
      MENU_THEME: "🎨 Thème",
      MENU_LANGUE: "🌍 Langue"
    }
  }
  /* en: {...}  es: {...}  ← à compléter (prochaine étape, comme sur le Budget) */
};

var LANGUE_ORDRE = ["fr"];
var LANGUE_PROP = "LANGUE";

function getLangue_() {
  try {
    var v = PropertiesService.getDocumentProperties().getProperty(LANGUE_PROP);
    return (v && LANGUES[v]) ? v : "fr";
  } catch (e) { return "fr"; }
}

function nomOnglet_(cle) {
  var L = LANGUES[getLangue_()];
  if (L && L.ONGLETS && L.ONGLETS[cle]) { return L.ONGLETS[cle]; }
  return LANGUES.fr.ONGLETS[cle];
}

function t_(cle) {
  var L = LANGUES[getLangue_()];
  if (L && L.UI && L.UI[cle] !== undefined) { return L.UI[cle]; }
  return (LANGUES.fr.UI && LANGUES.fr.UI[cle] !== undefined) ? LANGUES.fr.UI[cle] : cle;
}

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

function renommerOngletsSelonLangue_(ss, id) {
  var cible = LANGUES[id].ONGLETS;
  Object.keys(cible).forEach(function (cle) {
    var nouveauNom = cible[cle];
    var actuel = null;
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

function langueFr() { appliquerLangue("fr"); }
