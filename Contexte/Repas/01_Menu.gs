/**
 * REPAS_SEMAINE — MENU « 🍽️ Repas »
 * =================================
 * Menu ajouté à l'ouverture de la feuille.
 *   · En haut : l'action courante (envoyer les ingrédients vers les courses).
 *   · « 🎨 Thème » (Phase G) : change instantanément le coloris de tout le classeur.
 *   · « 🌍 Langue » (Phase H) : cadre posé, seul le 🇫🇷 est complet pour l'instant.
 *   · Sous « ⚙️ Configuration » : l'assistant d'installation puis les briques.
 *
 * `onOpen` est un déclencheur simple : il ne fait que construire le menu.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🍽️ Repas")
    .addItem("🛒 Envoyer les ingrédients vers ma liste de courses", "envoyerVersCourses")
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
      // 🇬🇧 / 🇪🇸 seront ajoutés ici dès que LANGUES.en / LANGUES.es seront remplis.
      .addItem("🇫🇷 Français (défaut)", "langueFr"))
    .addSeparator()
    .addSubMenu(ui.createMenu("⚙️ Configuration")
      .addItem("🚀 Tout installer / configurer (1er lancement)", "initialiserRepas")
      .addItem("🔍 Vérifier la configuration", "verifierRepas")
      .addItem("♻️ Réinitialiser les exemples…", "reinitialiserExemplesRepas")
      .addItem("📖 Remplir / mettre à jour le Lisez-moi", "remplirLisezMoi")
      .addSeparator()
      .addItem("📋 Configurer les listes déroulantes (Dîner)", "configurerListes")
      .addItem("🏷️ Ajouter les catégories aux recettes", "ajouterCategoriesRecettes")
      .addItem("🎨 Couleurs des recettes", "configurerCouleursRecettes")
      .addItem("🌸 Harmoniser le design (charte pastel)", "harmoniserRepas"))
    .addToUi();
}
