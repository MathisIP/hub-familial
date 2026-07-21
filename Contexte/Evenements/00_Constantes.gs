/**
 * ÉVÉNEMENTS — CONSTANTES PARTAGÉES & THÈMES DE COULEURS (source de vérité)
 * =======================================================================
 * Rappel Apps Script : tous les fichiers .gs partagent UN SEUL espace de noms
 * global → ne jamais redéclarer ces variables ailleurs.
 *
 * Ce fichier porte DEUX registres jumeaux, sur le même patron que le Budget :
 *   · PHASE G (2026-07-17) — REGISTRE `THEMES` (sélecteur de thème) : la charte
 *     est un registre de 9 coloris. Le choix est mémorisé dans la propriété de
 *     document `THEME` et relu à chaque exécution ; toutes les fonctions de mise
 *     en forme lisent les MÊMES globales (INK, HEAD, STAT_*, RSVP_*…),
 *     (ré)affectées par `chargerPalette_()`.
 *       - Menu « 🎉 Événements ▸ 🎨 Thème » → applique un coloris INSTANTANÉMENT.
 *       - Rôle CELL : fond de base des cellules (blanc en clair, foncé en 🌙 Nuit)
 *         peint par base_() → mode sombre lisible.
 *       - En 🌙 Nuit, les pastilles (statut, RSVP) deviennent des tons FONCÉS
 *         (texte clair = INK).
 *   · PHASE H (2026-07-17) — REGISTRE `LANGUES` (I18N) : noms d'onglets et
 *     libellés d'interface par langue. `nomOnglet_(cle)` / `t_(cle)` lisent la
 *     langue active ; `appliquerLangue(id)` RENOMME les onglets (renommage
 *     complet). Le code n'écrit plus jamais un nom d'onglet en dur.
 *
 * ⚠ Les deux registres sont INDÉPENDANTS mais partagent les MÊMES clés canoniques
 *   (APERCU, EVENEMENTS…) : le design retrouve la couleur d'onglet TABCOL via
 *   nomOnglet_(cle).
 */

// ID de l'agenda familial Google (alimenté par la synchronisation).
// ⚠ Phase E (gabarit distribuable) : remplacer cet ID en dur par une étape d'initialisation.
var CAL_ID = "family00543545316284784143@group.calendar.google.com";

/* ============================================================================
 *  PHASE G — REGISTRE DES THÈMES — 9 coloris, MÊMES clés partout (seules les hex
 *  changent). Socle : INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX,
 *  LINK_BG. Événements : DONE_* (Passé / coché), STAT_APLANIF / STAT_PREP /
 *  STAT_PRET (statut ; « date proche » et « RSVP Peut-être » réutilisent
 *  STAT_APLANIF, « RSVP Oui » réutilise STAT_PRET), RSVP_NON, RSVP_ATTENTE.
 *  TABCOL keyé par CLÉ CANONIQUE (Phase H) → couleur d'onglet via nomOnglet_(cle).
 *  ⚠ En 🌙 Nuit : toutes ces pastilles sont FONCÉES (texte clair = INK).
 * ============================================================================ */
var THEMES = {

  rose: {
    NOM: "🌸 Rose / Bleu",
    INK: "#3f3b36", INK2: "#6b655c", MUTED: "#8f887e",
    PAGE: "#f7f3ed", CELL: "#ffffff", HEAD: "#edc6d3",
    LINE: "#e7ded3", LINE2: "#d9cdbf", LINK_TX: "#2e4a7a", LINK_BG: "#eef1f6",
    DONE_BG: "#f1efea", DONE_TX: "#b8b2a8",
    STAT_APLANIF: "#fbefd4", STAT_PREP: "#dce8f6", STAT_PRET: "#e9f4ed",
    RSVP_NON: "#f6d5d5", RSVP_ATTENTE: "#eee9e1",
    TABCOL: {
      APERCU: "#e6a3b3", EVENEMENTS: "#a7c5e6", INVITES: "#a6d5b6",
      CHECKLIST: "#f0cf8b", MENU_COURSES: "#f3b89d",
      PARAMETRES: "#d7d0c6", LISEZMOI: "#d7d0c6"
    }
  },

  ocean: {
    NOM: "🌊 Bleu / Océan",
    INK: "#223a44", INK2: "#4a6470", MUTED: "#647d8a",
    PAGE: "#eef4f7", CELL: "#ffffff", HEAD: "#bfe0e6",
    LINE: "#d7e7eb", LINE2: "#c4d9de", LINK_TX: "#1f6f8b", LINK_BG: "#e6f1f6",
    DONE_BG: "#e6ecef", DONE_TX: "#93a1a8",
    STAT_APLANIF: "#cfe9e2", STAT_PREP: "#cbe3f2", STAT_PRET: "#d3ece0",
    RSVP_NON: "#f1d0d4", RSVP_ATTENTE: "#e4e8ea",
    TABCOL: {
      APERCU: "#7fc9d6", EVENEMENTS: "#9cc4e6", INVITES: "#8fd0c0",
      CHECKLIST: "#8ecfe0", MENU_COURSES: "#7fbfc9",
      PARAMETRES: "#c3d2d6", LISEZMOI: "#c3d2d6"
    }
  },

  sauge: {
    NOM: "🌿 Vert / Sauge",
    INK: "#37413a", INK2: "#5b675b", MUTED: "#757e73",
    PAGE: "#f4f6ee", CELL: "#ffffff", HEAD: "#cfe0c2",
    LINE: "#e2e6d5", LINE2: "#d2d8c3", LINK_TX: "#4c6f3a", LINK_BG: "#edf2ea",
    DONE_BG: "#eceee6", DONE_TX: "#98a08e",
    STAT_APLANIF: "#eef0d6", STAT_PREP: "#cfe6d6", STAT_PRET: "#dcecd0",
    RSVP_NON: "#efd4cc", RSVP_ATTENTE: "#e8e8de",
    TABCOL: {
      APERCU: "#a9cf94", EVENEMENTS: "#b6d69a", INVITES: "#9cd0b0",
      CHECKLIST: "#e0d488", MENU_COURSES: "#bfd39a",
      PARAMETRES: "#cdd0c2", LISEZMOI: "#cdd0c2"
    }
  },

  terracotta: {
    NOM: "🍂 Terracotta / Ambre",
    INK: "#43352c", INK2: "#6b574a", MUTED: "#9a8574",
    PAGE: "#faf1e8", CELL: "#ffffff", HEAD: "#f0c9a8",
    LINE: "#ecdcc9", LINE2: "#ddc9b2", LINK_TX: "#a65a3a", LINK_BG: "#f6ece0",
    DONE_BG: "#efe7dd", DONE_TX: "#a8968a",
    STAT_APLANIF: "#f6e3bf", STAT_PREP: "#f3d9c0", STAT_PRET: "#e2ecc8",
    RSVP_NON: "#f2ccc2", RSVP_ATTENTE: "#ece4d8",
    TABCOL: {
      APERCU: "#eaa985", EVENEMENTS: "#eeb98f", INVITES: "#e6c07f",
      CHECKLIST: "#e6c268", MENU_COURSES: "#e0956a",
      PARAMETRES: "#d6c6b2", LISEZMOI: "#d6c6b2"
    }
  },

  lila: {
    NOM: "🪻 Lila / Rose",
    INK: "#3b3340", INK2: "#64596b", MUTED: "#7d7086",
    PAGE: "#f6f2f8", CELL: "#ffffff", HEAD: "#e0c6ea",
    LINE: "#e6dcec", LINE2: "#d6c9de", LINK_TX: "#6a4a8a", LINK_BG: "#efe9f6",
    DONE_BG: "#eee9f0", DONE_TX: "#9a90a2",
    STAT_APLANIF: "#f4e2c0", STAT_PREP: "#d8cff0", STAT_PRET: "#d9ecdc",
    RSVP_NON: "#f2d0da", RSVP_ATTENTE: "#e8e4ec",
    TABCOL: {
      APERCU: "#d3a6dd", EVENEMENTS: "#b6b6e6", INVITES: "#c0b0dd",
      CHECKLIST: "#d6b0d0", MENU_COURSES: "#cbaad6",
      PARAMETRES: "#cdc6d4", LISEZMOI: "#cdc6d4"
    }
  },

  rouge: {
    NOM: "🌹 Rouge / Grenade",
    INK: "#43302f", INK2: "#6e514e", MUTED: "#946f6b",
    PAGE: "#faf0ee", CELL: "#ffffff", HEAD: "#f0b4bf",
    LINE: "#eccfc9", LINE2: "#ddbcb4", LINK_TX: "#a5384f", LINK_BG: "#f6e6e2",
    DONE_BG: "#efe6e2", DONE_TX: "#a8948e",
    STAT_APLANIF: "#f7dcc4", STAT_PREP: "#f0d6d0", STAT_PRET: "#e2ecc8",
    RSVP_NON: "#f4c8ce", RSVP_ATTENTE: "#ece2de",
    TABCOL: {
      APERCU: "#e79098", EVENEMENTS: "#eeab9f", INVITES: "#e6b878",
      CHECKLIST: "#eac090", MENU_COURSES: "#e07a6a",
      PARAMETRES: "#d6c2bc", LISEZMOI: "#d6c2bc"
    }
  },

  marron: {
    NOM: "🤎 Marron / Beige",
    INK: "#3f342a", INK2: "#6b5a48", MUTED: "#8c7860",
    PAGE: "#f6f0e6", CELL: "#ffffff", HEAD: "#ddc4a0",
    LINE: "#e6dcc9", LINE2: "#d6c6ac", LINK_TX: "#7a5a3a", LINK_BG: "#efe8dc",
    DONE_BG: "#ece5da", DONE_TX: "#a08d76",
    STAT_APLANIF: "#ecdcc0", STAT_PREP: "#d6dcc0", STAT_PRET: "#dde6cc",
    RSVP_NON: "#eccdc4", RSVP_ATTENTE: "#e8e0d2",
    TABCOL: {
      APERCU: "#d4b483", EVENEMENTS: "#d6c29a", INVITES: "#cdba8a",
      CHECKLIST: "#dcc07a", MENU_COURSES: "#c99a6a",
      PARAMETRES: "#cdc4b0", LISEZMOI: "#cdc4b0"
    }
  },

  gris: {
    NOM: "🩶 Nuance de gris",
    INK: "#2f3236", INK2: "#565b60", MUTED: "#7a7f84",
    PAGE: "#f2f3f4", CELL: "#ffffff", HEAD: "#d3d7db",
    LINE: "#e2e4e6", LINE2: "#d0d3d6", LINK_TX: "#4a5560", LINK_BG: "#e8eaec",
    DONE_BG: "#e6e6e6", DONE_TX: "#9a9ea2",
    STAT_APLANIF: "#ebe3cc", STAT_PREP: "#dbe1e6", STAT_PRET: "#dce4de",
    RSVP_NON: "#e6d6d7", RSVP_ATTENTE: "#e6e7e8",
    TABCOL: {
      APERCU: "#b6bcc2", EVENEMENTS: "#aab4be", INVITES: "#aeb4b0",
      CHECKLIST: "#c0bca8", MENU_COURSES: "#c0b2b2",
      PARAMETRES: "#c4c5c6", LISEZMOI: "#c4c5c6"
    }
  },

  nuit: {
    NOM: "🌙 Sombre / Nuit",
    INK: "#e8e6e1", INK2: "#b9c2cc", MUTED: "#8b95a1",
    PAGE: "#1f2430", CELL: "#232a33", HEAD: "#3a4560",
    LINE: "#3a3f4a", LINE2: "#454b58", LINK_TX: "#8fc4ea", LINK_BG: "#26303f",
    DONE_BG: "#2f333c", DONE_TX: "#6a7078",
    STAT_APLANIF: "#4a4230", STAT_PREP: "#26364a", STAT_PRET: "#24402f",
    RSVP_NON: "#4a2b30", RSVP_ATTENTE: "#333844",
    TABCOL: {
      APERCU: "#7d5a86", EVENEMENTS: "#3f6a9a", INVITES: "#3f7a63",
      CHECKLIST: "#8a7a3f", MENU_COURSES: "#8a5a4a",
      PARAMETRES: "#4a4f58", LISEZMOI: "#4a4f58"
    }
  }

};

var THEME_ORDRE = ["rose", "ocean", "sauge", "terracotta", "lila", "rouge", "marron", "gris", "nuit"];
var THEME_PROP  = "THEME";

/* ---- Variables de palette (globales) — (ré)affectées par chargerPalette_() ---- */
var INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX, LINK_BG,
    DONE_BG, DONE_TX, STAT_APLANIF, STAT_PREP, STAT_PRET, RSVP_NON, RSVP_ATTENTE, TABCOL;

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
  DONE_BG = T.DONE_BG; DONE_TX = T.DONE_TX;
  STAT_APLANIF = T.STAT_APLANIF; STAT_PREP = T.STAT_PREP; STAT_PRET = T.STAT_PRET;
  RSVP_NON = T.RSVP_NON; RSVP_ATTENTE = T.RSVP_ATTENTE;
  TABCOL = T.TABCOL;
}

// Charge la palette du thème actif dès l'évaluation du script (à chaque exécution).
chargerPalette_();

/**
 * Applique un thème : mémorise le choix, recharge la palette, puis re-formate
 * tout le classeur (configurerEvenementsCore_) + régénère le Lisez-moi.
 * Instantané, ré-exécutable, sans toucher aux données.
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
    appliquerThemeEvenements_();       // re-formatage non destructif (02_Design.gs)
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
 * ============================================================================ */

var LANGUES = {
  fr: {
    NOM: "🇫🇷 Français",
    ONGLETS: {
      LISEZMOI:      "Lisez-moi",
      APERCU:        "Aperçu",
      EVENEMENTS:    "Événements",
      INVITES:       "Invités",
      CHECKLIST:     "Checklist",
      MENU_COURSES:  "Menu & Courses",
      PARAMETRES:    "Paramètres"
    },
    UI: {
      MENU_TITRE: "🎉 Événements",
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
