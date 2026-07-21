/**
 * REPAS_SEMAINE — AJOUTER DES CATÉGORIES AUX RECETTES
 * ===================================================
 * Ajoute 2 colonnes à l'onglet « Recettes » (avec listes déroulantes) pour
 * pouvoir rechercher / filtrer :
 *   · Type          : Viande / Poisson / Végétarien
 *   · Chaud / Froid  : Chaud / Froid
 *
 * Les colonnes sont insérées APRÈS « Ingrédients » (col. B), donc l'envoi des
 * ingrédients vers les courses continue de fonctionner sans rien changer.
 *
 * IDEMPOTENT : garde-fou si la colonne « Type » existe déjà.
 * Lancement : menu 🍽️ Repas ▸ ⚙️ Configuration ▸ « 🏷️ Ajouter les catégories aux recettes ».
 *
 * Pour RECHERCHER ensuite : Données ▸ Créer un filtre (ou « Vue filtrée »), puis
 * l'entonnoir de la colonne Type ou Chaud/Froid.
 */
function ajouterCategoriesRecettes() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  if (!rec) { SpreadsheetApp.getUi().alert("Onglet « Recettes » introuvable."); return; }

  // garde-fou : déjà en place ?
  var head = rec.getRange(1, 1, 1, Math.max(rec.getLastColumn(), 1)).getValues()[0];
  for (var h = 0; h < head.length; h++) {
    if (String(head[h]).trim().toLowerCase() === "type") {
      SpreadsheetApp.getUi().alert("Les catégories semblent déjà présentes (colonne « Type »)."); return;
    }
  }

  // insère 2 colonnes après « Ingrédients » (col. B) : C = Type, D = Chaud/Froid ; « Note » passe en E
  rec.insertColumnsAfter(2, 2);

  // en-têtes (même style rose que les autres colonnes)
  rec.getRange("C1").setValue("Type");
  rec.getRange("D1").setValue("Chaud / Froid");
  rec.getRange("C1:D1")
     .setBackground("#EDC6D3").setFontColor("#3F3B36").setFontWeight("bold")
     .setVerticalAlignment("middle").setWrap(true)
     .setBorder(true, true, true, true, false, false, "#D9D2C6", SpreadsheetApp.BorderStyle.SOLID);
  rec.setColumnWidth(3, 120);
  rec.setColumnWidth(4, 120);
  rec.getRange("C2:D1000").setWrap(false).setVerticalAlignment("middle").setFontColor("#3F3B36");

  // listes déroulantes
  rec.getRange("C2:C1000").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Viande", "Poisson", "Végétarien"], true).setAllowInvalid(false).build());
  rec.getRange("D2:D1000").setDataValidation(
    SpreadsheetApp.newDataValidation()
      .requireValueInList(["Chaud", "Froid"], true).setAllowInvalid(false).build());

  // pré-remplissage des recettes d'exemple (repérées par leur nom)
  var CAT = {
    "pâtes bolognaise":      ["Viande", "Chaud"],
    "poulet rôti & légumes": ["Viande", "Chaud"],
    "curry de pois chiches": ["Végétarien", "Chaud"],
    "omelette & salade":     ["Végétarien", "Chaud"],
    "saumon & riz":          ["Poisson", "Chaud"],
    "soupe & tartines":      ["Végétarien", "Chaud"],
    "tacos maison":          ["Viande", "Chaud"],
    "risotto champignons":   ["Végétarien", "Chaud"]
  };
  var last = rec.getLastRow();
  if (last >= 2) {
    var noms = rec.getRange(2, 1, last - 1, 1).getValues();
    for (var i = 0; i < noms.length; i++) {
      var key = String(noms[i][0]).trim().toLowerCase();
      if (CAT[key]) {
        rec.getRange(i + 2, 3).setValue(CAT[key][0]);
        rec.getRange(i + 2, 4).setValue(CAT[key][1]);
      }
    }
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "Catégories ajoutées ✓\n\n" +
    "· « Type » : Viande / Poisson / Végétarien\n" +
    "· « Chaud / Froid »\n\n" +
    "Tes recettes d'exemple sont déjà catégorisées.\n" +
    "Pour rechercher : Données ▸ Créer un filtre, puis l'entonnoir de la colonne Type ou Chaud/Froid.");
}
