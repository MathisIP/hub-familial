/**
 * TO-DO FAMILIALE — INITIALISATION (Phase C — assistant d'installation)
 * ====================================================================
 * Permet à un NOUVEAU foyer de tout mettre en place « en quelques clics », sans
 * ouvrir l'éditeur Apps Script. 3 actions, dans le menu ✅ To-Do ▸ ⚙️ Configuration :
 *
 *   · initialiserTodo()            → 🚀 enchaîne les briques existantes.
 *   · verifierTodo()               → 🔍 diagnostic (ne modifie RIEN).
 *   · reinitialiserExemplesTodo()  → ♻️ remet des tâches / courses d'EXEMPLE
 *                                     (protégé par une confirmation tapée).
 *
 * Ces fonctions réutilisent les fonctions publiques déjà testées
 * (configurerTodo, installerTodoPlus, configurerValidation, creerFormulaireCourses).
 * Elles n'ajoutent aucune logique métier — elles orchestrent l'existant.
 * Constantes (VUES) → 00_Constantes.gs. Helpers (lire_) → 07_Utils.gs.
 *
 * Phase D (2026-07-16) : l'installation se termine par `remplirLisezMoi()`
 * (mode d'emploi enrichi de l'onglet Lisez-moi), et la vérification contrôle
 * que ce Lisez-moi a bien été généré.
 */

/* ================================================================
 *  🚀 INSTALLATION COMPLÈTE
 * ================================================================ */
function initialiserTodo() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "🚀 Installer / configurer la To-Do familiale",
    "Cet assistant met tout en place en une fois :\n\n" +
    "  1. Mise en forme (cases à cocher + couleurs)\n" +
    "  2. Formulaire d'ajout de tâche + récurrences + rappels\n" +
    "  3. Validation depuis Lou / Mati / Nous deux\n" +
    "  4. Formulaire d'ajout aux courses\n" +
    "  5. Lisez-moi (mode d'emploi complet)\n\n" +
    "👉 Tu verras plusieurs confirmations : clique OK à chaque étape.\n" +
    "👉 L'étape 2 demande tes adresses e-mail (pour les rappels) et\n" +
    "    une autorisation Google.\n\n" +
    "Lancer l'installation complète ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep !== ui.Button.OK) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  function etape(nom, fn) {
    try { ss.toast(nom + "…", "🚀 Installation", 5); fn(); log.push("✔ " + nom); }
    catch (e) { log.push("✘ " + nom + " — " + (e && e.message ? e.message : e)); }
  }

  etape("1. Mise en forme",               configurerTodo);
  etape("2. Formulaire tâche + rappels",  installerTodoPlus);
  etape("3. Validation (vues perso)",     configurerValidation);
  etape("4. Formulaire Courses",          creerFormulaireCourses);
  etape("5. Lisez-moi (mode d'emploi)",   remplirLisezMoi);

  SpreadsheetApp.flush();
  ui.alert(
    "✅ Installation de la To-Do terminée\n\n" +
    log.join("\n") +
    "\n\n— À VÉRIFIER —\n" +
    "• Onglet Paramètres : tes personnes, catégories, priorités et récurrences.\n" +
    "• Épingle les 2 formulaires (tâche + courses) sur les téléphones\n" +
    "  (liens dans l'onglet Lisez-moi, section ④).\n\n" +
    "Astuce : « 🔍 Vérifier la configuration » fait le point à tout moment.");
}

/* ================================================================
 *  🔍 VÉRIFICATION (ne modifie rien)
 * ================================================================ */
function verifierTodo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getDocumentProperties();
  var L = [];
  function ok(c, t) { L.push((c ? "✅ " : "❌ ") + t); }

  ["TACHES", "COURSES", "PARAMETRES"].forEach(function (cle) {
    var n = nomOnglet_(cle);
    ok(!!ss.getSheetByName(n), "Onglet « " + n + " » présent");
  });
  VUES_CLES.forEach(function (cle) {
    var n = nomOnglet_(cle);
    ok(!!ss.getSheetByName(n), "Onglet vue « " + n + " » présent");
  });

  // Lisez-moi enrichi (Phase D) : présent ET généré (titre « Mode d'emploi » en B2)
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  var lmRempli = lm && String(lm.getRange("B2").getValue()).indexOf("Mode d'emploi") !== -1;
  ok(!!lmRempli, "Onglet Lisez-moi enrichi (mode d'emploi généré)");

  // Validation activée : la colonne « Fait ? » (F1) est posée sur les vues perso
  var lou = ss.getSheetByName(nomOnglet_('LOU'));
  ok(lou && String(lou.getRange("F1").getValue()).trim() === "Fait ?",
     "Validation activée (colonne « Fait ? » sur les vues perso)");

  // Destinataires + formulaire tâche
  ok(!!props.getProperty("TODO_EMAILS"), "Adresses e-mail des rappels renseignées");
  var fOk = false, fid = props.getProperty("TODO_FORM_ID");
  if (fid) { try { FormApp.openById(fid); fOk = true; } catch (e) { fOk = false; } }
  ok(fOk, "Formulaire « Ajouter une tâche » créé");

  // Déclencheurs attendus
  var attendus = ["surEnvoiTache", "surEditionTache", "validerDepuisOnglet",
                  "surAjoutCourses", "rappelsTodo"];
  var presents = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { presents[t.getHandlerFunction()] = true; });
  var manque = attendus.filter(function (f) { return !presents[f]; });
  ok(manque.length === 0,
     "Déclencheurs installés (" + (attendus.length - manque.length) + "/" + attendus.length + ")" +
     (manque.length ? " — manquant(s) : " + manque.join(", ") : ""));

  SpreadsheetApp.getUi().alert("🔍 Vérification — To-Do familiale\n\n" + L.join("\n"));
}

/* ================================================================
 *  ♻️ RÉINITIALISER LES EXEMPLES (destructif — confirmation tapée)
 * ================================================================ */
function reinitialiserExemplesTodo() {
  var ui = SpreadsheetApp.getUi();
  if (!confirmerReset_(ui, "les onglets Tâches et Courses")) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var par = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  var log = [];

  // Valeurs cohérentes lues dans Paramètres (sinon repli neutre)
  var pers = par ? lire_(par, 2) : [];
  var prio = par ? lire_(par, 3) : [];
  var cats = par ? lire_(par, 5) : [];
  function pick(a, i, def) { return (a && a.length) ? a[i % a.length] : def; }

  var au = new Date();
  function jour(d) { return new Date(au.getFullYear(), au.getMonth(), au.getDate() + d); }

  // --- Tâches : vider puis écrire des exemples ---
  var ta = ss.getSheetByName(nomOnglet_('TACHES'));
  if (ta) {
    if (ta.getLastRow() > 1) { ta.getRange(2, 1, ta.getLastRow() - 1, 8).clearContent(); }
    var exTa = [
      ["À faire", "EXEMPLE — Réserver le restaurant", pick(pers, 0, ""),
        pick(cats, 0, ""), pick(prio, 1, "Moyenne"), jour(3),  "Aucune", "Exemple"],
      ["À faire", "EXEMPLE — Prendre un RDV",          pick(pers, 1, ""),
        pick(cats, 1, ""), pick(prio, 0, "Haute"),   jour(7),  "Aucune", "Exemple"],
      ["En cours", "EXEMPLE — Ranger le garage",       VUES_ASSIGNE.NOUS_DEUX,
        pick(cats, 0, ""), pick(prio, 2, "Basse"),   jour(-1), "Aucune", "Exemple (en retard)"]
    ];
    ta.getRange(2, 1, exTa.length, 8).setValues(exTa);
    ta.getRange(2, 6, exTa.length, 1).setNumberFormat("dd/mm/yyyy");
    log.push("✔ Tâches : " + exTa.length + " exemples");
  }

  // --- Courses : vider puis écrire des exemples (avec cases à cocher) ---
  var cs = ss.getSheetByName(nomOnglet_('COURSES'));
  if (cs) {
    if (cs.getLastRow() > 1) { cs.getRange(2, 1, cs.getLastRow() - 1, 3).clearContent(); }
    var exCs = [["Pain", "Épicerie"], ["Lait", "Frais"],
                ["Œufs", "Frais"], ["Pommes", "Fruits & légumes"]];
    cs.getRange(2, 2, exCs.length, 2).setValues(exCs);          // B = Article, C = Rayon
    cs.getRange(2, 1, exCs.length, 1).insertCheckboxes();        // A = Fait
    log.push("✔ Courses : " + exCs.length + " exemples");
  }

  SpreadsheetApp.flush();
  ui.alert(
    "♻️ Exemples réinitialisés — To-Do\n\n" + log.join("\n") +
    "\n\nNon touché : Paramètres et les vues perso (Lou / Mati / Nous deux),\n" +
    "qui se remplissent toutes seules via leurs formules QUERY.");
}

/* ================================================================
 *  Garde-fou commun aux actions destructives
 * ================================================================ */
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
