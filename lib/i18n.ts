/**
 * CADRE MULTILINGUE (UI).
 * =======================
 * Dictionnaire plat `clé → { fr, en?, es?… }`. `t(clé, langue)` résout la langue
 * avec repli sur le français. FR = référence complète ; EN en cours ; ES/DE/IT à
 * venir (repli FR tant qu'ils ne sont pas remplis).
 *
 * (Le registre historique des onglets Google Sheets a été retiré : les données
 * du foyer vivent en base, plus aucun module ne lit un Sheet.)
 */

export type IdLangue = 'fr' | 'en' | 'es' | 'de' | 'it';
export const LANGUE_DEFAUT: IdLangue = 'fr';

/** Langues proposées dans le sélecteur (l'ordre est l'ordre d'affichage). */
export const LANGUES_DISPO: { code: IdLangue; nom: string }[] = [
  { code: 'fr', nom: 'Français' },
  { code: 'en', nom: 'English' },
  { code: 'es', nom: 'Español' },
  { code: 'de', nom: 'Deutsch' },
  { code: 'it', nom: 'Italiano' },
];

/** Normalise une valeur quelconque en langue connue (repli fr). */
export function langueValide(v: string | undefined | null): IdLangue {
  return LANGUES_DISPO.some((l) => l.code === v) ? (v as IdLangue) : 'fr';
}

/** Locale BCP-47 pour `Intl` (dates, etc.) selon la langue. */
export function locale(langue: IdLangue): string {
  return { fr: 'fr-FR', en: 'en-GB', es: 'es-ES', de: 'de-DE', it: 'it-IT' }[langue] ?? 'fr-FR';
}

/* ----------------------------- UI multilingue ----------------------------- */

type Trad = { fr: string } & Partial<Record<IdLangue, string>>;

const UI = {
  APP_TITRE: { fr: '🏡 Nestync', en: '🏡 Nestync' },

  // Modules (libellés courts, nav + titres)
  MOD_BUDGET: { fr: 'Budget', en: 'Budget' },
  MOD_TODO: { fr: 'To-Do', en: 'To-Do' },
  MOD_REPAS: { fr: 'Repas', en: 'Meals' },
  MOD_EVENEMENTS: { fr: 'Événements', en: 'Events' },
  MOD_CADEAUX: { fr: 'Cadeaux', en: 'Gifts' },
  MOD_AGENDA: { fr: 'Agenda', en: 'Calendar' },
  MOD_DOCUMENTS: { fr: 'Documents', en: 'Documents' },

  // Sous-titres des pages de module
  SUB_BUDGET: { fr: 'Comptes, dépenses et objectifs du foyer', en: 'Household accounts, spending and goals' },
  SUB_TODO: { fr: 'Tâches du foyer et liste de courses partagée', en: 'Household tasks and shared shopping list' },
  SUB_REPAS: { fr: 'Planning des dîners et recettes', en: 'Dinner planning and recipes' },
  SUB_EVENEMENTS: { fr: 'Réceptions, invités, checklist et menu', en: 'Gatherings, guests, checklist and menu' },
  SUB_CADEAUX: { fr: 'Idées, budget et suivi des cadeaux par occasion', en: 'Ideas, budget and gift tracking by occasion' },
  SUB_AGENDA: { fr: 'Agenda familial partagé', en: 'Shared family calendar' },
  SUB_DOCUMENTS: { fr: 'Les papiers du foyer, rangés et privés', en: 'Household paperwork, sorted and private' },

  // Navigation
  NAV_ACCUEIL: { fr: 'Accueil', en: 'Home' },
  NAV_ALLER_A: { fr: 'Aller à…', en: 'Go to…' },
  NAV_APPARENCE: { fr: 'Apparence', en: 'Appearance' },
  NAV_REGLAGES: { fr: 'Réglages', en: 'Settings' },
  NAV_MON_FOYER: { fr: 'Mon foyer', en: 'My household' },
  NAV_ABONNEMENT: { fr: 'Abonnement', en: 'Subscription' },
  NAV_MON_COMPTE: { fr: 'Mon compte', en: 'My account' },
  NAV_CONFIDENTIALITE: { fr: 'Confidentialité', en: 'Privacy' },
  NAV_DECONNEXION: { fr: 'Se déconnecter', en: 'Sign out' },
  A_CHOISIR_ONGLET: { fr: 'Choisir un onglet', en: 'Choose a tab' },
  A_MODE_CLAIR: { fr: 'Passer en mode clair', en: 'Switch to light mode' },
  A_MODE_SOMBRE: { fr: 'Passer en mode sombre', en: 'Switch to dark mode' },
  A_COULEUR: { fr: 'Couleur du thème', en: 'Theme color' },
  NEON_LABEL: { fr: 'Effet néon', en: 'Neon effect' },
  A_NEON_ON: { fr: 'Activer l’effet néon', en: 'Turn on the neon effect' },
  A_NEON_OFF: { fr: 'Désactiver l’effet néon', en: 'Turn off the neon effect' },
  A_ANNEE: { fr: 'Année', en: 'Year' },
  A_MOIS: { fr: 'Mois', en: 'Month' },

  // Accueil (hero)
  ACC_BONJOUR: { fr: 'Bonjour', en: 'Good morning' },
  ACC_BONSOIR: { fr: 'Bonsoir', en: 'Good evening' },
  ACC_SOUS: { fr: 'Votre foyer en un coup d’œil.', en: 'Your household at a glance.' },
  ACC_MAISON: { fr: 'à la maison', en: 'at home' },

  // Réglages
  REG_TITRE: { fr: 'Réglages', en: 'Settings' },
  REG_SOUS: { fr: 'Tes préférences, ton foyer et ton compte', en: 'Your preferences, household and account' },
  REG_PERSO: { fr: 'Personnalisation', en: 'Personalization' },
  REG_NOM_LBL: { fr: 'Nom affiché à l’accueil', en: 'Name shown on the home screen' },
  REG_NOM_AIDE: { fr: 'Laisse vide pour utiliser le prénom de ton compte', en: 'Leave empty to use your account’s first name' },
  REG_LANGUE_LBL: { fr: 'Langue de l’application', en: 'App language' },
  REG_LANGUE_AIDE: {
    fr: 'Le français est complet ; les autres langues sont en cours de traduction et s’appliqueront progressivement.',
    en: 'French and English are available; other languages are being translated and will roll out progressively.',
  },
  REG_ENREGISTRER: { fr: 'Enregistrer', en: 'Save' },
  REG_ENREGISTRE: { fr: 'Enregistré ✓', en: 'Saved ✓' },
  REG_FOYER_DESC: { fr: 'Les personnes qui partagent les données du foyer, les invitations et le nom du foyer.', en: 'The people who share the household data, invitations and the household name.' },
  REG_FOYER_BTN: { fr: 'Gérer mon foyer', en: 'Manage my household' },
  REG_ABO_TITRE: { fr: 'Abonnement', en: 'Subscription' },
  REG_ABO_DESC: { fr: 'Gère l’abonnement du foyer (accès à tous les modules).', en: 'Manage the household subscription (access to all modules).' },
  REG_ABO_STATUT: { fr: 'Statut', en: 'Status' },
  REG_ABO_BTN: { fr: 'Gérer l’abonnement', en: 'Manage subscription' },
  REG_COMPTE_TITRE: { fr: 'Mon compte', en: 'My account' },
  REG_COMPTE_DESC: { fr: 'Exporter toutes tes données (portabilité) ou supprimer définitivement ton compte (effacement).', en: 'Export all your data (portability) or permanently delete your account (erasure).' },
  REG_COMPTE_BTN: { fr: 'Mes données & mon compte', en: 'My data & my account' },
  REG_CONF_TITRE: { fr: 'Confidentialité', en: 'Privacy' },
  REG_CONF_DESC: { fr: 'Comment tes données sont traitées et conservées.', en: 'How your data is processed and stored.' },
  REG_CONF_BTN: { fr: 'Politique de confidentialité', en: 'Privacy policy' },

  // Statuts d'abonnement (affichés dans Réglages)
  ABO_LIBRE: { fr: 'Accès libre', en: 'Free access' },
  ABO_ACTIF: { fr: 'Abonnement actif ✓', en: 'Active subscription ✓' },
  ABO_ESSAI: { fr: 'Période d’essai', en: 'Trial period' },
  ABO_IMPAYE: { fr: 'Paiement en attente', en: 'Payment pending' },
  ABO_ANNULE: { fr: 'Abonnement annulé', en: 'Subscription cancelled' },

  // Divers (page connexion, sélecteurs — secondaire)
  APP_SOUS_TITRE: { fr: "L'organisation du foyer, en un seul endroit", en: 'Your household, all in one place' },
  THEME: { fr: '🎨 Thème', en: '🎨 Theme' },
  LANGUE: { fr: '🌍 Langue', en: '🌍 Language' },
  BIENTOT: { fr: 'À venir', en: 'Coming soon' },

  // Génériques (boutons/messages partagés)
  G_FERMER: { fr: 'Fermer', en: 'Close' },
  G_ANNULER: { fr: 'Annuler', en: 'Cancel' },
  G_ENREGISTRER: { fr: 'Enregistrer', en: 'Save' },
  G_MODIFIER: { fr: 'Modifier', en: 'Edit' },
  G_SUPPRIMER: { fr: 'Supprimer', en: 'Delete' },
  G_AJOUTER: { fr: 'Ajouter', en: 'Add' },
  G_LIEU: { fr: 'Lieu', en: 'Place' },
  G_NOTE: { fr: 'Note', en: 'Note' },
  G_ERR_CHARGEMENT: { fr: 'Erreur de chargement.', en: 'Loading error.' },
  G_ERR_ACTION: { fr: 'Action refusée.', en: 'Action refused.' },
  G_JOURNEE: { fr: 'journée', en: 'all day' },
  REL_AUJOURDHUI: { fr: "aujourd'hui", en: 'today' },
  REL_DEMAIN: { fr: 'demain', en: 'tomorrow' },
  REL_DANS: { fr: 'dans', en: 'in' },
  REL_J: { fr: 'j', en: 'd' },

  // Accueil — cartes
  CARD_COMPTES: { fr: 'Mes comptes', en: 'My accounts' },
  CARD_TOTAL: { fr: 'Total', en: 'Total' },
  SEM_TITRE: { fr: 'Cette semaine', en: 'This week' },
  SEM_LIEN: { fr: 'Agenda complet →', en: 'Full calendar →' },
  SEM_CHARGEMENT: { fr: 'Chargement de l’agenda…', en: 'Loading calendar…' },
  SEM_INDISPO: { fr: 'Agenda indisponible pour le moment.', en: 'Calendar unavailable right now.' },
  SEM_RIEN: { fr: 'Rien de prévu ce jour.', en: 'Nothing planned that day.' },
  CS_TITRE: { fr: 'Liste de courses', en: 'Shopping list' },
  CS_AJOUT_LISTE: { fr: 'Ajouter à ma liste', en: 'Add to my list' },
  CS_ENVOYER: { fr: 'Envoyer par message', en: 'Send by message' },
  CS_PRODUIT_PH: { fr: 'Produit (ex. gel douche)…', en: 'Item (e.g. shower gel)…' },
  CS_QTE: { fr: 'Qté', en: 'Qty' },
  CS_VIDE: { fr: 'Ta liste de courses est vide.', en: 'Your shopping list is empty.' },
  CS_AJOUTE_SUFFIXE: { fr: 'ajouté à ta liste de courses.', en: 'added to your shopping list.' },
  // Documents (fichiers du foyer, stockage propre)
  DOC_TITRE: { fr: '🗂️ Documents', en: '🗂️ Documents' },
  DOC_CHARGEMENT: { fr: 'Chargement des documents…', en: 'Loading documents…' },
  DOC_VIDE: { fr: 'Aucun document. Téléverse le premier ci-dessus.', en: 'No documents yet. Upload your first one above.' },
  DOC_TELEVERSER: { fr: '⬆ Téléverser', en: '⬆ Upload' },
  DOC_AJOUTER: { fr: '⬆ Ajouter un document', en: '⬆ Add a document' },
  DOC_ENVOI: { fr: 'Envoi…', en: 'Uploading…' },
  DOC_OUVRIR: { fr: 'Ouvrir le document', en: 'Open document' },
  DOC_NOM: { fr: 'Nom du document', en: 'Document name' },
  DOC_LIEN_ONGLET: { fr: 'Tous mes documents →', en: 'All my documents →' },
  DOC_AJOUTE_SUFFIXE: { fr: 'document(s) ajouté(s) dans « Fichiers non classés ».', en: 'document(s) added to “Unsorted files”.' },
  DOC_RECHERCHE_PH: { fr: 'Rechercher un document…', en: 'Search a document…' },
  DOC_AUCUN_RESULTAT: { fr: 'Aucun document ne correspond.', en: 'No matching document.' },
  DOC_RESULTATS: { fr: 'Résultats', en: 'Results' },
  DOC_NOUVEAU_DOSSIER_PH: { fr: 'Nom du nouveau dossier', en: 'New folder name' },
  DOC_CREER_DOSSIER: { fr: '＋ Dossier', en: '＋ Folder' },
  DOC_DEPOSER_DANS: { fr: 'Déposer dans', en: 'Upload to' },
  DOC_DOSSIER_VIDE: { fr: 'Dossier vide.', en: 'Empty folder.' },
  DOC_GERER_DOSSIER: { fr: 'Renommer ou supprimer le dossier', en: 'Rename or delete folder' },
  DOC_NOM_DOSSIER: { fr: 'Nom du dossier', en: 'Folder name' },
  DOC_SUPPR_DOSSIER: { fr: 'Supprimer le dossier', en: 'Delete folder' },
  DOC_SUPPR_DOSSIER_AIDE: {
    fr: 'Les fichiers ne sont pas supprimés : ils repartent dans « Fichiers non classés ».',
    en: 'Files are not deleted: they go back to “Unsorted files”.',
  },
  DOC_DEPLACER_VERS: { fr: 'Déplacer vers', en: 'Move to' },

  // Saisie d'une opération (budget)
  SAISIE_CTA: { fr: 'Ajouter une opération', en: 'Add a transaction' },
  SAISIE_MONTANT: { fr: 'Montant (€)', en: 'Amount (€)' },
  SAISIE_COMPTE: { fr: 'Compte', en: 'Account' },
  SAISIE_COMPTE_DEP: { fr: 'Compte de départ', en: 'From account' },
  SAISIE_COMPTE_DEST: { fr: 'Compte de destination', en: 'To account' },
  SAISIE_CATEGORIE: { fr: 'Catégorie', en: 'Category' },
  SAISIE_LIBELLE: { fr: 'Libellé', en: 'Label' },
  SAISIE_LIBELLE_PH: { fr: 'ex. Courses', en: 'e.g. Groceries' },
  SAISIE_DATE: { fr: 'Date', en: 'Date' },
  SAISIE_ENREG_EN_COURS: { fr: 'Enregistrement…', en: 'Saving…' },
  SAISIE_OK: { fr: 'Opération enregistrée ✓', en: 'Transaction saved ✓' },
  SAISIE_ERR_MONTANT: { fr: 'Montant : un nombre positif est attendu.', en: 'Amount: a positive number is required.' },
  SAISIE_ERR_COMPTE: { fr: 'Choisis un compte.', en: 'Choose an account.' },
  SAISIE_ERR_VIREMENT: { fr: 'Un virement interne exige un compte de destination.', en: 'An internal transfer requires a destination account.' },
  TX_DEPENSE: { fr: 'Dépense', en: 'Expense' },
  TX_REVENU: { fr: 'Revenu', en: 'Income' },
  TX_VIREMENT: { fr: 'Virement interne', en: 'Internal transfer' },

  // Budget — dashboard
  BUD_RESTE: { fr: 'Reste ce mois', en: 'Left this month' },
  BUD_RESTE_N: { fr: 'revenus − dépenses', en: 'income − expenses' },
  BUD_REVENUS: { fr: 'Revenus', en: 'Income' },
  BUD_REVENUS_N: { fr: 'salaires du foyer', en: 'household salaries' },
  BUD_DEPENSES: { fr: 'Dépenses', en: 'Expenses' },
  BUD_DEPENSES_N: { fr: 'toutes catégories', en: 'all categories' },
  BUD_PATRIMOINE: { fr: 'Patrimoine', en: 'Net worth' },
  BUD_PATRIMOINE_N: { fr: 'comptes cumulés', en: 'total across accounts' },
  BUD_SOLDES: { fr: 'Soldes des comptes', en: 'Account balances' },
  BUD_PAR_CAT: { fr: 'Dépenses par catégorie', en: 'Spending by category' },
  BUD_MOIS_COURANT: { fr: 'mois en cours', en: 'current month' },
  BUD_DERNIERES_TX: { fr: 'Dernières transactions', en: 'Recent transactions' },
  BUD_SANS_LIBELLE: { fr: '(sans libellé)', en: '(no label)' },
  BUD_ECHEANCES: { fr: 'Échéances à venir', en: 'Upcoming due dates' },
  MOIS_PRECEDENT: { fr: 'Mois précédent', en: 'Previous month' },
  MOIS_SUIVANT: { fr: 'Mois suivant', en: 'Next month' },

  REL_PASSE: { fr: 'passé', en: 'past' },
  G_OK: { fr: 'OK', en: 'OK' },

  // Énumérations fixes (affichées ; la valeur stockée reste en français)
  ST_AFAIRE: { fr: 'À faire', en: 'To do' },
  ST_ENCOURS: { fr: 'En cours', en: 'In progress' },
  ST_FAIT: { fr: 'Fait', en: 'Done' },
  PR_HAUTE: { fr: 'Haute', en: 'High' },
  PR_MOY: { fr: 'Moyenne', en: 'Medium' },
  PR_BASSE: { fr: 'Basse', en: 'Low' },
  CAT_ENTREE: { fr: 'Entrée', en: 'Starter' },
  CAT_PLAT: { fr: 'Plat', en: 'Main' },
  CAT_DESSERT: { fr: 'Dessert', en: 'Dessert' },
  RTYPE_VIANDE: { fr: 'Viande', en: 'Meat' },
  RTYPE_POISSON: { fr: 'Poisson', en: 'Fish' },
  RTYPE_VEGE: { fr: 'Végétarien', en: 'Vegetarian' },
  CF_CHAUD: { fr: 'Chaud', en: 'Hot' },
  CF_FROID: { fr: 'Froid', en: 'Cold' },

  // To-Do
  TODO_TAB_TACHES: { fr: 'Tâches', en: 'Tasks' },
  TODO_TAB_COURSES: { fr: 'Courses', en: 'Shopping' },
  TODO_NOUVELLE_TACHE: { fr: 'Nouvelle tâche…', en: 'New task…' },
  TODO_QUI: { fr: 'Qui ?', en: 'Who?' },
  TODO_PRIORITE: { fr: 'Priorité', en: 'Priority' },
  TODO_TOUS: { fr: 'Tous', en: 'All' },
  TODO_AUCUNE_TACHE: { fr: 'Aucune tâche. Ajoute la première ci-dessus.', en: 'No tasks. Add the first one above.' },
  TODO_AUCUNE_POUR: { fr: 'Aucune tâche pour', en: 'No tasks for' },
  TODO_ARTICLE_PH: { fr: 'Article à acheter…', en: 'Item to buy…' },
  TODO_QTE_PH: { fr: 'Qté (ex. 400 g)', en: 'Qty (e.g. 400 g)' },
  TODO_RAYON: { fr: 'Rayon', en: 'Aisle' },
  TODO_LISTE_VIDE: { fr: 'Liste vide. Ajoute un article ci-dessus.', en: 'Empty list. Add an item above.' },
  TODO_RETIRER_1: { fr: 'Retirer les', en: 'Remove the' },
  TODO_RETIRER_2: { fr: 'article(s) coché(s)', en: 'checked item(s)' },

  // Repas
  REPAS_TAB_SEMAINE: { fr: 'Semaine', en: 'Week' },
  REPAS_TAB_RECETTES: { fr: 'Recettes', en: 'Recipes' },
  REPAS_PERS: { fr: 'pers.', en: 'ppl' },
  REPAS_APERCU_TITRE: { fr: 'Aperçu des courses de la semaine', en: 'This week’s shopping preview' },
  REPAS_APERCU_NOTE: { fr: 'Somme des ingrédients des dîners planifiés, quantités mises à l’échelle.', en: 'Sum of the planned meals’ ingredients, quantities scaled.' },
  REPAS_NOUVELLE_RECETTE: { fr: 'Nouvelle recette', en: 'New recipe' },
  REPAS_NOM_PH: { fr: 'Nom de la recette', en: 'Recipe name' },
  REPAS_CATEGORIE: { fr: 'Catégorie', en: 'Category' },
  REPAS_TYPE: { fr: 'Type', en: 'Type' },
  REPAS_CHAUDFROID: { fr: 'Chaud/Froid', en: 'Hot/Cold' },
  REPAS_ING_ARTICLE: { fr: 'Article', en: 'Item' },
  REPAS_ING_QTE: { fr: 'Quantité', en: 'Quantity' },
  REPAS_ING_UNITE: { fr: 'Unité', en: 'Unit' },
  REPAS_ING_RAYON: { fr: 'Rayon', en: 'Aisle' },
  REPAS_ING_QTE_PH: { fr: 'Qté', en: 'Qty' },
  REPAS_ING_AJOUTER: { fr: '＋ Ingrédient', en: '＋ Ingredient' },
  REPAS_NOTE_PH: { fr: 'Note (facultatif)', en: 'Note (optional)' },
  REPAS_BEBE_FAVORI: { fr: '👶 Favori de bébé', en: '👶 Baby’s favourite' },
  REPAS_BEBE_AGOUTER: { fr: '👶 Bébé n’a pas encore goûté', en: '👶 Baby hasn’t tried it yet' },
  REPAS_BADGE_FAVORI: { fr: '👶 Favori bébé', en: '👶 Baby fave' },
  REPAS_BADGE_AGOUTER: { fr: '👶 À goûter', en: '👶 To try' },
  REPAS_RETIRER_ING: { fr: "Retirer l'ingrédient", en: 'Remove ingredient' },

  // Événements
  EVT_NOUVEL: { fr: 'Nouvel événement', en: 'New event' },
  EVT_AUCUN: { fr: 'Aucun événement. Ajoute le premier ci-dessus.', en: 'No events. Add the first one above.' },
  EVT_CONFIRMES: { fr: 'confirmés', en: 'confirmed' },
  EVT_PERS: { fr: 'pers.', en: 'ppl' },
  EVT_PLATS: { fr: 'plat(s)', en: 'dish(es)' },
  EVT_DANS_AGENDA: { fr: 'dans l’agenda', en: 'in the calendar' },
  EVT_AJOUTER_AGENDA: { fr: 'Ajouter à l’agenda', en: 'Add to calendar' },
  EVT_RETIRER: { fr: 'retirer', en: 'remove' },
  EVT_CHOISIR_AGENDA: { fr: 'Choisir l’agenda…', en: 'Choose calendar…' },
  EVT_STATUT: { fr: 'Statut', en: 'Status' },
  EVT_TYPE: { fr: 'Type', en: 'Type' },
  EVT_NOM_PH: { fr: "Nom de l'événement", en: 'Event name' },
  EVT_HEURE: { fr: 'Heure', en: 'Time' },
  EVT_BUDGET_PH: { fr: 'Budget prévu (€)', en: 'Planned budget (€)' },
  EVT_DEPENSE_PH: { fr: 'Dépensé (€)', en: 'Spent (€)' },

  // Cadeaux
  CAD_NOUVELLE: { fr: 'Nouvelle idée', en: 'New idea' },
  CAD_SANS_OCCASION: { fr: 'Sans occasion', en: 'No occasion' },
  CAD_PREVU: { fr: 'prévu', en: 'planned' },
  CAD_PAYE: { fr: 'payé', en: 'paid' },
  CAD_BUDGET: { fr: 'budget', en: 'budget' },
  CAD_POUR: { fr: 'pour', en: 'for' },
  CAD_PAR: { fr: 'par', en: 'by' },
  CAD_IDEE_PH: { fr: 'Idée / cadeau', en: 'Idea / gift' },
  CAD_POUR_QUI: { fr: 'Pour qui', en: 'For whom' },
  CAD_OCCASION: { fr: 'Occasion', en: 'Occasion' },
  CAD_BUDGET_PH: { fr: 'Budget prévu (€)', en: 'Planned budget (€)' },
  CAD_PRIX_PH: { fr: 'Prix payé (€)', en: 'Price paid (€)' },
  CAD_OFFERT_PAR: { fr: 'Offert par', en: 'Given by' },
  CAD_OU_PH: { fr: 'Où / lien', en: 'Where / link' },
  CAD_PRIX_PAYE_PH: { fr: 'Prix payé (€)', en: 'Price paid (€)' },
  CAD_PARTAGE: { fr: 'Cadeau à plusieurs', en: 'Group gift' },
  CAD_COUT_PH: { fr: 'Coût total (€)', en: 'Total cost (€)' },
  CAD_PARTICIPATION_PH: { fr: 'Ta participation (€)', en: 'Your contribution (€)' },
  CAD_BADGE_PARTAGE: { fr: 'à plusieurs', en: 'group' },
  CAD_PART: { fr: 'ta part', en: 'your share' },
  CAD_COUT: { fr: 'coût', en: 'cost' },

  // Agenda (module)
  AGD_NOUVEL: { fr: 'Nouvel événement', en: 'New event' },
  AGD_AUCUN_1: { fr: 'Aucun événement à venir dans les', en: 'No upcoming events in the next' },
  AGD_AUCUN_2: { fr: 'prochains jours.', en: 'days.' },
  AGD_TITRE_PH: { fr: "Titre de l'événement", en: 'Event title' },
  AGD_JOURNEE_ENTIERE: { fr: 'Journée entière', en: 'All day' },
  AGD_DEBUT: { fr: 'Début', en: 'Start' },
  AGD_FIN: { fr: 'Fin', en: 'End' },
  AGD_DESC_PH: { fr: 'Note / description', en: 'Note / description' },

  // Statuts Événements
  EVS_APLANIFIER: { fr: 'À planifier', en: 'To plan' },
  EVS_ENPREP: { fr: 'En préparation', en: 'In preparation' },
  EVS_PRET: { fr: 'Prêt', en: 'Ready' },
  EVS_PASSE: { fr: 'Passé', en: 'Past' },
  // Statuts Cadeaux
  CDS_IDEE: { fr: 'Idée', en: 'Idea' },
  CDS_AACHETER: { fr: 'À acheter', en: 'To buy' },
  CDS_COMMANDE: { fr: 'Commandé', en: 'Ordered' },
  CDS_RECU: { fr: 'Reçu', en: 'Received' },
  CDS_EMBALLE: { fr: 'Emballé', en: 'Wrapped' },
  CDS_OFFERT: { fr: 'Offert', en: 'Given' },
  // Jours de la semaine
  JOUR_LUNDI: { fr: 'Lundi', en: 'Monday' },
  JOUR_MARDI: { fr: 'Mardi', en: 'Tuesday' },
  JOUR_MERCREDI: { fr: 'Mercredi', en: 'Wednesday' },
  JOUR_JEUDI: { fr: 'Jeudi', en: 'Thursday' },
  JOUR_VENDREDI: { fr: 'Vendredi', en: 'Friday' },
  JOUR_SAMEDI: { fr: 'Samedi', en: 'Saturday' },
  JOUR_DIMANCHE: { fr: 'Dimanche', en: 'Sunday' },

  // Mon compte (RGPD)
  CPT_SOUS: { fr: 'Tes données et ta confidentialité', en: 'Your data and privacy' },
  CPT_EXPORT_TITRE: { fr: 'Exporter mes données', en: 'Export my data' },
  CPT_EXPORT_DESC: {
    fr: "Télécharge l'intégralité des données de ton foyer (comptes et transactions, tâches et courses, recettes, cadeaux, événements…) dans un fichier JSON. C'est ton droit à la portabilité.",
    en: 'Download all of your household’s data (accounts and transactions, tasks and shopping, recipes, gifts, events…) as a JSON file. This is your right to data portability.',
  },
  CPT_EXPORT_BTN: { fr: '⬇ Exporter mes données (JSON)', en: '⬇ Export my data (JSON)' },
  CPT_SUPPR_TITRE: { fr: 'Supprimer mon compte', en: 'Delete my account' },
  CPT_SUPPR_DESC: {
    fr: 'Efface définitivement ton compte et toutes les données de ton foyer. Cette action est irréversible (droit à l’effacement). Pense à exporter tes données avant si tu veux en garder une copie.',
    en: 'Permanently deletes your account and all your household’s data. This action is irreversible (right to erasure). Remember to export your data first if you want to keep a copy.',
  },
  CPT_CHECK: {
    fr: 'Je comprends que la suppression est définitive et efface toutes les données de mon foyer.',
    en: 'I understand that deletion is permanent and erases all my household’s data.',
  },
  CPT_SUPPR_BTN: { fr: 'Supprimer définitivement mon compte', en: 'Permanently delete my account' },
  CPT_CONF_LIEN: { fr: 'Politique de confidentialité →', en: 'Privacy policy →' },

  // Mon foyer
  FOY_SOUS_A: { fr: 'Les personnes qui partagent les données de', en: 'The people who share the data of' },
  FOY_NOM_TITRE: { fr: 'Nom du foyer', en: 'Household name' },
  FOY_RENOMMER: { fr: 'Renommer', en: 'Rename' },
  FOY_MEMBRES: { fr: 'Membres', en: 'Members' },
  FOY_PROPRIETAIRE: { fr: 'Propriétaire', en: 'Owner' },
  FOY_MEMBRE: { fr: 'Membre', en: 'Member' },
  FOY_TOI: { fr: 'toi', en: 'you' },
  FOY_RETIRER: { fr: 'Retirer', en: 'Remove' },
  FOY_INVITER_TITRE: { fr: 'Inviter une personne', en: 'Invite someone' },
  FOY_INVITER_NOTE: {
    fr: 'Saisis son adresse Google. Un lien d’invitation sera créé : partage-le (SMS, WhatsApp…). La personne le suit, se connecte, et rejoint ton foyer.',
    en: 'Enter their Google address. An invitation link will be created: share it (SMS, WhatsApp…). They follow it, sign in, and join your household.',
  },
  FOY_INVITER_BTN: { fr: 'Inviter', en: 'Invite' },
  FOY_INVIT_ATTENTE: { fr: 'Invitations en attente', en: 'Pending invitations' },
  FOY_DEMANDES: { fr: 'Demandes reçues', en: 'Join requests' },
  FOY_ACCEPTER: { fr: 'Accepter', en: 'Accept' },
  FOY_REFUSER: { fr: 'Refuser', en: 'Decline' },
  FOY_EXPIRE: { fr: 'expire le', en: 'expires on' },
  FOY_AIDE_A: {
    fr: '💡 La personne invitée doit se connecter avec l’adresse Google exacte que tu as saisie — c’est ce qui lui donne accès au foyer. Si elle utilise une autre adresse, l’invitation sera refusée.',
    en: '💡 The invited person must sign in with the exact Google address you entered — that is what grants them access to the household. With a different address, the invitation will be refused.',
  },
  FOY_LIEN_COPIE: { fr: 'Lien copié ✓', en: 'Link copied ✓' },
  FOY_COPIER_LIEN: { fr: 'Copier le lien', en: 'Copy link' },

  // Abonnement (page)
  ABO_SOUS: { fr: 'L’abonnement du foyer donne accès à tous les modules de Nestync.', en: 'The household subscription unlocks all Nestync modules.' },
  ABOP_LIBRE: { fr: 'Accès libre (facturation non activée).', en: 'Free access (billing not enabled).' },
  ABOP_ACTIF: { fr: 'Abonnement actif ✓', en: 'Active subscription ✓' },
  ABOP_ESSAI: { fr: 'Période d’essai', en: 'Trial period' },
  ABOP_IMPAYE: { fr: 'Paiement en attente — régularise pour continuer.', en: 'Payment pending — settle it to continue.' },
  ABOP_ANNULE: { fr: 'Abonnement annulé.', en: 'Subscription cancelled.' },
  ABO_ESSAI_A: { fr: 'Essai gratuit jusqu’au', en: 'Free trial until' },
  ABO_ESSAI_B: { fr: 'Abonne-toi pour ne pas perdre l’accès.', en: 'Subscribe so you don’t lose access.' },
  ABO_ESSAI_OUVERT: { fr: 'Essai en cours. Abonne-toi quand tu veux pour pérenniser l’accès.', en: 'Trial in progress. Subscribe whenever you like to keep access.' },
  ABO_SUSPENDU: { fr: 'Ton accès est suspendu : un abonnement actif est requis.', en: 'Your access is suspended: an active subscription is required.' },
  ABO_NON_ACTIVE: { fr: 'La facturation n’est pas activée sur cette instance.', en: 'Billing is not enabled on this instance.' },
  ABO_REDIRECTION: { fr: 'Redirection…', en: 'Redirecting…' },
  ABO_SABONNER: { fr: 'S’abonner', en: 'Subscribe' },
  ABO_RESILIE_A: { fr: 'Résiliation enregistrée : ton accès reste ouvert jusqu’au', en: 'Cancellation registered: your access stays open until' },
  ABO_RESILIE_B: {
    fr: 'Aucun nouveau prélèvement ne sera effectué. Tu peux réactiver l’abonnement à tout moment depuis « Gérer mon abonnement ».',
    en: 'No further payment will be taken. You can reactivate your subscription at any time from “Manage my subscription”.',
  },
  ABO_GERER: { fr: 'Gérer mon abonnement', en: 'Manage my subscription' },

  // Politique de confidentialité (gabarit)
  CONF_RETOUR: { fr: 'Retour', en: 'Back' },
  CONF_TITRE: { fr: 'Politique de confidentialité', en: 'Privacy policy' },
  CONF_MAJ: { fr: 'Dernière mise à jour : 5 août 2026', en: 'Last updated: 5 August 2026' },
  CONF_AVERT: {
    fr: '⚠ Modèle à finaliser : renseigne les champs entre crochets et fais relire ce document avant toute mise à disposition à d’autres foyers.',
    en: '⚠ Template to finalize: fill in the bracketed fields and have this document reviewed before making it available to other households.',
  },
  CONF_S1_T: { fr: '1. Responsable du traitement', en: '1. Data controller' },
  CONF_S1_P: {
    fr: 'Le responsable du traitement des données est Mathis INGRAND-PERIGNE, personne physique éditant le service à titre individuel, joignable à l’adresse contact@nestync.app. Le service « Nestync » (ci-après « le Service ») est une application d’organisation familiale.',
    en: 'The data controller is Mathis INGRAND-PERIGNE, an individual publishing the service in a personal capacity, reachable at contact@nestync.app. The “Nestync” service (hereafter “the Service”) is a household-organization application.',
  },
  CONF_S2_T: { fr: '2. Données collectées', en: '2. Data collected' },
  CONF_S2_LI1: {
    fr: 'Identité de connexion (via Google) : adresse e-mail, nom et photo de profil, pour l’authentification et l’accès restreint au Service.',
    en: 'Login identity (via Google): email address, name and profile picture, for authentication and restricted access to the Service.',
  },
  CONF_S2_LI2: {
    fr: 'Données saisies dans le foyer : budget (comptes, transactions, catégories, échéances), tâches et listes de courses, recettes et planning des repas, événements, cadeaux et occasions.',
    en: 'Data entered in the household: budget (accounts, transactions, categories, due dates), tasks and shopping lists, recipes and meal planning, events, gifts and occasions.',
  },
  CONF_S2_LI3: {
    fr: 'Documents : les fichiers que tu téléverses dans le module Documents sont hébergés par le Service, dans un espace privé propre à ton foyer. Ils ne sont accessibles qu’aux membres de ton foyer, via une adresse authentifiée (aucun lien public).',
    en: 'Documents: the files you upload to the Documents module are hosted by the Service, in a private space belonging to your household. They are only accessible to your household’s members, through an authenticated address (no public link).',
  },
  CONF_S2_LI4: {
    fr: 'Google Agenda (facultatif) : si tu connectes ton agenda, Nestync lit les calendriers que tu as choisi de partager avec ton foyer et peut y créer des événements à ta demande. Détail complet en section 9.',
    en: 'Google Calendar (optional): if you connect your calendar, Nestync reads the calendars you chose to share with your household and can create events there at your request. Full details in section 9.',
  },
  CONF_S3_T: { fr: '3. Finalités et base légale', en: '3. Purposes and legal basis' },
  CONF_S3_P: {
    fr: 'Ces données sont traitées uniquement pour fournir le Service (organiser la vie du foyer). La base légale est l’exécution du contrat qui te lie au Service, et ton consentement pour l’accès facultatif à Google Agenda (révocable à tout moment). La connexion Google sert à t’identifier ; le Service ne demande jamais accès à tes fichiers ni à tes e-mails.',
    en: 'This data is processed solely to provide the Service (organizing household life). The legal basis is the performance of the contract between you and the Service, plus your consent for the optional Google Calendar access (revocable at any time). Signing in with Google identifies you; the Service never requests access to your files or emails.',
  },
  CONF_S4_T: { fr: '4. Hébergement et sous-traitants', en: '4. Hosting and sub-processors' },
  CONF_S4_LI1: { fr: 'Base de données : Neon, région Union européenne.', en: 'Database: Neon, European Union region.' },
  CONF_S4_LI2: { fr: 'Hébergement de l’application et mesure d’audience sans cookie : Vercel Inc.', en: 'Application hosting and cookieless audience measurement: Vercel Inc.' },
  CONF_S4_LI3: { fr: 'Google LLC : authentification (identité) et, si tu l’actives, Google Agenda — voir la section 9.', en: 'Google LLC: authentication (identity) and, if you enable it, Google Calendar — see section 9.' },
  CONF_S4_LI5: { fr: 'Hébergement des fichiers du module Documents : Vercel Blob, en accès privé (aucun lien public).', en: 'File hosting for the Documents module: Vercel Blob, private access (no public link).' },
  CONF_S4_LI4: { fr: 'Stripe Payments Europe : paiement de l’abonnement, dès l’activation de la facturation. Aucune coordonnée bancaire n’est conservée par Nestync.', en: 'Stripe Payments Europe: subscription payment, once billing is enabled. Nestync never stores any card details.' },
  CONF_S5_T: { fr: '5. Durée de conservation', en: '5. Retention period' },
  CONF_S5_A: { fr: 'Tes données sont conservées tant que ton compte est actif. Tu peux les supprimer à tout moment depuis', en: 'Your data is kept as long as your account is active. You can delete it at any time from' },
  CONF_S5_B: { fr: ': la suppression efface définitivement ton foyer et toutes ses données.', en: ': deletion permanently erases your household and all its data.' },
  CONF_S6_T: { fr: '6. Cookies et mesure d’audience', en: '6. Cookies and audience measurement' },
  CONF_S6_P: {
    fr: 'Le Service n’utilise qu’un cookie de session strictement nécessaire à l’authentification, plus deux préférences stockées sur ton appareil (thème, langue). Aucun traceur publicitaire n’est déposé et aucune donnée n’est revendue.',
    en: 'The Service uses only a strictly necessary session cookie for authentication, plus two preferences stored on your device (theme, language). No advertising tracker is set and no data is ever sold.',
  },
  CONF_S6_P2: {
    fr: 'Une mesure d’audience (Vercel Web Analytics) compte les pages vues afin d’améliorer le Service. Elle ne dépose AUCUN cookie, ne crée aucun profil et ne permet pas de te suivre d’un site à l’autre. Les adresses de pages sont en outre anonymisées avant envoi : les paramètres d’URL sont supprimés et les identifiants remplacés, de sorte qu’aucun contenu de ton foyer n’est transmis.',
    en: 'Audience measurement (Vercel Web Analytics) counts page views to improve the Service. It sets NO cookie, builds no profile and cannot track you across sites. Page addresses are also anonymised before being sent: URL parameters are stripped and identifiers replaced, so no household content is ever transmitted.',
  },
  CONF_S7_T: { fr: '7. Tes droits', en: '7. Your rights' },
  CONF_S7_A: {
    fr: 'Conformément au RGPD, tu disposes des droits d’accès, de rectification, d’effacement, de portabilité, de limitation et d’opposition. Deux de ces droits sont directement exerçables dans',
    en: 'Under the GDPR, you have the rights of access, rectification, erasure, portability, restriction and objection. Two of these rights can be exercised directly in',
  },
  CONF_S7_LI1: { fr: 'Portabilité / accès : « Exporter mes données » (fichier JSON complet).', en: 'Portability / access: “Export my data” (full JSON file).' },
  CONF_S7_LI2: { fr: 'Effacement : « Supprimer mon compte » (suppression définitive).', en: 'Erasure: “Delete my account” (permanent deletion).' },
  CONF_S7_P2: {
    fr: 'Pour les autres demandes, écris à contact@nestync.app. Tu peux aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).',
    en: 'For other requests, write to contact@nestync.app. You may also lodge a complaint with your data protection authority (e.g. the CNIL, www.cnil.fr).',
  },
  /* --- Section 9 : données Google. Exigée par Google pour la vérification des
     scopes sensibles (Google API Services User Data Policy / Limited Use). --- */
  CONF_S9_T: { fr: '9. Données Google Agenda', en: '9. Google Calendar data' },
  CONF_S9_INTRO: {
    fr: 'Connecter ton Google Agenda est entièrement facultatif : Nestync fonctionne sans. Si tu l’actives, voici précisément ce que nous demandons et pourquoi.',
    en: 'Connecting your Google Calendar is entirely optional: Nestync works without it. If you enable it, here is exactly what we request and why.',
  },
  CONF_S9_SCOPE1: {
    fr: 'Lister tes agendas (calendar.calendarlist.readonly) : afficher le NOM de tes calendriers, uniquement pour que tu choisisses ceux à partager avec ton foyer. Ce niveau d’accès ne donne aucun accès au contenu de tes événements.',
    en: 'List your calendars (calendar.calendarlist.readonly): display the NAMES of your calendars, solely so you can choose which ones to share with your household. This scope gives no access to the content of your events.',
  },
  CONF_S9_SCOPE2: {
    fr: 'Gérer les événements des calendriers que tu as choisis (calendar.events) : afficher leurs événements à venir dans l’agenda du foyer, créer un événement depuis Nestync, et supprimer un événement affiché dans Nestync.',
    en: 'Manage events on the calendars you selected (calendar.events): display their upcoming events in the household calendar, create an event from Nestync, and delete an event shown in Nestync.',
  },
  CONF_S9_MINIMAL: {
    fr: 'Nous demandons volontairement le périmètre le plus étroit possible : Nestync ne demande PAS l’accès en lecture à l’ensemble de tes agendas, seulement la liste de leurs noms et les événements des calendriers que tu as toi-même sélectionnés.',
    en: 'We deliberately request the narrowest possible scope: Nestync does NOT request read access to all your calendars — only the list of their names, and the events of the calendars you selected yourself.',
  },
  CONF_S9_USAGE: {
    fr: 'Ces données servent EXCLUSIVEMENT à faire fonctionner l’agenda partagé de ton foyer, à ta demande. Elles ne sont jamais utilisées à des fins publicitaires, jamais vendues ni transmises à des tiers, jamais exploitées pour entraîner des modèles d’intelligence artificielle, et aucun humain ne les consulte — sauf accord explicite de ta part pour résoudre un problème technique, ou obligation légale.',
    en: 'This data is used EXCLUSIVELY to power your household’s shared calendar, at your request. It is never used for advertising, never sold or shared with third parties, never used to train artificial-intelligence models, and no human reads it — except with your explicit permission to resolve a technical issue, or where legally required.',
  },
  CONF_S9_LIMITED: {
    fr: 'L’usage que Nestync fait des informations reçues des API Google respecte la Google API Services User Data Policy, y compris ses exigences d’usage limité (Limited Use).',
    en: 'Nestync’s use of information received from Google APIs adheres to the Google API Services User Data Policy, including the Limited Use requirements.',
  },
  CONF_S9_STOCKAGE: {
    fr: 'Conservation : nous ne copions PAS le contenu de tes agendas. Les événements sont lus à la volée à chaque affichage et ne sont pas enregistrés dans notre base. Seuls sont conservés : les identifiants des calendriers que tu as choisi de partager, et les jetons d’accès Google — ces derniers étant chiffrés (AES-256-GCM) dans notre base, hébergée dans l’Union européenne.',
    en: 'Retention: we do NOT copy your calendar contents. Events are read on the fly each time they are displayed and are not stored in our database. We only keep: the identifiers of the calendars you chose to share, and the Google access tokens — the latter encrypted (AES-256-GCM) in our database, hosted in the European Union.',
  },
  CONF_S9_REVOQUER: {
    fr: 'Retirer l’accès à tout moment, de deux façons : depuis la page Agenda de Nestync (« Déconnecter mon Google Agenda »), ce qui efface immédiatement les jetons conservés ; ou depuis ton compte Google, sur la page des applications tierces autorisées (myaccount.google.com/permissions). Supprimer ton compte Nestync efface également ces jetons.',
    en: 'Revoke access at any time, in two ways: from Nestync’s Calendar page (“Disconnect my Google Calendar”), which immediately erases the stored tokens; or from your Google account, on the third-party apps page (myaccount.google.com/permissions). Deleting your Nestync account also erases these tokens.',
  },

  CONF_S8_T: { fr: '8. Sécurité', en: '8. Security' },
  CONF_S8_P: {
    fr: 'L’accès au Service est protégé par authentification Google et restreint aux comptes autorisés. Les échanges sont chiffrés (HTTPS) et la base est hébergée dans l’Union européenne.',
    en: 'Access to the Service is protected by Google authentication and restricted to authorized accounts. Exchanges are encrypted (HTTPS) and the database is hosted in the European Union.',
  },

  // Erreur générique de chargement d'une page module
  G_ERR_PAGE: { fr: 'Impossible de charger cette page :', en: 'Could not load this page:' },

  // Connexion
  CNX_ACCES: { fr: 'Connecte-toi avec ton compte Google. Pas de mot de passe à retenir.', en: 'Sign in with your Google account. No password to remember.' },
  CNX_BOUTON: { fr: 'Se connecter avec Google', en: 'Sign in with Google' },
  CNX_DECOUVRIR: { fr: '← Découvrir Nestync et les tarifs', en: '← Discover Nestync and pricing' },

  // Hors ligne
  HL_TITRE: { fr: 'Hors ligne', en: 'Offline' },
  HL_TXT: { fr: 'Pas de connexion pour le moment. Nestync se rechargera dès que le réseau reviendra. Les pages déjà consultées restent accessibles.', en: 'No connection right now. Nestync will reload as soon as the network is back. Pages you already opened stay available.' },
  HL_REESSAYER: { fr: 'Réessayer', en: 'Retry' },

  // Astuce installation iOS
  IOS_ARIA: { fr: "Installer l'application", en: 'Install the app' },
  IOS_AVANT: { fr: 'Installe Nestync : appuie sur', en: 'Install Nestync: tap' },
  IOS_PARTAGER: { fr: 'Partager', en: 'Share' },
  IOS_PUIS: { fr: ', puis', en: ', then' },
  IOS_ECRAN: { fr: '« Sur l’écran d’accueil »', en: '“Add to Home Screen”' },

  // Rejoindre un foyer
  RJ_TITRE: { fr: 'Rejoindre un foyer', en: 'Join a household' },
  RJ_INTROUVABLE: { fr: 'Invitation introuvable ou déjà utilisée.', en: 'Invitation not found or already used.' },
  RJ_EXPIREE: { fr: 'Cette invitation a expiré. Demande-en une nouvelle.', en: 'This invitation has expired. Ask for a new one.' },
  RJ_MAUVAIS_A: { fr: 'Tu es connecté·e avec', en: 'You are signed in as' },
  RJ_MAUVAIS_B: { fr: ', mais cette invitation est destinée à', en: ', but this invitation is for' },
  RJ_RECONNECTE: { fr: 'Reconnecte-toi avec le bon compte Google pour accepter.', en: 'Sign in with the correct Google account to accept.' },
  RJ_INVITE_A: { fr: 'Tu es invité·e à rejoindre le foyer', en: 'You’re invited to join the household' },
  RJ_INVITE_B: { fr: 'et à en partager toutes les données.', en: 'and share all its data.' },
  RJ_REJOINDRE: { fr: 'Rejoindre ce foyer', en: 'Join this household' },

  // Agenda — configuration des calendriers du foyer
  AGC_TITRE: { fr: 'Agendas du foyer', en: 'Household calendars' },
  AGC_GERER: { fr: '⚙ Gérer les agendas du foyer', en: '⚙ Manage household calendars' },
  AGC_FERMER: { fr: 'Fermer', en: 'Close' },
  AGC_INTRO: {
    fr: 'Connecte ton Google Agenda pour afficher tes calendriers ici. Nestync ne demande que l’accès à tes agendas — jamais à tes e-mails ni à tes fichiers, et tu peux retirer cet accès à tout moment.',
    en: 'Connect your Google Calendar to show your calendars here. Nestync only requests access to your calendars — never to your emails or files, and you can revoke this access at any time.',
  },
  AGC_CONNECTER: { fr: 'Connecter mon Google Agenda', en: 'Connect my Google Calendar' },
  AGC_AUCUN_CAL: { fr: 'Aucun calendrier trouvé sur ton compte Google.', en: 'No calendar found on your Google account.' },
  AGC_CHOISIR: {
    fr: 'Choisis les calendriers à partager avec ton foyer. Les autres membres verront leurs événements.',
    en: 'Choose which calendars to share with your household. Other members will see their events.',
  },
  AGC_PRINCIPAL: { fr: 'principal', en: 'primary' },
  AGC_LECTURE: { fr: 'lecture seule', en: 'read-only' },
  AGC_AJOUTER: { fr: 'Ajouter', en: 'Add' },
  AGC_RETIRER: { fr: 'Retirer', en: 'Remove' },
  AGC_PAR_AUTRES: { fr: 'Ajoutés par d’autres membres', en: 'Added by other members' },
  AGC_DECONNECTER: { fr: 'Déconnecter mon Google Agenda', en: 'Disconnect my Google Calendar' },
  AGC_SANS_ECRITURE: {
    fr: '⚠ Tu n’as accordé que la lecture : les événements s’affichent, mais tu ne peux pas en créer ni en supprimer depuis Nestync. Reconnecte ton agenda en acceptant toutes les autorisations pour débloquer cette fonction.',
    en: '⚠ You only granted read access: events are displayed, but you cannot create or delete them from Nestync. Reconnect your calendar and accept all permissions to enable this.',
  },
  // Retours après l'autorisation Google
  AGC_RET_OK: { fr: 'Google Agenda connecté. Choisis les calendriers à partager.', en: 'Google Calendar connected. Choose the calendars to share.' },
  AGC_RET_REFUS: { fr: 'Autorisation annulée : aucun agenda n’a été connecté.', en: 'Authorisation cancelled: no calendar was connected.' },
  AGC_RET_ETAT: { fr: 'Lien d’autorisation invalide ou expiré. Réessaie.', en: 'Invalid or expired authorisation link. Please try again.' },
  AGC_RET_ECHEC: { fr: 'La connexion à Google Agenda a échoué. Réessaie.', en: 'Connecting to Google Calendar failed. Please try again.' },

  // Agenda — messages d'erreur / config
  AGD_INACCESSIBLE: { fr: 'Agenda inaccessible.', en: 'Calendar unavailable.' },
  AGD_ERR_API: { fr: '➡ Active l’API Google Calendar dans le projet GCP', en: '➡ Enable the Google Calendar API in the GCP project' },
  AGD_ERR_PARTAGE_A: { fr: '➡ Partage l’agenda avec', en: '➡ Share the calendar with' },
  AGD_ERR_PARTAGE_B: { fr: '(droit « modifier les événements »).', en: '(“make changes to events” permission).' },

  // Noms des gammes de couleur (infobulles des pastilles)
  THEME_CORAIL: { fr: 'Corail', en: 'Coral' },
  THEME_AMETHYSTE: { fr: 'Améthyste', en: 'Amethyst' },
  THEME_LAGON: { fr: 'Lagon', en: 'Lagoon' },
  THEME_MENTHE: { fr: 'Menthe', en: 'Mint' },
  THEME_AMBRE: { fr: 'Ambre', en: 'Amber' },
  THEME_INDIGO: { fr: 'Indigo', en: 'Indigo' },
} as const satisfies Record<string, Trad>;

export const CLE_FAMILLE: Record<string, CleUI> = {
  corail: 'THEME_CORAIL', amethyste: 'THEME_AMETHYSTE', lagon: 'THEME_LAGON',
  menthe: 'THEME_MENTHE', ambre: 'THEME_AMBRE', indigo: 'THEME_INDIGO',
};

/* Correspondances valeur (français, stockée) → clé UI, pour les énumérations. */
export const CLE_STATUT_TODO: Record<string, CleUI> = {
  'À faire': 'ST_AFAIRE', 'En cours': 'ST_ENCOURS', 'Fait': 'ST_FAIT',
};
export const CLE_PRIORITE: Record<string, CleUI> = {
  Haute: 'PR_HAUTE', Moyenne: 'PR_MOY', Basse: 'PR_BASSE',
};
export const CLE_CATEGORIE_PLAT: Record<string, CleUI> = {
  'Entrée': 'CAT_ENTREE', Plat: 'CAT_PLAT', Dessert: 'CAT_DESSERT',
};
export const CLE_TYPE_RECETTE: Record<string, CleUI> = {
  Viande: 'RTYPE_VIANDE', Poisson: 'RTYPE_POISSON', 'Végétarien': 'RTYPE_VEGE',
};
export const CLE_CHAUD_FROID: Record<string, CleUI> = {
  Chaud: 'CF_CHAUD', Froid: 'CF_FROID',
};
export const CLE_STATUT_EVT: Record<string, CleUI> = {
  'À planifier': 'EVS_APLANIFIER', 'En préparation': 'EVS_ENPREP', 'Prêt': 'EVS_PRET', 'Passé': 'EVS_PASSE',
};
export const CLE_STATUT_CADEAU: Record<string, CleUI> = {
  'Idée': 'CDS_IDEE', 'À acheter': 'CDS_AACHETER', 'Commandé': 'CDS_COMMANDE',
  'Reçu': 'CDS_RECU', 'Emballé': 'CDS_EMBALLE', 'Offert': 'CDS_OFFERT',
};
export const CLE_JOUR: Record<string, CleUI> = {
  Lundi: 'JOUR_LUNDI', Mardi: 'JOUR_MARDI', Mercredi: 'JOUR_MERCREDI', Jeudi: 'JOUR_JEUDI',
  Vendredi: 'JOUR_VENDREDI', Samedi: 'JOUR_SAMEDI', Dimanche: 'JOUR_DIMANCHE',
};

/** Traduit une valeur d'énumération via sa table ; repli sur la valeur brute. */
export function tEnum(table: Record<string, CleUI>, valeur: string, langue: IdLangue): string {
  const cle = table[valeur];
  return cle ? t(cle, langue) : valeur;
}

export type CleUI = keyof typeof UI;

/** Libellé d'interface dans la langue voulue, repli sur le français. */
export function t(cle: CleUI, langue: IdLangue = LANGUE_DEFAUT): string {
  const e = UI[cle] as Trad;
  return e[langue] ?? e.fr;
}
