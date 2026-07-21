/**
 * BUDGET FAMILIAL — AUTOMATISATIONS (e-mails)
 * ===========================================
 *  1. Onglet « Échéances » (dates importantes, avec récurrence).
 *  2. Chaque matin vers 8 h : e-mail pour toute échéance à J-7, J-1 et jour J.
 *     Les échéances récurrentes (annuelles/mensuelles) se reprogramment seules.
 *  3. Le 1er du mois vers 8 h : e-mail récapitulatif du mois écoulé
 *     (dépenses par catégorie vs budget, soldes des 4 comptes) — virements exclus.
 *
 * INSTALLATION (une seule fois) : menu 🌸 Budget ▸ ⚙️ Configuration ▸
 *   « 🔔 Installer les automatisations » (ou exécuter `installerAutomatisations`).
 * TESTS immédiats : menu 🧪 Tests e-mail (testEnvoiEcheances / testEnvoiRecap).
 *
 * Déclencheurs installés : verifierEcheances (quotidien 8 h),
 *                          recapMensuel (le 1er du mois, 8 h).
 * Helpers communs (supprimerDeclencheurs_, estBudgetee_, dateSeule_, fmtDate_,
 * eur_) → voir Utils.gs. Constantes MOIS_FR → voir 00_Constantes.gs.
 */

// Phase H : le nom de l'onglet Échéances suit désormais la langue active (nomOnglet_).

/**
 * INSTALLATION : à exécuter une seule fois.
 */
function installerAutomatisations() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();

  // 1. Destinataires des e-mails.
  var rep = ui.prompt(
    "Destinataires des e-mails",
    "Adresses e-mail séparées par une virgule (la tienne + celle de Lou) :",
    ui.ButtonSet.OK_CANCEL);
  if (rep.getSelectedButton() !== ui.Button.OK) { return; }
  var emails = rep.getResponseText().split(",")
    .map(function (s) { return s.trim(); })
    .filter(function (s) { return s.indexOf("@") > 0; })
    .join(",");
  if (!emails) { ui.alert("Aucune adresse valide saisie — installation annulée."); return; }
  props.setProperty("DESTINATAIRES", emails);

  // 2. Onglet Échéances (créé seulement s'il n'existe pas).
  creerOngletEcheances_(ss);

  // 3. Déclencheurs automatiques (sans doublons si on relance).
  supprimerDeclencheurs_(["verifierEcheances", "recapMensuel"]);
  ScriptApp.newTrigger("verifierEcheances").timeBased().everyDays(1).atHour(8).create();
  ScriptApp.newTrigger("recapMensuel").timeBased().onMonthDay(1).atHour(8).create();

  ui.alert(
    "Automatisations installées !\n\n" +
    "· Rappels d'échéances : tous les matins vers 8 h (J-7, J-1, jour J)\n" +
    "· Récap budget : le 1er du mois vers 8 h\n" +
    "· Destinataires : " + emails + "\n\n" +
    "Remplissez l'onglet « " + nomOnglet_('ECHEANCES') + " » avec vos vraies dates\n" +
    "(2 exemples fournis, à remplacer).\n\n" +
    "Pour tester tout de suite : menu 🧪 Tests e-mail."
  );
}

/** Rappels : exécuté chaque matin par le déclencheur. */
function verifierEcheances() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nomOnglet_('ECHEANCES'));
  var dest = PropertiesService.getDocumentProperties().getProperty("DESTINATAIRES");
  if (!sh || !dest) { return; }

  var auj = dateSeule_(new Date());
  var donnees = sh.getRange(2, 1, Math.max(sh.getLastRow() - 1, 1), 4).getValues();
  var alertes = [];

  for (var i = 0; i < donnees.length; i++) {
    var libelle = String(donnees[i][0]).trim();
    var d = donnees[i][1];
    var recurrence = String(donnees[i][2]).trim().toLowerCase();
    if (!libelle || !(d instanceof Date)) { continue; }
    d = dateSeule_(d);

    // Échéance passée + récurrente → reprogrammer et mettre à jour la feuille.
    var modifie = false;
    while (d < auj && (recurrence === "annuelle" || recurrence === "mensuelle")) {
      if (recurrence === "annuelle") { d = new Date(d.getFullYear() + 1, d.getMonth(), d.getDate()); }
      else { d = new Date(d.getFullYear(), d.getMonth() + 1, d.getDate()); }
      modifie = true;
    }
    if (modifie) { sh.getRange(2 + i, 2).setValue(d); }

    var joursRestants = Math.round((d - auj) / 86400000);
    if (joursRestants === 7) { alertes.push("· Dans 7 jours (" + fmtDate_(d) + ") : " + libelle); }
    if (joursRestants === 1) { alertes.push("· DEMAIN (" + fmtDate_(d) + ") : " + libelle); }
    if (joursRestants === 0) { alertes.push("· AUJOURD'HUI : " + libelle); }
  }

  if (alertes.length) {
    MailApp.sendEmail({
      to: dest,
      subject: "Échéances famille — " + alertes.length + " rappel(s)",
      body: "Bonjour !\n\nÉchéances qui approchent :\n\n" + alertes.join("\n") +
            "\n\nDétails et modifications : onglet « " + nomOnglet_('ECHEANCES') + " » de la feuille Budget familial.",
      name: "Budget familial"
    });
  }
}

/** Récap mensuel : exécuté le 1er du mois par le déclencheur (mois écoulé). */
function recapMensuel() {
  var auj = new Date();
  var precedent = new Date(auj.getFullYear(), auj.getMonth() - 1, 1);
  envoyerRecap_(precedent.getFullYear(), precedent.getMonth());
}

/** TESTS — à exécuter à la main pour vérifier tout de suite. */
function testEnvoiEcheances() { verifierEcheances(); }
function testEnvoiRecap() {
  var auj = new Date(); // récap du mois EN COURS, pour voir un résultat immédiat
  envoyerRecap_(auj.getFullYear(), auj.getMonth());
}

/* ----------------------------- interne ----------------------------- */

function envoyerRecap_(annee, moisIndex) {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var dest = PropertiesService.getDocumentProperties().getProperty("DESTINATAIRES");
  if (!dest) { return; }

  var param = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  var comptes = param.getRange("A4:B7").getValues(); // nom + solde initial
  var budgets = param.getRange("F4:G13").getValues(); // catégorie + budget

  var tx = ss.getSheetByName(nomOnglet_('TRANSACTIONS'));
  var lignes = tx.getLastRow() > 1 ? tx.getRange(2, 1, tx.getLastRow() - 1, 7).getValues() : [];

  var totalDep = 0, totalRev = 0, parCat = {}, soldes = {};
  comptes.forEach(function (c) { if (c[0]) { soldes[c[0]] = Number(c[1]) || 0; } });

  lignes.forEach(function (l) {
    var d = l[0], type = String(l[1]).trim(), cpt = String(l[2]).trim(),
        destCpt = String(l[3]).trim(), cat = String(l[4]).trim(), m = Number(l[6]) || 0;
    if (!(d instanceof Date) || !type) { return; }

    // Soldes : toutes dates confondues (virements inclus, par définition).
    if (type === "Revenu" && soldes.hasOwnProperty(cpt)) { soldes[cpt] += m; }
    if (type === "Dépense" && soldes.hasOwnProperty(cpt)) { soldes[cpt] -= m; }
    if (type === "Virement interne") {
      if (soldes.hasOwnProperty(cpt)) { soldes[cpt] -= m; }
      if (soldes.hasOwnProperty(destCpt)) { soldes[destCpt] += m; }
    }

    // Totaux du mois : virements exclus.
    if (d.getFullYear() === annee && d.getMonth() === moisIndex) {
      if (type === "Dépense") { totalDep += m; parCat[cat] = (parCat[cat] || 0) + m; }
      if (type === "Revenu") { totalRev += m; }
    }
  });

  var nomMois = MOIS_FR[moisIndex] + " " + annee;
  var html = "<h2>Budget familial — " + nomMois + "</h2>" +
    "<p><b>Revenus :</b> " + eur_(totalRev) + " &nbsp;·&nbsp; <b>Dépenses :</b> " + eur_(totalDep) +
    " &nbsp;·&nbsp; <b>Reste :</b> " + eur_(totalRev - totalDep) + "</p>" +
    "<h3>Dépenses par catégorie</h3>" +
    "<table border='1' cellpadding='5' style='border-collapse:collapse'>" +
    "<tr style='background:#2E4A7A;color:#fff'><th>Catégorie</th><th>Réel</th><th>Budget</th><th>Écart</th></tr>";

  budgets.forEach(function (b) {
    var cat = String(b[0]).trim();
    if (!cat) { return; }
    var reel = parCat[cat] || 0;
    var budget = Number(b[1]) || 0;
    var ecart = budget - reel;
    html += "<tr><td>" + cat + "</td><td align='right'>" + eur_(reel) +
            "</td><td align='right'>" + eur_(budget) + "</td><td align='right'" +
            (ecart < 0 ? " style='color:#B3392E'><b>" + eur_(ecart) + "</b>" : ">" + eur_(ecart)) +
            "</td></tr>";
  });
  html += "</table>";

  var horsCat = totalDep - Object.keys(parCat).reduce(function (s, k) {
    return s + (estBudgetee_(k, budgets) ? parCat[k] : 0);
  }, 0);
  if (horsCat > 0.005) {
    html += "<p style='color:#8A5B00'>Dont " + eur_(horsCat) +
            " hors catégories budgétées (à vérifier lors de la revue).</p>";
  }

  html += "<h3>Soldes des comptes</h3><ul>";
  comptes.forEach(function (c) {
    if (c[0]) { html += "<li>" + c[0] + " : <b>" + eur_(soldes[c[0]]) + "</b></li>"; }
  });
  var total = comptes.reduce(function (s, c) { return c[0] ? s + soldes[c[0]] : s; }, 0);
  html += "</ul><p><b>Total foyer : " + eur_(total) + "</b></p>" +
          "<p style='color:#5C6470'>Rituel du mois : export CSV des comptes → onglet Import CSV → " +
          "revue du Tableau de bord à deux → vider « 00 - À classer » dans le Drive.</p>";

  MailApp.sendEmail({
    to: dest,
    subject: "Budget familial — récap " + nomMois,
    htmlBody: html,
    name: "Budget familial"
  });
}

function creerOngletEcheances_(ss) {
  if (ss.getSheetByName(nomOnglet_('ECHEANCES'))) { return; }
  var sh = ss.insertSheet(nomOnglet_('ECHEANCES'));
  var entetes = ["Échéance", "Date", "Récurrence (Aucune / Mensuelle / Annuelle)", "Note"];
  sh.getRange(1, 1, 1, 4).setValues([entetes])
    .setFontWeight("bold").setFontColor("#FFFFFF").setBackground("#2E4A7A");
  sh.setColumnWidths(1, 1, 280); sh.setColumnWidths(2, 1, 110);
  sh.setColumnWidths(3, 1, 250); sh.setColumnWidths(4, 1, 220);

  var dans7j = new Date(); dans7j.setDate(dans7j.getDate() + 7);
  var dans30j = new Date(); dans30j.setDate(dans30j.getDate() + 30);
  sh.getRange(2, 1, 2, 4).setValues([
    ["EXEMPLE à remplacer — Assurance habitation", dateSeule_(dans7j), "Annuelle", "Résiliable à échéance (loi Hamon après 1 an)"],
    ["EXEMPLE à remplacer — Contrôle technique", dateSeule_(dans30j), "Aucune", ""]
  ]);
  sh.getRange(2, 2, 200, 1).setNumberFormat("dd/mm/yyyy");

  var regle = SpreadsheetApp.newDataValidation()
    .requireValueInList(["Aucune", "Mensuelle", "Annuelle"], true).setAllowInvalid(true).build();
  sh.getRange(2, 3, 200, 1).setDataValidation(regle);
  sh.setFrozenRows(1);
}
