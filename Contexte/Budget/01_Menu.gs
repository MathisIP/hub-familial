/**
 * BUDGET FAMILIAL — MENU « 🌸 Budget »
 * ====================================
 * Ajoute un menu dans la feuille (à l'ouverture) pour lancer les actions
 * courantes sans passer par l'éditeur Apps Script.
 *
 * PHILOSOPHIE (menu de maintenance sûr) :
 *  · En haut : uniquement les actions RÉ-EXÉCUTABLES sans risque.
 *  · « 🎨 Thème » : change instantanément le coloris du classeur (Phase G) —
 *    recoloration NON destructive, ré-exécutable autant qu'on veut.
 *  · Sous « ⚙️ Configuration » : l'assistant d'installation, puis les briques
 *    plus lourdes, protégées par une confirmation quand elles réinitialisent.
 *
 * Ce fichier n'ajoute qu'un menu : il ne modifie AUCUN comportement existant.
 * `onOpen` est un déclencheur simple (aucune autorisation spéciale) — il se
 * contente de construire le menu ; les services (mails, formulaires…) ne sont
 * appelés que lorsqu'on clique réellement sur une entrée.
 */

function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🌸 Budget")
    .addItem("🔄 Rafraîchir le donut", "rendreDonutDynamique")
    .addItem("🗓️ Masquer les anciens mois", "masquerAnciensMois")
    .addItem("🔁 Resynchroniser Mois / Année", "menu_resync")
    .addSeparator()
    .addSubMenu(ui.createMenu("🎨 Thème")
      .addItem("🌸 Rose / Bleu (défaut)", "themeRose")
      .addItem("🌊 Bleu / Océan", "themeOcean")
      .addItem("🌿 Vert / Sauge", "themeSauge")
      .addItem("🍂 Terracotta / Ambre", "themeTerracotta")
      .addItem("🪻 Lila / Rose", "themeLila")
      .addItem("🌹 Rouge / Grenade", "themeRouge")
      .addItem("🤎 Marron / Beige", "themeMarron")
      .addItem("🩶 Nuance de gris", "themeGris")
      .addSeparator()
      .addItem("🌙 Sombre / Nuit", "themeNuit"))
    .addSubMenu(ui.createMenu("🌍 Langue")
      // Phase H (2026-07-17) : cadre posé, seul le 🇫🇷 est complet pour l'instant.
      // 🇬🇧 / 🇪🇸 seront ajoutés ici dès que LANGUES.en / LANGUES.es seront remplis
      // (voir 00_Constantes.gs) — aucune autre modification de menu à prévoir.
      .addItem("🇫🇷 Français (défaut)", "langueFr"))
    .addSubMenu(ui.createMenu("⚙️ Configuration")
      .addItem("🚀 Tout installer / configurer (1er lancement)", "initialiserBudget")
      .addItem("🔍 Vérifier la configuration", "verifierBudget")
      .addItem("♻️ Réinitialiser les exemples…", "reinitialiserExemplesBudget")
      .addItem("📖 Remplir / mettre à jour le Lisez-moi", "remplirLisezMoi")
      .addSeparator()
      .addItem("📝 Créer le formulaire de saisie", "creerFormulaire")
      .addItem("🔔 Installer les automatisations (e-mails)", "installerAutomatisations")
      .addItem("📅 Configurer le budget dynamique", "configurerBudgetDynamique")
      .addItem("🎨 Réappliquer le design pastel…", "menu_reappliquerPastel")
      .addItem("➕ Ajouter la catégorie Réceptions", "ajouterCategorieReceptions")
      .addItem("🎯 Préparer les objectifs dynamiques…", "menu_preparerObjectifs"))
    .addSubMenu(ui.createMenu("🧪 Tests e-mail")
      .addItem("Tester l'e-mail d'échéances", "testEnvoiEcheances")
      .addItem("Tester l'e-mail de récap", "testEnvoiRecap"))
    .addToUi();
}

/* ------------------------- Enrobages du menu ------------------------- */

/** Resynchronise les sélecteurs Mois/Année et le sous-titre depuis le moteur. */
function menu_resync() {
  resyncSelecteurs_();
  majSousTitre_();
  SpreadsheetApp.getActiveSpreadsheet().toast("Mois / Année resynchronisés.", "🌸 Budget", 3);
}

/** Réapplique le pastel APRÈS confirmation (l'action réinitialise le donut + objectifs). */
function menu_reappliquerPastel() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "Réappliquer le design pastel ?",
    "Cette action reconstruit la 🌸 Vue d'ensemble.\n\n" +
    "⚠ Le donut et la zone des objectifs seront réinitialisés. Il faudra ensuite :\n" +
    "   1. « 🔄 Rafraîchir le donut »\n" +
    "   2. « 🎯 Préparer les objectifs dynamiques »\n" +
    "   3. recoller les 2 formules FILTER (E50 et G50) du cahier de projet.\n\n" +
    "💡 Pour seulement CHANGER LES COULEURS, utilise plutôt « 🎨 Thème » :\n" +
    "   c'est instantané et ça ne casse ni le donut ni les objectifs.\n\n" +
    "Continuer ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep === ui.Button.OK) { toutEnPastel(); }
}

/** Prépare la zone des objectifs APRÈS confirmation (il faudra recoller 2 formules). */
function menu_preparerObjectifs() {
  var ui = SpreadsheetApp.getUi();
  var rep = ui.alert(
    "Préparer les objectifs dynamiques ?",
    "La zone E50:G62 de la 🌸 Vue d'ensemble sera nettoyée.\n\n" +
    "Tu devras ensuite recoller les 2 formules FILTER (en E50 puis G50) fournies dans le cahier de projet.\n\n" +
    "Continuer ?",
    ui.ButtonSet.OK_CANCEL);
  if (rep === ui.Button.OK) { preparerObjectifsDynamiques(); }
}
