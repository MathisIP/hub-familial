/**
 * ÉVÉNEMENTS — DESIGN (harmonisation + couleurs statut / RSVP + cases + THÈMES + LANGUES)
 * ======================================================================================
 * Formatage uniquement — aucune donnée touchée. Ré-exécutable à volonté.
 *   · Base commune : police Arial + encre INK + fond CELL (blanc en clair, foncé
 *     en 🌙 Nuit → mode sombre lisible), en-têtes HEAD avec filet, lignes figées,
 *     onglets colorés (TABCOL du thème).
 *   · Événements : statut en couleur, dates proches (< 14 j) en ambre, lignes
 *     « Passé » grisées, colonne technique AgendaID (K) masquée.
 *   · Invités : couleur selon la réponse (RSVP).
 *   · Checklist & Menu & Courses : cases à cocher (F) ; ligne cochée grisée/barrée.
 *
 * Toutes les couleurs viennent du thème actif (00_Constantes.gs, registre THEMES).
 * La bascule de thème (menu 🎨 Thème) appelle `appliquerThemeEvenements_`.
 * Phase H : les onglets sont référencés par `nomOnglet_('CLE')` (le nom réel suit
 * la langue active) ; TABCOL est keyé par les MÊMES clés canoniques. Les libellés
 * « métier » (Passé / À planifier / En préparation / Prêt / Oui / Non / Peut-être /
 * En attente) restent en dur : décision Phase H (pas encore dans l'I18N).
 * Lancement manuel : menu 🎉 Événements ▸ « 🎨 Configurer le design ».
 */

/** Cœur du design (SANS boîte de dialogue) — réutilisé par le menu et la bascule
 *  de thème. Formatage pur : ne touche ni valeurs ni formules. */
function configurerEvenementsCore_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // === Base typographique + fond CELL sur les onglets de données ===
  ["EVENEMENTS", "INVITES", "CHECKLIST", "MENU_COURSES", "PARAMETRES"].forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle)); if (sh) base_(sh);
  });
  // Onglets « vitrine » : police seule (on ne veut pas écraser leurs couleurs/fond).
  ["APERCU", "LISEZMOI"].forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle)); if (sh) softFont_(sh);
  });

  // === Onglets colorés (du thème) — recherche par nom localisé (nomOnglet_) ===
  Object.keys(TABCOL).forEach(function (cle) {
    var sh = ss.getSheetByName(nomOnglet_(cle));
    if (sh) sh.setTabColor(TABCOL[cle]);
  });

  // --- Événements : en-tête + gel + formats + statut en couleur + « Passé » grisé ---
  var ev = ss.getSheetByName(nomOnglet_('EVENEMENTS'));
  if (ev) {
    head_(ev, "A1:J1"); ev.setFrozenRows(1);
    ev.getRange("C2:C1000").setNumberFormat("dd/mm/yyyy");   // Date en JJ/MM/AAAA (charte)
    ev.getRange("G2:H1000").setNumberFormat('#,##0" €"');    // Budget prévu / Dépensé en €
    var rules = [];
    // Passé -> ligne grisée (prioritaire)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$I2="Passé"')
      .setBackground(DONE_BG).setFontColor(DONE_TX)
      .setRanges([ev.getRange("A2:J1000")]).build());
    // pastilles sur la colonne Statut (I)
    rules.push(stat_(ev, "I", "À planifier",    STAT_APLANIF));
    rules.push(stat_(ev, "I", "En préparation", STAT_PREP));
    rules.push(stat_(ev, "I", "Prêt",           STAT_PRET));
    // Date à moins de 14 jours (et pas encore passée) -> date en ambre
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=AND($C2<>"",$C2>=TODAY(),$C2-TODAY()<=14)')
      .setBackground(STAT_APLANIF).setBold(true)
      .setRanges([ev.getRange("C2:C1000")]).build());
    ev.setConditionalFormatRules(rules);
    // masque la colonne technique AgendaID (K)
    ev.hideColumns(11);
  }

  // --- Invités : en-tête + gel + couleur selon la réponse (RSVP, colonne D) ---
  var inv = ss.getSheetByName(nomOnglet_('INVITES'));
  if (inv) {
    head_(inv, "A1:E1"); inv.setFrozenRows(1);
    inv.setConditionalFormatRules([
      stat_(inv, "D", "Oui",       STAT_PRET),
      stat_(inv, "D", "Non",       RSVP_NON),
      stat_(inv, "D", "Peut-être", STAT_APLANIF),
      stat_(inv, "D", "En attente", RSVP_ATTENTE)
    ]);
  }

  // --- Checklist : en-tête + gel + cases à cocher + tâches faites grisées/barrées ---
  var chk = ss.getSheetByName(nomOnglet_('CHECKLIST'));
  if (chk) {
    head_(chk, "A1:G1"); chk.setFrozenRows(1);
    chk.getRange("F2:F1000").insertCheckboxes();
    chk.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$F2=TRUE')
        .setBackground(DONE_BG).setFontColor(DONE_TX).setStrikethrough(true)
        .setRanges([chk.getRange("A2:G1000")]).build()
    ]);
  }

  // --- Menu & Courses : en-tête + gel + cases à cocher + articles achetés grisés ---
  var men = ss.getSheetByName(nomOnglet_('MENU_COURSES'));
  if (men) {
    head_(men, "A1:G1"); men.setFrozenRows(1);
    men.getRange("F2:F1000").insertCheckboxes();
    men.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=$F2=TRUE')
        .setBackground(DONE_BG).setFontColor(DONE_TX).setStrikethrough(true)
        .setRanges([men.getRange("A2:G1000")]).build()
    ]);
  }

  // --- Aperçu / Lisez-moi : titres en encre du thème ---
  var ap = ss.getSheetByName(nomOnglet_('APERCU')); if (ap) title_(ap, "A1");
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI')); if (lm) { title_(lm, "A1"); title_(lm, "B1"); }

  SpreadsheetApp.flush();
}

/** Action de menu « 🎨 Configurer le design » (design + récap). */
function configurerEvenements() {
  configurerEvenementsCore_();
  SpreadsheetApp.getUi().alert(
    "Design harmonisé !\n\n" +
    "· Police Arial + encre + fond du thème, en-têtes colorés, onglets colorés.\n" +
    "· Événements : statut en couleur, dates proches en ambre, lignes « Passé » grisées.\n" +
    "· Invités : couleur selon la réponse (RSVP).\n" +
    "· Checklist & Menu : cases à cocher ; une fois cochées, la ligne se grise.\n\n" +
    "Astuce : pour changer TOUT le coloris, utilise le menu « 🎨 Thème ».\n" +
    "Pense à « 📅 Synchroniser l'agenda » pour envoyer les dates.");
}

/** Bascule de thème (appelée par appliquerTheme, 00_Constantes.gs) : re-design +
 *  régénère le Lisez-moi (qui lit la palette). Pas de boîte de dialogue. */
function appliquerThemeEvenements_() {
  configurerEvenementsCore_();
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
// softFont_ : unifie seulement la police (onglets « vitrine » — Aperçu, Lisez-moi —
// dont on ne veut écraser ni les couleurs ni le fond ; restent lisibles en Nuit).
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

// pastille de couleur sur une colonne pour une valeur exacte
function stat_(sh, colLetter, val, bg) {
  return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(val)
    .setBackground(bg).setRanges([sh.getRange(colLetter + "2:" + colLetter + "1000")]).build();
}
