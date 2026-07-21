/**
 * BUDGET FAMILIAL — FORMULAIRE DE SAISIE MOBILE
 * =============================================
 * Crée un formulaire Google lié à la feuille et route chaque réponse vers
 * l'onglet « Transactions », avec la logique des virements internes.
 *
 * INSTALLATION (une seule fois) : menu 🌸 Budget ▸ ⚙️ Configuration ▸
 *   « 📝 Créer le formulaire de saisie » (ou exécuter `creerFormulaire`).
 *
 * Fonctions publiques :
 *   · creerFormulaire       — installation (garde-fou anti-doublon)
 *   · surEnvoiFormulaire(e) — routage, appelé par le déclencheur onFormSubmit
 * Fonction interne : parseDate
 *
 * Phase D (2026-07-16) : au lieu d'écrire le lien en dur dans Lisez-moi (B24/B25),
 * on mémorise le lien du formulaire dans les propriétés du document
 * (FORM_URL / FORM_EDIT_URL) et on régénère l'onglet Lisez-moi via
 * `remplirLisezMoi()` (09_LisezMoi.gs), qui affiche ce lien dans sa section ④.
 * La logique métier du formulaire (questions, routage) est INCHANGÉE.
 */

// --- Titres des questions (ne pas modifier sans adapter le routage) ---
var Q_TYPE = "Type";
var Q_MONTANT = "Montant (€)";
var Q_COMPTE = "Compte (départ)";
var Q_DEST = "Compte destination (si virement)";
var Q_CAT = "Catégorie";
var Q_LIB = "Libellé";
var Q_DATE = "Date (vide = aujourd'hui)";

var AUCUNE_CAT = "— aucune (virement interne)";
var AUCUN_DEST = "— (pas un virement)";

/**
 * INSTALLATION : à exécuter une seule fois.
 */
function creerFormulaire() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var ui = SpreadsheetApp.getUi();
  var props = PropertiesService.getDocumentProperties();

  // Garde-fou : ne pas créer deux formulaires si on relance par erreur.
  var dejaId = props.getProperty("FORM_ID");
  if (dejaId) {
    try {
      var dejaForm = FormApp.openById(dejaId);
      var court = dejaForm.shortenFormUrl(dejaForm.getPublishedUrl());
      props.setProperty("FORM_URL", court);
      props.setProperty("FORM_EDIT_URL", dejaForm.getEditUrl());
      try { remplirLisezMoi(); } catch (e) { /* le Lisez-moi se régénère depuis son menu */ }
      ui.alert("Le formulaire existe déjà !\n\nLien à épingler sur les téléphones :\n" + court);
      return;
    } catch (err) {
      props.deleteProperty("FORM_ID"); // l'ancien a été supprimé : on recrée.
    }
  }

  // Listes lues dans l'onglet Paramètres (comptes A4:A7, catégories K4:K17).
  var param = ss.getSheetByName(nomOnglet_('PARAMETRES'));
  var comptes = param.getRange("A4:A7").getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (v) { return v; });
  var categories = param.getRange("K4:K17").getValues()
    .map(function (r) { return String(r[0]).trim(); })
    .filter(function (v) { return v; });

  // --- Création du formulaire ---
  var form = FormApp.create("Budget familial — Saisie");
  form.setDescription("Une dépense, un revenu ou un virement entre vos comptes, en 10 secondes.");
  form.setConfirmationMessage("C'est noté ! La ligne est ajoutée au budget.");
  form.setAllowResponseEdits(false);
  form.setLimitOneResponsePerUser(false);

  form.addListItem().setTitle(Q_TYPE)
      .setChoiceValues(["Dépense", "Revenu", "Virement interne"])
      .setRequired(true);

  var montant = form.addTextItem().setTitle(Q_MONTANT).setRequired(true);
  montant.setValidation(
    FormApp.createTextValidation()
      .setHelpText("Un nombre positif (la virgule est acceptée).")
      .requireNumberGreaterThan(0)
      .build());

  form.addListItem().setTitle(Q_COMPTE)
      .setChoiceValues(comptes)
      .setRequired(true);

  form.addListItem().setTitle(Q_DEST)
      .setChoiceValues([AUCUN_DEST].concat(comptes))
      .setRequired(false);

  form.addListItem().setTitle(Q_CAT)
      .setChoiceValues([AUCUNE_CAT].concat(categories))
      .setRequired(true);

  form.addTextItem().setTitle(Q_LIB).setRequired(true);

  form.addDateItem().setTitle(Q_DATE).setRequired(false);

  // --- Liaison à la feuille + routage automatique ---
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  ScriptApp.newTrigger("surEnvoiFormulaire").forSpreadsheet(ss).onFormSubmit().create();
  props.setProperty("FORM_ID", form.getId());

  // Masquer l'onglet technique « Réponses » (il doit exister, mais pas gêner).
  SpreadsheetApp.flush();
  Utilities.sleep(2000);
  ss.getSheets().forEach(function (sh) {
    try {
      if (sh.getFormUrl()) { sh.hideSheet(); }
    } catch (err) { /* sans gravité */ }
  });

  // --- Liens : mémorisés dans les propriétés + Lisez-moi régénéré (lien à jour) ---
  var lienCourt = form.shortenFormUrl(form.getPublishedUrl());
  props.setProperty("FORM_URL", lienCourt);
  props.setProperty("FORM_EDIT_URL", form.getEditUrl());
  try { remplirLisezMoi(); } catch (e) { /* le Lisez-moi se régénère depuis son menu */ }

  ui.alert(
    "Formulaire créé !\n\n" +
    "Lien à ouvrir sur chaque téléphone (puis « Ajouter à l'écran d'accueil ») :\n" +
    lienCourt + "\n\n" +
    "Ce lien est aussi noté dans l'onglet Lisez-moi (section ④).\n" +
    "Un onglet de réponses a été créé et masqué : ne pas le supprimer."
  );
}

/**
 * Routage : appelé automatiquement à chaque envoi du formulaire
 * (déclencheur onFormSubmit). Transforme la réponse en ligne propre
 * de l'onglet Transactions.
 */
function surEnvoiFormulaire(e) {
  if (!e || !e.namedValues) { return; }
  var v = function (titre) {
    var arr = e.namedValues[titre];
    return (arr && arr[0]) ? String(arr[0]).trim() : "";
  };

  var type = v(Q_TYPE);
  var montant = parseFloat(v(Q_MONTANT).replace(/\s/g, "").replace(",", "."));
  var compte = v(Q_COMPTE);
  var dest = v(Q_DEST);
  var cat = v(Q_CAT);
  var lib = v(Q_LIB);
  var dateSaisie = parseDate(v(Q_DATE)) || new Date();

  // Logique virement interne : destination gardée, catégorie effacée.
  if (type === "Virement interne") {
    cat = "";
    if (dest === AUCUN_DEST) { dest = ""; } // virement sans destination : à corriger à la main
  } else {
    dest = "";
    if (cat === AUCUNE_CAT) { cat = ""; }
  }
  if (!type || isNaN(montant)) { return; } // réponse inexploitable : on n'écrit rien

  var tx = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(nomOnglet_('TRANSACTIONS'));
  tx.appendRow([dateSaisie, type, compte, dest, cat, lib, montant, "Formulaire"]);

  // Formats de la ligne ajoutée (date + euros).
  var ligne = tx.getLastRow();
  tx.getRange(ligne, 1).setNumberFormat("dd/mm/yyyy");
  tx.getRange(ligne, 7).setNumberFormat('#,##0.00 "€"');
}

/** Accepte « 2026-07-13 », « 13/07/2026 » ou vide. */
function parseDate(s) {
  if (!s) { return null; }
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) { return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])); }
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) { return new Date(Number(m[3]), Number(m[2]) - 1, Number(m[1])); }
  var d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}
