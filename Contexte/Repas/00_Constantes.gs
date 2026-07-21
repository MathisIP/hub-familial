/**
 * REPAS_SEMAINE — CONSTANTES PARTAGÉES & THÈMES DE COULEURS (source de vérité)
 * ===========================================================================
 * Rappel Apps Script : tous les fichiers .gs partagent UN SEUL espace de noms
 * global → ne jamais redéclarer ces variables ailleurs.
 *
 * Ce fichier porte DEUX registres jumeaux, sur le même patron que le Budget :
 *   · PHASE G (2026-07-17) — REGISTRE `THEMES` (sélecteur de thème) : la charte
 *     est un registre de 9 coloris. Le choix est mémorisé dans la propriété de
 *     document `THEME` et relu à chaque exécution ; toutes les fonctions de mise
 *     en forme lisent les MÊMES globales (INK, HEAD, CHAUD_BG, FROID_BG, VIANDE…),
 *     (ré)affectées par `chargerPalette_()`.
 *       - Menu « 🍽️ Repas ▸ 🎨 Thème » → applique un coloris INSTANTANÉMENT.
 *       - Rôle CELL : fond de base des cellules (blanc en clair, foncé en 🌙 Nuit)
 *         peint par base_() sur l'onglet Recettes → mode sombre lisible.
 *       - En 🌙 Nuit, les fonds Chaud/Froid deviennent FONCÉS et les couleurs de
 *         Type (Viande/Poisson/Végé) passent en teintes CLAIRES.
 *   · PHASE H (2026-07-17) — REGISTRE `LANGUES` (I18N) : noms d'onglets et
 *     libellés d'interface par langue. `nomOnglet_(cle)` / `t_(cle)` lisent la
 *     langue active ; `appliquerLangue(id)` RENOMME les onglets (renommage complet).
 *
 * ⚠ Les deux registres partagent les MÊMES clés canoniques (SEMAINE, RECETTES…) :
 *   le design retrouve la couleur d'onglet TABCOL via nomOnglet_(cle).
 */

// --- Liaison vers la liste de courses (ToDo_familiale) ---
// ⚠ Phase E (gabarit distribuable) : remplacer cet ID en dur par une étape d'initialisation.
// ⚠ Phase H : TODO_ONGLET référence un onglet d'un AUTRE projet Apps Script
//   (ToDo_familiale), qui a son PROPRE registre LANGUES indépendant de celui-ci.
//   Ce nom reste donc en dur (pas de nomOnglet_ possible d'un projet à l'autre) :
//   si un jour ToDo_familiale change de langue, ce lien devra être mis à jour ici
//   à la main (cf. cahier de projet §2 Phase H, point ouvert).
var TODO_ID     = "1HnbbcYnu5aPLVldLr4mMvAhBHwyIOVtS34Ea-j5JO10";
var TODO_ONGLET = "Courses";   // onglet de la liste de courses dans ToDo_familiale

// --- Disposition de l'onglet Semaine ---
var JOUR_LIGNE_DEBUT = 8;   // 1re ligne de jour dans l'onglet Semaine
var JOUR_NB          = 7;   // nombre de jours

/* ============================================================================
 *  PHASE G — REGISTRE DES THÈMES — 9 coloris, MÊMES clés partout (seules les hex
 *  changent). Socle : INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX,
 *  LINK_BG. Recettes : CHAUD_BG / FROID_BG (fond de plat) + VIANDE / POISSON / VEG
 *  (Type en gras coloré). TABCOL keyé par CLÉ CANONIQUE (Phase H) → couleur
 *  d'onglet via nomOnglet_(cle). ⚠ En 🌙 Nuit : fonds Chaud/Froid FONCÉS, Types CLAIRS.
 * ============================================================================ */
var THEMES = {

  rose: {
    NOM: "🌸 Rose / Bleu",
    INK: "#3f3b36", INK2: "#6b655c", MUTED: "#8f887e",
    PAGE: "#f7f3ed", CELL: "#ffffff", HEAD: "#edc6d3",
    LINE: "#e7ded3", LINE2: "#d9cdbf", LINK_TX: "#2e4a7a", LINK_BG: "#eef1f6",
    CHAUD_BG: "#f9c7b8", FROID_BG: "#dce8f6",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#3c8c5a",
    TABCOL: { SEMAINE: "#e6a3b3", RECETTES: "#a6d5b6", RECHERCHE: "#a7c5e6", LISEZMOI: "#d7d0c6" }
  },

  ocean: {
    NOM: "🌊 Bleu / Océan",
    INK: "#223a44", INK2: "#4a6470", MUTED: "#647d8a",
    PAGE: "#eef4f7", CELL: "#ffffff", HEAD: "#bfe0e6",
    LINE: "#d7e7eb", LINE2: "#c4d9de", LINK_TX: "#1f6f8b", LINK_BG: "#e6f1f6",
    CHAUD_BG: "#f3cdba", FROID_BG: "#cbe3f2",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#2f7245",
    TABCOL: { SEMAINE: "#7fc9d6", RECETTES: "#8fd0c0", RECHERCHE: "#9cc4e6", LISEZMOI: "#c3d2d6" }
  },

  sauge: {
    NOM: "🌿 Vert / Sauge",
    INK: "#37413a", INK2: "#5b675b", MUTED: "#757e73",
    PAGE: "#f4f6ee", CELL: "#ffffff", HEAD: "#cfe0c2",
    LINE: "#e2e6d5", LINE2: "#d2d8c3", LINK_TX: "#4c6f3a", LINK_BG: "#edf2ea",
    CHAUD_BG: "#f0d3b0", FROID_BG: "#cfe0ea",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#2f7245",
    TABCOL: { SEMAINE: "#a9cf94", RECETTES: "#9cd0b0", RECHERCHE: "#b6d69a", LISEZMOI: "#cdd0c2" }
  },

  terracotta: {
    NOM: "🍂 Terracotta / Ambre",
    INK: "#43352c", INK2: "#6b574a", MUTED: "#9a8574",
    PAGE: "#faf1e8", CELL: "#ffffff", HEAD: "#f0c9a8",
    LINE: "#ecdcc9", LINE2: "#ddc9b2", LINK_TX: "#a65a3a", LINK_BG: "#f6ece0",
    CHAUD_BG: "#f3c9a8", FROID_BG: "#d6e2ee",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#2f7245",
    TABCOL: { SEMAINE: "#eaa985", RECETTES: "#e6c07f", RECHERCHE: "#eeb98f", LISEZMOI: "#d6c6b2" }
  },

  lila: {
    NOM: "🪻 Lila / Rose",
    INK: "#3b3340", INK2: "#64596b", MUTED: "#7d7086",
    PAGE: "#f6f2f8", CELL: "#ffffff", HEAD: "#e0c6ea",
    LINE: "#e6dcec", LINE2: "#d6c9de", LINK_TX: "#6a4a8a", LINK_BG: "#efe9f6",
    CHAUD_BG: "#f4d3c0", FROID_BG: "#d8dcf0",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#2f7245",
    TABCOL: { SEMAINE: "#d3a6dd", RECETTES: "#c0b0dd", RECHERCHE: "#b6b6e6", LISEZMOI: "#cdc6d4" }
  },

  rouge: {
    NOM: "🌹 Rouge / Grenade",
    INK: "#43302f", INK2: "#6e514e", MUTED: "#946f6b",
    PAGE: "#faf0ee", CELL: "#ffffff", HEAD: "#f0b4bf",
    LINE: "#eccfc9", LINE2: "#ddbcb4", LINK_TX: "#a5384f", LINK_BG: "#f6e6e2",
    CHAUD_BG: "#f6cdbf", FROID_BG: "#dce2ef",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#2f7245",
    TABCOL: { SEMAINE: "#e79098", RECETTES: "#e6b878", RECHERCHE: "#eeab9f", LISEZMOI: "#d6c2bc" }
  },

  marron: {
    NOM: "🤎 Marron / Beige",
    INK: "#3f342a", INK2: "#6b5a48", MUTED: "#8c7860",
    PAGE: "#f6f0e6", CELL: "#ffffff", HEAD: "#ddc4a0",
    LINE: "#e6dcc9", LINE2: "#d6c6ac", LINK_TX: "#7a5a3a", LINK_BG: "#efe8dc",
    CHAUD_BG: "#ecd0b8", FROID_BG: "#d6dce4",
    VIANDE: "#c0392b", POISSON: "#2e6da4", VEG: "#2f7245",
    TABCOL: { SEMAINE: "#d4b483", RECETTES: "#cdba8a", RECHERCHE: "#d6c29a", LISEZMOI: "#cdc4b0" }
  },

  gris: {
    NOM: "🩶 Nuance de gris",
    INK: "#2f3236", INK2: "#565b60", MUTED: "#7a7f84",
    PAGE: "#f2f3f4", CELL: "#ffffff", HEAD: "#d3d7db",
    LINE: "#e2e4e6", LINE2: "#d0d3d6", LINK_TX: "#4a5560", LINK_BG: "#e8eaec",
    CHAUD_BG: "#e8d8d2", FROID_BG: "#d8e0e6",
    VIANDE: "#a35047", POISSON: "#4a6f8c", VEG: "#5a7d5f",
    TABCOL: { SEMAINE: "#b6bcc2", RECETTES: "#aeb4b0", RECHERCHE: "#aab4be", LISEZMOI: "#c4c5c6" }
  },

  nuit: {
    NOM: "🌙 Sombre / Nuit",
    INK: "#e8e6e1", INK2: "#b9c2cc", MUTED: "#8b95a1",
    PAGE: "#1f2430", CELL: "#232a33", HEAD: "#3a4560",
    LINE: "#3a3f4a", LINE2: "#454b58", LINK_TX: "#8fc4ea", LINK_BG: "#26303f",
    CHAUD_BG: "#4a3328", FROID_BG: "#26364a",
    VIANDE: "#ff9d90", POISSON: "#8fc4ea", VEG: "#8fd0a0",
    TABCOL: { SEMAINE: "#7d5a86", RECETTES: "#3f7a63", RECHERCHE: "#3f6a9a", LISEZMOI: "#4a4f58" }
  }

};

var THEME_ORDRE = ["rose", "ocean", "sauge", "terracotta", "lila", "rouge", "marron", "gris", "nuit"];
var THEME_PROP  = "THEME";

/* ---- Variables de palette (globales) — (ré)affectées par chargerPalette_() ---- */
var INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX, LINK_BG,
    CHAUD_BG, FROID_BG, VIANDE, POISSON, VEG, TABCOL;

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
  CHAUD_BG = T.CHAUD_BG; FROID_BG = T.FROID_BG;
  VIANDE = T.VIANDE; POISSON = T.POISSON; VEG = T.VEG;
  TABCOL = T.TABCOL;
}

// Charge la palette du thème actif dès l'évaluation du script (à chaque exécution).
chargerPalette_();

/**
 * Applique un thème : mémorise le choix, recharge la palette, puis re-formate
 * tout le classeur (formaterRepas via appliquerThemeRepas_) + régénère le
 * Lisez-moi. Instantané, ré-exécutable, sans toucher aux données.
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
    appliquerThemeRepas_();            // re-formatage non destructif (04_Design.gs)
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
      LISEZMOI:  "Lisez-moi",
      SEMAINE:   "Semaine",
      RECETTES:  "Recettes",
      RECHERCHE: "Recherche"
    },
    UI: {
      MENU_TITRE: "🍽️ Repas",
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
