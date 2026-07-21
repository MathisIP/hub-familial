/**
 * SUIVI CADEAUX — INITIALISATION (Phase C — assistant d'installation)
 * ==================================================================
 * Permet à un NOUVEAU foyer de tout mettre en place « en quelques clics », sans
 * ouvrir l'éditeur Apps Script. 3 actions, dans le menu 🎁 Cadeaux ▸ ⚙️ Configuration :
 *
 *   · initialiserCadeaux()            → 🚀 mise en forme (couleurs par statut + occasions proches).
 *   · verifierCadeaux()               → 🔍 diagnostic (ne modifie RIEN).
 *   · reinitialiserExemplesCadeaux()  → ♻️ remet des cadeaux / occasions d'EXEMPLE
 *                                       (protégé par une confirmation tapée).
 *
 * Réutilise la fonction publique déjà testée `configurerCadeaux`.
 * Couleurs de statut → 00_Constantes.gs.
 *
 * Phase D (2026-07-16) : l'installation se termine par `remplirLisezMoi()`
 * (mode d'emploi enrichi de l'onglet Lisez-moi), et la vérification contrôle
 * que ce Lisez-moi a bien été généré.
 */

/* ================================================================
 *  🚀 INSTALLATION COMPLÈTE
 * ================================================================ */
function initialiserCadeaux() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "🚀 Installer / configurer le Suivi cadeaux",
    "Cet assistant met la feuille en forme en une fois :\n\n" +
    "  1. Police + en-têtes + onglets colorés (charte pastel)\n" +
    "  2. Couleur selon le statut, lignes « Offert » grisées\n" +
    "  3. Occasions à moins de 30 jours en ambre\n" +
    "  4. Lisez-moi (mode d'emploi complet)\n\n" +
    "👉 Tu verras une confirmation : clique OK.\n\n" +
    "Lancer l'installation ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep !== ui.Button.OK) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  try { ss.toast("Mise en forme…", "🚀 Installation", 5); configurerCadeaux(); log.push("✔ Design + couleurs de statut"); }
  catch (e) { log.push("✘ Design — " + (e && e.message ? e.message : e)); }

  try { ss.toast("Lisez-moi…", "🚀 Installation", 5); remplirLisezMoi(); log.push("✔ Lisez-moi (mode d'emploi)"); }
  catch (e) { log.push("✘ Lisez-moi — " + (e && e.message ? e.message : e)); }

  SpreadsheetApp.flush();
  ui.alert(
    "✅ Installation du Suivi cadeaux terminée\n\n" +
    log.join("\n") +
    "\n\n— À VÉRIFIER / À FAIRE À LA MAIN —\n" +
    "• Onglet Paramètres : tes plages nommées ListeStatutsCad,\n" +
    "  ListePersonnes, ListeOccasions.\n" +
    "• Onglet Aperçu : coller la formule IMPORTRANGE du lien budget\n" +
    "  « Cadeaux » (Vue annuelle!B14:M14) — voir le Lisez-moi, section ⑥.\n\n" +
    "Astuce : « 🔍 Vérifier la configuration » fait le point à tout moment.");
}

/* ================================================================
 *  🔍 VÉRIFICATION (ne modifie rien)
 * ================================================================ */
function verifierCadeaux() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = [];
  function ok(c, t)  { L.push((c ? "✅ " : "❌ ") + t); }
  function warn(t)   { L.push("⚠️ " + t); }

  ["CADEAUX", "OCCASIONS", "PARAMETRES"].forEach(function (cle) {
    var n = nomOnglet_(cle);
    ok(!!ss.getSheetByName(n), "Onglet « " + n + " » présent");
  });

  // Lisez-moi enrichi (Phase D) : présent ET généré (titre « Mode d'emploi » en B2)
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  var lmRempli = lm && String(lm.getRange("B2").getValue()).indexOf("Mode d'emploi") !== -1;
  ok(!!lmRempli, "Onglet Lisez-moi enrichi (mode d'emploi généré)");

  var ca = ss.getSheetByName(nomOnglet_('CADEAUX'));
  ok(ca && ca.getFrozenRows() === 1, "Mise en forme appliquée (ligne d'en-tête figée)");

  ["ListeStatutsCad", "ListePersonnes", "ListeOccasions"].forEach(function (nm) {
    var present = false;
    try { present = !!ss.getRangeByName(nm); } catch (e) { present = false; }
    if (present) { ok(true, "Plage nommée « " + nm + " » définie"); }
    else { warn("Plage nommée « " + nm + " » à définir (Données ▸ Plages nommées)"); }
  });

  warn("Rappel : IMPORTRANGE du lien budget à coller dans l'onglet Aperçu (Lisez-moi § ⑥)");
  L.push("• Aucun déclencheur requis pour ce fichier.");

  SpreadsheetApp.getUi().alert("🔍 Vérification — Suivi cadeaux\n\n" + L.join("\n"));
}

/* ================================================================
 *  ♻️ RÉINITIALISER LES EXEMPLES (destructif — confirmation tapée)
 * ================================================================ */
function reinitialiserExemplesCadeaux() {
  var ui = SpreadsheetApp.getUi();
  if (!confirmerReset_(ui, "les onglets Cadeaux et Occasions")) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];

  var au = new Date();
  function jour(d) { return new Date(au.getFullYear(), au.getMonth(), au.getDate() + d); }
  var noel = new Date(au.getFullYear(), 11, 25);
  if (noel < au) { noel = new Date(au.getFullYear() + 1, 11, 25); }

  // --- Occasions (A Occasion · B Date · C Budget · D Note) ---
  var oc = ss.getSheetByName(nomOnglet_('OCCASIONS'));
  if (oc) {
    if (oc.getLastRow() > 1) { oc.getRange(2, 1, oc.getLastRow() - 1, 4).clearContent(); }
    var exOc = [
      ["EXEMPLE — Anniversaire (Membre A)", jour(40), 50,  "Exemple"],
      ["EXEMPLE — Noël",                    noel,     150, "Exemple"]
    ];
    oc.getRange(2, 1, exOc.length, 4).setValues(exOc);
    oc.getRange(2, 2, exOc.length, 1).setNumberFormat("dd/mm/yyyy");
    oc.getRange(2, 3, exOc.length, 1).setNumberFormat('#,##0" €"');
    log.push("✔ Occasions : " + exOc.length + " exemples");
  }

  // --- Cadeaux (A Pour qui · B Occasion · C Idée · D Statut · E Budget · F Prix · G Offert par · H Où/lien · I Note) ---
  var ca = ss.getSheetByName(nomOnglet_('CADEAUX'));
  if (ca) {
    if (ca.getLastRow() > 1) { ca.getRange(2, 1, ca.getLastRow() - 1, 9).clearContent(); }
    var exCa = [
      ["EXEMPLE — Membre A", "EXEMPLE — Anniversaire (Membre A)", "Livre",        "Idée",      25, "", "", "", "Exemple"],
      ["EXEMPLE — Membre B", "EXEMPLE — Noël",                    "Écharpe",      "À acheter", 30, "", "", "", "Exemple"],
      ["EXEMPLE — Membre A", "EXEMPLE — Noël",                    "Casque audio", "Commandé",  60, "", "", "", "Exemple"]
    ];
    ca.getRange(2, 1, exCa.length, 9).setValues(exCa);
    ca.getRange(2, 5, exCa.length, 2).setNumberFormat('#,##0.00" €"');   // Budget prévu / Prix payé
    log.push("✔ Cadeaux : " + exCa.length + " exemples");
  }

  SpreadsheetApp.flush();
  ui.alert(
    "♻️ Exemples réinitialisés — Cadeaux\n\n" + log.join("\n") +
    "\n\nRelance « 🎨 Configurer les couleurs / statuts » si les couleurs\n" +
    "ne s'affichent pas tout de suite.");
}

/* ================================================================
 *  Garde-fou commun aux actions destructives
 * ================================================================ */
function confirmerReset_(ui, cible) {
  var rep = ui.prompt(
    "⚠️ Réinitialiser les exemples",
    "Cette action EFFACE le contenu actuel de : " + cible + "\n" +
    "et le remplace par des données d'EXEMPLE.\n\n" +
    "À utiliser sur une COPIE vierge (gabarit), PAS sur ton fichier en service.\n\n" +
    "Pour confirmer, tape  RESET  puis clique OK :",
    ui.ButtonSet.OK_CANCEL);
  return rep.getSelectedButton() === ui.Button.OK &&
         String(rep.getResponseText()).trim().toUpperCase() === "RESET";
}
