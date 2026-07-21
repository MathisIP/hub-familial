/**
 * SUIVI CADEAUX — MISE EN FORME (harmonisation + couleurs par statut + THÈMES + LANGUES)
 * =====================================================================================
 * Formatage uniquement — aucune donnée touchée. Ré-exécutable à volonté.
 *   · Base commune : police Arial + encre INK + fond CELL (blanc en clair, foncé
 *     en 🌙 Nuit → mode sombre lisible), en-têtes HEAD avec filet, lignes figées,
 *     onglets colorés (TABCOL du thème).
 *   · Cadeaux   : couleur selon le statut (colonne D), lignes « Offert » grisées,
 *                 budgets/prix au format €.
 *   · Occasions : dates au format JJ/MM/AAAA ; celles dans les 30 prochains jours
 *                 ressortent en ambre.
 *
 * Toutes les couleurs viennent du thème actif (00_Constantes.gs, registre THEMES).
 * La bascule de thème (menu 🎨 Thème) appelle `appliquerThemeCadeaux_`.
 * Phase H : les onglets sont référencés par `nomOnglet_('CLE')` (nom suivant la
 * langue active) ; TABCOL est keyé par les MÊMES clés canoniques. Les statuts
 * (Idée / À acheter / Commandé / Reçu / Emballé / Offert) restent en dur : ce sont
 * des données saisies par l'utilisateur (hors I18N, décision Phase H).
 * Lancement manuel : menu 🎁 Cadeaux ▸ « 🎨 Configurer les couleurs / statuts ».
 */

/** Cœur du design (SANS boîte de dialogue) — réutilisé par le menu et la bascule
 *  de thème. Formatage pur : ne touche ni valeurs ni formules. */
function configurerCadeauxCore_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  // === Base typographique + fond CELL sur les onglets de données ===
  ["CADEAUX", "OCCASIONS", "PARAMETRES"].forEach(function (cle) {
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

  // --- Cadeaux : en-tête + gel + formats € + couleur selon le statut ---
  var ca = ss.getSheetByName(nomOnglet_('CADEAUX'));
  if (ca) {
    head_(ca, "A1:I1"); ca.setFrozenRows(1);
    ca.getRange("E2:F1000").setNumberFormat('#,##0.00" €"');   // Budget prévu / Prix payé
    var rules = [];
    // Offert -> ligne grisée (règle prioritaire)
    rules.push(SpreadsheetApp.newConditionalFormatRule()
      .whenFormulaSatisfied('=$D2="Offert"')
      .setBackground(COUL_OFFERT_BG).setFontColor(COUL_TXT_GRIS)
      .setRanges([ca.getRange("A2:I1000")]).build());
    // pastille de couleur sur la colonne Statut (D)
    rules.push(stat_(ca, "Idée",      COUL_STATUT["Idée"]));
    rules.push(stat_(ca, "À acheter", COUL_STATUT["À acheter"]));
    rules.push(stat_(ca, "Commandé",  COUL_STATUT["Commandé"]));
    rules.push(stat_(ca, "Reçu",      COUL_STATUT["Reçu"]));
    rules.push(stat_(ca, "Emballé",   COUL_STATUT["Emballé"]));
    ca.setConditionalFormatRules(rules);
  }

  // --- Occasions : en-tête + gel + format date + occasions proches (< 30 j) en ambre ---
  var oc = ss.getSheetByName(nomOnglet_('OCCASIONS'));
  if (oc) {
    head_(oc, "A1:D1"); oc.setFrozenRows(1);
    oc.getRange("B2:B200").setNumberFormat("dd/mm/yyyy");   // Date en JJ/MM/AAAA (charte)
    oc.getRange("C2:C200").setNumberFormat('#,##0" €"');    // Budget en €
    oc.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule()
        .whenFormulaSatisfied('=AND($B2<>"",$B2>=TODAY(),$B2-TODAY()<=30)')
        .setBackground(COUL_OCCASION_PROCHE).setBold(true)
        .setRanges([oc.getRange("A2:D200")]).build()
    ]);
  }

  // --- Aperçu / Lisez-moi : titres en encre du thème ---
  var ap = ss.getSheetByName(nomOnglet_('APERCU')); if (ap) title_(ap, "A1");
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI')); if (lm) { title_(lm, "A1"); title_(lm, "B1"); }

  SpreadsheetApp.flush();
}

/** Action de menu « 🎨 Configurer les couleurs / statuts » (design + récap). */
function configurerCadeaux() {
  configurerCadeauxCore_();
  SpreadsheetApp.getUi().alert(
    "Suivi cadeaux harmonisé !\n\n" +
    "· Police Arial + encre + fond du thème, en-têtes colorés, onglets colorés.\n" +
    "· Cadeaux : couleur selon le statut, lignes « Offert » grisées.\n" +
    "· Occasions : celles à moins de 30 jours ressortent en ambre.\n\n" +
    "Astuce : pour changer TOUT le coloris, utilise le menu « 🎨 Thème ».");
}

/** Bascule de thème (appelée par appliquerTheme, 00_Constantes.gs) : re-design +
 *  régénère le Lisez-moi (qui lit la palette). Pas de boîte de dialogue. */
function appliquerThemeCadeaux_() {
  configurerCadeauxCore_();
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

// pastille de couleur sur la colonne Statut (D) pour une valeur exacte
function stat_(sh, val, bg) {
  return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(val)
    .setBackground(bg).setRanges([sh.getRange("D2:D1000")]).build();
}
