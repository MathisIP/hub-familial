/**
 * SUIVI CADEAUX — LISEZ-MOI ENRICHI (Phase D — mode d'emploi)
 * ==========================================================
 * `remplirLisezMoi()` reconstruit tout l'onglet « Lisez-moi » en un vrai mode
 * d'emploi pour quelqu'un qui DÉCOUVRE le fichier : à quoi ça sert · démarrage ·
 * les onglets un par un · le quotidien (idées, statuts, budget) · le menu ·
 * le lien budget (IMPORTRANGE) · une FAQ · comment partager.
 *
 * POINTS D'ENTRÉE :
 *   · Menu 🎁 Cadeaux ▸ ⚙️ Configuration ▸ « 📖 Remplir / mettre à jour le Lisez-moi ».
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
  sh.getRange(r, 2, 1, 7).merge().setValue("🎁 Suivi cadeaux — Mode d'emploi")
    .setFontSize(20).setFontWeight("bold").setFontColor(INK).setVerticalAlignment("middle");
  sh.setRowHeight(r, 34); r++;
  r = lm_para_(sh, r,
    "Notez vos idées de cadeaux, suivez leur avancement (de l'idée à l'emballage) et gardez un " +
    "œil sur le budget, pour chaque personne et chaque occasion. Ce guide explique tout, même si " +
    "vous découvrez le fichier aujourd'hui.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ① À QUOI ÇA SERT ===================== */
  r = lm_bandeau_(sh, r, "①  À quoi sert ce classeur ?");
  r = lm_para_(sh, r,
    "Il centralise les cadeaux à offrir : pour qui, à quelle occasion, l'idée, le statut (Idée, " +
    "À acheter, Commandé, Reçu, Emballé, Offert), le budget prévu et le prix réellement payé. " +
    "Fini les doublons et les oublis, et le budget cadeaux reste sous contrôle.");
  r = lm_para_(sh, r,
    "100 % gratuit et partageable entre les deux membres du foyer (droit « Éditeur »). Aucun " +
    "formulaire ni automatisation à installer : tout se fait à la main, aidé par les couleurs de statut.");
  r = lm_vide_(sh, r);

  /* ===================== ② DÉMARRAGE ===================== */
  r = lm_bandeau_(sh, r, "②  Premier démarrage — 4 étapes");
  r = lm_para_(sh, r, "Vous venez de copier ce fichier ? Faites simplement, dans l'ordre :", INK2);
  r = lm_deux_(sh, r, "Étape 1 — Occasions & listes",
    "Remplissez l'onglet « Occasions » (nom, date, budget) et vos listes de choix (personnes, " +
    "statuts) via les plages nommées ListePersonnes, ListeStatutsCad, ListeOccasions " +
    "(menu Google « Données » ▸ « Plages nommées »).");
  r = lm_deux_(sh, r, "Étape 2 — Installer",
    "Menu « 🎁 Cadeaux » ▸ « ⚙️ Configuration » ▸ « 🚀 Tout installer / configurer » (couleurs par " +
    "statut, en-têtes, formats €, occasions proches en ambre). Cliquez OK.");
  r = lm_deux_(sh, r, "Étape 3 — Lien budget",
    "Si vous suivez aussi le budget cadeaux dans le Budget familial : collez la formule IMPORTRANGE " +
    "de la section ⑥ dans l'onglet Aperçu (facultatif).");
  r = lm_deux_(sh, r, "Étape 4 — Vérifier",
    "Menu ▸ « ⚙️ Configuration » ▸ « 🔍 Vérifier la configuration » : l'assistant coche ce qui est " +
    "en place (dont les plages nommées) et signale ce qui manque.");
  r = lm_para_(sh, r,
    "Astuce : tant que vous testez, « ♻️ Réinitialiser les exemples… » remet des cadeaux et " +
    "occasions neutres. Ne l'utilisez JAMAIS sur un fichier déjà rempli de vos vraies idées.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== ③ LES ONGLETS ===================== */
  r = lm_bandeau_(sh, r, "③  Les onglets, un par un");
  r = lm_deux_(sh, r, "Aperçu",
    "Page de synthèse : vue d'ensemble et total dépensé en « Cadeaux » (relié au Budget familial — voir section ⑥).");
  r = lm_deux_(sh, r, "Cadeaux",
    "La liste principale : Pour qui, Occasion, Idée/cadeau, Statut, Budget prévu, Prix payé, " +
    "Offert par, Où / lien, Note. La couleur de la ligne suit le statut ; « Offert » se grise.");
  r = lm_deux_(sh, r, "Occasions",
    "Vos occasions (anniversaires, Noël…) : nom, date, budget, note. Une occasion à moins de " +
    "30 jours ressort en ambre.");
  r = lm_deux_(sh, r, "Paramètres",
    "Les listes de choix (personnes, statuts, occasions), reliées aux menus déroulants par les plages nommées.");
  r = lm_deux_(sh, r, "Lisez-moi",
    "Ce mode d'emploi (régénéré depuis le menu).");
  r = lm_vide_(sh, r);

  /* ===================== ④ AU QUOTIDIEN ===================== */
  r = lm_bandeau_(sh, r, "④  Au quotidien : de l'idée au cadeau offert");
  r = lm_deux_(sh, r, "Noter une idée",
    "Une ligne dans l'onglet Cadeaux : la personne, l'occasion, l'idée, et le statut « Idée ». " +
    "Ajoutez un budget prévu et, plus tard, le prix payé.");
  r = lm_deux_(sh, r, "Suivre l'avancement",
    "Faites évoluer le Statut : Idée → À acheter → Commandé → Reçu → Emballé → Offert. Les couleurs " +
    "sont automatiques ; une fois « Offert », la ligne se grise (mission accomplie).");
  r = lm_deux_(sh, r, "Tenir le budget",
    "« Budget prévu » et « Prix payé » par cadeau ; chaque occasion a aussi son budget global " +
    "dans l'onglet Occasions.");
  r = lm_deux_(sh, r, "Anticiper les occasions",
    "L'onglet Occasions surligne en ambre celles qui arrivent dans les 30 jours : un coup d'œil suffit.");
  r = lm_vide_(sh, r);

  /* ===================== ⑤ LE MENU ===================== */
  r = lm_bandeau_(sh, r, "⑤  Le menu « 🎁 Cadeaux »");
  r = lm_para_(sh, r,
    "Tout se pilote depuis ce menu (en haut, après « Aide »), sans ouvrir l'éditeur de code :", INK2);
  r = lm_deux_(sh, r, "🎨 Configurer les couleurs / statuts",
    "Repose la mise en forme : couleurs par statut, en-têtes, formats €, occasions proches (sans toucher à vos données).");
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
  r = lm_bandeau_(sh, r, "⑥  Lien budget « Cadeaux » (formule à coller)");
  r = lm_para_(sh, r,
    "La seule formule à coller à la main relie l'Aperçu au Budget familial pour afficher le total " +
    "dépensé en « Cadeaux ». Sur une feuille en français, le script ne peut pas l'écrire (elle " +
    "renverrait #ERROR!) : copiez-collez-la vous-même, une fois, dans la cellule du total (onglet Aperçu) :");
  r = lm_code_(sh, r, "=SOMME(IMPORTRANGE(\"ID_DU_BUDGET\";\"Vue annuelle!B14:M14\"))");
  r = lm_deux_(sh, r, "À adapter",
    "Remplacez ID_DU_BUDGET par l'identifiant de votre fichier Budget familial (visible dans son URL). " +
    "À la 1re utilisation, cliquez la cellule puis « Autoriser l'accès ». Séparateur d'arguments FR = point-virgule.");
  r = lm_vide_(sh, r);

  /* ===================== ⑦ FAQ ===================== */
  r = lm_bandeau_(sh, r, "⑦  FAQ — en cas de souci");
  r = lm_deux_(sh, r, "Les menus déroulants ne proposent rien ?",
    "Les listes (personne / statut / occasion) s'appuient sur des plages nommées : ListePersonnes, " +
    "ListeStatutsCad, ListeOccasions. Définissez-les via « Données » ▸ « Plages nommées ». " +
    "« 🔍 Vérifier » indique celles qui manquent.");
  r = lm_deux_(sh, r, "Les couleurs de statut ne s'affichent pas ?",
    "Relancez « 🎨 Configurer les couleurs / statuts » (ou choisissez un « 🎨 Thème »). Vérifiez que le statut " +
    "est écrit exactement : Idée, À acheter, Commandé, Reçu, Emballé ou Offert.");
  r = lm_deux_(sh, r, "#REF! ou #NAME? dans l'Aperçu ?",
    "La formule IMPORTRANGE (section ⑥) attend une autorisation : cliquez la cellule puis " +
    "« Autoriser l'accès », et vérifiez l'identifiant du Budget.");
  r = lm_deux_(sh, r, "Une occasion proche n'est pas surlignée ?",
    "Vérifiez que sa date est bien remplie (onglet Occasions, colonne Date) et qu'elle tombe dans les 30 jours.");
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
    "⚠ Attention à la surprise : ne partagez PAS ce fichier avec la personne à qui les cadeaux sont " +
    "destinés — elle verrait toute la liste ! Réservez-le aux personnes qui offrent.", MUTED);
  r = lm_vide_(sh, r);

  /* ===================== PIED DE PAGE ===================== */
  var leJour = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "dd/MM/yyyy");
  r = lm_para_(sh, r,
    "Cet onglet est généré automatiquement — menu « 🎁 Cadeaux » ▸ « ⚙️ Configuration » ▸ " +
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
