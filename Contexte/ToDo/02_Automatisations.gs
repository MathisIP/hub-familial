/**
 * TO-DO FAMILIALE — FORMULAIRE (ajout de tâche) + RÉCURRENCES + RAPPELS
 * ====================================================================
 *   1. FORMULAIRE pour ajouter une tâche en 10 s depuis le téléphone.
 *   2. RÉCURRENCES : une tâche récurrente cochée « Fait » recrée automatiquement
 *      sa prochaine occurrence (à la bonne date).
 *   3. RAPPELS : un e-mail chaque matin (8 h) listant les tâches en retard, du
 *      jour et du lendemain.
 *
 * INSTALLATION (une seule fois) : menu ✅ To-Do ▸ ⚙️ Configuration ▸
 *   « 🔔 Installer formulaire tâche + rappels » (ou exécuter `installerTodoPlus`).
 *
 * Déclencheurs installés : surEnvoiTache (onFormSubmit), surEditionTache (onEdit),
 *                          rappelsTodo (quotidien 8 h).
 * Helpers communs (lire_, supprimerDeclencheurs_, dateSeule_, parseDate_,
 * prochaineDate_) → voir 07_Utils.gs.
 *
 * Phase D (2026-07-16) : le lien du formulaire n'est plus écrit en dur dans
 * Lisez-moi (B28). Il reste mémorisé dans la propriété TODO_FORM_LINK, et
 * l'onglet Lisez-moi est régénéré par `remplirLisezMoi()` (08_LisezMoi.gs), qui
 * affiche ce lien dans sa section ④. Logique du formulaire INCHANGÉE.
 */

function installerTodoPlus() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();
  var log = [];

  // 1) destinataires des rappels
  var rep = ui.prompt("Rappels par e-mail",
    "Adresses (toi + Lou), séparées par une virgule :", ui.ButtonSet.OK_CANCEL);
  if (rep.getSelectedButton() !== ui.Button.OK) return;
  var emails = rep.getResponseText().split(",").map(function (s) { return s.trim(); })
    .filter(function (s) { return s.indexOf("@") > 0; }).join(",");
  if (emails) { props.setProperty("TODO_EMAILS", emails); log.push("✔ Rappels e-mail : " + emails); }
  else { log.push("• Rappels e-mail ignorés (aucune adresse valide)"); }

  // 2) formulaire
  try { creerFormulaireTodo_(ss); log.push("✔ Formulaire créé"); }
  catch (e) { log.push("✘ Formulaire : " + e.message); }

  // 3) récurrences (déclencheur onEdit)
  try {
    supprimerDeclencheurs_(["surEditionTache"]);
    ScriptApp.newTrigger("surEditionTache").forSpreadsheet(ss).onEdit().create();
    log.push("✔ Récurrences automatiques activées");
  } catch (e) { log.push("✘ Récurrences : " + e.message); }

  // 4) rappels quotidiens (déclencheur horaire)
  try {
    supprimerDeclencheurs_(["rappelsTodo"]);
    ScriptApp.newTrigger("rappelsTodo").timeBased().everyDays(1).atHour(8).create();
    log.push("✔ Rappels quotidiens à 8 h");
  } catch (e) { log.push("✘ Rappels : " + e.message); }

  var lien = props.getProperty("TODO_FORM_LINK") || "(voir onglet Lisez-moi)";
  ui.alert("To-Do boostée !\n\n" + log.join("\n") +
    "\n\nFORMULAIRE à épingler sur les téléphones :\n" + lien +
    "\n\n(Il est aussi noté dans l'onglet Lisez-moi, section ④.)");
}

/* ------------------------- FORMULAIRE ------------------------- */
function creerFormulaireTodo_(ss) {
  var props = PropertiesService.getDocumentProperties();
  var old = props.getProperty("TODO_FORM_ID");
  if (old) { try { FormApp.openById(old); return; } catch (e) { props.deleteProperty("TODO_FORM_ID"); } }

  var par = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  var personnes = lire_(par, 2), priorites = lire_(par, 3),
      recurrences = lire_(par, 4), categories = lire_(par, 5);

  var form = FormApp.create("To-Do familiale — Ajouter une tâche");
  form.setDescription("Ajoute une tâche à la to-do en quelques secondes.");
  form.setConfirmationMessage("C'est ajouté à la to-do !");
  form.addTextItem().setTitle("Tâche").setRequired(true);
  form.addListItem().setTitle("Assigné à").setChoiceValues(personnes).setRequired(true);
  form.addListItem().setTitle("Catégorie").setChoiceValues(categories).setRequired(true);
  form.addListItem().setTitle("Priorité").setChoiceValues(priorites).setRequired(true);
  form.addDateItem().setTitle("Échéance").setRequired(false);
  form.addListItem().setTitle("Récurrence").setChoiceValues(recurrences).setRequired(false);
  form.addTextItem().setTitle("Note").setRequired(false);

  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  ScriptApp.newTrigger("surEnvoiTache").forSpreadsheet(ss).onFormSubmit().create();
  props.setProperty("TODO_FORM_ID", form.getId());

  SpreadsheetApp.flush(); Utilities.sleep(1500);
  ss.getSheets().forEach(function (sh) { try { if (sh.getFormUrl()) sh.hideSheet(); } catch (e) {} });

  // Lien mémorisé en propriété + Lisez-moi régénéré (affiche le lien à jour, section ④).
  var lien = form.shortenFormUrl(form.getPublishedUrl());
  props.setProperty("TODO_FORM_LINK", lien);
  try { remplirLisezMoi(); } catch (e) { /* le Lisez-moi se régénère depuis son menu */ }
}

/** Routage : chaque envoi du formulaire devient une ligne de l'onglet Tâches. */
function surEnvoiTache(e) {
  if (!e || !e.namedValues) return;
  var v = function (t) { var a = e.namedValues[t]; return (a && a[0]) ? String(a[0]).trim() : ""; };
  var tache = v("Tâche"); if (!tache) return;
  var ech = parseDate_(v("Échéance"));
  var rec = v("Récurrence") || "Aucune";
  var ta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomOnglet_('TACHES'));
  ta.appendRow(["À faire", tache, v("Assigné à"), v("Catégorie"), v("Priorité"),
                ech || "", rec, v("Note")]);
  var r = ta.getLastRow();
  if (ech) ta.getRange(r, 6).setNumberFormat("dd/mm/yyyy");
}

/* ------------------------- RÉCURRENCES ------------------------- */
/** Quand un Statut passe à « Fait » sur une tâche récurrente, crée la suivante. */
function surEditionTache(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  if (sh.getName() !== nomOnglet_('TACHES')) return;
  if (e.range.getColumn() !== 1 || e.range.getRow() < 2) return;   // colonne Statut
  if (String(e.value) !== "Fait") return;

  var row = e.range.getRow();
  var d = sh.getRange(row, 1, 1, 8).getValues()[0];               // A..H
  var rec = String(d[6]).trim().toLowerCase();
  if (["hebdomadaire", "mensuelle", "annuelle"].indexOf(rec) === -1) return;

  var base = (d[5] instanceof Date) ? d[5] : new Date();
  var next = prochaineDate_(base, rec);
  sh.appendRow(["À faire", d[1], d[2], d[3], d[4], next, d[6], d[7]]);
  sh.getRange(sh.getLastRow(), 6).setNumberFormat("dd/mm/yyyy");
}

/* --------------------------- RAPPELS --------------------------- */
function rappelsTodo() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dest = PropertiesService.getDocumentProperties().getProperty("TODO_EMAILS");
  var ta = ss.getSheetByName(nomOnglet_('TACHES'));
  if (!dest || !ta || ta.getLastRow() < 2) return;

  var data = ta.getRange(2, 1, ta.getLastRow() - 1, 8).getValues();
  var today = dateSeule_(new Date());
  var retard = [], auj = [], demain = [];
  data.forEach(function (row) {
    var statut = String(row[0]).trim(), tache = String(row[1]).trim(),
        qui = String(row[2]).trim(), ech = row[5];
    if (!tache || statut === "Fait" || !(ech instanceof Date)) return;
    var j = Math.round((dateSeule_(ech) - today) / 86400000);
    var ligne = "· " + tache + (qui ? " — " + qui : "");
    if (j < 0) retard.push(ligne); else if (j === 0) auj.push(ligne); else if (j === 1) demain.push(ligne);
  });
  if (!retard.length && !auj.length && !demain.length) return;

  var html = "<div style='font-family:Arial'><h2 style='color:#2e4a7a'>To-Do familiale — rappels</h2>";
  if (retard.length) html += "<p><b style='color:#b3392e'>En retard</b><br>" + retard.join("<br>") + "</p>";
  if (auj.length)    html += "<p><b>Aujourd'hui</b><br>" + auj.join("<br>") + "</p>";
  if (demain.length) html += "<p><b>Demain</b><br>" + demain.join("<br>") + "</p>";
  html += "<p style='color:#8a857e;font-size:12px'>Ouvre la To-Do pour les cocher ou replanifier.</p></div>";

  MailApp.sendEmail({
    to: dest,
    subject: "To-Do familiale — " + (retard.length + auj.length + demain.length) + " tâche(s) à surveiller",
    htmlBody: html, name: "To-Do familiale"
  });
}

/** TEST : exécute-la à la main pour recevoir un rappel tout de suite. */
function testRappelTodo() { rappelsTodo(); }
