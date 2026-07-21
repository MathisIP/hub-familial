/**
 * TO-DO FAMILIALE — MENU « ✅ To-Do »
 * ===================================
 * Ajoute un menu dans la feuille (à l'ouverture) pour lancer les actions sans
 * passer par l'éditeur Apps Script.
 *   · En haut : l'action ré-exécutable sans risque (réappliquer la mise en forme).
 *   · « 🎨 Thème » (Phase G) : change instantanément le coloris de tout le classeur.
 *   · « 🌍 Langue » (Phase H) : cadre posé, seul le 🇫🇷 est complet pour l'instant.
 *   · Sous « ⚙️ Configuration » : l'assistant d'installation puis les briques.
 *
 * `onOpen` est un déclencheur simple : il ne fait que construire le menu.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("✅ To-Do")
    .addItem("🎨 Réappliquer la mise en forme", "configurerTodo")
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
      .addItem("🚀 Tout installer / configurer (1er lancement)", "initialiserTodo")
      .addItem("🔍 Vérifier la configuration", "verifierTodo")
      .addItem("♻️ Réinitialiser les exemples…", "reinitialiserExemplesTodo")
      .addItem("📖 Remplir / mettre à jour le Lisez-moi", "remplirLisezMoi")
      .addSeparator()
      .addItem("🔔 Installer formulaire tâche + rappels", "installerTodoPlus")
      .addItem("✅ Activer la validation (Lou / Mati / Nous deux)", "configurerValidation")
      .addItem("🛒 Créer le formulaire Courses", "creerFormulaireCourses")
      .addItem("🔗 Enregistrer le lien du formulaire Courses existant", "enregistrerLienCourses"))
    .addSubMenu(ui.createMenu("🧪 Tests")
      .addItem("Tester le rappel e-mail", "testRappelTodo"))
    .addToUi();
}
