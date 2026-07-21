/**
 * BUDGET FAMILIAL — DYNAMISME (piloté depuis la 🌸 Vue d'ensemble)
 * ===============================================================
 * Regroupe tout ce qui rend la feuille « vivante » :
 *   · configurerBudgetDynamique   — sélecteurs Mois/Année + moteur masqué + déclencheurs
 *   · majSousTitreAuto            — handler onEdit (sélecteurs → moteur → titre)
 *   · masquerAnciensMois          — masque les transactions de + d'1 mois (quotidien)
 *   · rendreDonutDynamique        — relie le donut au Tableau de bord (auto-adaptatif)
 *   · preparerObjectifsDynamiques — nettoie la zone des objectifs (avant collage FILTER)
 *
 * SÛR EN LOCALE FR : uniquement des validations de données et des valeurs/réf
 * simples. Aucune formule à virgules n'est réécrite par script.
 *
 * Déclencheurs installés : majSousTitreAuto (onEdit),
 *                          masquerAnciensMois (quotidien 3 h).
 * Helper `trouverFeuille_` → voir Utils.gs. Constante MOIS → voir 00_Constantes.gs.
 * Phase G : le style des sélecteurs et de la zone objectifs lit la palette du
 * thème actif (INK, INK2, FIELD_BG, LINE2) au lieu de couleurs écrites en dur.
 */

var MOIS_HISTORIQUE = 1;   // nb de mois affichés dans Transactions avant masquage

/* ==================================================================
 *  A. MOIS / ANNÉE DYNAMIQUES
 * ================================================================== */

// ---------- CONFIGURATION (à lancer 1 fois) ----------
function configurerBudgetDynamique() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  var vd = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE'));
  if (!tb || !vd) { SpreadsheetApp.getUi().alert("Onglet Tableau de bord ou Vue d'ensemble introuvable."); return; }

  // 1) Moteur numérique masqué sur le Tableau de bord (B3 = année, B4 = mois)
  tb.getRange("B3").clearDataValidations(); tb.getRange("B3").setNumberFormat(";;;");
  tb.getRange("B4").clearDataValidations(); tb.getRange("B4").setNumberFormat(";;;");
  // retire les anciens sélecteurs C3/C4 du Tableau de bord (déplacés vers la Vue d'ensemble)
  tb.getRange("C3").clearDataValidations(); tb.getRange("C3").clearContent();
  tb.getRange("C4").clearDataValidations(); tb.getRange("C4").clearContent();

  // 2) Sélecteurs sur la 🌸 Vue d'ensemble (ligne 2, colonnes F→I, à droite du titre)
  var annees = []; var y0 = 2025; for (var y = y0; y <= y0 + 8; y++) annees.push(y);
  vd.getRange("B4:E4").clearDataValidations();
  vd.getRange("B4:E4").clearContent();   // retire les sélecteurs de l'ancienne position (ligne 4)
  poserSelecteur_(vd, "F2", "Mois :",  "G2", MOIS);
  poserSelecteur_(vd, "H2", "Année :", "I2", annees);
  resyncSelecteurs_();                 // initialise G2 / I2 depuis le moteur

  // 3) Déclencheurs + application immédiate
  installerDeclencheurs_();
  majSousTitre_();
  masquerAnciensMois();

  // 4) Masquer l'onglet Tableau de bord (on pilote tout depuis la Vue d'ensemble)
  vd.activate();
  tb.hideSheet();

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "C'est en place ✓\n\n" +
    "· Sur la 🌸 Vue d'ensemble, en haut à droite : choisis le Mois (en lettres) et l'Année.\n" +
    "· Le titre et tous les chiffres se mettent à jour.\n" +
    "· L'onglet « Tableau de bord » est masqué (il calcule en coulisses).\n" +
    "  Pour le revoir un jour : icône ☰ des onglets en bas ▸ « Afficher les feuilles masquées ».\n" +
    "· Transactions : mois de plus d'" + MOIS_HISTORIQUE + " mois masqués (données conservées).");
}

// ---------- SÉLECTEURS (Vue d'ensemble) ↔ MOTEUR (Tableau de bord) ----------
function majSousTitreAuto(e) {
  try {
    var ss = e.source;
    var sh = e.range.getSheet();
    var nom = sh.getName();
    var row = e.range.getRow(), col = e.range.getColumn();
    var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));

    // --- édition d'un sélecteur sur la Vue d'ensemble ---
    if (nom === nomOnglet_('VUE_ENSEMBLE')) {
      if (row === 2 && col === 7) {                 // G2 = mois (nom) -> B4 (numéro)
        var m = String(e.range.getValue()).trim().toLowerCase();
        for (var i = 0; i < MOIS.length; i++) {
          if (MOIS[i].toLowerCase() === m) { tb.getRange("B4").setValue(i + 1); break; }
        }
        majSousTitre_();
      } else if (row === 2 && col === 9) {           // I2 = année -> B3
        var a = parseInt(e.range.getValue(), 10);
        if (a) tb.getRange("B3").setValue(a);
        majSousTitre_();
      }
      return;
    }

    // --- édition manuelle du moteur sur le Tableau de bord (rare) : resync + titre ---
    if (nom === nomOnglet_('TABLEAU_BORD') && col === 2 && (row === 3 || row === 4)) {
      resyncSelecteurs_();
      majSousTitre_();
    }
  } catch (err) {}
}

// moteur (Tableau de bord B4/B3) -> sélecteurs affichés (Vue d'ensemble G2/I2)
function resyncSelecteurs_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  var vd = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE'));
  if (!tb || !vd) return;
  var m = parseInt(tb.getRange("B4").getValue(), 10);
  var a = parseInt(tb.getRange("B3").getValue(), 10);
  if (m >= 1 && m <= 12) vd.getRange("G2").setValue(MOIS[m - 1]);
  if (a) vd.getRange("I2").setValue(a);
}

// titre « Mois Année · foyer Lou & Mati » sur la Vue d'ensemble (valeur littérale = sûr)
function majSousTitre_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  var vd = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE'));
  if (!tb || !vd) return;
  var m = parseInt(tb.getRange("B4").getValue(), 10);
  var a = parseInt(tb.getRange("B3").getValue(), 10);
  if (!(m >= 1 && m <= 12) || !a) return;
  vd.getRange("B3").setValue(MOIS[m - 1] + " " + a + " · foyer Lou & Mati");
}

// pose un libellé + une liste déroulante stylée (champ selon le thème actif)
function poserSelecteur_(sheet, cellLib, texte, cellListe, liste) {
  sheet.getRange(cellLib).setValue(texte)
       .setFontColor(INK2).setFontWeight("bold").setHorizontalAlignment("right");
  var dd = sheet.getRange(cellListe);
  dd.setDataValidation(
    SpreadsheetApp.newDataValidation().requireValueInList(liste, true).setAllowInvalid(false).build());
  dd.setBackground(FIELD_BG).setFontColor(INK).setHorizontalAlignment("left")
    .setBorder(true, true, true, true, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID);
}

// ---------- MASQUAGE DES MOIS ANCIENS ----------
function masquerAnciensMois() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tx = ss.getSheetByName(nomOnglet_('TRANSACTIONS'));
  if (!tx) return;
  var last = tx.getLastRow();
  if (last < 2) return;

  var today  = new Date();
  var cutoff = new Date(today.getFullYear(), today.getMonth() - MOIS_HISTORIQUE, 1);

  var dates = tx.getRange(2, 1, last - 1, 1).getValues();
  var flags = [];
  for (var i = 0; i < dates.length; i++) {
    var d = dates[i][0];
    flags.push(d instanceof Date && d < cutoff);
  }
  appliquerVisibilite_(tx, 2, flags);
}

function appliquerVisibilite_(sheet, startRow, flags) {
  var i = 0, n = flags.length;
  while (i < n) {
    var val = flags[i], j = i;
    while (j < n && flags[j] === val) j++;
    if (val) sheet.hideRows(startRow + i, j - i);
    else     sheet.showRows(startRow + i, j - i);
    i = j;
  }
}

// ---------- DÉCLENCHEURS (sans doublon) ----------
function installerDeclencheurs_() {
  var trg = ScriptApp.getProjectTriggers();
  var aEdit = false, aTime = false;
  for (var i = 0; i < trg.length; i++) {
    var f = trg[i].getHandlerFunction();
    if (f === "majSousTitreAuto")   aEdit = true;
    if (f === "masquerAnciensMois") aTime = true;
  }
  if (!aEdit) ScriptApp.newTrigger("majSousTitreAuto")
                 .forSpreadsheet(SpreadsheetApp.getActive()).onEdit().create();
  if (!aTime) ScriptApp.newTrigger("masquerAnciensMois")
                 .timeBased().everyDays(1).atHour(3).create();
}

/* ==================================================================
 *  B. DONUT « RÉPARTITION DES DÉPENSES » DYNAMIQUE
 * ================================================================== */
/**
 * Relie la source du donut (colonnes P/Q de la 🌸 Vue d'ensemble) au tableau
 * « Dépenses par catégorie » du Tableau de bord. Le donut se met à jour tout
 * seul et inclut automatiquement toute nouvelle catégorie (ex. Réceptions).
 *
 * AUTO-ADAPTATIF & RE-EXÉCUTABLE : détecte le nombre de catégories (jusqu'à la
 * ligne TOTAL), réécrit la source et ajuste la plage du graphique.
 * ORDRE CONSEILLÉ : après « Ajouter la catégorie Réceptions ».
 */
function rendreDonutDynamique() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  var vd = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE'));
  if (!tb || !vd) {
    SpreadsheetApp.getUi().alert("Feuille introuvable (Tableau de bord ou Vue d'ensemble).");
    return;
  }

  // --- 1) Repérer le bloc catégories du Tableau de bord (13 → ligne TOTAL) ---
  var colA = tb.getRange("A13:A45").getValues();
  var ligneTotal = -1;
  for (var i = 0; i < colA.length; i++) {
    if (String(colA[i][0]).trim() === "TOTAL") { ligneTotal = 13 + i; break; }
  }
  if (ligneTotal < 14) {
    SpreadsheetApp.getUi().alert("Bloc « Dépenses par catégorie » introuvable dans le Tableau de bord.");
    return;
  }
  var nbCat = ligneTotal - 13;   // nombre de lignes de catégories (13 .. ligneTotal-1)

  // --- 2) Réécrire la source du donut (P = libellés, Q = montants) ---
  vd.getRange("P2:Q400").clearContent();          // efface l'ancienne source figée
  vd.getRange("P1").setValue("Catégorie");
  vd.getRange("Q1").setValue("Montant");
  for (var k = 0; k < nbCat; k++) {
    var src = 13 + k;
    vd.getRange(2 + k, 16).setFormula("='" + nomOnglet_('TABLEAU_BORD') + "'!A" + src);  // colonne P (libellé)
    vd.getRange(2 + k, 17).setFormula("='" + nomOnglet_('TABLEAU_BORD') + "'!B" + src);  // colonne Q (réel)
  }
  // ligne « Autres » = dépenses du mois non catégorisées (B7 total mois − total catégories)
  var ligneAutres = 2 + nbCat;
  vd.getRange(ligneAutres, 16).setValue("Autres");
  vd.getRange(ligneAutres, 17).setFormula("='" + nomOnglet_('TABLEAU_BORD') + "'!B7-'" + nomOnglet_('TABLEAU_BORD') + "'!B" + ligneTotal);

  // --- 3) Ajuster la plage du graphique donut à P1:Q(ligneAutres) ---
  var lignesData = ligneAutres;                    // dernière ligne de données
  var charts = vd.getCharts();
  var donut = null;
  for (var c = 0; c < charts.length && !donut; c++) {
    var ranges = charts[c].getRanges();
    for (var j = 0; j < ranges.length; j++) {
      var col = ranges[j].getColumn();
      if (col === 16 || col === 17) { donut = charts[c]; break; }   // graphique branché sur P/Q
    }
  }
  var infoGraph = "";
  if (donut) {
    var nouveau = donut.modify()
      .clearRanges()
      .addRange(vd.getRange(1, 16, lignesData, 2))   // P1:Q(lignesData)
      .build();
    vd.updateChart(nouveau);
    infoGraph = "\n· Graphique : plage étendue à " + nbCat + " catégories + « Autres ».";
  } else {
    infoGraph = "\n· ⚠ Donut non trouvé automatiquement : ouvre le graphique > Plage de données > mets P1:Q" + lignesData + ".";
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "Donut dynamique ✓\n\n" +
    "· Source (P/Q) reliée au Tableau de bord : les montants se mettent à jour tout seuls." +
    infoGraph + "\n\n" +
    "Change le mois en haut du Tableau de bord : le donut suit.");
}

/* ==================================================================
 *  C. OBJECTIFS D'ÉPARGNE DYNAMIQUES
 * ================================================================== */
/**
 * PRÉPARE la zone des objectifs sur la 🌸 Vue d'ensemble : défusionne, efface
 * les anciennes références figées (#REF!), met le format % et un style propre.
 * ENSUITE tu colles 2 formules FILTER (fournies par Claude) en E50 et G50 —
 * la liste devient dynamique et suit l'onglet Épargne automatiquement.
 */
function preparerObjectifsDynamiques() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var vd = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE'));
  if (!vd) { SpreadsheetApp.getUi().alert("Feuille « Vue d'ensemble » introuvable."); return; }

  // 1) défusionner la zone de droite des objectifs (E50:G62) — la partie gauche (B/C) n'est pas touchée
  var merges = vd.getRange("E50:G62").getMergedRanges();
  for (var m = 0; m < merges.length; m++) { merges[m].breakApart(); }

  // 2) effacer les anciennes formules (dont le #REF!)
  vd.getRange("E50:G62").clearContent();

  // 3) style : % à droite pour la colonne G, noms en encre du thème pour E/F
  vd.getRange("G50:G62").setNumberFormat("0%").setFontColor(INK2).setHorizontalAlignment("right");
  vd.getRange("E50:F62").setFontColor(INK).setHorizontalAlignment("left");

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "Zone des objectifs nettoyée ✓\n\n" +
    "Colle maintenant les 2 formules de Claude :\n" +
    "   • en E50  → les noms des objectifs\n" +
    "   • en G50  → l'avancement (%)\n\n" +
    "La liste deviendra dynamique et suivra l'onglet Épargne automatiquement.");
}
