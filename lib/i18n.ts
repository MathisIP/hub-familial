/**
 * CADRE MULTILINGUE.
 * ==================
 * Deux volets distincts :
 *  1. ONGLETS Sheets (legacy) — noms d'onglets par module, en français. Utilisés
 *     par le client Sheets (`lib/google/sheets.ts`). On garde `nomOnglet()` /
 *     `plage()` inchangés (la règle « jamais de nom d'onglet en dur » tient).
 *  2. UI multilingue — dictionnaire plat `clé → { fr, en?, es?… }`. `t(clé, langue)`
 *     résout la langue avec repli sur le français. FR = référence complète ; EN en
 *     cours ; ES/DE/IT à venir (repli FR tant qu'ils ne sont pas remplis).
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

/* ----------------------- ONGLETS Sheets (legacy, FR) ----------------------- */

const ONGLETS = {
  BUDGET: {
    VUE_ENSEMBLE: "🌸 Vue d'ensemble",
    TABLEAU_BORD: 'Tableau de bord',
    VUE_ANNUELLE: 'Vue annuelle',
    EPARGNE: 'Épargne',
    TRANSACTIONS: 'Transactions',
    IMPORT_CSV: 'Import CSV',
    PARAMETRES: 'Paramètres',
    ECHEANCES: 'Échéances',
    LISEZMOI: 'Lisez-moi',
    REPONSES_FORM: 'Réponses au formulaire 1',
  },
  TODO: {
    REPONSES_FORM: 'Réponses au formulaire 1',
    LISEZMOI: 'Lisez-moi',
    APERCU: 'Aperçu',
    TACHES: 'Tâches',
    COURSES: 'Courses',
    PARAMETRES: 'Paramètres',
    LOU: 'Lou',
    MATI: 'Mati',
    NOUS_DEUX: 'Nous deux',
  },
  REPAS: {
    LISEZMOI: 'Lisez-moi',
    SEMAINE: 'Semaine',
    RECETTES: 'Recettes',
    RECHERCHE: 'Recherche',
  },
  EVENEMENTS: {
    LISEZMOI: 'Lisez-moi',
    APERCU: 'Aperçu',
    EVENEMENTS: 'Événements',
    INVITES: 'Invités',
    CHECKLIST: 'Checklist',
    MENU_COURSES: 'Menu & Courses',
    PARAMETRES: 'Paramètres',
  },
  CADEAUX: {
    LISEZMOI: 'Lisez-moi',
    APERCU: 'Aperçu',
    CADEAUX: 'Cadeaux',
    OCCASIONS: 'Occasions',
    PARAMETRES: 'Paramètres',
  },
} as const;

export type Module = keyof typeof ONGLETS;
export type ClesOnglet<M extends Module> = keyof (typeof ONGLETS)[M];

/** Nom réel de l'onglet Sheets (français ; les Sheets sont legacy). */
export function nomOnglet<M extends Module>(
  mod: M,
  cle: ClesOnglet<M>,
  _langue: IdLangue = LANGUE_DEFAUT,
): string {
  const onglets = ONGLETS[mod] as Record<string, string>;
  return onglets[cle as string];
}

/**
 * Construit une plage A1 en échappant le nom d'onglet (emojis, accents,
 * apostrophes, esperluettes) — sinon l'API Sheets renvoie une erreur de parsing.
 */
export function plage(nomDeLOnglet: string, a1?: string): string {
  const echappe = `'${nomDeLOnglet.replace(/'/g, "''")}'`;
  return a1 ? `${echappe}!${a1}` : echappe;
}

/* ----------------------------- UI multilingue ----------------------------- */

type Trad = { fr: string } & Partial<Record<IdLangue, string>>;

const UI = {
  APP_TITRE: { fr: '🏡 Hub familial', en: '🏡 Family Hub' },

  // Modules (libellés courts, nav + titres)
  MOD_BUDGET: { fr: 'Budget', en: 'Budget' },
  MOD_TODO: { fr: 'To-Do', en: 'To-Do' },
  MOD_REPAS: { fr: 'Repas', en: 'Meals' },
  MOD_EVENEMENTS: { fr: 'Événements', en: 'Events' },
  MOD_CADEAUX: { fr: 'Cadeaux', en: 'Gifts' },
  MOD_AGENDA: { fr: 'Agenda', en: 'Calendar' },

  // Sous-titres des pages de module
  SUB_BUDGET: { fr: 'Comptes, dépenses et objectifs du foyer', en: 'Household accounts, spending and goals' },
  SUB_TODO: { fr: 'Tâches du foyer et liste de courses partagée', en: 'Household tasks and shared shopping list' },
  SUB_REPAS: { fr: 'Planning des dîners, recettes et quantités par personne', en: 'Dinner planning, recipes and quantities per person' },
  SUB_EVENEMENTS: { fr: 'Réceptions, invités, checklist et menu', en: 'Gatherings, guests, checklist and menu' },
  SUB_CADEAUX: { fr: 'Idées, budget et suivi des cadeaux par occasion', en: 'Ideas, budget and gift tracking by occasion' },
  SUB_AGENDA: { fr: 'Agenda familial partagé', en: 'Shared family calendar' },

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

  // Divers (page connexion, bandeau d'état, sélecteurs — legacy/secondaire)
  APP_SOUS_TITRE: { fr: "L'organisation du foyer, en un seul endroit", en: 'Your household, all in one place' },
  THEME: { fr: '🎨 Thème', en: '🎨 Theme' },
  LANGUE: { fr: '🌍 Langue', en: '🌍 Language' },
  ETAT_CONNEXION: { fr: 'État de la connexion', en: 'Connection status' },
  ETAT_OK: { fr: 'Connecté', en: 'Connected' },
  ETAT_ECHEC: { fr: 'Inaccessible', en: 'Unavailable' },
  ETAT_VERIF: { fr: 'Vérification…', en: 'Checking…' },
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
  DR_TITRE: { fr: '🗂️ Drive familial', en: '🗂️ Family Drive' },
  DR_CHARGEMENT: { fr: 'Chargement du Drive…', en: 'Loading Drive…' },
  DR_VIDE: { fr: 'Ce dossier est vide.', en: 'This folder is empty.' },
  DR_OUVRIR_DOSSIER: { fr: 'Ouvrir le dossier', en: 'Open folder' },
  DR_OUVRIR_DRIVE: { fr: 'Ouvrir dans Google Drive', en: 'Open in Google Drive' },
  DR_AUTORISER: { fr: 'Autoriser Google Drive →', en: 'Authorize Google Drive →' },
  IMPORT_BTN: { fr: 'Importer', en: 'Import' },
  IMPORT_EN_COURS: { fr: 'Import en cours…', en: 'Importing…' },

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
