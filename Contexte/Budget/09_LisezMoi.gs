/**
 * BUDGET FAMILIAL — LISEZ-MOI ENRICHI (Phase D — mode d'emploi)
 * ============================================================
 * Objectif Phase D : rendre l'onglet « Lisez-moi » vraiment utile pour
 * quelqu'un qui DÉCOUVRE le classeur (pas pour nous). La fonction
 * `remplirLisezMoi()` reconstruit tout l'onglet, joliment mis en forme, avec :
 *   à quoi sert le fichier · démarrage pas à pas · les onglets un par un ·
 *   comment saisir au quotidien · le menu · les formules à coller à la main ·
 *   une FAQ « en cas d'erreur » · comment partager.
 *
 * POINTS D'ENTRÉE :
 *   · Menu 🌸 Budget ▸ ⚙️ Configuration ▸ « 📖 Remplir / mettre à jour le Lisez-moi ».
 *   · Appelée aussi en fin de « 🚀 Tout installer » et à la création du formulaire
 *     (pour afficher le lien du formulaire à jour).
 *   · Phase G : appelée aussi au changement de thème (appliquerThemeBudget_) —
 *     comme elle lit la palette (INK, HEAD, LINK_BG…), le mode d'emploi se
 *     recolore automatiquement dans le coloris choisi.
 *
 * IDEMPOTENT : re-lançable sans dégât. La fonction VIDE l'onglet puis le
 * reconstruit ; elle ne touche à aucun autre onglet.
 *
 * NOTE locale FR (cf. cahier §4.1) : ce fichier n'écrit AUCUNE formule à
 * virgules. Le lien du formulaire est une simple valeur texte (cliquable),
 * pas un =HYPERLINK(). La palette (INK, INK2, MUTED, HEAD, LINE, LINE2, PAGE,
 * LINK_BG, LINK_TX…) vient de 00_Constantes.gs. Les helpers `lm_*` sont définis
 * UNIQUEMENT ici (un seul espace de noms par projet — comme base_/head_).
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
  sh.setColumnWidth(2, 170);
  for (var c = 3; c <= 8; c++) { sh.setColumnWidth(c, 110); }
  sh.setColumnWidth(9, 24);
  // Fond du thème sur TOUTE la grille (propre aussi en 🌙 Nuit) + encre du thème
  sh.getRange(1, 1, maxR, maxC).setBackground(PAGE).setFontFamily("Arial").setFontColor(INK);

  // --- Lien du formulaire (lu dans les propriétés, sans ouvrir Forms) ---
  var props = PropertiesService.getDocumentProperties();
  var lienForm = props.getProperty("FORM_URL");
  var lienEdit = props.getProperty("FORM_EDIT_URL");

  var r = 2;

  /* ===================== TITRE ===================== */
  sh.getRange(r, 2, 1, 7).merge().setValue("🌸 Budget familial — Mode d'emploi")
    .setFontSize(20).setFontWeight("bold").setFontColor(INK).setVerticalAlignment("middle");
  sh.setRowHeight(r, 34); r++;
  r = lm_para_(sh, r,
    "Suivez et partagez le budget du foyer, sans aucune synchronisation bancaire. " +
    "Ce guide explique tout, même si vous découvrez le fichier aujourd'hui.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ① À QUOI ÇA SERT ===================== */
  r = lm_bandeau_(sh, r, "①  À quoi sert ce classeur ?");
  r = lm_para_(sh, r,
    "Il centralise l'argent du foyer : vos comptes, vos dépenses, vos revenus et vos " +
    "virements internes. Tout est calculé tout seul et résumé sur l'onglet « 🌸 Vue " +
    "d'ensemble » : revenus du mois, dépenses, reste à vivre, patrimoine, répartition " +
    "en camembert, suivi du budget et objectifs d'épargne.");
  r = lm_para_(sh, r,
    "Il est 100 % gratuit et sans lien avec la banque : vous saisissez vous-même chaque " +
    "opération (à la main ou via le formulaire mobile). Il se partage entre les deux " +
    "membres du foyer, chacun en droit « Éditeur ».");
  r = lm_vide_(sh, r);

  /* ===================== ② DÉMARRAGE ===================== */
  r = lm_bandeau_(sh, r, "②  Premier démarrage — 4 étapes");
  r = lm_para_(sh, r, "Vous venez de copier ce fichier ? Faites simplement, dans l'ordre :", INK2);
  r = lm_deux_(sh, r, "Étape 1 — Vos infos",
    "Ouvrez l'onglet « Paramètres » et remplacez les exemples par vos données : noms des " +
    "comptes et soldes de départ, catégories de dépenses et budgets, catégories de revenus.");
  r = lm_deux_(sh, r, "Étape 2 — Installer",
    "Menu « 🌸 Budget » ▸ « ⚙️ Configuration » ▸ « 🚀 Tout installer / configurer ». " +
    "Cliquez OK à chaque confirmation. Google demandera une autorisation la 1re fois : " +
    "c'est normal (voir la FAQ), acceptez.");
  r = lm_deux_(sh, r, "Étape 3 — Coller 2 formules",
    "Collez à la main les 2 formules d'objectifs (section ⑥) sur la 🌸 Vue d'ensemble, en " +
    "E50 puis G50. Le script ne peut pas les poser lui-même (feuille en français).");
  r = lm_deux_(sh, r, "Étape 4 — Vérifier",
    "Menu « 🌸 Budget » ▸ « ⚙️ Configuration » ▸ « 🔍 Vérifier la configuration » : " +
    "l'assistant coche ce qui est en place et signale ce qui manque.");
  r = lm_para_(sh, r,
    "Astuce : tant que vous testez, « ♻️ Réinitialiser les exemples… » remet des données " +
    "neutres. Ne l'utilisez JAMAIS sur un fichier déjà rempli de vos vraies opérations.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ③ LES ONGLETS ===================== */
  r = lm_bandeau_(sh, r, "③  Les onglets, un par un");
  r = lm_deux_(sh, r, "🌸 Vue d'ensemble",
    "Votre tableau de bord. Rien à saisir ici : tout se met à jour seul. Changez le mois " +
    "et l'année avec les menus déroulants en haut.");
  r = lm_deux_(sh, r, "Transactions",
    "Le cœur du fichier : une ligne = une opération (Date, Type, Compte de départ, Compte " +
    "destination, Catégorie, Libellé, Montant).");
  r = lm_deux_(sh, r, "Échéances",
    "Vos paiements à ne pas oublier (assurance, impôts…). Un e-mail de rappel part avant la date.");
  r = lm_deux_(sh, r, "Vue annuelle",
    "Récapitulatif mois par mois de chaque catégorie de dépense sur l'année.");
  r = lm_deux_(sh, r, "Épargne",
    "Vos objectifs d'épargne (cible, montant affecté, avancement). Alimente les objectifs " +
    "affichés sur la Vue d'ensemble.");
  r = lm_deux_(sh, r, "Paramètres",
    "Vos réglages : comptes et soldes de départ, catégories et budgets. C'est ici qu'on " +
    "personnalise le fichier.");
  r = lm_deux_(sh, r, "Import CSV",
    "Zone pour coller un relevé bancaire et importer plusieurs lignes d'un coup.");
  r = lm_deux_(sh, r, "Tableau de bord (masqué)",
    "Onglet moteur, volontairement masqué : il fait les calculs de la Vue d'ensemble. Ne pas y toucher.");
  r = lm_deux_(sh, r, "Réponses au formulaire 1 (masqué)",
    "Onglet technique masqué (réponses brutes du formulaire). Ne pas le supprimer ni l'afficher.");
  r = lm_vide_(sh, r);

  /* ===================== ④ SAISIR ===================== */
  r = lm_bandeau_(sh, r, "④  Saisir une opération au quotidien");
  r = lm_para_(sh, r, "Il existe trois types d'opérations :", INK2);
  r = lm_deux_(sh, r, "Dépense",
    "De l'argent qui sort (courses, essence…). On choisit le compte de départ et une catégorie.");
  r = lm_deux_(sh, r, "Revenu",
    "De l'argent qui entre (salaire, remboursement…). On choisit le compte d'arrivée, sans catégorie de dépense.");
  r = lm_deux_(sh, r, "Virement interne",
    "De l'argent déplacé entre vos comptes (ex. vers l'épargne). On renseigne le compte de départ ET le " +
    "compte destination. Ce n'est ni une dépense ni un revenu : cela n'affecte pas le « reste à vivre ».");
  r = lm_para_(sh, r,
    "Deux façons de saisir : directement dans l'onglet « Transactions », ou depuis votre " +
    "téléphone avec le formulaire ci-dessous (le plus pratique — à ajouter à l'écran d'accueil).");
  r = lm_lien_(sh, r, "📲 Formulaire de saisie",
    lienForm || "À créer : menu ⚙️ Configuration ▸ « 📝 Créer le formulaire de saisie ».");
  if (lienEdit) { r = lm_lien_(sh, r, "✏️ Modifier le formulaire", lienEdit); }
  r = lm_vide_(sh, r);

  /* ===================== ⑤ LE MENU ===================== */
  r = lm_bandeau_(sh, r, "⑤  Le menu « 🌸 Budget »");
  r = lm_para_(sh, r,
    "Tout se pilote depuis ce menu (en haut, après « Aide »), sans jamais ouvrir l'éditeur de code :", INK2);
  r = lm_deux_(sh, r, "🔄 Rafraîchir le donut",
    "Recalcule le camembert de répartition des dépenses.");
  r = lm_deux_(sh, r, "🎨 Thème",
    "Change le coloris de tout le classeur en un clic — 9 ambiances : 🌸 Rose, 🌊 Océan, 🌿 Sauge, " +
    "🍂 Terracotta, 🪻 Lila, 🌹 Rouge, 🤎 Marron, 🩶 Gris et 🌙 Nuit. Instantané et réversible : " +
    "rien n'est perdu, seules les couleurs changent.");
  r = lm_deux_(sh, r, "🗓️ / 🔁 Mois & Année",
    "« Masquer les anciens mois » et « Resynchroniser Mois / Année » : entretien courant de la Vue d'ensemble.");
  r = lm_deux_(sh, r, "⚙️ Configuration",
    "Contient : 🚀 Tout installer · 🔍 Vérifier · ♻️ Réinitialiser les exemples · 📖 Remplir le Lisez-moi, " +
    "puis les briques individuelles (formulaire, automatisations, design pastel, catégorie Réceptions, objectifs).");
  r = lm_deux_(sh, r, "🧪 Tests e-mail",
    "Envoie un e-mail de test (échéances / récap) pour vérifier que tout arrive bien.");
  r = lm_vide_(sh, r);

  /* ===================== ⑥ FORMULES À COLLER ===================== */
  r = lm_bandeau_(sh, r, "⑥  Formules à coller à la main (obligatoire)");
  r = lm_para_(sh, r,
    "Sur une feuille en français, le script ne peut pas écrire les formules à plusieurs " +
    "arguments (elles renverraient #ERROR!). Il faut donc les coller vous-même, une seule fois. " +
    "Copiez-collez EXACTEMENT ceci :");
  r = lm_deux_(sh, r, "🌸 Vue d'ensemble · E50", "Noms des objectifs d'épargne :");
  r = lm_code_(sh, r, "=FILTER('Épargne'!A8:A100;'Épargne'!B8:B100>0)");
  r = lm_deux_(sh, r, "🌸 Vue d'ensemble · G50", "Avancement (%) des objectifs :");
  r = lm_code_(sh, r, "=FILTER('Épargne'!E8:E100;'Épargne'!B8:B100>0)");
  r = lm_deux_(sh, r, "Fichier « Événements » · Aperçu",
    "Total dépensé en Réceptions (remplacez ID par l'identifiant de CE classeur Budget, visible dans son URL) :");
  r = lm_code_(sh, r, "=SOMME(IMPORTRANGE(\"ID\";\"Vue annuelle!B15:M15\"))");
  r = lm_vide_(sh, r);

  /* ===================== ⑦ FAQ ===================== */
  r = lm_bandeau_(sh, r, "⑦  FAQ — en cas d'erreur");
  r = lm_deux_(sh, r, "#ERROR! ou #REF! dans une cellule ?",
    "Le plus souvent : une formule de la section ⑥ n'a pas été collée, ou un IMPORTRANGE attend " +
    "une autorisation. Cliquez sur la cellule puis sur « Autoriser l'accès » si le bouton apparaît.");
  r = lm_deux_(sh, r, "Le camembert est vide ?",
    "Menu « 🌸 Budget » ▸ « 🔄 Rafraîchir le donut ». Vérifiez qu'il y a bien des dépenses ce mois-ci.");
  r = lm_deux_(sh, r, "Le mauvais mois s'affiche ?",
    "Changez le mois / l'année avec les menus en haut de la Vue d'ensemble, ou « 🔁 Resynchroniser Mois / Année ».");
  r = lm_deux_(sh, r, "Google demande une autorisation ?",
    "Normal au 1er lancement d'une action du menu. Choisissez votre compte, « Paramètres avancés », " +
    "puis « Autoriser ». Le script est le vôtre : rien n'est envoyé à l'extérieur.");
  r = lm_deux_(sh, r, "Pas reçu l'e-mail de rappel ?",
    "Vérifiez vos adresses (Configuration ▸ automatisations) et testez avec « 🧪 Tests e-mail ».");
  r = lm_deux_(sh, r, "J'ai cassé quelque chose en testant ?",
    "Fichier ▸ Historique des versions ▸ restaurez une version antérieure, puis relancez « 🚀 Tout installer ».");
  r = lm_vide_(sh, r);

  /* ===================== ⑧ PARTAGER ===================== */
  r = lm_bandeau_(sh, r, "⑧  Partager le classeur");
  r = lm_para_(sh, r,
    "En haut à droite, bouton « Partager ». Saisissez l'e-mail de l'autre membre du foyer, " +
    "choisissez le droit « Éditeur », puis « Envoyer ». Vous verrez ses modifications en temps réel.");
  r = lm_para_(sh, r,
    "Le formulaire de saisie, lui, se partage juste en envoyant son lien (section ④) : " +
    "l'autre personne n'a besoin d'aucun accès au fichier pour l'utiliser.");
  r = lm_vide_(sh, r);

  /* ===================== PIED DE PAGE ===================== */
  var leJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  r = lm_para_(sh, r,
    "Cet onglet est généré automatiquement — menu « 🌸 Budget » ▸ « ⚙️ Configuration » ▸ " +
    "« 📖 Remplir / mettre à jour le Lisez-moi ». Dernière régénération : " + leJour + ".", MUTED);

  // Couleur d'onglet (charte) + on remonte tout en haut
  try { sh.setTabColor(TABCOL.LISEZMOI || "#d7d0c6"); } catch (e) {}
  sh.setActiveSelection("A1");
  SpreadsheetApp.flush();
}

/* ================================================================
 *  HELPERS DE MISE EN PAGE (locaux à ce fichier — préfixe lm_)
 *  Chacun écrit une « brique » à la ligne r et RENVOIE la ligne suivante.
 * ================================================================ */

// Estime une hauteur de ligne (px) selon la longueur du texte et le nb de
// caractères par ligne (cpl) tenant dans la largeur de la zone.
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
  var h = Math.max(lm_hauteur_(droite, 80), lm_hauteur_(gauche, 22));
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
  sh.setRowHeight(r, Math.max(24, lm_hauteur_(url, 80)));
  return r + 1;
}

// Bloc « formule à coller » (police à chasse fixe, fond du thème, encadré).
// IMPORTANT (locale FR) : on écrit la formule via setRichTextValue (et NON
// setValue) — une valeur RichText est TOUJOURS stockée comme du texte pur, donc
// une chaîne commençant par « = » s'affiche telle quelle (à copier-coller) au
// lieu d'être évaluée en #REF!/#NAME?. On applique aussi le format texte (@) par
// sécurité, puis la mise en forme (police, fond, bordure) sur la zone fusionnée.
function lm_code_(sh, r, texte) {
  var rg = sh.getRange(r, 2, 1, 7).merge();
  rg.setNumberFormat("@");                                   // ceinture + bretelles
  var rich = SpreadsheetApp.newRichTextValue().setText(texte).build();
  sh.getRange(r, 2).setRichTextValue(rich);                  // texte pur dans la cellule d'ancrage
  rg.setFontFamily("Consolas").setFontSize(9).setFontColor(LINK_TX)
    .setBackground(LINK_BG).setWrap(true).setVerticalAlignment("middle").setHorizontalAlignment("left")
    .setBorder(true, true, true, true, false, false, LINE, SpreadsheetApp.BorderStyle.SOLID);
  sh.setRowHeight(r, lm_hauteur_(texte, 95) + 6);
  return r + 1;
}

// Petite ligne vide (respiration entre sections).
function lm_vide_(sh, r) { sh.setRowHeight(r, 10); return r + 1; }
