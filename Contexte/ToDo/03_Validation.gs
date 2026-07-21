/**
 * TO-DO FAMILIALE — VALIDER DEPUIS LES ONGLETS Lou / Mati / Nous deux
 * ==================================================================
 * Ajoute une colonne « Fait ? » (cases à cocher) dans Lou / Mati / Nous deux.
 * Quand on coche une case :
 *   · la tâche passe à « Fait » dans l'onglet Tâches (et disparaît de la vue) ;
 *   · si elle est récurrente, sa prochaine occurrence est créée automatiquement ;
 *   · la case se décoche toute seule.
 * Les vues restent pilotées par les formules QUERY (rien à changer dedans).
 *
 * INSTALLATION (une seule fois) : menu ✅ To-Do ▸ ⚙️ Configuration ▸
 *   « ✅ Activer la validation » (ou exécuter `configurerValidation`).
 * Déclencheur installé : validerDepuisOnglet (onEdit).
 * Constante VUES → voir 00_Constantes.gs. Helpers (memeDate_, prochaineDate_,
 * supprimerDeclencheurs_) → voir 07_Utils.gs.
 */

function configurerValidation() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  VUES_CLES.forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle));
    if (!sh) return;
    sh.getRange("F1").setValue("Fait ?").setFontWeight("bold").setFontColor("#3F3B36");
    sh.getRange("F2:F1000").setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build());
    sh.setColumnWidth(6, 60);
    sh.getRange("D2:D1000").setNumberFormat("dd/mm/yyyy");   // colonne Échéance lisible
  });
  supprimerDeclencheurs_(["validerDepuisOnglet"]);
  ScriptApp.newTrigger("validerDepuisOnglet").forSpreadsheet(ss).onEdit().create();
  SpreadsheetApp.getUi().alert(
    "Validation activée !\n\nDans Lou / Mati / Nous deux, coche la case « Fait ? » "
    + "d'une tâche : elle passe à « Fait » dans Tâches et disparaît de la vue.");
}

/** Déclencheur onEdit : coche = valide la tâche correspondante. */
function validerDepuisOnglet(e) {
  if (!e || !e.range) return;
  var sh = e.range.getSheet();
  var perso = vueAssigneDepuisFeuille_(sh);
  if (!perso) return;                        // pas une vue perso
  if (e.range.getColumn() !== 6 || e.range.getRow() < 2) return;   // colonne F
  if (e.range.getValue() !== true) return;   // seulement quand on coche

  var row = e.range.getRow();
  var tache = String(sh.getRange(row, 1).getValue()).trim();   // A = Tâche
  var ech = sh.getRange(row, 4).getValue();                    // D = Échéance
  if (!tache) { e.range.setValue(false); return; }

  var ta = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomOnglet_('TACHES'));
  var last = ta.getLastRow();
  if (last >= 2) {
    var data = ta.getRange(2, 1, last - 1, 8).getValues();     // A..H
    for (var i = 0; i < data.length; i++) {
      if (String(data[i][0]).trim() === "Fait") continue;      // A statut
      if (String(data[i][1]).trim() !== tache) continue;       // B tâche
      if (String(data[i][2]).trim() !== perso) continue;       // C assigné
      if (!memeDate_(data[i][5], ech)) continue;               // F échéance
      // -> on a trouvé la tâche : on la valide
      ta.getRange(2 + i, 1).setValue("Fait");
      // récurrence : créer la prochaine occurrence
      var rec = String(data[i][6]).trim().toLowerCase();
      if (["hebdomadaire", "mensuelle", "annuelle"].indexOf(rec) >= 0) {
        var base = (data[i][5] instanceof Date) ? data[i][5] : new Date();
        var next = prochaineDate_(base, rec);
        ta.appendRow(["À faire", data[i][1], data[i][2], data[i][3], data[i][4],
                      next, data[i][6], data[i][7]]);
        ta.getRange(ta.getLastRow(), 6).setNumberFormat("dd/mm/yyyy");
      }
      break;
    }
  }
  e.range.setValue(false);   // décoche la case
}
