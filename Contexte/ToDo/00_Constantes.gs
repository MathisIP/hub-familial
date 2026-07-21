/**
 * TO-DO FAMILIALE — CONSTANTES PARTAGÉES & THÈMES DE COULEURS (source de vérité)
 * =============================================================================
 * Constantes utilisées par plusieurs modules. Rappel Apps Script : tous les
 * fichiers .gs d'un projet partagent UN SEUL espace de noms global → ne jamais
 * redéclarer ces variables ailleurs.
 *
 * Ce fichier porte DEUX registres jumeaux, sur le même patron que le Budget :
 *   · PHASE G (2026-07-17) — REGISTRE `THEMES` (sélecteur de thème) : la charte
 *     de couleurs est un registre de 9 coloris. Le choix est mémorisé dans la
 *     propriété de document `THEME` et relu à chaque exécution ; toutes les
 *     fonctions de mise en forme lisent les MÊMES globales (INK, HEAD, STATUT_*,
 *     PRIO_*, ASSIGN_*…), (ré)affectées par `chargerPalette_()`.
 *       - Menu « ✅ To-Do ▸ 🎨 Thème » → applique un coloris INSTANTANÉMENT.
 *       - Rôle CELL : fond de base des cellules (blanc en clair, foncé en 🌙 Nuit)
 *         peint par base_() → mode sombre lisible.
 *       - Pas de vitrine reconstruite : la bascule = re-formatage (formaterTodo_)
 *         + régénération du Lisez-moi. Ré-exécutable à volonté.
 *   · PHASE H (2026-07-17) — REGISTRE `LANGUES` (I18N) : noms d'onglets et
 *     libellés d'interface par langue. `nomOnglet_(cle)` / `t_(cle)` lisent la
 *     langue active ; `appliquerLangue(id)` RENOMME les onglets (décision Mathis :
 *     renommage complet, pas un simple affichage). Le code n'écrit plus jamais un
 *     nom d'onglet en dur : toujours `nomOnglet_('CLE')`.
 *
 * ⚠ Les deux registres sont INDÉPENDANTS : la clé de TABCOL (Phase G) et la clé
 *   d'onglet (Phase H) partagent les MÊMES noms canoniques (APERCU, TACHES…), si
 *   bien que le design retrouve la bonne couleur d'onglet via nomOnglet_(cle).
 */

/* ============================================================================
 *  VUES PERSO (Phase H) — clé canonique → valeur « Assigné à » de l'onglet Tâches
 *  Keyé par CLÉ CANONIQUE (pas par nom d'onglet, qui varie selon la langue) : le
 *  nom réel de l'onglet se lit via nomOnglet_(cle).
 * ============================================================================ */
var VUES_ASSIGNE = { LOU: "Lou", MATI: "Mati", NOUS_DEUX: "Les deux" };
var VUES_CLES = ["LOU", "MATI", "NOUS_DEUX"];   // ordre d'itération des vues perso

/** Renvoie la valeur « Assigné à » (VUES_ASSIGNE) correspondant à une feuille
 *  donnée, en la reconnaissant par son nom ACTUEL (quelle que soit la langue),
 *  ou null si ce n'est pas une vue perso. Remplace l'ancien `VUES[sh.getName()]`. */
function vueAssigneDepuisFeuille_(sh) {
  var nom = sh.getName();
  for (var i = 0; i < VUES_CLES.length; i++) {
    if (nomOnglet_(VUES_CLES[i]) === nom) { return VUES_ASSIGNE[VUES_CLES[i]]; }
  }
  return null;
}

// ID du fichier ToDo_familiale. Utilisé par le formulaire Courses, qui est un
// formulaire AUTONOME (non lié à la feuille) : son déclencheur ouvre donc la
// feuille par son ID pour écrire dans l'onglet Courses.
// ⚠ Phase E (gabarit distribuable) : remplacer cet ID en dur par une étape
//   d'initialisation (l'utilisateur renseignera son propre fichier).
var TODO_ID = "1HnbbcYnu5aPLVldLr4mMvAhBHwyIOVtS34Ea-j5JO10";
// Phase H : le nom de l'onglet Courses suit désormais la langue active — voir
// nomOnglet_('COURSES') (l'ancienne constante ONGLET n'est plus utilisée).

/* ============================================================================
 *  PHASE G — REGISTRE DES THÈMES — 9 coloris, MÊMES clés partout (seules les hex
 *  changent). Rôles « socle » : INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2,
 *  LINK_TX, LINK_BG. Rôles « signaux/tâches » : OVER_* (retard), OK_TX, DONE_*
 *  (Fait), STATUT_* (À faire / En cours), PRIO_* (Haute/Moyenne/Basse), ASSIGN_*
 *  (Lou/Mati/les deux). TABCOL keyé par CLÉ CANONIQUE (Phase H) → couleur d'onglet
 *  retrouvée via nomOnglet_(cle). ⚠ En 🌙 Nuit les fonds de pastilles sont FONCÉS
 *  (texte clair = INK).
 * ============================================================================ */
var THEMES = {

  rose: {
    NOM: "🌸 Rose / Bleu",
    INK: "#3f3b36", INK2: "#6b655c", MUTED: "#8f887e",
    PAGE: "#f7f3ed", CELL: "#ffffff", HEAD: "#edc6d3",
    LINE: "#e7ded3", LINE2: "#d9cdbf", LINK_TX: "#2e4a7a", LINK_BG: "#eef1f6",
    OVER_BG: "#f7c9d5", OVER_TX: "#a5384f", OK_TX: "#3f8b5f",
    DONE_BG: "#f1efea", DONE_TX: "#b8b2a8",
    STATUT_AFAIRE: "#fbefd4", STATUT_ENCOURS: "#ddeaf7",
    PRIO_HAUTE_BG: "#f6cfd9", PRIO_MOY_BG: "#f3e0a2", PRIO_MOY_TX: "#8a6d1a", PRIO_BAS_BG: "#cbe8d5",
    ASSIGN_A: "#d7e7f6", ASSIGN_B: "#d3eddd", ASSIGN_BOTH: "#e7d8f4",
    TABCOL: {
      APERCU: "#e6a3b3", TACHES: "#a7c5e6", COURSES: "#a6d5b6",
      LOU: "#bcd6f2", MATI: "#bfe3cc", NOUS_DEUX: "#d6c4ef",
      PARAMETRES: "#d7d0c6", LISEZMOI: "#d7d0c6"
    }
  },

  ocean: {
    NOM: "🌊 Bleu / Océan",
    INK: "#223a44", INK2: "#4a6470", MUTED: "#647d8a",
    PAGE: "#eef4f7", CELL: "#ffffff", HEAD: "#bfe0e6",
    LINE: "#d7e7eb", LINE2: "#c4d9de", LINK_TX: "#1f6f8b", LINK_BG: "#e6f1f6",
    OVER_BG: "#f1cdd4", OVER_TX: "#9c3a4c", OK_TX: "#297a6a",
    DONE_BG: "#e6ecef", DONE_TX: "#93a1a8",
    STATUT_AFAIRE: "#cfe9e2", STATUT_ENCOURS: "#cbe3f2",
    PRIO_HAUTE_BG: "#f1cdd4", PRIO_MOY_BG: "#f1e2b0", PRIO_MOY_TX: "#8a6d1a", PRIO_BAS_BG: "#c0e4e2",
    ASSIGN_A: "#cfe6f6", ASSIGN_B: "#d0eee5", ASSIGN_BOTH: "#d7e1f1",
    TABCOL: {
      APERCU: "#7fc9d6", TACHES: "#9cc4e6", COURSES: "#8fd0c0",
      LOU: "#b6d6ea", MATI: "#b6e2d2", NOUS_DEUX: "#a9bfe0",
      PARAMETRES: "#c3d2d6", LISEZMOI: "#c3d2d6"
    }
  },

  sauge: {
    NOM: "🌿 Vert / Sauge",
    INK: "#37413a", INK2: "#5b675b", MUTED: "#757e73",
    PAGE: "#f4f6ee", CELL: "#ffffff", HEAD: "#cfe0c2",
    LINE: "#e2e6d5", LINE2: "#d2d8c3", LINK_TX: "#4c6f3a", LINK_BG: "#edf2ea",
    OVER_BG: "#efd0c8", OVER_TX: "#9c4340", OK_TX: "#43803f",
    DONE_BG: "#eceee6", DONE_TX: "#98a08e",
    STATUT_AFAIRE: "#eef0d6", STATUT_ENCOURS: "#cfe6d6",
    PRIO_HAUTE_BG: "#efd0c8", PRIO_MOY_BG: "#ece0b0", PRIO_MOY_TX: "#7d6320", PRIO_BAS_BG: "#d3e6c8",
    ASSIGN_A: "#cfe2e2", ASSIGN_B: "#d3e6c8", ASSIGN_BOTH: "#e3ddc6",
    TABCOL: {
      APERCU: "#a9cf94", TACHES: "#b6d69a", COURSES: "#9cd0b0",
      LOU: "#c6dcb0", MATI: "#bfe0cc", NOUS_DEUX: "#c0b6d6",
      PARAMETRES: "#cdd0c2", LISEZMOI: "#cdd0c2"
    }
  },

  terracotta: {
    NOM: "🍂 Terracotta / Ambre",
    INK: "#43352c", INK2: "#6b574a", MUTED: "#9a8574",
    PAGE: "#faf1e8", CELL: "#ffffff", HEAD: "#f0c9a8",
    LINE: "#ecdcc9", LINE2: "#ddc9b2", LINK_TX: "#a65a3a", LINK_BG: "#f6ece0",
    OVER_BG: "#f2c7bd", OVER_TX: "#9c3a34", OK_TX: "#5f8f4f",
    DONE_BG: "#efe7dd", DONE_TX: "#a8968a",
    STATUT_AFAIRE: "#f6e3bf", STATUT_ENCOURS: "#f3d9c0",
    PRIO_HAUTE_BG: "#f2c7bd", PRIO_MOY_BG: "#f1e2b0", PRIO_MOY_TX: "#8a6320", PRIO_BAS_BG: "#e2ebc8",
    ASSIGN_A: "#f3d3b0", ASSIGN_B: "#ece0c0", ASSIGN_BOTH: "#ecd0bd",
    TABCOL: {
      APERCU: "#eaa985", TACHES: "#eeb98f", COURSES: "#e6c07f",
      LOU: "#f0c4a0", MATI: "#e6c68a", NOUS_DEUX: "#d8b0a0",
      PARAMETRES: "#d6c6b2", LISEZMOI: "#d6c6b2"
    }
  },

  lila: {
    NOM: "🪻 Lila / Rose",
    INK: "#3b3340", INK2: "#64596b", MUTED: "#7d7086",
    PAGE: "#f6f2f8", CELL: "#ffffff", HEAD: "#e0c6ea",
    LINE: "#e6dcec", LINE2: "#d6c9de", LINK_TX: "#6a4a8a", LINK_BG: "#efe9f6",
    OVER_BG: "#f4cdd8", OVER_TX: "#9c3a5c", OK_TX: "#4f7d5f",
    DONE_BG: "#eee9f0", DONE_TX: "#9a90a2",
    STATUT_AFAIRE: "#f4e2c0", STATUT_ENCOURS: "#d8cff0",
    PRIO_HAUTE_BG: "#f4cdd8", PRIO_MOY_BG: "#f4dca8", PRIO_MOY_TX: "#8a6d1a", PRIO_BAS_BG: "#d6ecd6",
    ASSIGN_A: "#e0d2f2", ASSIGN_B: "#f0d6e6", ASSIGN_BOTH: "#cdc4ea",
    TABCOL: {
      APERCU: "#d3a6dd", TACHES: "#b6b6e6", COURSES: "#c0b0dd",
      LOU: "#c6b6ea", MATI: "#d0c0e6", NOUS_DEUX: "#cbaad6",
      PARAMETRES: "#cdc6d4", LISEZMOI: "#cdc6d4"
    }
  },

  rouge: {
    NOM: "🌹 Rouge / Grenade",
    INK: "#43302f", INK2: "#6e514e", MUTED: "#946f6b",
    PAGE: "#faf0ee", CELL: "#ffffff", HEAD: "#f0b4bf",
    LINE: "#eccfc9", LINE2: "#ddbcb4", LINK_TX: "#a5384f", LINK_BG: "#f6e6e2",
    OVER_BG: "#f4c4cc", OVER_TX: "#9c2f3c", OK_TX: "#5f8f4f",
    DONE_BG: "#efe6e2", DONE_TX: "#a8948e",
    STATUT_AFAIRE: "#f7dcc4", STATUT_ENCOURS: "#f0d6d0",
    PRIO_HAUTE_BG: "#f4c4cc", PRIO_MOY_BG: "#f2dcc6", PRIO_MOY_TX: "#8a5a20", PRIO_BAS_BG: "#e2ecc8",
    ASSIGN_A: "#f6d2cd", ASSIGN_B: "#f3dcc4", ASSIGN_BOTH: "#eecfd6",
    TABCOL: {
      APERCU: "#e79098", TACHES: "#eeab9f", COURSES: "#e6b878",
      LOU: "#f0b0aa", MATI: "#eac090", NOUS_DEUX: "#e0a0b0",
      PARAMETRES: "#d6c2bc", LISEZMOI: "#d6c2bc"
    }
  },

  marron: {
    NOM: "🤎 Marron / Beige",
    INK: "#3f342a", INK2: "#6b5a48", MUTED: "#8c7860",
    PAGE: "#f6f0e6", CELL: "#ffffff", HEAD: "#ddc4a0",
    LINE: "#e6dcc9", LINE2: "#d6c6ac", LINK_TX: "#7a5a3a", LINK_BG: "#efe8dc",
    OVER_BG: "#eccdc0", OVER_TX: "#9c4a3a", OK_TX: "#5f7a3d",
    DONE_BG: "#ece5da", DONE_TX: "#a08d76",
    STATUT_AFAIRE: "#ecdcc0", STATUT_ENCOURS: "#d6dcc0",
    PRIO_HAUTE_BG: "#eccdc0", PRIO_MOY_BG: "#f0d9a0", PRIO_MOY_TX: "#7a5a20", PRIO_BAS_BG: "#dbe6c4",
    ASSIGN_A: "#e3d4b8", ASSIGN_B: "#dce4d0", ASSIGN_BOTH: "#e0cdbc",
    TABCOL: {
      APERCU: "#d4b483", TACHES: "#d6c29a", COURSES: "#cdba8a",
      LOU: "#dcc8a0", MATI: "#cfc4a0", NOUS_DEUX: "#c9b6a0",
      PARAMETRES: "#cdc4b0", LISEZMOI: "#cdc4b0"
    }
  },

  gris: {
    NOM: "🩶 Nuance de gris",
    INK: "#2f3236", INK2: "#565b60", MUTED: "#7a7f84",
    PAGE: "#f2f3f4", CELL: "#ffffff", HEAD: "#d3d7db",
    LINE: "#e2e4e6", LINE2: "#d0d3d6", LINK_TX: "#4a5560", LINK_BG: "#e8eaec",
    OVER_BG: "#e4d6d7", OVER_TX: "#8c4a52", OK_TX: "#5f766a",
    DONE_BG: "#e6e6e6", DONE_TX: "#9a9ea2",
    STATUT_AFAIRE: "#ebe3cc", STATUT_ENCOURS: "#dbe1e6",
    PRIO_HAUTE_BG: "#e4d6d7", PRIO_MOY_BG: "#ebe3cc", PRIO_MOY_TX: "#7a6f4a", PRIO_BAS_BG: "#dce4de",
    ASSIGN_A: "#dbe1e6", ASSIGN_B: "#dce4de", ASSIGN_BOTH: "#e2dee6",
    TABCOL: {
      APERCU: "#b6bcc2", TACHES: "#aab4be", COURSES: "#aeb4b0",
      LOU: "#b6c0c8", MATI: "#b6c2ba", NOUS_DEUX: "#b8b4c0",
      PARAMETRES: "#c4c5c6", LISEZMOI: "#c4c5c6"
    }
  },

  nuit: {
    NOM: "🌙 Sombre / Nuit",
    INK: "#e8e6e1", INK2: "#b9c2cc", MUTED: "#8b95a1",
    PAGE: "#1f2430", CELL: "#232a33", HEAD: "#3a4560",
    LINE: "#3a3f4a", LINE2: "#454b58", LINK_TX: "#8fc4ea", LINK_BG: "#26303f",
    OVER_BG: "#4a2b34", OVER_TX: "#ff9db0", OK_TX: "#7fd3a0",
    DONE_BG: "#2f333c", DONE_TX: "#6a7078",
    STATUT_AFAIRE: "#4a4230", STATUT_ENCOURS: "#26364a",
    PRIO_HAUTE_BG: "#4a2b34", PRIO_MOY_BG: "#4a4230", PRIO_MOY_TX: "#f0cf7a", PRIO_BAS_BG: "#24402f",
    ASSIGN_A: "#263c50", ASSIGN_B: "#244035", ASSIGN_BOTH: "#362a48",
    TABCOL: {
      APERCU: "#7d5a86", TACHES: "#3f6a9a", COURSES: "#3f7a63",
      LOU: "#4a5f8a", MATI: "#45705a", NOUS_DEUX: "#5a5a8a",
      PARAMETRES: "#4a4f58", LISEZMOI: "#4a4f58"
    }
  }

};

// Ordre d'affichage dans le menu 🎨 Thème (le 1er = défaut ; Nuit en dernier).
var THEME_ORDRE = ["rose", "ocean", "sauge", "terracotta", "lila", "rouge", "marron", "gris", "nuit"];
var THEME_PROP  = "THEME";

/* ---- Variables de palette (globales) — (ré)affectées par chargerPalette_() ---- */
var INK, INK2, MUTED, PAGE, CELL, HEAD, LINE, LINE2, LINK_TX, LINK_BG,
    OVER_BG, OVER_TX, OK_TX, DONE_BG, DONE_TX, STATUT_AFAIRE, STATUT_ENCOURS,
    PRIO_HAUTE_BG, PRIO_MOY_BG, PRIO_MOY_TX, PRIO_BAS_BG,
    ASSIGN_A, ASSIGN_B, ASSIGN_BOTH, TABCOL;

/* ============================================================================
 *  MOTEUR DE THÈME (Phase G)
 * ============================================================================ */

/** Id du thème actif (repli sûr sur "rose"). try/catch : ne jamais casser onOpen. */
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
  OVER_BG = T.OVER_BG; OVER_TX = T.OVER_TX; OK_TX = T.OK_TX;
  DONE_BG = T.DONE_BG; DONE_TX = T.DONE_TX;
  STATUT_AFAIRE = T.STATUT_AFAIRE; STATUT_ENCOURS = T.STATUT_ENCOURS;
  PRIO_HAUTE_BG = T.PRIO_HAUTE_BG; PRIO_MOY_BG = T.PRIO_MOY_BG; PRIO_MOY_TX = T.PRIO_MOY_TX;
  PRIO_BAS_BG = T.PRIO_BAS_BG;
  ASSIGN_A = T.ASSIGN_A; ASSIGN_B = T.ASSIGN_B; ASSIGN_BOTH = T.ASSIGN_BOTH;
  TABCOL = T.TABCOL;
}

// Charge la palette du thème actif dès l'évaluation du script (à chaque exécution).
chargerPalette_();

/**
 * Applique un thème : mémorise le choix, recharge la palette, puis re-formate
 * tout le classeur (formaterTodo_) + régénère le Lisez-moi. Instantané,
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
    appliquerThemeTodo_();             // re-formatage non destructif (04_Design.gs)
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
 *  Même patron que Budget_familial/00_Constantes.gs — voir ce fichier pour
 *  l'explication détaillée. Résumé :
 *   · `LANGUES[langue].ONGLETS[cle]` — nom RÉEL de l'onglet dans cette langue.
 *   · `nomOnglet_(cle)` / `t_(cle)` — accès à la langue active.
 *   · `appliquerLangue(id)` — mémorise + RENOMME les onglets (décision Mathis :
 *     renommage complet, pas un simple affichage).
 *  ÉTAT : cadre + 🇫🇷 fr = référence complète (comportement inchangé).
 *  🇬🇧 en / 🇪🇸 es : à compléter (même étape que sur le Budget).
 * ============================================================================ */

var LANGUES = {
  fr: {
    NOM: "🇫🇷 Français",
    ONGLETS: {
      REPONSES_FORM: "Réponses au formulaire 1",
      LISEZMOI:      "Lisez-moi",
      APERCU:        "Aperçu",
      TACHES:        "Tâches",
      COURSES:       "Courses",
      PARAMETRES:    "Paramètres",
      LOU:           "Lou",
      MATI:          "Mati",
      NOUS_DEUX:     "Nous deux"
    },
    UI: {
      MENU_TITRE: "✅ To-Do",
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
