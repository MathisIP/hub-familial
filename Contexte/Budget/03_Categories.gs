/**
 * BUDGET FAMILIAL — AJOUTER LA CATÉGORIE « RÉCEPTIONS »
 * ====================================================
 * Ajoute proprement une catégorie de dépense sur 3 onglets :
 *   · Paramètres      → la catégorie + son budget + l'entrée du menu déroulant
 *   · Vue annuelle    → une ligne (dépenses réceptions, mois par mois)
 *   · Tableau de bord → une ligne dans « Dépenses par catégorie » (vue mensuelle)
 *
 * SÛR EN LOCALE FR : on insère des lignes et on RECOPIE les formules existantes
 * (copyTo) — jamais de réécriture de formule à virgules.
 *
 * SANS CASSER LE LOOKER NI LA 🌸 VUE D'ENSEMBLE : après insertion dans le Tableau
 * de bord, on supprime la ligne vide au-dessus des SOLDES pour remettre le bloc
 * SOLDES exactement à sa place d'origine.
 *
 * IDEMPOTENT : le script saute automatiquement ce qui est déjà fait.
 * Lancement : menu 🌸 Budget ▸ ⚙️ Configuration ▸ « ➕ Ajouter la catégorie Réceptions ».
 *
 * FILET DE SÉCURITÉ : Fichier > Historique des versions pour revenir en arrière.
 * (Helper `colonneContient_` → voir Utils.gs.)
 */

var NOM_CATEGORIE  = "Réceptions";   // nom de la catégorie
var BUDGET_MENSUEL = 50;             // budget mensuel indicatif (modifiable ensuite dans Paramètres, G)

function ajouterCategorieReceptions() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pa = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  var va = ss.getSheetByName(nomOnglet_('VUE_ANNUELLE'));
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  if (!pa || !va || !tb) {
    SpreadsheetApp.getUi().alert("Onglet manquant (Paramètres / Vue annuelle / Tableau de bord).");
    return;
  }
  var faits = [];

  // ============================================================
  // 1) PARAMÈTRES — nouvelle ligne 14 : catégorie (F), budget (G),
  //    entrée du menu déroulant (K). F4:F13 / G4:G13 restent intacts
  //    (au-dessus) et la plage nommée ListeCategories s'étend seule.
  // ============================================================
  if (!colonneContient_(pa, 6, NOM_CATEGORIE)) {   // colonne F
    pa.insertRowsBefore(14, 1);
    pa.getRange(14, 6).setValue(NOM_CATEGORIE);    // F14 = catégorie
    pa.getRange(14, 7).setValue(BUDGET_MENSUEL);   // G14 = budget mensuel
    pa.getRange(14, 11).setValue(NOM_CATEGORIE);   // K14 = entrée du menu déroulant
    faits.push("Paramètres : catégorie + budget (" + BUDGET_MENSUEL + " €) + menu déroulant");
  }

  // ============================================================
  // 2) VUE ANNUELLE — nouvelle ligne JUSTE AU-DESSUS de « Divers »
  //    (ligne 15). Cadeaux (ligne 14) ne bouge pas → lien cadeaux OK.
  //    Le Total dépenses s'étend automatiquement.
  // ============================================================
  if (!colonneContient_(va, 1, NOM_CATEGORIE)) {    // colonne A
    va.insertRowsBefore(15, 1);                             // ligne 15 vierge ; Divers -> 16 ; Total -> 17
    va.getRange("A16:M16").copyTo(va.getRange("A15:M15"));  // recopie « Divers » (formats + SUMIFS mensuels)
    va.getRange("A15").setFormula("='" + nomOnglet_('PARAMETRES') + "'!F14");     // libellé (référence simple = sûre)
    faits.push("Vue annuelle : ligne « Réceptions » (dépenses mois par mois)");
  }

  // ============================================================
  // 3) TABLEAU DE BORD — nouvelle ligne AU-DESSUS de « Divers » (22),
  //    puis suppression de la ligne vide sous le total des catégories
  //    pour REMETTRE le bloc SOLDES à sa position d'origine.
  // ============================================================
  if (!colonneContient_(tb, 1, NOM_CATEGORIE)) {    // colonne A
    tb.insertRowsBefore(22, 1);                             // ligne 22 vierge ; Divers -> 23 ; Total -> 24
    tb.getRange("A23:D23").copyTo(tb.getRange("A22:D22"));  // recopie « Divers » (formats + formules)
    tb.getRange("A22").setFormula("='" + nomOnglet_('PARAMETRES') + "'!F14");     // libellé (réf simple = sûre)
    tb.getRange("C22").setFormula("='" + nomOnglet_('PARAMETRES') + "'!G14");     // budget (réf simple = sûre)
    // Remet le bloc SOLDES à sa place : supprime la ligne vide (désormais 26),
    // seulement si elle est bien vide et suivie de l'entête « SOLDES ».
    var a26 = String(tb.getRange("A26").getValue()).trim();
    var a27 = String(tb.getRange("A27").getValue()).trim();
    if (a26 === "" && a27.indexOf("SOLDES") === 0) {
      tb.deleteRow(26);
      faits.push("Tableau de bord : ligne « Réceptions » (SOLDES conservés à l'identique)");
    } else {
      faits.push("Tableau de bord : ligne « Réceptions » ajoutée (⚠ vérifie l'emplacement du bloc SOLDES)");
    }
  }

  SpreadsheetApp.flush();

  var msg;
  if (faits.length === 0) {
    msg = "Rien à faire : la catégorie « " + NOM_CATEGORIE + " » est déjà en place partout.";
  } else {
    msg = "Catégorie « " + NOM_CATEGORIE + " » — c'est fait ✓\n\n· " + faits.join("\n· ") +
      "\n\nTu peux choisir « Réceptions » dans la colonne Catégorie de Transactions.\n" +
      "Colle ensuite la formule IMPORTRANGE (fournie par Claude) dans l'onglet Événements.";
  }
  SpreadsheetApp.getUi().alert(msg);
}
