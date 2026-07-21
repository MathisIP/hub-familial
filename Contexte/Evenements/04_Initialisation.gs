/**
 * ÉVÉNEMENTS — INITIALISATION (Phase C — assistant d'installation)
 * ===============================================================
 * Permet à un NOUVEAU foyer de tout mettre en place « en quelques clics », sans
 * ouvrir l'éditeur Apps Script. 3 actions, dans le menu 🎉 Événements ▸ ⚙️ Configuration :
 *
 *   · initialiserEvenements()            → 🚀 mise en forme + cases + masquage AgendaID.
 *   · verifierEvenements()               → 🔍 diagnostic (ne modifie RIEN).
 *   · reinitialiserExemplesEvenements()  → ♻️ remet 2 événements d'EXEMPLE
 *                                          (protégé par une confirmation tapée).
 *
 * Réutilise la fonction publique déjà testée `configurerEvenements`.
 * Constante CAL_ID → 00_Constantes.gs. La synchronisation d'agenda reste une
 * action courante (menu « 📅 Synchroniser l'agenda »), lancée à la demande.
 *
 * Phase D (2026-07-16) : l'installation se termine par `remplirLisezMoi()`
 * (mode d'emploi enrichi de l'onglet Lisez-moi), et la vérification contrôle
 * que ce Lisez-moi a bien été généré.
 */

/* ================================================================
 *  🚀 INSTALLATION COMPLÈTE
 * ================================================================ */
function initialiserEvenements() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "🚀 Installer / configurer les Événements",
    "Cet assistant met la feuille en forme en une fois :\n\n" +
    "  1. Design pastel + couleurs statut / RSVP\n" +
    "  2. Cases à cocher (Checklist, Menu & Courses)\n" +
    "  3. Masquage de la colonne technique AgendaID\n" +
    "  4. Lisez-moi (mode d'emploi complet)\n\n" +
    "👉 Tu verras une confirmation : clique OK.\n\n" +
    "Lancer l'installation ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep !== ui.Button.OK) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  try { ss.toast("Mise en forme…", "🚀 Installation", 5); configurerEvenements(); log.push("✔ Design + cases + AgendaID masqué"); }
  catch (e) { log.push("✘ Design — " + (e && e.message ? e.message : e)); }

  try { ss.toast("Lisez-moi…", "🚀 Installation", 5); remplirLisezMoi(); log.push("✔ Lisez-moi (mode d'emploi)"); }
  catch (e) { log.push("✘ Lisez-moi — " + (e && e.message ? e.message : e)); }

  SpreadsheetApp.flush();
  ui.alert(
    "✅ Installation des Événements terminée\n\n" +
    log.join("\n") +
    "\n\n— AVANT LA 1re SYNCHRONISATION —\n" +
    "• Renseigne l'ID de TON agenda familial dans 00_Constantes.gs (CAL_ID),\n" +
    "  et partage cet agenda avec ce compte.\n" +
    "• Puis lance « 📅 Synchroniser l'agenda ».\n" +
    "• Onglet Aperçu : coller la formule IMPORTRANGE « Réceptions »\n" +
    "  (Vue annuelle!B15:M15 du Budget) — voir le Lisez-moi, section ⑥.\n\n" +
    "Astuce : « 🔍 Vérifier la configuration » fait le point à tout moment.");
}

/* ================================================================
 *  🔍 VÉRIFICATION (ne modifie rien)
 * ================================================================ */
function verifierEvenements() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var L = [];
  function ok(c, t)  { L.push((c ? "✅ " : "❌ ") + t); }
  function warn(t)   { L.push("⚠️ " + t); }

  ["EVENEMENTS", "INVITES", "CHECKLIST", "MENU_COURSES", "PARAMETRES"].forEach(function (cle) {
    var n = nomOnglet_(cle);
    ok(!!ss.getSheetByName(n), "Onglet « " + n + " » présent");
  });

  // Lisez-moi enrichi (Phase D) : présent ET généré (titre « Mode d'emploi » en B2)
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  var lmRempli = lm && String(lm.getRange("B2").getValue()).indexOf("Mode d'emploi") !== -1;
  ok(!!lmRempli, "Onglet Lisez-moi enrichi (mode d'emploi généré)");

  var ev = ss.getSheetByName(nomOnglet_('EVENEMENTS'));
  if (ev) {
    ok(ev.getFrozenRows() === 1, "Mise en forme appliquée (ligne d'en-tête figée)");
    var kMasque = false;
    try { kMasque = ev.isColumnHiddenByUser(11); } catch (e) { kMasque = false; }
    ok(kMasque, "Colonne technique AgendaID (K) masquée");
  }

  // Agenda familial accessible ?
  var calOk = false;
  try { calOk = !!CalendarApp.getCalendarById(CAL_ID); } catch (e) { calOk = false; }
  if (calOk) { ok(true, "Agenda familial accessible (CAL_ID)"); }
  else { warn("Agenda familial (CAL_ID) inaccessible — renseigne / partage ton agenda"); }

  warn("Rappel : IMPORTRANGE « Réceptions » à coller dans l'onglet Aperçu (Lisez-moi § ⑥)");
  L.push("• Aucun déclencheur requis pour ce fichier.");

  SpreadsheetApp.getUi().alert("🔍 Vérification — Événements\n\n" + L.join("\n"));
}

/* ================================================================
 *  ♻️ RÉINITIALISER LES EXEMPLES (destructif — confirmation tapée)
 * ================================================================ */
function reinitialiserExemplesEvenements() {
  var ui = SpreadsheetApp.getUi();
  if (!confirmerReset_(ui, "l'onglet Événements")) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ev = ss.getSheetByName(nomOnglet_('EVENEMENTS'));
  if (!ev) { ui.alert("Onglet « Événements » introuvable."); return; }

  var au = new Date();
  function jour(d) { return new Date(au.getFullYear(), au.getMonth(), au.getDate() + d); }

  // Vider les données (A..K) — on efface aussi les AgendaID pour repartir propre
  if (ev.getLastRow() > 1) { ev.getRange(2, 1, ev.getLastRow() - 1, 11).clearContent(); }

  // 2 exemples (A Événement · B Type · C Date · D Heure · E Lieu · F Nb · G Budget · H Dépensé · I Statut · J Note · K AgendaID)
  var exemples = [
    ["EXEMPLE — Dîner entre amis", "Reçu chez nous", jour(20), "19h30", "À la maison", 6, 80, 0, "En préparation", "Exemple", ""],
    ["EXEMPLE — Anniversaire",     "À venir",        jour(45), "",      "",             "", "", "", "À planifier",   "Exemple", ""]
  ];
  ev.getRange(2, 1, exemples.length, 11).setValues(exemples);
  ev.getRange(2, 3, exemples.length, 1).setNumberFormat("dd/mm/yyyy");   // Date
  ev.getRange(2, 7, exemples.length, 2).setNumberFormat('#,##0" €"');    // Budget / Dépensé

  SpreadsheetApp.flush();
  ui.alert(
    "♻️ Exemples réinitialisés — Événements\n\n" +
    "✔ Onglet Événements : 2 exemples\n\n" +
    "Non touché : Invités, Checklist, Menu & Courses (logistique par événement).\n" +
    "⚠ Les anciens événements déjà envoyés dans l'agenda n'y sont PAS supprimés\n" +
    "  (à retirer à la main dans Google Agenda si besoin).");
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
