/**
 * ÉVÉNEMENTS — LISEZ-MOI ENRICHI (Phase D — mode d'emploi)
 * =======================================================
 * `remplirLisezMoi()` reconstruit tout l'onglet « Lisez-moi » en un vrai mode
 * d'emploi pour quelqu'un qui DÉCOUVRE le fichier : à quoi ça sert · démarrage ·
 * les onglets un par un · le quotidien (événements, logistique, agenda) · le
 * menu · le lien budget (IMPORTRANGE) · une FAQ · comment partager.
 *
 * POINTS D'ENTRÉE :
 *   · Menu 🎉 Événements ▸ ⚙️ Configuration ▸ « 📖 Remplir / mettre à jour le Lisez-moi ».
 *   · Appelée aussi en fin de « 🚀 Tout installer » et au CHANGEMENT DE THÈME
 *     (elle lit la palette → se re-thème entièrement).
 *
 * IDEMPOTENT : re-lançable sans dégât. Vide puis reconstruit l'onglet Lisez-moi.
 * Ce fichier n'écrit AUCUNE formule par script : la formule IMPORTRANGE de la
 * section ⑥ est affichée en TEXTE via setRichTextValue (jamais setValue). Phase G :
 * la palette (INK, INK2, MUTED, HEAD, LINE, LINE2, PAGE, LINK_TX, LINK_BG…) vient
 * du thème actif (00_Constantes.gs) — plus de palette locale LM_. Phase H : l'onglet
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
  sh.getRange(r, 2, 1, 7).merge().setValue("🎉 Événements — Mode d'emploi")
    .setFontSize(20).setFontWeight("bold").setFontColor(INK).setVerticalAlignment("middle");
  sh.setRowHeight(r, 34); r++;
  r = lm_para_(sh, r,
    "Organisez vos réceptions et vos événements à venir, gérez toute la logistique (invités, " +
    "checklist, menu, courses) et envoyez les dates dans votre agenda familial. Ce guide explique " +
    "tout, même si vous découvrez le fichier aujourd'hui.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ① À QUOI ÇA SERT ===================== */
  r = lm_bandeau_(sh, r, "①  À quoi sert ce classeur ?");
  r = lm_para_(sh, r,
    "Il suit deux types d'événements : les réceptions « Reçu chez nous » (dîners, fêtes que vous " +
    "organisez, avec toute la logistique) et les événements « À venir » (un simple suivi de date). " +
    "Un onglet Aperçu résume le tout, et un clic envoie les dates dans l'agenda familial Google.");
  r = lm_para_(sh, r,
    "100 % gratuit et partagé en temps réel entre les deux membres du foyer (droit « Éditeur »). " +
    "Aucun formulaire à installer ; la seule automatisation est la synchronisation d'agenda, à la demande.");
  r = lm_vide_(sh, r);

  /* ===================== ② DÉMARRAGE ===================== */
  r = lm_bandeau_(sh, r, "②  Premier démarrage — 4 étapes");
  r = lm_para_(sh, r, "Vous venez de copier ce fichier ? Faites simplement, dans l'ordre :", INK2);
  r = lm_deux_(sh, r, "Étape 1 — Vos événements",
    "Ouvrez l'onglet « Événements » et saisissez un événement par ligne : nom, Type (Reçu chez " +
    "nous / À venir), date, heure, lieu, nombre d'invités, budget…");
  r = lm_deux_(sh, r, "Étape 2 — Installer",
    "Menu « 🎉 Événements » ▸ « ⚙️ Configuration » ▸ « 🚀 Tout installer / configurer » (design, " +
    "couleurs, cases à cocher, masquage de la colonne technique AgendaID). Cliquez OK.");
  r = lm_deux_(sh, r, "Étape 3 — Agenda",
    "Pour envoyer les dates dans l'agenda familial : renseignez l'identifiant de VOTRE agenda " +
    "(CAL_ID, dans 00_Constantes.gs), partagez-le avec ce compte, puis lancez « 📅 Synchroniser l'agenda ».");
  r = lm_deux_(sh, r, "Étape 4 — Vérifier",
    "Menu ▸ « ⚙️ Configuration » ▸ « 🔍 Vérifier la configuration » : l'assistant coche ce qui est " +
    "en place et signale ce qui manque. (Lien budget « Réceptions » : voir section ⑥.)");
  r = lm_para_(sh, r,
    "Astuce : tant que vous testez, « ♻️ Réinitialiser les exemples… » remet 2 événements neutres. " +
    "Ne l'utilisez JAMAIS sur un fichier déjà rempli de vos vrais événements.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ③ LES ONGLETS ===================== */
  r = lm_bandeau_(sh, r, "③  Les onglets, un par un");
  r = lm_deux_(sh, r, "Aperçu",
    "Page de synthèse : vue d'ensemble de vos événements et total dépensé en « Réceptions » " +
    "(relié au Budget familial — voir section ⑥).");
  r = lm_deux_(sh, r, "Événements",
    "La liste principale : nom, Type, Date, Heure, Lieu, Nb invités, Budget prévu, Dépensé, " +
    "Statut, Note. (Une colonne technique AgendaID est masquée : ne pas y toucher.)");
  r = lm_deux_(sh, r, "Invités",
    "La liste des invités et leur réponse (RSVP : Oui / Non / Peut-être / En attente), colorée automatiquement.");
  r = lm_deux_(sh, r, "Checklist",
    "Le pense-bête d'une réception : cochez la case quand c'est fait (la ligne se grise et se barre).");
  r = lm_deux_(sh, r, "Menu & Courses",
    "Le menu du repas et les courses associées : cases à cocher pour les articles achetés.");
  r = lm_deux_(sh, r, "Paramètres",
    "Vos réglages et listes (statuts, réponses…).");
  r = lm_deux_(sh, r, "Lisez-moi",
    "Ce mode d'emploi (régénéré depuis le menu).");
  r = lm_vide_(sh, r);

  /* ===================== ④ AU QUOTIDIEN ===================== */
  r = lm_bandeau_(sh, r, "④  Au quotidien : suivre un événement");
  r = lm_deux_(sh, r, "Ajouter un événement",
    "Une ligne dans l'onglet Événements. « Reçu chez nous » = une réception (avec logistique) ; " +
    "« À venir » = un simple suivi de date.");
  r = lm_deux_(sh, r, "Gérer la logistique",
    "Pour une réception : remplissez Invités (avec leur RSVP), Checklist (cases à cocher) et " +
    "Menu & Courses (cases à cocher).");
  r = lm_deux_(sh, r, "Suivre le statut",
    "Colonne Statut : À planifier → En préparation → Prêt → Passé. Les couleurs sont automatiques, " +
    "et une date à moins de 14 jours est surlignée en ambre.");
  r = lm_deux_(sh, r, "Envoyer dans l'agenda",
    "Menu « 🎉 Événements » ▸ « 📅 Synchroniser l'agenda » : chaque événement daté devient une " +
    "entrée d'agenda. Relancez-le après chaque ajout ou changement de date (les entrées existantes sont mises à jour, pas dupliquées).");
  r = lm_vide_(sh, r);

  /* ===================== ⑤ LE MENU ===================== */
  r = lm_bandeau_(sh, r, "⑤  Le menu « 🎉 Événements »");
  r = lm_para_(sh, r,
    "Tout se pilote depuis ce menu (en haut, après « Aide »), sans ouvrir l'éditeur de code :", INK2);
  r = lm_deux_(sh, r, "📅 Synchroniser l'agenda",
    "Envoie / met à jour les dates des événements dans l'agenda familial.");
  r = lm_deux_(sh, r, "🎨 Configurer le design",
    "Repose les couleurs, les cases à cocher et les en-têtes (sans toucher à vos données).");
  r = lm_deux_(sh, r, "🎨 Thème",
    "Change le coloris de tout le classeur en un clic — 9 ambiances : 🌸 Rose, 🌊 Océan, 🌿 Sauge, " +
    "🍂 Terracotta, 🪻 Lila, 🌹 Rouge, 🤎 Marron, 🩶 Gris et 🌙 Nuit. Instantané et réversible.");
  r = lm_deux_(sh, r, "🌍 Langue",
    "Choisit la langue du classeur (renomme les onglets). Pour l'instant : 🇫🇷 Français ; " +
    "🇬🇧 anglais et 🇪🇸 espagnol arriveront ici.");
  r = lm_deux_(sh, r, "⚙️ Configuration",
    "Contient : 🚀 Tout installer · 🔍 Vérifier · ♻️ Réinitialiser les exemples · 📖 Remplir le Lisez-moi.");
  r = lm_vide_(sh, r);

  /* ===================== ⑥ LIEN BUDGET (formule à coller) ===================== */
  r = lm_bandeau_(sh, r, "⑥  Lien budget « Réceptions » (formule à coller)");
  r = lm_para_(sh, r,
    "La seule formule à coller à la main relie l'Aperçu au Budget familial pour afficher le total " +
    "dépensé en « Réceptions ». Sur une feuille en français, le script ne peut pas l'écrire (elle " +
    "renverrait #ERROR!) : copiez-collez-la vous-même, une fois, dans la cellule du total (onglet Aperçu) :");
  r = lm_code_(sh, r, "=SOMME(IMPORTRANGE(\"ID_DU_BUDGET\";\"Vue annuelle!B15:M15\"))");
  r = lm_deux_(sh, r, "À adapter",
    "Remplacez ID_DU_BUDGET par l'identifiant de votre fichier Budget familial (visible dans son URL). " +
    "À la 1re utilisation, cliquez la cellule puis « Autoriser l'accès ». Séparateur d'arguments FR = point-virgule.");
  r = lm_vide_(sh, r);

  /* ===================== ⑦ FAQ ===================== */
  r = lm_bandeau_(sh, r, "⑦  FAQ — en cas de souci");
  r = lm_deux_(sh, r, "« Agenda introuvable » à la synchro ?",
    "L'identifiant CAL_ID n'est pas renseigné, ou l'agenda n'est pas partagé avec ce compte. " +
    "Renseignez CAL_ID (00_Constantes.gs) et partagez l'agenda familial, puis relancez.");
  r = lm_deux_(sh, r, "Un événement en double dans l'agenda ?",
    "Ne supprimez pas la colonne technique AgendaID (masquée, colonne K) : c'est elle qui évite " +
    "les doublons. Si elle a été vidée, resynchronisez pour la reconstruire.");
  r = lm_deux_(sh, r, "J'ai changé une date, l'agenda n'a pas suivi ?",
    "Relancez « 📅 Synchroniser l'agenda » : l'entrée existante est mise à jour.");
  r = lm_deux_(sh, r, "#REF! ou #NAME? dans l'Aperçu ?",
    "La formule IMPORTRANGE (section ⑥) attend une autorisation : cliquez la cellule puis " +
    "« Autoriser l'accès », et vérifiez l'identifiant du Budget.");
  r = lm_deux_(sh, r, "Les couleurs ou les cases manquent ?",
    "Relancez « 🎨 Configurer le design » (ou choisissez un « 🎨 Thème »).");
  r = lm_deux_(sh, r, "Google demande une autorisation ?",
    "Normal au 1er lancement d'une action du menu (surtout l'agenda). Choisissez votre compte, " +
    "« Paramètres avancés », puis « Autoriser ». Le script est le vôtre.");
  r = lm_deux_(sh, r, "J'ai cassé quelque chose en testant ?",
    "Fichier ▸ Historique des versions ▸ restaurez une version antérieure, puis relancez « 🚀 Tout installer ».");
  r = lm_vide_(sh, r);

  /* ===================== ⑧ PARTAGER ===================== */
  r = lm_bandeau_(sh, r, "⑧  Partager le classeur");
  r = lm_para_(sh, r,
    "En haut à droite, bouton « Partager ». Saisissez l'e-mail de l'autre membre du foyer, " +
    "choisissez le droit « Éditeur », puis « Envoyer ». Vous verrez ses modifications en temps réel.");
  r = lm_para_(sh, r,
    "Pensez aussi à partager l'agenda familial avec la même personne, pour qu'elle voie les " +
    "événements synchronisés dans son propre Google Agenda.");
  r = lm_vide_(sh, r);

  /* ===================== PIED DE PAGE ===================== */
  var leJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  r = lm_para_(sh, r,
    "Cet onglet est généré automatiquement — menu « 🎉 Événements » ▸ « ⚙️ Configuration » ▸ " +
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
