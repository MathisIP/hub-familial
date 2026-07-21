/**
 * TO-DO FAMILIALE — MISE EN FORME (charte + THÈMES Phase G + LANGUES Phase H)
 * ==========================================================================
 * Formatage uniquement — aucune donnée n'est touchée. Ré-exécutable à volonté.
 *   · Base commune : police Arial + encre INK + fond CELL sur les onglets de
 *     données (CELL = blanc en thème clair, foncé en 🌙 Nuit → mode sombre lisible).
 *   · En-têtes HEAD avec filet LINE2, lignes d'en-tête figées, onglets colorés (TABCOL).
 *   · Courses : vraies cases à cocher (l'article se barre une fois coché).
 *   · Tâches  : « Fait » grisé, retards en rouge, priorités / personnes / statuts
 *               en couleur, échéances au format JJ/MM/AAAA.
 *
 * Toutes les couleurs viennent du thème actif (00_Constantes.gs, registre THEMES) :
 * changer de thème = changer les valeurs lues. Voir aussi appliquerThemeTodo_.
 *
 * Phase H : les onglets ne sont plus référencés par un nom en dur mais par
 * `nomOnglet_('CLE')` (le nom réel suit la langue active). TABCOL est keyé par les
 * MÊMES clés canoniques → couleur d'onglet retrouvée via nomOnglet_(cle). Les
 * libellés « métier » (Fait / Haute / Moyenne / Basse / Lou / Mati / Les deux /
 * À faire / En cours) restent en dur : décision Phase H (pas encore dans l'I18N).
 *
 * Lancement manuel : menu ✅ To-Do ▸ « 🎨 Réappliquer la mise en forme »
 * (`configurerTodo`, avec récap). La bascule de thème appelle `appliquerThemeTodo_`.
 */

/** Cœur du formatage (SANS boîte de dialogue) — réutilisé par configurerTodo et
 *  par la bascule de thème. Formatage pur : ne touche ni valeurs ni formules. */
function formaterTodo_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // === Base typographique + fond CELL sur les onglets de données ===
  ["TACHES", "COURSES", "LOU", "MATI", "NOUS_DEUX", "PARAMETRES"].forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle)); if (sh) base_(sh);
  });
  // Onglets « vitrine » : on unifie seulement la police, sans écraser leurs couleurs
  // ni leur fond (Aperçu reste donc lisible même en thème sombre ; le Lisez-moi est
  // régénéré à part par remplirLisezMoi, qui le re-thème entièrement).
  ["APERCU", "LISEZMOI"].forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle)); if (sh) softFont_(sh);
  });

  // === Onglets colorés (du thème) — recherche par nom localisé (nomOnglet_) ===
  Object.keys(TABCOL).forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle));
    if (sh) sh.setTabColor(TABCOL[cle]);
  });

  // --- Courses : vraies cases à cocher + en-tête + ligne figée ---
  var co = ss.getSheetByName(nomOnglet_('COURSES'));
  if (co) {
    co.getRange("A2:A1000").setDataValidation(
      SpreadsheetApp.newDataValidation().requireCheckbox().build());
    head_(co, "A1:C1"); co.setFrozenRows(1);
    // quand c'est coché -> l'article se grise et se barre
    co.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$A2=TRUE')
        .setFontColor(DONE_TX).setStrikethrough(true)
        .setRanges([co.getRange("B2:C1000")]).build()
    ]);
  }

  // --- Tâches : en-tête + ligne figée + format date + couleurs conditionnelles ---
  var ta = ss.getSheetByName(nomOnglet_('TACHES'));
  if (ta) {
    head_(ta, "A1:H1"); ta.setFrozenRows(1);
    ta.getRange("F2:F1000").setNumberFormat("dd/mm/yyyy");   // Échéance en JJ/MM/AAAA (charte)
    var rules = [];
    // Fait -> ligne grisée (règle prioritaire)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$A2="Fait"')
      .setBackground(DONE_BG).setFontColor(DONE_TX)
      .setRanges([ta.getRange("A2:H1000")]).build());
    // En retard -> échéance en rouge
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($F2<>"",$F2<TODAY(),$A2<>"Fait")')
      .setBackground(OVER_BG).setFontColor(OVER_TX).setBold(true)
      .setRanges([ta.getRange("F2:F1000")]).build());
    // Priorité (colonne E)
    rules.push(prio_(ta, "Haute", PRIO_HAUTE_BG, OVER_TX));
    rules.push(prio_(ta, "Moyenne", PRIO_MOY_BG, PRIO_MOY_TX));
    rules.push(prio_(ta, "Basse", PRIO_BAS_BG, OK_TX));
    // Assigné à (colonne C)
    rules.push(assig_(ta, "Lou", ASSIGN_A));
    rules.push(assig_(ta, "Mati", ASSIGN_B));
    rules.push(assig_(ta, "Les deux", ASSIGN_BOTH));
    // Statut (colonne A) — pastilles douces
    rules.push(assigCol_(ta, "A", "À faire", STATUT_AFAIRE));
    rules.push(assigCol_(ta, "A", "En cours", STATUT_ENCOURS));
    ta.setConditionalFormatRules(rules);
  }

  // --- Onglets perso (vues QUERY) : en-tête stylé + ligne figée ---
  ["LOU", "MATI", "NOUS_DEUX"].forEach(function (cle) {
    var v = ss.getSheetByName(nomOnglet_(cle));
    if (v) { head_(v, "A1:F1"); v.setFrozenRows(1); }
  });

  // --- Aperçu / Lisez-moi : titres en encre du thème ---
  var ap = ss.getSheetByName(nomOnglet_('APERCU')); if (ap) title_(ap, "A1");
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI')); if (lm) { title_(lm, "A1"); title_(lm, "B1"); }

  SpreadsheetApp.flush();
}

/** Action de menu « 🎨 Réappliquer la mise en forme » (formatage + récap). */
function configurerTodo() {
  formaterTodo_();
  SpreadsheetApp.getUi().alert(
    "To-Do harmonisée !\n\n" +
    "· Police Arial + encre + fond du thème sur tous les onglets\n" +
    "· En-têtes colorés, lignes d'en-tête figées, onglets colorés\n" +
    "· Courses : cases à cocher (l'article se barre une fois coché)\n" +
    "· Tâches : « Fait » grisé, retards en rouge, priorités / personnes / statuts en couleur\n\n" +
    "Astuce : pour changer les COULEURS, utilise le menu « 🎨 Thème ».");
}

/** Bascule de thème (appelée par appliquerTheme, 00_Constantes.gs) : re-formate
 *  tout + régénère le Lisez-moi (qui lit la palette). Pas de boîte de dialogue. */
function appliquerThemeTodo_() {
  formaterTodo_();
  try { remplirLisezMoi(); } catch (e) {}
}

/* ================= SOCLE COMMUN D'HARMONISATION ================= */
// base_ : fond CELL (toute la grille : blanc en clair, foncé en Nuit) + police
// Arial + encre INK sur la zone utilisée. Formatage pur (ni valeurs ni formules).
function base_(sh) {
  var mr = sh.getMaxRows(), mc = sh.getMaxColumns();
  sh.getRange(1, 1, mr, mc).setBackground(CELL);
  var r = Math.max(sh.getLastRow(), 1), c = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, r, c).setFontFamily("Arial").setFontColor(INK).setVerticalAlignment("middle");
}
// softFont_ : unifie seulement la police (onglets « vitrine » dont on ne veut
// écraser ni les couleurs de texte ni le fond — reste lisible en thème sombre).
function softFont_(sh) {
  var r = Math.max(sh.getLastRow(), 1), c = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, r, c).setFontFamily("Arial").setVerticalAlignment("middle");
}
// head_ : en-tête de tableau (HEAD), gras, filet inférieur LINE2 (même style partout).
function head_(sh, a1) {
  sh.getRange(a1).setBackground(HEAD).setFontColor(INK).setFontWeight("bold").setFontSize(10)
    .setVerticalAlignment("middle")
    .setBorder(false, false, true, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
}
function title_(sh, a1) { sh.getRange(a1).setFontColor(INK).setFontWeight("bold"); }

/* ================= RÈGLES DE COULEUR (Tâches) ================= */
function prio_(sh, val, bg, fg) {
  return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(val)
    .setBackground(bg).setFontColor(fg).setRanges([sh.getRange("E2:E1000")]).build();
}
function assig_(sh, val, bg) {
  return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(val)
    .setBackground(bg).setRanges([sh.getRange("C2:C1000")]).build();
}
function assigCol_(sh, col, val, bg) {
  return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(val)
    .setBackground(bg).setRanges([sh.getRange(col + "2:" + col + "1000")]).build();
}
