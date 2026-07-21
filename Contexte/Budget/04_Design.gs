/**
 * BUDGET FAMILIAL — DESIGN PASTEL (V3) + THÈMES (Phase G)
 * ======================================================
 * Formatage uniquement — aucune donnée ni formule métier n'est modifiée :
 *  1. Recrée l'onglet « 🌸 Vue d'ensemble » (cartes KPI, comptes, donut,
 *     suivi du budget, objectifs).
 *  2. Repasse TOUS les autres onglets dans la palette du thème actif (base
 *     typographique commune, en-têtes, couleurs d'onglets, mises en forme
 *     conditionnelles).
 *  3. Masque l'onglet technique « Réponses au formulaire 1 ».
 *
 * ⚠ IMPORTANT : `toutEnPastel` RECONSTRUIT la 🌸 Vue d'ensemble (destructif :
 * donut réécrit en valeurs figées, zone objectifs remise à zéro). À réserver à
 * l'installation / la maintenance lourde.
 *
 * >>> POUR UN SIMPLE CHANGEMENT DE THÈME, on n'appelle PAS toutEnPastel : on
 *     utilise `appliquerThemeBudget_()` (plus bas), qui RECOLORE sans reconstruire
 *     — le donut dynamique et les 2 formules FILTER sont préservés. C'est ce que
 *     lance le menu « 🎨 Thème » (via appliquerTheme dans 00_Constantes.gs).
 *
 * La palette (PAGE, CELL, INK, HEAD, WASH, PIE, TABCOL…) est définie et pilotée
 * par 00_Constantes.gs (registre THEMES + chargerPalette_). Ce fichier ne fait
 * que LIRE ces variables : changer de thème = changer les valeurs lues.
 *
 * ---
 * STANDARD D'HARMONISATION (Phase B) :
 *  • base_(sh)  : fond CELL sur toute la grille (blanc en thème clair = inchangé,
 *                 foncé en 🌙 Nuit) + police Arial + encre INK sur la zone utilisée.
 *  • head_(sh)  : en-tête HEAD, gras, filet inférieur LINE2 → même style partout.
 *  • Lignes figées sur les onglets « liste ». Formats € (EUR/EUR0) et dates.
 * ---
 */

var SRC = "'" + nomOnglet_('TABLEAU_BORD') + "'!";   // référence source pour la Vue d'ensemble (Phase H : nom localisé)

function toutEnPastel() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  try { creerVue_(ss); log.push("✔ " + nomOnglet_('VUE_ENSEMBLE')); } catch (e) { log.push("✘ Vue : " + e.message); }
  [["TABLEAU_BORD", recolTableauBord_], ["VUE_ANNUELLE", recolVueAnnuelle_],
   ["EPARGNE", recolEpargne_], ["TRANSACTIONS", recolTransactions_],
   ["PARAMETRES", recolParametres_], ["ECHEANCES", recolEcheances_],
   ["IMPORT_CSV", recolImportCSV_], ["LISEZMOI", recolSimple_]].forEach(function (t) {
    var nom = nomOnglet_(t[0]);
    try {
      var sh = ss.getSheetByName(nom);
      if (sh) { base_(sh); t[1](sh); log.push("✔ " + nom); }
    }
    catch (e) { log.push("✘ " + nom + " : " + e.message); }
  });
  // couleurs d'onglets (Phase H : recherche par nom localisé, plus par nom en dur)
  Object.keys(TABCOL).forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle));
    if (sh) { sh.setTabColor(TABCOL[cle]); }
  });
  // masquer l'onglet technique « Réponses au formulaire » (inutile à afficher ;
  // les soldes ne le lisent jamais — ils se fient à Transactions / Tableau de bord)
  var rf = ss.getSheetByName(nomOnglet_('REPONSES_FORM')); if (rf) { try { rf.hideSheet(); log.push("✔ Réponses formulaire masquées"); } catch (e) {} }
  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert("Design appliqué partout !\n\n" + log.join("\n"));
}

/* ================= 🎨 CHANGEMENT DE THÈME (NON DESTRUCTIF) ================= */
/**
 * Recolore TOUT le classeur avec la palette du thème actif SANS rien
 * reconstruire : la 🌸 Vue d'ensemble est recolorée cellule par cellule
 * (recolorVue_), les autres onglets repassés dans la palette, le Lisez-moi
 * régénéré (il lit la palette), les couleurs d'onglets remises. Aucune donnée,
 * formule, fusion, ni le donut dynamique n'est touché.
 *
 * Appelé par appliquerTheme() (00_Constantes.gs) après chargerPalette_().
 */
function appliquerThemeBudget_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // 1) Vue d'ensemble — recoloration NON destructive (donut + FILTER préservés)
  try { var vd = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE')); if (vd) recolorVue_(vd); } catch (e) {}

  // 2) Autres onglets de données — formatage seulement (ré-exécutable)
  [["TABLEAU_BORD", recolTableauBord_], ["VUE_ANNUELLE", recolVueAnnuelle_],
   ["EPARGNE", recolEpargne_], ["TRANSACTIONS", recolTransactions_],
   ["PARAMETRES", recolParametres_], ["ECHEANCES", recolEcheances_],
   ["IMPORT_CSV", recolImportCSV_]].forEach(function (t) {
    try {
      var sh = ss.getSheetByName(nomOnglet_(t[0]));
      if (sh) { base_(sh); t[1](sh); }
    } catch (e) {}
  });

  // 3) Lisez-moi — régénéré : remplirLisezMoi() lit la palette -> se re-thème seul
  try { remplirLisezMoi(); } catch (e) {}

  // 4) Couleurs d'onglets du thème (Phase H : recherche par nom localisé)
  Object.keys(TABCOL).forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle));
    if (sh) { sh.setTabColor(TABCOL[cle]); }
  });

  SpreadsheetApp.flush();
}

/* ================= 🌸 VUE D'ENSEMBLE (reconstruction complète) ================= */
function creerVue_(ss) {
  var name = nomOnglet_('VUE_ENSEMBLE');
  var old = ss.getSheetByName(name); if (old) ss.deleteSheet(old);
  var sh = ss.insertSheet(name, ss.getNumSheets());
  sh.setHiddenGridlines(true);
  sh.setColumnWidth(1, 20); for (var c = 2; c <= 9; c++) sh.setColumnWidth(c, 96); sh.setColumnWidth(10, 20);
  sh.getRange(1, 1, 60, 10).setBackground(PAGE).setFontFamily("Arial").setFontColor(INK).setVerticalAlignment("middle");

  sh.getRange("B2").setValue("Budget familial").setFontSize(20).setFontWeight("bold");
  sh.getRange("B3").setValue("Juillet 2026 · foyer Lou & Mati").setFontSize(10).setFontColor(MUTED);

  var kpis = [["REVENUS", SRC + "B6", "salaires du foyer"], ["DÉPENSES", SRC + "B7", "toutes catégories"],
              ["RESTE CE MOIS", SRC + "B8", "revenus − dépenses"], ["PATRIMOINE", SRC + "B32", "4 comptes cumulés"]];
  for (var i = 0; i < 4; i++) { var c1 = 2 + i * 2; carte_(sh, 5, c1, kpis[i][0], kpis[i][1], kpis[i][2], WASH[i]); }

  var acc = [["Compte Lou", SRC + "B28"], ["Compte Mati", SRC + "B29"], ["Compte commun", SRC + "B30"], ["Épargne", SRC + "B31"]];
  for (var j = 0; j < 4; j++) {
    var a1 = 2 + j * 2;
    sh.getRange(9, a1, 1, 2).merge().setValue(acc[j][0]).setFontSize(11).setFontColor(INK2).setFontWeight("bold");
    sh.getRange(10, a1, 1, 2).merge().setFormula("=" + acc[j][1]).setFontSize(15).setFontWeight("bold").setNumberFormat(EUR).setFontColor(INK);
    sh.getRange(9, a1, 2, 2).setBackground(ACCT_FILL[j]).setBorder(true, true, true, true, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(9, a1, 1, 2).setBorder(true, null, null, null, null, null, ACCT_TOP[j], SpreadsheetApp.BorderStyle.SOLID_THICK);
  }
  sh.setRowHeight(9, 24); sh.setRowHeight(10, 34);

  sh.getRange("B12").setValue("Répartition des dépenses").setFontSize(13).setFontWeight("bold");
  sh.getRange("B13").setValue("Où est parti l'argent ce mois-ci").setFontSize(10).setFontColor(MUTED);

  // Données du donut écrites EN DUR (valeurs lues sur Tableau de bord après calcul).
  // (rendreDonutDynamique remplace ensuite ces valeurs par des références LIVE.)
  SpreadsheetApp.flush();
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  var nm = tb.getRange("A13:A22").getValues(), rl = tb.getRange("B13:B22").getValues();
  var depMois = Number(tb.getRange("B7").getValue()) || 0, totCat = Number(tb.getRange("B23").getValue()) || 0;
  sh.getRange(1, 16).setValue("Catégorie"); sh.getRange(1, 17).setValue("Montant");
  for (var k = 0; k < 10; k++) { sh.getRange(2 + k, 16).setValue(nm[k][0]); sh.getRange(2 + k, 17).setValue(Number(rl[k][0]) || 0); }
  sh.getRange(12, 16).setValue("Autres"); sh.getRange(12, 17).setValue(Math.max(depMois - totCat, 0));
  sh.getRange(1, 16, 12, 2).setFontColor(GHOST).setFontSize(8);

  var pie = sh.newChart().asPieChart()
    .addRange(sh.getRange("P1:Q12"))
    .setPosition(15, 2, 0, 2)
    .setOption("pieHole", 0.55)
    .setOption("colors", PIE)
    .setOption("backgroundColor", PAGE)
    .setOption("legend", { position: "right", textStyle: { color: INK } })
    .setOption("width", 720).setOption("height", 330)
    .build();
  sh.insertChart(pie);

  sh.getRange("B33").setValue("Suivi du budget").setFontSize(13).setFontWeight("bold");
  sh.getRange("B34").setValue("Dépensé vs budget mensuel · dépassements en rose").setFontSize(10).setFontColor(MUTED);
  sh.getRange(36, 2, 1, 2).merge().setValue("Catégorie");
  sh.getRange("D36").setValue("Réel"); sh.getRange("E36").setValue("Budget"); sh.getRange("F36").setValue("Écart");
  sh.getRange(36, 2, 1, 5).setFontColor(MUTED).setFontWeight("bold").setFontSize(10)
    .setBorder(false, false, true, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange("D36:F36").setHorizontalAlignment("right");
  for (var t = 0; t < 10; t++) {
    var r = 37 + t;
    sh.getRange(r, 2, 1, 2).merge().setFormula("=" + SRC + "A" + (13 + t)).setFontColor(INK).setFontWeight("bold").setFontSize(10);
    sh.getRange(r, 4).setFormula("=" + SRC + "B" + (13 + t)).setNumberFormat(EUR0);
    sh.getRange(r, 5).setFormula("=" + SRC + "C" + (13 + t)).setNumberFormat(EUR0).setFontColor(INK2);
    sh.getRange(r, 6).setFormula("=" + SRC + "D" + (13 + t)).setNumberFormat(EUR0);
    sh.getRange(r, 2, 1, 5).setBorder(false, false, true, false, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
    sh.getRange(r, 4, 1, 3).setHorizontalAlignment("right");
  }
  sh.getRange(47, 2, 1, 2).merge().setValue("Total").setFontWeight("bold");
  sh.getRange("D47").setFormula("=" + SRC + "B23").setNumberFormat(EUR0).setFontWeight("bold");
  sh.getRange("E47").setFormula("=" + SRC + "C23").setNumberFormat(EUR0).setFontWeight("bold");
  sh.getRange("F47").setFormula("=" + SRC + "D23").setNumberFormat(EUR0).setFontWeight("bold");
  sh.getRange(47, 2, 1, 5).setHorizontalAlignment("right").setBorder(true, false, false, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.getRange("B47").setHorizontalAlignment("left");

  sh.getRange("B49").setValue("Objectifs d'épargne").setFontSize(13).setFontWeight("bold");
  sh.getRange(50, 2, 1, 2).merge().setValue("Épargne totale").setFontColor(MUTED).setFontSize(10).setFontWeight("bold");
  sh.getRange(51, 2, 1, 2).merge().setFormula("='Épargne'!B3").setFontSize(20).setFontWeight("bold").setNumberFormat(EUR).setFontColor(OK_TX);
  var goals = [["'Épargne'!A8", "'Épargne'!E8"], ["'Épargne'!A9", "'Épargne'!E9"], ["'Épargne'!A10", "'Épargne'!E10"]];
  for (var g = 0; g < 3; g++) {
    var gr = 50 + g;
    sh.getRange(gr, 5, 1, 2).merge().setFormula("=" + goals[g][0]).setFontColor(INK).setFontSize(10).setFontWeight("bold");
    sh.getRange(gr, 7).setFormula("=" + goals[g][1]).setNumberFormat("0%").setFontColor(INK2).setHorizontalAlignment("right");
  }

  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor(OVER_TX).setBold(true).setBackground(OVER_BG).setRanges([sh.getRange("F37:F46")]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(0).setFontColor(OK_TX).setRanges([sh.getRange("F37:F46")]).build(),
    SpreadsheetApp.newConditionalFormatRule().setGradientMinpoint(HEAT_LO).setGradientMaxpoint(HEAT_HI).setRanges([sh.getRange("D37:D46")]).build()
  ];
  sh.setConditionalFormatRules(rules);
}

/**
 * Recolore la 🌸 Vue d'ensemble EXISTANTE avec la palette du thème actif, SANS
 * la reconstruire : ne touche ni aux valeurs, ni aux formules, ni aux fusions,
 * ni au donut dynamique. On ne fait que réappliquer fonds / encres / bordures /
 * mises en forme conditionnelles + recolorer le graphique.
 */
function recolorVue_(vd) {
  // Fond général PAGE (toute la grille -> propre aussi en thème sombre) + encre INK
  var mr = vd.getMaxRows(), mc = vd.getMaxColumns();
  vd.getRange(1, 1, mr, mc).setBackground(PAGE);
  vd.getRange(1, 1, Math.max(60, vd.getLastRow()), Math.min(mc, 10))
    .setFontFamily("Arial").setFontColor(INK).setVerticalAlignment("middle");

  vd.getRange("B3").setFontColor(MUTED);                    // sous-titre

  // Cartes KPI (rangs 5-7) — fonds WASH + encres
  for (var i = 0; i < 4; i++) {
    var c1 = 2 + i * 2;
    vd.getRange(5, c1, 1, 2).setFontColor(INK2);
    vd.getRange(6, c1, 1, 2).setFontColor(INK);
    vd.getRange(7, c1, 1, 2).setFontColor(INK2);
    vd.getRange(5, c1, 3, 2).setBackground(WASH[i])
      .setBorder(true, true, true, true, false, false, CARD_BD, SpreadsheetApp.BorderStyle.SOLID_THICK);
  }

  // Cartes « comptes » (rangs 9-10) — fonds ACCT_FILL + filet supérieur ACCT_TOP
  for (var j = 0; j < 4; j++) {
    var a1 = 2 + j * 2;
    vd.getRange(9, a1, 1, 2).setFontColor(INK2);
    vd.getRange(10, a1, 1, 2).setFontColor(INK);
    vd.getRange(9, a1, 2, 2).setBackground(ACCT_FILL[j]).setBorder(true, true, true, true, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
    vd.getRange(9, a1, 1, 2).setBorder(true, null, null, null, null, null, ACCT_TOP[j], SpreadsheetApp.BorderStyle.SOLID_THICK);
  }

  vd.getRange("B13").setFontColor(MUTED);                   // sous-titre donut
  vd.getRange(1, 16, 12, 2).setFontColor(GHOST);           // source P/Q discrète

  // Donut : couleurs + fond + légende
  themerDonut_(vd);

  vd.getRange("B34").setFontColor(MUTED);                   // sous-titre suivi budget

  // En-tête du suivi de budget (rang 36) + lignes (37-46) + total (47)
  vd.getRange(36, 2, 1, 5).setFontColor(MUTED)
    .setBorder(false, false, true, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  for (var t = 0; t < 10; t++) {
    var r = 37 + t;
    vd.getRange(r, 2, 1, 2).setFontColor(INK);
    vd.getRange(r, 5).setFontColor(INK2);
    vd.getRange(r, 2, 1, 5).setBorder(false, false, true, false, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
  }
  vd.getRange(47, 2, 1, 5).setBorder(true, false, false, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);

  // Objectifs d'épargne (bloc gauche + liste dynamique E50:G62 — encres seulement)
  vd.getRange(50, 2, 1, 2).setFontColor(MUTED);
  vd.getRange(51, 2, 1, 2).setFontColor(OK_TX);
  vd.getRange("E50:F62").setFontColor(INK);
  vd.getRange("G50:G62").setFontColor(INK2);

  // Sélecteurs Mois / Année (libellés + champs)
  vd.getRange("F2").setFontColor(INK2);
  vd.getRange("H2").setFontColor(INK2);
  vd.getRange("G2").setBackground(FIELD_BG).setFontColor(INK)
    .setBorder(true, true, true, true, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID);
  vd.getRange("I2").setBackground(FIELD_BG).setFontColor(INK)
    .setBorder(true, true, true, true, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID);

  // Mises en forme conditionnelles (mêmes règles que creerVue_, couleurs du thème)
  var rules = [
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor(OVER_TX).setBold(true).setBackground(OVER_BG).setRanges([vd.getRange("F37:F46")]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(0).setFontColor(OK_TX).setRanges([vd.getRange("F37:F46")]).build(),
    SpreadsheetApp.newConditionalFormatRule().setGradientMinpoint(HEAT_LO).setGradientMaxpoint(HEAT_HI).setRanges([vd.getRange("D37:D46")]).build()
  ];
  vd.setConditionalFormatRules(rules);
}

// Recolore le donut existant (branché sur P/Q) : couleurs de parts + fond + légende.
function themerDonut_(vd) {
  var charts = vd.getCharts();
  for (var c = 0; c < charts.length; c++) {
    var rgs = charts[c].getRanges(), hit = false;
    for (var j = 0; j < rgs.length; j++) {
      var col = rgs[j].getColumn();
      if (col === 16 || col === 17) { hit = true; break; }
    }
    if (hit) {
      var nv = charts[c].modify()
        .setOption("colors", PIE)
        .setOption("backgroundColor", PAGE)
        .setOption("legend", { position: "right", textStyle: { color: INK } })
        .build();
      vd.updateChart(nv);
    }
  }
}

function carte_(sh, top, c1, label, formula, foot, fill) {
  sh.getRange(top, c1, 1, 2).merge().setValue(label).setFontSize(10).setFontColor(INK2).setFontWeight("bold");
  sh.getRange(top + 1, c1, 1, 2).merge().setFormula("=" + formula).setFontSize(18).setFontWeight("bold").setFontColor(INK).setNumberFormat('#,##0" €"');
  sh.getRange(top + 2, c1, 1, 2).merge().setValue(foot).setFontSize(9).setFontColor(INK2);
  sh.getRange(top, c1, 3, 2).setBackground(fill).setBorder(true, true, true, true, false, false, CARD_BD, SpreadsheetApp.BorderStyle.SOLID_THICK);
  sh.setRowHeight(top, 20); sh.setRowHeight(top + 1, 30); sh.setRowHeight(top + 2, 22);
}

/* ================= BASE COMMUNE + RECOLORATION DES AUTRES ONGLETS ================= */
// base_ : socle appliqué à CHAQUE onglet avant sa recoloration spécifique.
//  • fond CELL sur TOUTE la grille : blanc pour les thèmes clairs (comportement
//    inchangé), foncé pour 🌙 Nuit (sinon texte clair sur cellules blanches = illisible).
//  • police Arial + encre INK + alignement vertical sur la zone utilisée.
// Ne touche ni aux valeurs ni aux formules (formatage pur).
function base_(sh) {
  var mr = sh.getMaxRows(), mc = sh.getMaxColumns();
  sh.getRange(1, 1, mr, mc).setBackground(CELL);
  var r = Math.max(sh.getLastRow(), 1), c = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, r, c).setFontFamily("Arial").setFontColor(INK).setVerticalAlignment("middle");
}

function head_(sh, a1) {
  sh.getRange(a1).setBackground(HEAD).setFontColor(INK).setFontWeight("bold").setFontSize(10)
    .setVerticalAlignment("middle")
    .setBorder(false, false, true, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}
function title_(sh, a1) { sh.getRange(a1).setFontColor(INK).setFontWeight("bold"); }

function recolTableauBord_(sh) {
  title_(sh, "A1");
  ["A11", "A26"].forEach(function (a) { sh.getRange(a).setBackground(HEAD).setFontColor(INK).setFontWeight("bold"); });
  head_(sh, "A12:D12"); head_(sh, "A27:B27");
  sh.getRange("A6:B9").setBackground(BLOCK);              // bloc chiffres clés (accent du thème)
  sh.getRange("A6:A9").setFontColor(INK2); sh.getRange("B6:B9").setFontWeight("bold");
  var R = [
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor(OVER_TX).setBold(true).setBackground(OVER_BG).setRanges([sh.getRange("D13:D22"), sh.getRange("B28:B31")]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(0).setFontColor(OK_TX).setRanges([sh.getRange("D13:D22")]).build()
  ];
  sh.setConditionalFormatRules(R);
}
function recolVueAnnuelle_(sh) {
  title_(sh, "A1"); head_(sh, "A5:M5"); sh.getRange("A16:M18").setBackground(BLOCK).setFontWeight("bold");
  sh.setFrozenRows(5);                                    // l'en-tête des mois reste visible
  var R = [
    SpreadsheetApp.newConditionalFormatRule().setGradientMinpoint(HEAT_LO).setGradientMaxpoint(HEAT_HI).setRanges([sh.getRange("B6:M15")]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenNumberLessThan(0).setFontColor(OVER_TX).setBold(true).setRanges([sh.getRange("B18:M18")]).build()
  ];
  sh.setConditionalFormatRules(R);
}
function recolEpargne_(sh) {
  title_(sh, "A1"); head_(sh, "A7:F7");
  sh.getRange("B3").setFontColor(OK_TX).setFontWeight("bold");
  sh.getRange("F8:F10").clearContent();                   // supprime les jauges #ERROR!
  sh.getRange("A8:C10").setBackground(SOFT);              // objectifs (accent doux du thème)
  var R = [SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThanOrEqualTo(1).setFontColor(OK_TX).setBold(true).setRanges([sh.getRange("E8:E10")]).build()];
  sh.setConditionalFormatRules(R);
}
function recolTransactions_(sh) {
  head_(sh, "A1:H1");
  sh.setFrozenRows(1);                                    // en-tête toujours visible au défilement
  sh.getRange("A2:A").setNumberFormat("dd/mm/yyyy");      // dates JJ/MM/AAAA (charte)
  sh.getRange("G2:G").setNumberFormat(EUR);               // montants en € (2 décimales)
  var R = [
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B2="Virement interne"').setFontColor(MUTED).setRanges([sh.getRange("A2:H500")]).build(),
    SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=$B2="Revenu"').setFontColor(OK_TX).setRanges([sh.getRange("A2:H500")]).build()
  ];
  sh.setConditionalFormatRules(R);
}
function recolParametres_(sh) {
  ["A3:B3", "D3", "F3:G3", "I3", "K3"].forEach(function (a) { head_(sh, a); });
  sh.getRange("B4:B7").setBackground(PARAM); sh.getRange("G4:G13").setBackground(PARAM);
}
function recolEcheances_(sh) {
  head_(sh, "A1:D1");
  sh.setFrozenRows(1);                                    // en-tête toujours visible au défilement
  var R = [SpreadsheetApp.newConditionalFormatRule().whenFormulaSatisfied('=AND($B2<>"",$B2>=TODAY(),$B2-TODAY()<=7)').setBackground(AMBER_BG).setBold(true).setRanges([sh.getRange("A2:D200")]).build()];
  sh.setConditionalFormatRules(R);
}
function recolImportCSV_(sh) { title_(sh, "A1"); head_(sh, "A7:K7"); }
function recolSimple_(sh) { title_(sh, "B1"); title_(sh, "A1"); }
