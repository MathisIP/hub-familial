/**
 * ÉVÉNEMENTS — MENU « 🎉 Événements »
 * ===================================
 * Menu ajouté à l'ouverture de la feuille :
 *   · En haut : les actions courantes (synchro agenda, design).
 *   · « 🎨 Thème » (Phase G) : change instantanément le coloris de tout le classeur.
 *   · « 🌍 Langue » (Phase H) : cadre posé, seul le 🇫🇷 est complet pour l'instant.
 *   · Sous « ⚙️ Configuration » : l'assistant d'installation, la vérification, etc.
 *
 * `onOpen` est un déclencheur simple : il ne fait que construire le menu.
 */
function onOpen() {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu("🎉 Événements")
    .addItem("📅 Synchroniser l'agenda", "synchroniserAgenda")
    .addItem("🎨 Configurer le design", "configurerEvenements")
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
      .addItem("🚀 Tout installer / configurer (1er lancement)", "initialiserEvenements")
      .addItem("🔍 Vérifier la configuration", "verifierEvenements")
      .addItem("♻️ Réinitialiser les exemples…", "reinitialiserExemplesEvenements")
      .addItem("📖 Remplir / mettre à jour le Lisez-moi", "remplirLisezMoi"))
    .addToUi();
}
