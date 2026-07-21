/**
 * TO-DO FAMILIALE — FORMULAIRE COURSES (ajout rapide de plusieurs articles)
 * ========================================================================
 * Formulaire Google « Ajouter aux courses » à épingler sur le téléphone : on
 * tape plusieurs articles (un par ligne, ou séparés par des virgules), on
 * envoie → tous s'ajoutent à l'onglet Courses (cochables). Un article déjà
 * présent et non coché n'est pas dupliqué.
 *
 * Ce formulaire est AUTONOME (non lié à la feuille) : son déclencheur ouvre la
 * feuille par son ID (TODO_ID, voir 00_Constantes.gs) pour écrire dans Courses.
 *
 * INSTALLATION (une seule fois) : menu ✅ To-Do ▸ ⚙️ Configuration ▸
 *   « 🛒 Créer le formulaire Courses » (ou exécuter `creerFormulaireCourses`).
 * Déclencheur installé : surAjoutCourses (onFormSubmit du formulaire Courses).
 * Helper `supprimerDeclencheurs_` → voir 07_Utils.gs.
 *
 * Phase D (2026-07-16) : le lien du formulaire est mémorisé dans la propriété
 * COURSES_FORM_LINK et l'onglet Lisez-moi est régénéré (section ④) via
 * `remplirLisezMoi()` (08_LisezMoi.gs). Logique du formulaire INCHANGÉE.
 * `enregistrerLienCourses()` permet de renseigner le lien d'un formulaire Courses
 * DÉJÀ existant (sans en recréer un) — utile pour un fichier créé avant la Phase D.
 */

function creerFormulaireCourses() {
  // 1) le formulaire
  var form = FormApp.create("Ajouter aux courses");
  form.setDescription("Écris un article par ligne (ou séparés par des virgules). Ils s'ajoutent à la liste de courses.");
  form.setConfirmationMessage("Ajouté à la liste de courses ✓");
  form.setCollectEmail(false);
  form.setLimitOneResponsePerUser(false);
  form.setAllowResponseEdits(false);

  form.addParagraphTextItem().setTitle("Articles (un par ligne)").setRequired(true);
  form.addListItem().setTitle("Rayon (facultatif — appliqué à tous)")
      .setChoiceValues(["(aucun)", "Fruits & légumes", "Frais", "Épicerie", "Surgelés",
                        "Boissons", "Hygiène", "Maison", "Bébé", "Autre"]);

  // 2) le déclencheur qui traite chaque envoi
  supprimerDeclencheurs_(["surAjoutCourses"]);
  ScriptApp.newTrigger("surAjoutCourses").forForm(form).onFormSubmit().create();

  // 3) le lien : mémorisé en propriété + Lisez-moi régénéré (section ④)
  var url = form.getPublishedUrl();
  var court = url;
  try { court = form.shortenFormUrl(url); } catch (e) {}
  Logger.log("Lien du formulaire : " + court);
  PropertiesService.getDocumentProperties().setProperty("COURSES_FORM_LINK", court);
  try { remplirLisezMoi(); } catch (e) { /* le Lisez-moi se régénère depuis son menu */ }

  try {
    SpreadsheetApp.getUi().alert(
      "Formulaire « Ajouter aux courses » créé ✓\n\n" +
      "Lien à épingler sur le téléphone (et à partager avec Lou) :\n" + court + "\n\n" +
      "Il est aussi noté dans l'onglet Lisez-moi (section ④) et dans ton Drive.");
  } catch (e) {
    Logger.log("Formulaire créé. Lien : " + court);
  }
}

/**
 * Enregistre le lien d'un formulaire « Ajouter aux courses » DÉJÀ existant, sans
 * en recréer un. À utiliser sur un fichier créé avant la Phase D (où le lien
 * n'était pas mémorisé). Le lien saisi est stocké dans COURSES_FORM_LINK puis
 * affiché dans l'onglet Lisez-moi (section ④).
 */
function enregistrerLienCourses() {
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();
  var actuel = props.getProperty("COURSES_FORM_LINK") || "";

  var rep = ui.prompt(
    "🔗 Enregistrer le lien du formulaire Courses",
    "Colle ici l'adresse de TON formulaire « Ajouter aux courses » déjà existant.\n" +
    "(Depuis le formulaire : bouton « Envoyer » ▸ onglet lien 🔗 ▸ Copier.)\n\n" +
    (actuel ? "Lien actuellement enregistré :\n" + actuel + "\n\n" : "") +
    "⚠ Cette action NE crée PAS de nouveau formulaire : elle mémorise seulement\n" +
    "le lien pour l'afficher dans l'onglet Lisez-moi (section ④).\n\n" +
    "Colle le lien puis clique OK :",
    ui.ButtonSet.OK_CANCEL);
  if (rep.getSelectedButton() !== ui.Button.OK) { return; }

  var url = String(rep.getResponseText()).trim();
  if (!/^https?:\/\/\S+/.test(url)) {
    ui.alert("Lien non enregistré.\n\nCe n'est pas une adresse valide : elle doit commencer par « http ».");
    return;
  }

  props.setProperty("COURSES_FORM_LINK", url);
  try { remplirLisezMoi(); } catch (e) { /* le Lisez-moi se régénère depuis son menu */ }
  ui.alert("✅ Lien du formulaire Courses enregistré.\n\n" +
           "Il apparaît maintenant dans l'onglet Lisez-moi (section ④).");
}

function surAjoutCourses(e) {
  // récupère les réponses
  var articles = "", rayon = "";
  var reps = e.response.getItemResponses();
  for (var i = 0; i < reps.length; i++) {
    var titre = reps[i].getItem().getTitle().toLowerCase();
    if (titre.indexOf("article") !== -1)   articles = reps[i].getResponse();
    else if (titre.indexOf("rayon") !== -1) rayon = reps[i].getResponse();
  }
  if (!rayon || rayon === "(aucun)") rayon = "";

  // découpe en articles (ligne, virgule ou point-virgule)
  var brut = String(articles).split(/[\n;,]+/);
  var propres = [];
  for (var j = 0; j < brut.length; j++) { var a = brut[j].trim(); if (a) propres.push(a); }
  if (!propres.length) return;

  var cs = SpreadsheetApp.openById(TODO_ID).getSheetByName(nomOnglet_('COURSES'));
  if (!cs) return;

  // articles déjà présents ET non cochés -> on évite le doublon
  var existants = {};
  var last = cs.getLastRow();
  if (last >= 2) {
    var data = cs.getRange(2, 1, last - 1, 2).getValues(); // A=Fait, B=Article
    for (var d = 0; d < data.length; d++) {
      var fait = (data[d][0] === true);
      var art  = String(data[d][1]).trim().toLowerCase();
      if (!fait && art) existants[art] = true;
    }
  }

  var rows = [];
  for (var k = 0; k < propres.length; k++) {
    var key = propres[k].toLowerCase();
    if (existants[key]) continue;
    existants[key] = true;                 // évite aussi les doublons dans le même envoi
    rows.push([propres[k], rayon]);
  }
  if (!rows.length) return;

  var start = cs.getLastRow() + 1;
  cs.getRange(start, 2, rows.length, 2).setValues(rows);    // B=Article, C=Rayon
  cs.getRange(start, 1, rows.length, 1).insertCheckboxes();  // A=Fait (cases décochées)
  SpreadsheetApp.flush();
}
