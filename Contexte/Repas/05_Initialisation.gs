/**
 * REPAS_SEMAINE — INITIALISATION (Phase C — assistant d'installation)
 * ==================================================================
 * Permet à un NOUVEAU foyer de tout mettre en place « en quelques clics », sans
 * ouvrir l'éditeur Apps Script. 3 actions, dans le menu 🍽️ Repas ▸ ⚙️ Configuration :
 *
 *   · initialiserRepas()            → 🚀 enchaîne les briques existantes.
 *   · verifierRepas()               → 🔍 diagnostic (ne modifie RIEN).
 *   · reinitialiserExemplesRepas()  → ♻️ remet des recettes / dîners d'EXEMPLE
 *                                     (protégé par une confirmation tapée).
 *
 * Réutilise les fonctions publiques déjà testées (ajouterCategoriesRecettes,
 * configurerCouleursRecettes, configurerListes, harmoniserRepas).
 * Constantes (TODO_ID, JOUR_*) → 00_Constantes.gs.
 *
 * Phase D (2026-07-16) : l'installation se termine par `remplirLisezMoi()`
 * (mode d'emploi enrichi de l'onglet Lisez-moi), et la vérification contrôle
 * que ce Lisez-moi a bien été généré.
 */

/* ================================================================
 *  🚀 INSTALLATION COMPLÈTE
 * ================================================================ */
function initialiserRepas() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "🚀 Installer / configurer les Repas de la semaine",
    "Cet assistant met tout en place en une fois :\n\n" +
    "  1. Colonnes « Type » + « Chaud / Froid » sur les recettes\n" +
    "  2. Couleurs des recettes\n" +
    "  3. Liste déroulante « Dîner » sur l'onglet Semaine\n" +
    "  4. Harmonisation charte pastel (typo, en-têtes, onglets)\n" +
    "  5. Lisez-moi (mode d'emploi complet)\n\n" +
    "👉 Tu verras plusieurs confirmations : clique OK à chaque étape.\n\n" +
    "Lancer l'installation complète ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep !== ui.Button.OK) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  function etape(nom, fn) {
    try { ss.toast(nom + "…", "🚀 Installation", 5); fn(); log.push("✔ " + nom); }
    catch (e) { log.push("✘ " + nom + " — " + (e && e.message ? e.message : e)); }
  }

  // Catégories d'abord (elles ajoutent des colonnes), puis couleurs, listes, puis
  // l'harmonisation (ses en-têtes couvrent la disposition finale) ; le Lisez-moi en dernier.
  etape("1. Catégories des recettes",  ajouterCategoriesRecettes);
  etape("2. Couleurs des recettes",    configurerCouleursRecettes);
  etape("3. Liste déroulante Dîner",   configurerListes);
  etape("4. Harmonisation pastel",     harmoniserRepas);
  etape("5. Lisez-moi (mode d'emploi)", remplirLisezMoi);

  SpreadsheetApp.flush();
  ui.alert(
    "✅ Installation des Repas terminée\n\n" +
    log.join("\n") +
    "\n\n— BON À SAVOIR —\n" +
    "• Recherche des recettes : par filtre (Données ▸ Créer un filtre) ou la\n" +
    "  formule QUERY de l'onglet Recherche — voir le Lisez-moi, section ⑥.\n" +
    "• (Phase E) Renseigner TODO_ID pour le bouton « Envoyer vers les courses ».\n\n" +
    "Astuce : « 🔍 Vérifier la configuration » fait le point à tout moment.");
}

/* ================================================================
 *  🔍 VÉRIFICATION (ne modifie rien)
 * ================================================================ */
function verifierRepas() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = [];
  function ok(c, t)  { L.push((c ? "✅ " : "❌ ") + t); }
  function warn(t)   { L.push("⚠️ " + t); }

  var sem = ss.getSheetByName(nomOnglet_('SEMAINE'));
  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  ok(!!sem, "Onglet « Semaine » présent");
  ok(!!rec, "Onglet « Recettes » présent");

  // Lisez-moi enrichi (Phase D) : présent ET généré (titre « Mode d'emploi » en B2)
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  var lmRempli = lm && String(lm.getRange("B2").getValue()).indexOf("Mode d'emploi") !== -1;
  ok(!!lmRempli, "Onglet Lisez-moi enrichi (mode d'emploi généré)");

  // Colonnes de catégories posées ?
  var colType = rec ? colParEntete_(rec, "type") : 0;
  ok(colType > 0, "Colonne « Type » présente sur Recettes");

  // Liste déroulante « Dîner » posée ?
  if (sem) {
    var colDiner = colParEntete_(sem, "îner", 7) || 3;
    var dv = sem.getRange(JOUR_LIGNE_DEBUT, colDiner).getDataValidation();
    ok(!!dv, "Liste déroulante « Dîner » posée sur Semaine");
  }

  // Lien vers la liste de courses (TODO_ID) accessible ?
  try {
    var nom = SpreadsheetApp.openById(TODO_ID).getName();
    ok(true, "Fichier de courses accessible (« " + nom + " »)");
  } catch (e) {
    warn("Fichier de courses (TODO_ID) inaccessible — vérifie l'ID / tes autorisations");
  }

  L.push("• Aucun déclencheur requis pour ce fichier.");
  SpreadsheetApp.getUi().alert("🔍 Vérification — Repas de la semaine\n\n" + L.join("\n"));
}

/* ================================================================
 *  ♻️ RÉINITIALISER LES EXEMPLES (destructif — confirmation tapée)
 * ================================================================ */
function reinitialiserExemplesRepas() {
  var ui = SpreadsheetApp.getUi();
  if (!confirmerReset_(ui, "les onglets Recettes et Semaine (dîners)")) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  // Recettes d'exemple : nom, ingrédients ("article | rayon" par ligne), Type, Chaud/Froid
  var RECETTES = [
    ["Pâtes bolognaise",      "Pâtes | Épicerie\nViande hachée | Frais\nSauce tomate | Épicerie\nOignon | Fruits & légumes", "Viande",     "Chaud"],
    ["Poulet rôti & légumes", "Poulet | Frais\nPommes de terre | Fruits & légumes\nCarottes | Fruits & légumes",             "Viande",     "Chaud"],
    ["Curry de pois chiches", "Pois chiches | Épicerie\nLait de coco | Épicerie\nCurry | Épicerie\nRiz | Épicerie",           "Végétarien", "Chaud"],
    ["Omelette & salade",     "Œufs | Frais\nSalade | Fruits & légumes\nVinaigrette | Épicerie",                             "Végétarien", "Chaud"],
    ["Saumon & riz",          "Pavé de saumon | Frais\nRiz | Épicerie\nCitron | Fruits & légumes",                           "Poisson",    "Chaud"],
    ["Soupe & tartines",      "Soupe de légumes | Épicerie\nPain | Épicerie\nFromage | Frais",                               "Végétarien", "Chaud"],
    ["Tacos maison",          "Tortillas | Épicerie\nViande hachée | Frais\nCheddar | Frais\nSalade | Fruits & légumes",     "Viande",     "Chaud"],
    ["Risotto champignons",   "Riz arborio | Épicerie\nChampignons | Fruits & légumes\nParmesan | Frais\nBouillon | Épicerie","Végétarien", "Chaud"]
  ];

  // --- Recettes : vider puis réécrire (robuste à la disposition des colonnes) ---
  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  if (rec) {
    var lastCol = Math.max(rec.getLastColumn(), 5);
    if (rec.getLastRow() > 1) { rec.getRange(2, 1, rec.getLastRow() - 1, lastCol).clearContent(); }
    var cType = colParEntete_(rec, "type");
    var cCF   = colParEntete_(rec, "chaud") || colParEntete_(rec, "froid");
    var cNote = colParEntete_(rec, "note");
    for (var i = 0; i < RECETTES.length; i++) {
      var r = 2 + i;
      rec.getRange(r, 1).setValue(RECETTES[i][0]);   // A = Recette
      rec.getRange(r, 2).setValue(RECETTES[i][1]);   // B = Ingrédients
      if (cType) { rec.getRange(r, cType).setValue(RECETTES[i][2]); }
      if (cCF)   { rec.getRange(r, cCF).setValue(RECETTES[i][3]); }
      if (cNote) { rec.getRange(r, cNote).setValue("Exemple"); }
    }
    log.push("✔ Recettes : " + RECETTES.length + " exemples" +
             (cType ? " (catégorisés)" : " (lance « Ajouter les catégories » pour les colorer)"));
  }

  // --- Semaine : proposer 7 dîners d'exemple dans la colonne « Dîner » ---
  var sem = ss.getSheetByName(nomOnglet_('SEMAINE'));
  if (sem) {
    var colDiner = colParEntete_(sem, "îner", 7) || 3;
    for (var d = 0; d < JOUR_NB; d++) {
      sem.getRange(JOUR_LIGNE_DEBUT + d, colDiner).setValue(RECETTES[d % RECETTES.length][0]);
    }
    log.push("✔ Semaine : " + JOUR_NB + " dîners d'exemple");
  }

  SpreadsheetApp.flush();
  ui.alert(
    "♻️ Exemples réinitialisés — Repas\n\n" + log.join("\n") +
    "\n\nRelance « 🛒 Envoyer les ingrédients vers ma liste de courses »\n" +
    "pour voir la chaîne complète fonctionner.");
}

/* ================================================================
 *  Helpers Phase C
 * ================================================================ */

/**
 * Renvoie l'index (1-based) de la 1re colonne dont l'en-tête CONTIENT `motcle`
 * (insensible à la casse), ou 0 si absente. `ligneEntete` = ligne des en-têtes
 * (1 par défaut ; 7 pour l'onglet Semaine).
 */
function colParEntete_(sh, motcle, ligneEntete) {
  var lig = ligneEntete || 1;
  var largeur = Math.max(sh.getLastColumn(), 1);
  var entetes = sh.getRange(lig, 1, 1, largeur).getValues()[0];
  motcle = String(motcle).toLowerCase();
  for (var c = 0; c < entetes.length; c++) {
    if (String(entetes[c]).toLowerCase().indexOf(motcle) !== -1) { return c + 1; }
  }
  return 0;
}

/** Garde-fou commun aux actions destructives. */
function confirmerReset_(ui, cible) {
  var rep = ui.prompt(
    "⚠️ Réinitialiser les exemples",
    "Cette action EFFACE le contenu actuel de : " + cible + "\n" +
    "et le remplace par des données d'EXEMPLE.\n\n" +
    "À utiliser sur une COPIE vierge (gabarit), PAS sur ton fichier en service.\n\n" +
    "Pour confirmer, tape  RESET  puis clique OK :",
    ui.ButtonSet.OK_CANCEL);
  return rep.getSelectedButton() === ui.Button.OK &&
         String(rep.getResponseText()).trim().toUpperCase() === "RESET";
}
