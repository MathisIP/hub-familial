/**
 * REPAS_SEMAINE — MISE EN FORME (listes + couleurs + harmonisation + THÈMES + LANGUES)
 * ===================================================================================
 * Mises en place visuelles, sûres et ré-exécutables :
 *   · configurerListes            — liste déroulante « Dîner » (recettes).
 *   · configurerCouleursRecettes  — Type en gras coloré (Viande/Poisson/Végé) +
 *                                    fond de ligne selon Chaud/Froid.
 *   · harmoniserRepas             — charte : police Arial, en-têtes, onglets colorés,
 *                                    lignes figées + fond CELL (mode 🌙 Nuit lisible).
 *
 * Toutes les couleurs viennent du thème actif (00_Constantes.gs, registre THEMES).
 * La bascule de thème (menu 🎨 Thème) appelle `appliquerThemeRepas_` : elle
 * ré-applique l'harmonisation + les couleurs de recettes + régénère le Lisez-moi,
 * SANS toucher aux données. Ne touchent QUE la mise en forme.
 * Phase H : les onglets sont référencés par `nomOnglet_('CLE')` (nom suivant la
 * langue active) ; TABCOL est keyé par les MÊMES clés canoniques. Les libellés
 * « métier » (Viande / Poisson / Végétarien / Chaud / Froid) restent en dur :
 * décision Phase H (pas encore dans l'I18N).
 */

/**
 * Pose la liste déroulante « Dîner » (recettes) en autorisant aussi la saisie libre.
 */
function configurerListes() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sem = ss.getSheetByName(nomOnglet_('SEMAINE'));
  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  if (!sem || !rec) { ui.alert("Onglet Semaine ou Recettes introuvable."); return; }

  // repérer la colonne « Dîner » (robuste si tu ajoutes une colonne Midi plus tard)
  var colDiner = 3;
  var entetes = sem.getRange(7, 1, 1, sem.getLastColumn()).getValues()[0];
  for (var c = 0; c < entetes.length; c++) {
    if (String(entetes[c]).toLowerCase().indexOf("îner") !== -1) { colDiner = c + 1; break; }
  }

  var regle = SpreadsheetApp.newDataValidation()
    .requireValueInRange(rec.getRange("A2:A100"), true)  // true = afficher la flèche de liste
    .setAllowInvalid(true)                               // autorise aussi la saisie libre
    .build();
  sem.getRange(JOUR_LIGNE_DEBUT, colDiner, JOUR_NB, 1).setDataValidation(regle);

  SpreadsheetApp.flush();
  ui.alert("Listes déroulantes configurées ✓\n\n" +
           "Colonne « Dîner » : clique la petite flèche pour choisir une recette, ou tape librement.\n" +
           "La liste se met à jour automatiquement quand tu ajoutes des recettes.");
}

/* ================= COULEURS DES RECETTES ================= */
/** Cœur (sans alerte) : Type en gras coloré + fond de ligne Chaud/Froid.
 *  Lit les couleurs du thème actif (VIANDE/POISSON/VEG, CHAUD_BG/FROID_BG). */
function couleursRecettesCore_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  if (!rec) { return false; }

  var TYPES = [["Viande", VIANDE], ["Poisson", POISSON], ["Végétarien", VEG]];
  var TEMPS = [["Chaud", CHAUD_BG], ["Froid", FROID_BG]];
  var rules = [];

  // 1) Colonne Type (C) : Type + Chaud/Froid combinés -> fond + gras coloré (prioritaire)
  for (var t = 0; t < TYPES.length; t++) {
    for (var p = 0; p < TEMPS.length; p++) {
      rules.push(SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=($C2="' + TYPES[t][0] + '")*($D2="' + TEMPS[p][0] + '")')
        .setBackground(TEMPS[p][1]).setBold(true).setFontColor(TYPES[t][1])
        .setRanges([rec.getRange("C2:C1000")]).build());
    }
  }
  // 2) Colonne Type (C) sans Chaud/Froid renseigné : juste le gras coloré
  for (var t2 = 0; t2 < TYPES.length; t2++) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenTextEqualTo(TYPES[t2][0]).setBold(true).setFontColor(TYPES[t2][1])
      .setRanges([rec.getRange("C2:C1000")]).build());
  }
  // 3) Fond de la ligne selon Chaud/Froid, SUR LES AUTRES COLONNES (A, B, D, E)
  for (var p2 = 0; p2 < TEMPS.length; p2++) {
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$D2="' + TEMPS[p2][0] + '"')
      .setBackground(TEMPS[p2][1])
      .setRanges([rec.getRange("A2:B1000"), rec.getRange("D2:E1000")]).build());
  }

  rec.setConditionalFormatRules(rules);
  SpreadsheetApp.flush();
  return true;
}

/** Action de menu « 🎨 Couleurs des recettes » (couleurs + récap). */
function configurerCouleursRecettes() {
  if (!couleursRecettesCore_()) { SpreadsheetApp.getUi().alert("Onglet « Recettes » introuvable."); return; }
  SpreadsheetApp.getUi().alert(
    "Couleurs corrigées ✓\n\n" +
    "· Type en gras coloré (Viande / Poisson / Végétarien).\n" +
    "· Fond « chaud » pour les plats Chaud, « froid » pour les Froid.\n\n" +
    "Astuce : pour changer TOUT le coloris, utilise le menu « 🎨 Thème ».");
}

/* ================= HARMONISATION (charte + thème) ================= */
/** Cœur (sans alerte) : typographie, en-têtes, onglets colorés, lignes figées,
 *  fond CELL (mode Nuit). Lit le thème actif. */
function harmoniserRepasCore_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var sem = ss.getSheetByName(nomOnglet_('SEMAINE'));
  if (sem) { softFont_(sem); head_(sem, "A7:C7"); sem.setFrozenRows(7); }

  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  if (rec) { base_(rec); head_(rec, "A1:E1"); rec.setFrozenRows(1); }

  var rch = ss.getSheetByName(nomOnglet_('RECHERCHE'));
  if (rch) { softFont_(rch); head_(rch, "A8:D8"); }

  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  if (lm) { softFont_(lm); title_(lm, "A1"); title_(lm, "B1"); }

  // Onglets colorés (du thème) — Phase H : recherche par nom localisé (nomOnglet_)
  Object.keys(TABCOL).forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle));
    if (sh) sh.setTabColor(TABCOL[cle]);
  });

  SpreadsheetApp.flush();
}

/** Action de menu « 🌸 Harmoniser le design » (harmonisation + récap). */
function harmoniserRepas() {
  harmoniserRepasCore_();
  SpreadsheetApp.getUi().alert(
    "Design harmonisé ✓\n\n" +
    "· Police Arial + encre + fond du thème\n" +
    "· En-têtes colorés, lignes d'en-tête figées, onglets colorés\n\n" +
    "Astuce : pour changer les COULEURS, utilise le menu « 🎨 Thème ».");
}

/** Bascule de thème (appelée par appliquerTheme, 00_Constantes.gs) : harmonise +
 *  couleurs de recettes + régénère le Lisez-moi. Pas de boîte de dialogue. */
function appliquerThemeRepas_() {
  harmoniserRepasCore_();
  couleursRecettesCore_();
  try { remplirLisezMoi(); } catch (e) {}
}

/* ================= SOCLE COMMUN D'HARMONISATION (thème) ================= */
// base_ : fond CELL (toute la grille : blanc en clair, foncé en Nuit) + police
// Arial + encre INK sur la zone utilisée. Formatage pur.
function base_(sh) {
  var mr = sh.getMaxRows(), mc = sh.getMaxColumns();
  sh.getRange(1, 1, mr, mc).setBackground(CELL);
  var r = Math.max(sh.getLastRow(), 1), c = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, r, c).setFontFamily("Arial").setFontColor(INK).setVerticalAlignment("middle");
}
// softFont_ : unifie seulement la police (onglets « vitrine » — Semaine, Recherche,
// Lisez-moi — dont on ne veut écraser ni les couleurs ni le fond ; restent lisibles
// même en thème sombre). Le Lisez-moi est de toute façon régénéré par remplirLisezMoi.
function softFont_(sh) {
  var r = Math.max(sh.getLastRow(), 1), c = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, r, c).setFontFamily("Arial").setVerticalAlignment("middle");
}
function head_(sh, a1) {
  sh.getRange(a1).setBackground(HEAD).setFontColor(INK).setFontWeight("bold").setFontSize(10)
    .setVerticalAlignment("middle")
    .setBorder(false, false, true, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}
function title_(sh, a1) { sh.getRange(a1).setFontColor(INK).setFontWeight("bold"); }
