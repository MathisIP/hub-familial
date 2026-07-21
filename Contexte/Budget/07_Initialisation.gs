/**
 * BUDGET FAMILIAL — INITIALISATION (Phase C — assistant d'installation)
 * ====================================================================
 * Objectif Phase C : permettre à un NOUVEAU foyer de tout mettre en place « en
 * quelques clics », sans ouvrir l'éditeur Apps Script. Ce fichier expose 3
 * actions, toutes accessibles depuis le menu 🌸 Budget ▸ ⚙️ Configuration :
 *
 *   · initialiserBudget()            → 🚀 enchaîne, dans le BON ORDRE, toutes
 *                                       les briques déjà existantes du projet.
 *   · verifierBudget()               → 🔍 diagnostic (ne modifie RIEN) : dit ce
 *                                       qui est en place et ce qui manque.
 *   · reinitialiserExemplesBudget()  → ♻️ remet des données d'EXEMPLE dans les
 *                                       onglets Transactions / Échéances
 *                                       (protégé par une confirmation tapée).
 *
 * ⚠ Toutes ces fonctions réutilisent les fonctions publiques déjà testées du
 * projet (toutEnPastel, ajouterCategorieReceptions, …). Elles n'introduisent
 * aucune logique métier nouvelle : elles orchestrent l'existant.
 *
 * Phase D (2026-07-16) : l'installation se termine désormais par
 * `remplirLisezMoi()` (mode d'emploi enrichi de l'onglet Lisez-moi), et la
 * vérification contrôle que ce Lisez-moi a bien été généré.
 *
 * RAPPEL locale FR (cf. cahier §4.1) : rien n'écrit de formule à virgules par
 * script. Les 2 formules FILTER (E50/G50) et l'IMPORTRANGE restent collées à la
 * main — l'assistant se contente de les RAPPELER à la fin.
 */

/* ================================================================
 *  🚀 INSTALLATION COMPLÈTE
 * ================================================================ */
function initialiserBudget() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "🚀 Installer / configurer le Budget familial",
    "Cet assistant met tout en place en une fois :\n\n" +
    "  1. Design pastel + 🌸 Vue d'ensemble\n" +
    "  2. Catégorie « Réceptions »\n" +
    "  3. Donut dynamique\n" +
    "  4. Sélecteurs Mois / Année + moteur + déclencheurs\n" +
    "  5. Zone des objectifs d'épargne\n" +
    "  6. Formulaire de saisie mobile\n" +
    "  7. Automatisations e-mail (échéances + récap)\n" +
    "  8. Lisez-moi (mode d'emploi complet)\n\n" +
    "👉 Tu verras plusieurs confirmations : clique OK à chaque étape.\n" +
    "👉 Certaines étapes demandent une autorisation Google et tes\n" +
    "    adresses e-mail (étape 7).\n\n" +
    "Lancer l'installation complète ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep !== ui.Button.OK) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var log = [];
  function etape(nom, fn) {
    try {
      ss.toast(nom + "…", "🚀 Installation", 5);
      fn();
      log.push("✔ " + nom);
    } catch (e) {
      log.push("✘ " + nom + " — " + (e && e.message ? e.message : e));
    }
  }

  // Ordre imposé par les dépendances (cf. 07 stub + module Dynamique) :
  // le donut et les objectifs doivent passer APRÈS toutEnPastel (qui reconstruit
  // la 🌸 Vue d'ensemble) ; le donut passe APRÈS l'ajout de « Réceptions ».
  // Le Lisez-moi passe EN DERNIER (il affiche le lien du formulaire créé à l'étape 6).
  etape("1. Design pastel + Vue d'ensemble", toutEnPastel);
  etape("2. Catégorie Réceptions",           ajouterCategorieReceptions);
  etape("3. Donut dynamique",                rendreDonutDynamique);
  etape("4. Mois/Année + moteur",            configurerBudgetDynamique);
  etape("5. Zone des objectifs",             preparerObjectifsDynamiques);
  etape("6. Formulaire de saisie",           creerFormulaire);
  etape("7. Automatisations e-mail",         installerAutomatisations);
  etape("8. Lisez-moi (mode d'emploi)",      remplirLisezMoi);

  SpreadsheetApp.flush();
  ui.alert(
    "✅ Installation du Budget terminée\n\n" +
    log.join("\n") +
    "\n\n— À FAIRE À LA MAIN (locale FR, non scriptable) —\n" +
    "• 🌸 Vue d'ensemble : coller les 2 formules FILTER en E50 et G50\n" +
    "  (fournies dans le cahier de projet / par Claude).\n" +
    "• Onglet Événements : coller la formule IMPORTRANGE « Réceptions »\n" +
    "  (Vue annuelle!B15:M15).\n\n" +
    "Astuce : ces 2 formules sont aussi rappelées dans l'onglet Lisez-moi\n" +
    "(section ⑥). « 🔍 Vérifier la configuration » fait le point à tout moment.");
}

/* ================================================================
 *  🔍 VÉRIFICATION (ne modifie rien)
 * ================================================================ */
function verifierBudget() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var props = PropertiesService.getDocumentProperties();
  var L = [];
  function ok(c, t)  { L.push((c ? "✅ " : "❌ ") + t); }
  function warn(t)   { L.push("⚠️ " + t); }

  // Onglets clés
  var vue = ss.getSheetByName(nomOnglet_('VUE_ENSEMBLE'));
  ok(!!vue, "Onglet Vue d'ensemble présent");
  var tb = ss.getSheetByName(nomOnglet_('TABLEAU_BORD'));
  ok(!!tb, "Onglet Tableau de bord (moteur) présent");
  ["TRANSACTIONS", "PARAMETRES", "VUE_ANNUELLE", "EPARGNE"].forEach(function (cle) {
    var n = nomOnglet_(cle);
    ok(!!ss.getSheetByName(n), "Onglet « " + n + " » présent");
  });

  // Lisez-moi enrichi (Phase D) : présent ET généré (titre « Mode d'emploi » en B2)
  var lm = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  var lmRempli = lm && String(lm.getRange("B2").getValue()).indexOf("Mode d'emploi") !== -1;
  ok(!!lmRempli, "Onglet Lisez-moi enrichi (mode d'emploi généré)");

  // Catégorie Réceptions
  var pa = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  ok(pa && colonneContient_(pa, 6, "Réceptions"), "Catégorie « Réceptions » dans " + nomOnglet_('PARAMETRES'));

  // Formulaire de saisie
  var formOk = false;
  var fid = props.getProperty("FORM_ID");
  if (fid) { try { FormApp.openById(fid); formOk = true; } catch (e) { formOk = false; } }
  ok(formOk, "Formulaire de saisie créé");

  // Destinataires e-mail
  ok(!!props.getProperty("DESTINATAIRES"), "Destinataires e-mail renseignés");

  // Déclencheurs installés (les 5 attendus)
  var attendus = ["surEnvoiFormulaire", "majSousTitreAuto", "masquerAnciensMois",
                  "verifierEcheances", "recapMensuel"];
  var presents = {};
  ScriptApp.getProjectTriggers().forEach(function (t) { presents[t.getHandlerFunction()] = true; });
  var manque = attendus.filter(function (f) { return !presents[f]; });
  ok(manque.length === 0,
     "Déclencheurs installés (" + (attendus.length - manque.length) + "/" + attendus.length + ")" +
     (manque.length ? " — manquant(s) : " + manque.join(", ") : ""));

  // Formules à coller à la main (contrôle « présence de contenu » seulement)
  if (vue) {
    var e50 = String(vue.getRange("E50").getValue()).trim();
    if (e50) { ok(true, "Objectifs dynamiques : E50 renseignée"); }
    else { warn("Objectifs dynamiques : coller la formule FILTER en E50 (puis G50)"); }
  }
  warn("Rappel : IMPORTRANGE « Réceptions » à coller dans l'onglet Événements");

  SpreadsheetApp.getUi().alert("🔍 Vérification — Budget familial\n\n" + L.join("\n"));
}

/* ================================================================
 *  ♻️ RÉINITIALISER LES EXEMPLES (destructif — confirmation tapée)
 * ================================================================ */
function reinitialiserExemplesBudget() {
  var ui = SpreadsheetApp.getUi();
  if (!confirmerReset_(ui, "les onglets Transactions et Échéances")) { return; }

  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var pa = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  var log = [];

  // Comptes et catégories réels lus dans Paramètres (pour des exemples cohérents)
  var comptes = pa ? pa.getRange("A4:A7").getValues()
      .map(function (r) { return String(r[0]).trim(); })
      .filter(function (v) { return v; }) : [];
  var cats = pa ? pa.getRange("K4:K17").getValues()
      .map(function (r) { return String(r[0]).trim(); })
      .filter(function (v) { return v; }) : [];
  var c0 = comptes[0] || "Compte commun";
  var c1 = comptes[1] || c0;
  var cat0 = cats[0] || "Alimentation";
  var cat1 = cats[1] || cat0;

  var au = new Date();
  function jour(delta) { return new Date(au.getFullYear(), au.getMonth(), au.getDate() + delta); }

  // --- Transactions : vider les données puis écrire des exemples ---
  var tx = ss.getSheetByName(nomOnglet_('TRANSACTIONS'));
  if (tx) {
    if (tx.getLastRow() > 1) { tx.getRange(2, 1, tx.getLastRow() - 1, 8).clearContent(); }
    var exTx = [
      [jour(-6), "Revenu",           c0, "", "",   "EXEMPLE — Salaire",     1800],
      [jour(-5), "Dépense",          c0, "", cat0, "EXEMPLE — Courses",       42.5],
      [jour(-3), "Dépense",          c0, "", cat1, "EXEMPLE — Essence",        60],
      [jour(-2), "Virement interne", c0, c1, "",   "EXEMPLE — Vers épargne",  200],
      [jour(-1), "Dépense",          c0, "", cat0, "EXEMPLE — Boulangerie",    12.9]
    ];
    tx.getRange(2, 1, exTx.length, 7).setValues(exTx);
    tx.getRange(2, 1, exTx.length, 1).setNumberFormat("dd/mm/yyyy");
    tx.getRange(2, 7, exTx.length, 1).setNumberFormat('#,##0.00" €"');
    log.push("✔ Transactions : " + exTx.length + " exemples");
  }

  // --- Échéances : remettre 2 exemples (si l'onglet existe déjà) ---
  var ec = ss.getSheetByName(nomOnglet_('ECHEANCES'));
  if (ec) {
    if (ec.getLastRow() > 1) { ec.getRange(2, 1, ec.getLastRow() - 1, 4).clearContent(); }
    var exEc = [
      ["EXEMPLE — Assurance habitation", jour(7),  "Annuelle", "À remplacer par ta vraie échéance"],
      ["EXEMPLE — Contrôle technique",   jour(30), "Aucune",   ""]
    ];
    ec.getRange(2, 1, exEc.length, 4).setValues(exEc);
    ec.getRange(2, 2, exEc.length, 1).setNumberFormat("dd/mm/yyyy");
    log.push("✔ Échéances : 2 exemples");
  } else {
    log.push("• Échéances : onglet absent (installe d'abord les automatisations)");
  }

  SpreadsheetApp.flush();
  ui.alert(
    "♻️ Exemples réinitialisés — Budget\n\n" + log.join("\n") +
    "\n\nNon touché : Paramètres (comptes, soldes, catégories, budgets),\n" +
    "onglets moteur, Vue annuelle, Épargne. Remplace les lignes « EXEMPLE »\n" +
    "par tes vraies données quand tu es prêt.");
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
