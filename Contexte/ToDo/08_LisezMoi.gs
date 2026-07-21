/**
 * TO-DO FAMILIALE — LISEZ-MOI ENRICHI (Phase D — mode d'emploi)
 * ============================================================
 * `remplirLisezMoi()` reconstruit tout l'onglet « Lisez-moi » en un vrai mode
 * d'emploi pour quelqu'un qui DÉCOUVRE le fichier : à quoi ça sert · démarrage ·
 * les onglets un par un · saisir au quotidien (+ liens des 2 formulaires) · le
 * menu · la formule QUERY des vues perso · une FAQ · comment partager.
 *
 * POINTS D'ENTRÉE :
 *   · Menu ✅ To-Do ▸ ⚙️ Configuration ▸ « 📖 Remplir / mettre à jour le Lisez-moi ».
 *   · Appelée aussi en fin de « 🚀 Tout installer », à la création des 2
 *     formulaires, et au CHANGEMENT DE THÈME (elle lit la palette → se re-thème).
 *
 * IDEMPOTENT : re-lançable sans dégât. Vide puis reconstruit l'onglet Lisez-moi ;
 * ne touche à aucun autre onglet.
 *
 * NOTE locale FR : ce fichier n'écrit AUCUNE formule par script. La formule QUERY
 * de la section ⑥ est affichée en TEXTE via setRichTextValue (jamais setValue).
 * Phase G : la palette (INK, INK2, MUTED, HEAD, LINE, LINE2, PAGE, LINK_TX,
 * LINK_BG…) vient du thème actif (00_Constantes.gs) — plus de palette locale LM_.
 * Phase H : l'onglet Lisez-moi est retrouvé/créé via nomOnglet_('LISEZMOI') (son
 * nom suit la langue active). Les helpers de mise en page `lm_*` restent définis
 * UNIQUEMENT ici.
 */

function remplirLisezMoi() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(nomOnglet_('LISEZMOI'));
  if (!sh) { sh = ss.insertSheet(nomOnglet_('LISEZMOI'), 1); }

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

  // --- Liens des 2 formulaires (lus dans les propriétés, sans ouvrir Forms) ---
  var props = PropertiesService.getDocumentProperties();
  var lienTache   = props.getProperty("TODO_FORM_LINK");
  var lienCourses = props.getProperty("COURSES_FORM_LINK");

  var r = 2;

  /* ===================== TITRE ===================== */
  sh.getRange(r, 2, 1, 7).merge().setValue("✅ To-Do familiale — Mode d'emploi")
    .setFontSize(20).setFontWeight("bold").setFontColor(INK).setVerticalAlignment("middle");
  sh.setRowHeight(r, 34); r++;
  r = lm_para_(sh, r,
    "Les tâches du foyer et la liste de courses, partagées et à jour sur tous les " +
    "téléphones. Ce guide explique tout, même si vous découvrez le fichier aujourd'hui.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ① À QUOI ÇA SERT ===================== */
  r = lm_bandeau_(sh, r, "①  À quoi sert ce classeur ?");
  r = lm_para_(sh, r,
    "Il gère les tâches de la maison (qui fait quoi, pour quand) et la liste de courses " +
    "commune. Chacun retrouve ses tâches sur son onglet, coche ce qui est fait, et la " +
    "liste de courses se remplit depuis le téléphone.");
  r = lm_para_(sh, r,
    "100 % gratuit et partagé en temps réel entre les deux membres du foyer (droit " +
    "« Éditeur »). Les tâches récurrentes se recréent toutes seules, et un e-mail de " +
    "rappel arrive chaque matin avec ce qui est en retard, du jour et du lendemain.");
  r = lm_vide_(sh, r);

  /* ===================== ② DÉMARRAGE ===================== */
  r = lm_bandeau_(sh, r, "②  Premier démarrage — 4 étapes");
  r = lm_para_(sh, r, "Vous venez de copier ce fichier ? Faites simplement, dans l'ordre :", INK2);
  r = lm_deux_(sh, r, "Étape 1 — Vos listes",
    "Ouvrez l'onglet « Paramètres » et renseignez : les personnes du foyer, les priorités, " +
    "les récurrences et les catégories. Ce sont les listes qui alimentent le formulaire d'ajout de tâche.");
  r = lm_deux_(sh, r, "Étape 2 — Installer",
    "Menu « ✅ To-Do » ▸ « ⚙️ Configuration » ▸ « 🚀 Tout installer / configurer ». Cliquez OK " +
    "à chaque confirmation. L'assistant demande vos adresses e-mail (pour les rappels) et une " +
    "autorisation Google la 1re fois : c'est normal, acceptez.");
  r = lm_deux_(sh, r, "Étape 3 — Vues perso",
    "Vérifiez que les onglets Lou / Mati / Nous deux affichent bien les tâches. Ils sont " +
    "pilotés par une formule QUERY déjà en place (voir section ⑥ si l'un d'eux est vide).");
  r = lm_deux_(sh, r, "Étape 4 — Vérifier",
    "Menu ▸ « ⚙️ Configuration » ▸ « 🔍 Vérifier la configuration » : l'assistant coche ce " +
    "qui est en place et signale ce qui manque.");
  r = lm_para_(sh, r,
    "Astuce : tant que vous testez, « ♻️ Réinitialiser les exemples… » remet des tâches et " +
    "courses neutres. Ne l'utilisez JAMAIS sur un fichier déjà rempli de vos vraies données.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ③ LES ONGLETS ===================== */
  r = lm_bandeau_(sh, r, "③  Les onglets, un par un");
  r = lm_deux_(sh, r, "Tâches",
    "Le cœur du fichier : une ligne = une tâche (Statut, Tâche, Assigné à, Catégorie, " +
    "Priorité, Échéance, Récurrence, Note).");
  r = lm_deux_(sh, r, "Courses",
    "La liste de courses partagée : case « Fait », Article, Rayon. On coche pour barrer un " +
    "article ; on ajoute depuis le formulaire Courses.");
  r = lm_deux_(sh, r, "Lou / Mati / Nous deux",
    "Une vue par personne : uniquement ses tâches non terminées. Cochez « Fait ? » pour " +
    "valider une tâche sans ouvrir l'onglet Tâches (elle disparaît alors de la vue).");
  r = lm_deux_(sh, r, "Aperçu",
    "Page d'accueil / synthèse du fichier.");
  r = lm_deux_(sh, r, "Paramètres",
    "Vos listes : personnes, priorités, récurrences, catégories. C'est ici qu'on " +
    "personnalise le formulaire d'ajout de tâche.");
  r = lm_deux_(sh, r, "Réponses au formulaire 1 (masqué)",
    "Onglet technique masqué (réponses brutes du formulaire de tâche). Ne pas le supprimer ni l'afficher.");
  r = lm_vide_(sh, r);

  /* ===================== ④ SAISIR ===================== */
  r = lm_bandeau_(sh, r, "④  Au quotidien : ajouter, cocher, faire les courses");
  r = lm_deux_(sh, r, "Ajouter une tâche",
    "Depuis le formulaire mobile « Ajouter une tâche » (le plus rapide), ou directement dans l'onglet Tâches.");
  r = lm_deux_(sh, r, "Cocher « Fait »",
    "Dans Tâches (colonne Statut) ou via « Fait ? » sur votre onglet perso. Une tâche " +
    "récurrente cochée recrée automatiquement sa prochaine occurrence, à la bonne date.");
  r = lm_deux_(sh, r, "Ajouter aux courses",
    "Depuis le formulaire « Ajouter aux courses » : un article par ligne, ils s'ajoutent " +
    "(sans doublon) à l'onglet Courses.");
  r = lm_lien_(sh, r, "📲 Formulaire « Tâche »",
    lienTache || "À créer : menu ⚙️ Configuration ▸ « 🔔 Installer formulaire tâche + rappels ».");
  r = lm_lien_(sh, r, "🛒 Formulaire « Courses »",
    lienCourses || "À créer : menu ⚙️ Configuration ▸ « 🛒 Créer le formulaire Courses ».");
  r = lm_vide_(sh, r);

  /* ===================== ⑤ LE MENU ===================== */
  r = lm_bandeau_(sh, r, "⑤  Le menu « ✅ To-Do »");
  r = lm_para_(sh, r,
    "Tout se pilote depuis ce menu (en haut, après « Aide »), sans ouvrir l'éditeur de code :", INK2);
  r = lm_deux_(sh, r, "🎨 Réappliquer la mise en forme",
    "Repose les couleurs, cases à cocher et en-têtes, sans toucher à vos données.");
  r = lm_deux_(sh, r, "🎨 Thème",
    "Change le coloris de tout le classeur en un clic — 9 ambiances : 🌸 Rose, 🌊 Océan, 🌿 Sauge, " +
    "🍂 Terracotta, 🪻 Lila, 🌹 Rouge, 🤎 Marron, 🩶 Gris et 🌙 Nuit. Instantané et réversible.");
  r = lm_deux_(sh, r, "🌍 Langue",
    "Choisit la langue du classeur (renomme les onglets). Pour l'instant : 🇫🇷 Français ; " +
    "🇬🇧 anglais et 🇪🇸 espagnol arriveront ici.");
  r = lm_deux_(sh, r, "⚙️ Configuration",
    "Contient : 🚀 Tout installer · 🔍 Vérifier · ♻️ Réinitialiser les exemples · 📖 Remplir le " +
    "Lisez-moi, puis les briques : 🔔 formulaire tâche + rappels, ✅ validation (vues perso), 🛒 formulaire Courses.");
  r = lm_deux_(sh, r, "🧪 Tests",
    "« Tester le rappel e-mail » : envoie tout de suite un e-mail de rappel pour vérifier que tout arrive.");
  r = lm_vide_(sh, r);

  /* ===================== ⑥ FORMULE DES VUES PERSO ===================== */
  r = lm_bandeau_(sh, r, "⑥  La formule des vues perso (rappel)");
  r = lm_para_(sh, r,
    "Bonne nouvelle : dans ce fichier, presque tout est posé par le menu. La seule formule " +
    "« à la main » concerne les vues Lou / Mati / Nous deux, qui listent les tâches via une " +
    "formule QUERY. Dans votre fichier, elle est déjà en place — rien à faire.");
  r = lm_deux_(sh, r, "Si une vue est vide",
    "(par ex. sur une copie toute neuve) : collez la formule QUERY en A2 de l'onglet concerné, " +
    "en adaptant la personne. La tâche doit rester en colonne A et l'échéance en colonne D " +
    "(c'est ce que lit la case « Fait ? »). Séparateur d'arguments FR = point-virgule.");
  r = lm_deux_(sh, r, "Onglet « Lou »", "En A2 :");
  r = lm_code_(sh, r, "=QUERY(Tâches!A2:H;\"select B, E, D, F where C = 'Lou' and A <> 'Fait' order by F\";0)");
  r = lm_deux_(sh, r, "Onglets « Mati » et « Nous deux »",
    "Même formule en remplaçant 'Lou' par 'Mati', puis par 'Les deux' (valeur attendue pour « Nous deux »).");
  r = lm_vide_(sh, r);

  /* ===================== ⑦ FAQ ===================== */
  r = lm_bandeau_(sh, r, "⑦  FAQ — en cas de souci");
  r = lm_deux_(sh, r, "Une vue perso reste vide ?",
    "Vérifiez la formule QUERY en A2 (section ⑥) et que la colonne « Assigné à » des tâches " +
    "contient bien la bonne valeur : Lou, Mati ou Les deux.");
  r = lm_deux_(sh, r, "Ma tâche récurrente ne se recrée pas ?",
    "La récurrence se déclenche quand le Statut passe à « Fait » (ou via « Fait ? »). Vérifiez " +
    "que la Récurrence est Hebdomadaire, Mensuelle ou Annuelle et qu'une échéance est renseignée.");
  r = lm_deux_(sh, r, "Le formulaire n'a pas les bonnes listes ?",
    "Le formulaire lit l'onglet Paramètres au moment de sa création. Mettez Paramètres à jour ; " +
    "pour un formulaire déjà créé, ajustez ses choix depuis l'éditeur du formulaire.");
  r = lm_deux_(sh, r, "Pas reçu l'e-mail de rappel ?",
    "Vérifiez les adresses (Configuration ▸ « Installer formulaire tâche + rappels ») et testez " +
    "avec « 🧪 Tester le rappel e-mail ».");
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
    "Les 2 formulaires (tâche et courses) se partagent juste en envoyant leur lien (section ④) : " +
    "l'autre personne n'a besoin d'aucun accès au fichier pour les utiliser.");
  r = lm_vide_(sh, r);

  /* ===================== PIED DE PAGE ===================== */
  var leJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  r = lm_para_(sh, r,
    "Cet onglet est généré automatiquement — menu « ✅ To-Do » ▸ « ⚙️ Configuration » ▸ " +
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

// Ligne « lien » mise en avant : B = libellé, C:H = URL (cliquable en tant que valeur).
function lm_lien_(sh, r, gauche, url) {
  sh.getRange(r, 2).setValue(gauche).setFontWeight("bold").setFontSize(10)
    .setFontColor(INK).setVerticalAlignment("middle").setHorizontalAlignment("left");
  sh.getRange(r, 3, 1, 6).merge()
    .setValue(url).setFontSize(10).setFontColor(LINK_TX)
    .setWrap(true).setVerticalAlignment("middle").setHorizontalAlignment("left");
  sh.getRange(r, 2, 1, 7).setBackground(LINK_BG)
    .setBorder(true, true, true, true, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(r, Math.max(24, lm_hauteur_(url, 78)));
  return r + 1;
}

// Bloc « formule à coller » : écrit en RichText (texte pur, jamais évalué en
// formule) — seule façon fiable en locale FR d'afficher une chaîne « =… ».
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
