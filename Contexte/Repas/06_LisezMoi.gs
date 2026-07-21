/**
 * REPAS_SEMAINE — LISEZ-MOI ENRICHI (Phase D — mode d'emploi)
 * ==========================================================
 * `remplirLisezMoi()` reconstruit tout l'onglet « Lisez-moi » en un vrai mode
 * d'emploi pour quelqu'un qui DÉCOUVRE le fichier : à quoi ça sert · démarrage ·
 * les onglets un par un · le quotidien (planifier, recettes, envoyer aux courses) ·
 * le menu · chercher une recette · une FAQ · comment partager.
 *
 * POINTS D'ENTRÉE :
 *   · Menu 🍽️ Repas ▸ ⚙️ Configuration ▸ « 📖 Remplir / mettre à jour le Lisez-moi ».
 *   · Appelée aussi en fin de « 🚀 Tout installer » et au CHANGEMENT DE THÈME
 *     (elle lit la palette → se re-thème entièrement).
 *
 * IDEMPOTENT : re-lançable sans dégât. Vide puis reconstruit l'onglet Lisez-moi.
 * Ce fichier n'écrit AUCUNE formule par script : l'exemple de la section ⑥ est
 * affiché en TEXTE via setRichTextValue (jamais setValue). Phase G : la palette
 * (INK, INK2, MUTED, HEAD, LINE, LINE2, PAGE, LINK_TX, LINK_BG…) vient du thème
 * actif (00_Constantes.gs) — plus de palette locale LM_. Phase H : l'onglet
 * Lisez-moi est retrouvé/créé via nomOnglet_('LISEZMOI') (nom suivant la langue).
 */

function remplirLisezMoi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  if (!sh) { sh = ss.insertSheet(nomOnglet_('LISEZMOI'), 0); }

  // --- Remise à zéro propre (démerge + vide contenu et formats) ---
  var maxR = sh.getMaxRows(), maxC = Math.max(sh.getMaxColumns(), 9);
  sh.getRange(1, 1, maxR, maxC).breakApart();
  sh.clearContents();
  sh.clearFormats();
  sh.setHiddenGridlines(true);

  // --- Colonnes : A = marge, B = libellés, C..H = contenu, I = marge ---
  sh.setColumnWidth(1, 24);
  sh.setColumnWidth(2, 190);
  for (var c = 3; c <= 8; c++) { sh.setColumnWidth(c, 108); }
  sh.setColumnWidth(9, 24);
  // Fond du thème sur TOUTE la grille (propre aussi en 🌙 Nuit) + encre du thème
  sh.getRange(1, 1, maxR, maxC).setBackground(PAGE).setFontFamily("Arial").setFontColor(INK);

  var r = 2;

  /* ===================== TITRE ===================== */
  sh.getRange(r, 2, 1, 7).merge().setValue("🍽️ Repas de la semaine — Mode d'emploi")
    .setFontSize(20).setFontWeight("bold").setFontColor(INK).setVerticalAlignment("middle");
  sh.setRowHeight(r, 34); r++;
  r = lm_para_(sh, r,
    "Planifiez les dîners de la semaine, gardez une banque de recettes, et envoyez leurs " +
    "ingrédients dans la liste de courses en un clic. Ce guide explique tout, même si vous " +
    "découvrez le fichier aujourd'hui.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ① À QUOI ÇA SERT ===================== */
  r = lm_bandeau_(sh, r, "①  À quoi sert ce classeur ?");
  r = lm_para_(sh, r,
    "Trois choses : (1) planifier le dîner de chaque jour de la semaine, (2) tenir une banque " +
    "de recettes avec leurs ingrédients, et (3) envoyer automatiquement les ingrédients des " +
    "dîners choisis vers votre liste de courses partagée (le fichier To-Do familiale).");
  r = lm_para_(sh, r,
    "100 % gratuit et partagé en temps réel entre les deux membres du foyer (droit " +
    "« Éditeur »). Aucun formulaire ni automatisation à installer : tout se fait depuis le menu.");
  r = lm_vide_(sh, r);

  /* ===================== ② DÉMARRAGE ===================== */
  r = lm_bandeau_(sh, r, "②  Premier démarrage — 4 étapes");
  r = lm_para_(sh, r, "Vous venez de copier ce fichier ? Faites simplement, dans l'ordre :", INK2);
  r = lm_deux_(sh, r, "Étape 1 — Vos recettes",
    "Ouvrez l'onglet « Recettes » et saisissez vos plats : le nom, les ingrédients (un par " +
    "ligne, avec « | rayon » facultatif), le Type et Chaud/Froid.");
  r = lm_deux_(sh, r, "Étape 2 — Installer",
    "Menu « 🍽️ Repas » ▸ « ⚙️ Configuration » ▸ « 🚀 Tout installer / configurer ». Cliquez OK " +
    "à chaque confirmation (colonnes catégories, couleurs, liste déroulante « Dîner », charte pastel).");
  r = lm_deux_(sh, r, "Étape 3 — Liste de courses",
    "L'envoi vers les courses écrit dans le fichier To-Do familiale : assurez-vous d'y avoir " +
    "accès (droit Éditeur). Sur un gabarit neuf, l'identifiant du fichier To-Do est à renseigner (Phase E).");
  r = lm_deux_(sh, r, "Étape 4 — Vérifier",
    "Menu ▸ « ⚙️ Configuration » ▸ « 🔍 Vérifier la configuration » : l'assistant coche ce " +
    "qui est en place et signale ce qui manque.");
  r = lm_para_(sh, r,
    "Astuce : tant que vous testez, « ♻️ Réinitialiser les exemples… » remet des recettes et " +
    "des dîners neutres. Ne l'utilisez JAMAIS sur un fichier déjà rempli de vos vraies recettes.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ③ LES ONGLETS ===================== */
  r = lm_bandeau_(sh, r, "③  Les onglets, un par un");
  r = lm_deux_(sh, r, "Semaine",
    "Votre planning : une ligne par jour (Jour, Dîner, Note). La colonne « Dîner » propose vos " +
    "recettes dans une liste déroulante — mais vous pouvez aussi taper librement.");
  r = lm_deux_(sh, r, "Recettes",
    "Votre banque de recettes : Recette, Ingrédients (un par ligne, « ingrédient | rayon »), " +
    "Type (Viande/Poisson/Végétarien), Chaud/Froid, Note. Les couleurs aident à repérer les types.");
  r = lm_deux_(sh, r, "Recherche",
    "Pour retrouver une recette par ingrédient, par Type ou Chaud/Froid (saisies en B4/B5/B6, " +
    "résultats à partir de A9). Voir la section ⑥.");
  r = lm_deux_(sh, r, "Lisez-moi",
    "Ce mode d'emploi (régénéré depuis le menu).");
  r = lm_vide_(sh, r);

  /* ===================== ④ AU QUOTIDIEN ===================== */
  r = lm_bandeau_(sh, r, "④  Au quotidien : planifier, cuisiner, faire les courses");
  r = lm_deux_(sh, r, "Planifier la semaine",
    "Sur l'onglet Semaine, choisissez un dîner pour chaque jour (flèche de la liste déroulante, " +
    "ou saisie libre).");
  r = lm_deux_(sh, r, "Ajouter une recette",
    "Sur l'onglet Recettes, une ligne = une recette. Écrivez un ingrédient par ligne dans la " +
    "cellule « Ingrédients », en ajoutant « | rayon » si vous voulez trier les courses (ex. « Lait | Frais »).");
  r = lm_deux_(sh, r, "Envoyer aux courses",
    "Menu « 🍽️ Repas » ▸ « 🛒 Envoyer les ingrédients vers ma liste de courses » : les ingrédients " +
    "des dîners de la semaine sont ajoutés (sans doublon) à l'onglet Courses de la To-Do familiale.");
  r = lm_para_(sh, r,
    "Important : seuls les dîners qui correspondent EXACTEMENT à une recette de l'onglet Recettes " +
    "sont envoyés. Un dîner tapé librement (sans recette) est ignoré — ajoutez-le dans Recettes.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ⑤ LE MENU ===================== */
  r = lm_bandeau_(sh, r, "⑤  Le menu « 🍽️ Repas »");
  r = lm_para_(sh, r,
    "Tout se pilote depuis ce menu (en haut, après « Aide »), sans ouvrir l'éditeur de code :", INK2);
  r = lm_deux_(sh, r, "🛒 Envoyer les ingrédients…",
    "Envoie les ingrédients des dîners de la semaine vers la liste de courses (To-Do familiale).");
  r = lm_deux_(sh, r, "🎨 Thème",
    "Change le coloris de tout le classeur en un clic — 9 ambiances : 🌸 Rose, 🌊 Océan, 🌿 Sauge, " +
    "🍂 Terracotta, 🪻 Lila, 🌹 Rouge, 🤎 Marron, 🩶 Gris et 🌙 Nuit. Instantané et réversible.");
  r = lm_deux_(sh, r, "🌍 Langue",
    "Choisit la langue du classeur (renomme les onglets). Pour l'instant : 🇫🇷 Français ; " +
    "🇬🇧 anglais et 🇪🇸 espagnol arriveront ici.");
  r = lm_deux_(sh, r, "⚙️ Configuration",
    "Contient : 🚀 Tout installer · 🔍 Vérifier · ♻️ Réinitialiser les exemples · 📖 Remplir le " +
    "Lisez-moi, puis les briques : 📋 listes déroulantes (Dîner), 🏷️ catégories des recettes, " +
    "🎨 couleurs des recettes, 🌸 harmoniser le design.");
  r = lm_vide_(sh, r);

  /* ===================== ⑥ CHERCHER UNE RECETTE ===================== */
  r = lm_bandeau_(sh, r, "⑥  Chercher une recette");
  r = lm_para_(sh, r,
    "Bonne nouvelle : rien d'obligatoire à coller dans ce fichier. Pour retrouver une recette, " +
    "deux méthodes :");
  r = lm_deux_(sh, r, "Le plus simple — le filtre",
    "Sur l'onglet Recettes : menu Google « Données » ▸ « Créer un filtre », puis cliquez " +
    "l'entonnoir d'une colonne (Type, Chaud/Froid…) pour n'afficher que ce qui vous intéresse.");
  r = lm_deux_(sh, r, "L'onglet Recherche",
    "Il utilise une formule QUERY en A9. Dans votre fichier, elle est déjà en place. Sur une copie " +
    "neuve, vous pouvez coller cette version simple (recherche par ingrédient tapé en B4) en A9 :");
  r = lm_code_(sh, r, "=QUERY(Recettes!A2:E;\"select A,C,D,E where B contains '\"&B4&\"'\";0)");
  r = lm_para_(sh, r,
    "(Pour filtrer aussi par Type et Chaud/Froid en même temps, le filtre ci-dessus est le plus " +
    "commode — ou demandez à Claude la formule combinée. Séparateur d'arguments FR = point-virgule.)", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ⑦ FAQ ===================== */
  r = lm_bandeau_(sh, r, "⑦  FAQ — en cas de souci");
  r = lm_deux_(sh, r, "Un dîner n'est pas parti aux courses ?",
    "Son nom doit correspondre EXACTEMENT à une recette de l'onglet Recettes. L'assistant liste " +
    "les dîners « non reconnus » : ajoutez-les dans Recettes, puis relancez l'envoi.");
  r = lm_deux_(sh, r, "La liste déroulante « Dîner » est vide ?",
    "Relancez « 📋 Configurer les listes déroulantes ». Vérifiez que l'onglet Recettes a bien " +
    "des noms de recettes en colonne A.");
  r = lm_deux_(sh, r, "Les couleurs des recettes manquent ?",
    "Relancez « 🎨 Couleurs des recettes ». Vérifiez que les colonnes « Type » et « Chaud / Froid » " +
    "existent (sinon « 🏷️ Ajouter les catégories aux recettes »).");
  r = lm_deux_(sh, r, "« Impossible d'ouvrir le fichier de courses » ?",
    "L'envoi écrit dans la To-Do familiale : vérifiez que vous y avez accès (droit Éditeur) et " +
    "acceptez l'autorisation Google demandée.");
  r = lm_deux_(sh, r, "Google demande une autorisation ?",
    "Normal au 1er lancement d'une action du menu. Choisissez votre compte, « Paramètres avancés », " +
    "puis « Autoriser ». Le script est le vôtre : rien n'est envoyé à l'extérieur.");
  r = lm_deux_(sh, r, "J'ai cassé quelque chose en testant ?",
    "Fichier ▸ Historique des versions ▸ restaurez une version antérieure, puis relancez « 🚀 Tout installer ».");
  r = lm_vide_(sh, r);

  /* ===================== ⑧ PARTAGER ===================== */
  r = lm_bandeau_(sh, r, "⑧  Partager le classeur");
  r = lm_para_(sh, r,
    "En haut à droite, bouton « Partager ». Saisissez l'e-mail de l'autre membre du foyer, " +
    "choisissez le droit « Éditeur », puis « Envoyer ». Vous verrez ses modifications en temps réel.");
  r = lm_para_(sh, r,
    "Comme l'envoi aux courses écrit dans la To-Do familiale, pensez à partager AUSSI ce fichier " +
    "To-Do avec la même personne (droit Éditeur), pour que la chaîne fonctionne des deux côtés.");
  r = lm_vide_(sh, r);

  /* ===================== PIED DE PAGE ===================== */
  var leJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  r = lm_para_(sh, r,
    "Cet onglet est généré automatiquement — menu « 🍽️ Repas » ▸ « ⚙️ Configuration » ▸ " +
    "« 📖 Remplir / mettre à jour le Lisez-moi ». Dernière régénération : " + leJour + ".", MUTED);

  try { sh.setTabColor(TABCOL.LISEZMOI || "#d7d0c6"); } catch (e) {}   // onglet utilitaire
  sh.setActiveSelection("A1");
  SpreadsheetApp.flush();
}

/* ================================================================
 *  HELPERS DE MISE EN PAGE (locaux à ce fichier — préfixe lm_)
 *  Chacun écrit une « brique » à la ligne r et RENVOIE la ligne suivante.
 * ================================================================ */

function lm_hauteur_(texte, cpl) {
  var seg = String(texte).split("\n");
  var n = 0;
  for (var i = 0; i < seg.length; i++) { n += Math.max(1, Math.ceil(seg[i].length / cpl)); }
  return Math.max(20, n * 16 + 8);
}

// Bandeau de section (couleur d'en-tête du thème), pleine largeur B:H.
function lm_bandeau_(sh, r, texte) {
  sh.getRange(r, 2, 1, 7).merge()
    .setValue(texte).setFontWeight("bold").setFontSize(12).setFontColor(INK)
    .setBackground(HEAD).setVerticalAlignment("middle").setHorizontalAlignment("left")
    .setBorder(false, false, true, false, false, false, LINE2, SpreadsheetApp.BorderStyle.SOLID_MEDIUM);
  sh.setRowHeight(r, 30);
  return r + 1;
}

// Paragraphe pleine largeur B:H (retour à la ligne auto).
function lm_para_(sh, r, texte, couleur) {
  sh.getRange(r, 2, 1, 7).merge()
    .setValue(texte).setFontSize(10).setFontColor(couleur || INK)
    .setWrap(true).setVerticalAlignment("top").setHorizontalAlignment("left");
  sh.setRowHeight(r, lm_hauteur_(texte, 100));
  return r + 1;
}

// Ligne à 2 colonnes : B = libellé (gras), C:H = description.
function lm_deux_(sh, r, gauche, droite) {
  sh.getRange(r, 2).setValue(gauche).setFontWeight("bold").setFontSize(10)
    .setFontColor(INK).setVerticalAlignment("top").setWrap(true).setHorizontalAlignment("left");
  sh.getRange(r, 3, 1, 6).merge()
    .setValue(droite).setFontSize(10).setFontColor(INK2)
    .setWrap(true).setVerticalAlignment("top").setHorizontalAlignment("left");
  var h = Math.max(lm_hauteur_(droite, 78), lm_hauteur_(gauche, 24));
  sh.setRowHeight(r, h);
  return r + 1;
}

// Bloc « formule à coller » : écrit en RichText (texte pur, jamais évalué) —
// seule façon fiable en locale FR d'afficher une chaîne « =… ».
function lm_code_(sh, r, texte) {
  var rg = sh.getRange(r, 2, 1, 7).merge();
  rg.setNumberFormat("@");                                   // ceinture + bretelles
  var rich = SpreadsheetApp.newRichTextValue().setText(texte).build();
  sh.getRange(r, 2).setRichTextValue(rich);                  // texte pur dans la cellule d'ancrage
  rg.setFontFamily("Consolas").setFontSize(9).setFontColor(LINK_TX)
    .setBackground(LINK_BG).setWrap(true).setVerticalAlignment("middle").setHorizontalAlignment("left")
    .setBorder(true, true, true, true, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(r, lm_hauteur_(texte, 92) + 6);
  return r + 1;
}

// Petite ligne vide (respiration entre sections).
function lm_vide_(sh, r) { sh.setRowHeight(r, 10); return r + 1; }
