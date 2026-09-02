import { ES } from '@/lib/i18n/es';
import { DE } from '@/lib/i18n/de';
import { IT } from '@/lib/i18n/it';

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
  SUB_DOCUMENTS: { fr: 'Les papiers du foyer, rangés et totalement privés', en: 'Household paperwork, sorted and fully private' },

  // Navigation
  NAV_ACCUEIL: { fr: 'Accueil', en: 'Home' },
  NAV_ALLER_A: { fr: 'Aller à…', en: 'Go to…' },
  NAV_APPARENCE: { fr: 'Apparence', en: 'Appearance' },
  NAV_REGLAGES: { fr: 'Réglages', en: 'Settings' },
  NAV_MON_FOYER: { fr: 'Mon foyer', en: 'My household' },
  NAV_ABONNEMENT: { fr: 'Abonnement', en: 'Subscription' },
  NAV_MON_COMPTE: { fr: 'Mon compte', en: 'My account' },
  NAV_CONFIDENTIALITE: { fr: 'Confidentialité', en: 'Privacy' },
  NAV_AIDE: { fr: 'Aide et contact', en: 'Help and contact' },
  NAV_MENTIONS: { fr: 'Mentions légales', en: 'Legal notice' },
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
  REG_MAJ_TITRE: { fr: 'Mises à jour', en: 'Updates' },
  REG_MAJ_DESC: { fr: 'Ce qui a changé dans Nestync, version après version.', en: 'What has changed in Nestync, version after version.' },
  REG_MAJ_BTN: { fr: 'Voir les nouveautés', en: 'See what’s new' },

  // Statuts d'abonnement (affichés dans Réglages)
  ABO_LIBRE: { fr: 'Accès libre', en: 'Free access' },
  ABO_ACTIF: { fr: 'Abonnement actif ✓', en: 'Active subscription ✓' },
  ABO_ESSAI: { fr: 'Période d’essai', en: 'Trial period' },
  ABO_OFFERT: { fr: 'Accès offert', en: 'Complimentary access' },
  ABO_IMPAYE: { fr: 'Paiement en attente', en: 'Payment pending' },
  ABO_ANNULE: { fr: 'Abonnement annulé', en: 'Subscription cancelled' },

  // Divers (page connexion, sélecteurs — secondaire)
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
  CS_PRODUIT_PH: { fr: 'Produit (ex. gel douche)…', en: 'Item (e.g. shower gel)…' },
  CS_QTE: { fr: 'Qté', en: 'Qty' },
  CS_VIDE: { fr: 'Ta liste de courses est vide.', en: 'Your shopping list is empty.' },
  CS_AJOUTE_SUFFIXE: { fr: 'ajouté à ta liste de courses.', en: 'added to your shopping list.' },
  /* --- Budget : initialisation des comptes --- */
  INIT_TITRE: { fr: 'Commençons par tes comptes 💶', en: 'Let’s start with your accounts 💶' },
  INIT_SOUS_A: { fr: 'Indique le', en: 'Enter the' },
  INIT_SOUS_B: { fr: 'solde actuel', en: 'current balance' },
  INIT_SOUS_C: {
    fr: 'de chacun de tes comptes. Nestync partira de ces montants : chaque opération que tu saisiras viendra ensuite s’ajouter ou se soustraire automatiquement.',
    en: 'of each of your accounts. Nestync starts from these amounts: every transaction you enter is then added or subtracted automatically.',
  },
  INIT_NOM: { fr: 'Nom du compte', en: 'Account name' },
  INIT_SOLDE: { fr: 'Solde actuel (€)', en: 'Current balance (€)' },
  INIT_AJOUTER_LIGNE: { fr: '＋ Ajouter un compte', en: '＋ Add an account' },
  INIT_RETIRER_LIGNE: { fr: 'Retirer cette ligne', en: 'Remove this row' },
  INIT_VALIDER: { fr: 'Créer mes comptes', en: 'Create my accounts' },
  INIT_VALIDER_AJOUT: { fr: 'Ajouter', en: 'Add' },
  INIT_ENREGISTREMENT: { fr: 'Enregistrement…', en: 'Saving…' },
  INIT_NOTE: {
    fr: '💡 Tu pourras ajouter, renommer ou retirer des comptes plus tard. Rien n’est figé — et aucune information bancaire ne t’est demandée, seulement un montant.',
    en: '💡 You can add, rename or remove accounts later. Nothing is set in stone — and no banking details are requested, only an amount.',
  },
  /* --- Budget : gestion des comptes --- */
  GC_TITRE: { fr: 'Mes comptes', en: 'My accounts' },
  GC_MODIFIER: { fr: 'Modifier', en: 'Edit' },
  GC_SUPPRIMER: { fr: 'Supprimer', en: 'Delete' },
  GC_ENREGISTRER: { fr: 'Enregistrer', en: 'Save' },
  GC_ANNULER: { fr: 'Annuler', en: 'Cancel' },
  GC_AJOUTER: { fr: '＋ Ajouter un compte', en: '＋ Add an account' },
  GC_FERMER_AJOUT: { fr: 'Annuler l’ajout', en: 'Cancel adding' },
  GC_OPERATIONS: { fr: 'opérations', en: 'transactions' },
  GC_OPERATION: { fr: 'opération', en: 'transaction' },
  GC_AUCUNE_OP: { fr: 'aucune opération', en: 'no transactions' },
  GC_SUPPR_TITRE: { fr: 'Supprimer ce compte ?', en: 'Delete this account?' },
  GC_SUPPR_VIDE: {
    fr: 'Ce compte n’a aucune opération : le supprimer n’efface aucun historique.',
    en: 'This account has no transactions: deleting it erases no history.',
  },
  GC_SUPPR_OPS_A: { fr: 'Supprimer ce compte effacera aussi ses', en: 'Deleting this account will also erase its' },
  GC_SUPPR_OPS_B: {
    fr: '. C’est définitif : sans elles, le tableau de bord ne compterait plus juste.',
    en: '. This is permanent: without them the dashboard would no longer add up.',
  },
  GC_SUPPR_VIREMENTS: {
    fr: 'Les virements liés à un autre compte seront reportés sur celui-ci (en revenu ou en dépense) : le solde de tes autres comptes ne bougera pas.',
    en: 'Transfers involving another account are carried over to it (as income or an expense): the balance of your other accounts will not change.',
  },
  GC_SUPPR_CASE: { fr: 'J’ai compris, supprimer quand même', en: 'I understand, delete anyway' },
  GC_VIDE: {
    fr: 'Aucun compte pour l’instant.',
    en: 'No accounts yet.',
  },
  GC_RESTREINT: { fr: 'Visibilité restreinte', en: 'Restricted visibility' },

  /* --- Budget : qui voit quels comptes --- */
  PART_TITRE: { fr: 'Qui voit quels comptes', en: 'Who sees which accounts' },
  PART_SOUS: {
    fr: 'Par défaut, chaque compte est visible de tout le foyer. Restreins-en un pour qu’il n’apparaisse qu’aux personnes que tu choisis — dans leurs soldes, leurs opérations et leurs totaux.',
    en: 'By default every account is visible to the whole household. Restrict one so it only appears to the people you pick — in their balances, transactions and totals.',
  },
  PART_TOUS: { fr: 'Tout le foyer', en: 'Whole household' },
  PART_RESTREINT: { fr: 'Personnes choisies', en: 'Selected people' },
  PART_ENREGISTRER: { fr: 'Enregistrer', en: 'Save' },
  PART_MODIFIER: { fr: 'Modifier', en: 'Change' },
  PART_ANNULER: { fr: 'Annuler', en: 'Cancel' },
  PART_VISIBLE_TOUS: { fr: 'Visible de tout le foyer', en: 'Visible to the whole household' },
  PART_VISIBLE_N: { fr: 'Visible de', en: 'Visible to' },
  PART_PERSONNES: { fr: 'personnes', en: 'people' },
  PART_PERSONNE_1: { fr: 'personne', en: 'person' },
  PART_AUCUN: {
    fr: 'Aucun compte à régler pour l’instant.',
    en: 'No accounts to configure yet.',
  },
  PART_AIDE: {
    fr: 'Cet écran ne montre aucun montant : régler le partage d’un compte ne donne pas le droit de le lire. Pour le consulter, il faut y figurer comme les autres.',
    en: 'This screen shows no amounts: setting an account’s sharing does not grant the right to read it. To see it, you must be listed like everyone else.',
  },
  PART_VUE_PARTIELLE: {
    fr: 'Certains comptes du foyer ne te sont pas partagés : ces chiffres ne portent que sur les tiens.',
    en: 'Some household accounts are not shared with you: these figures cover only yours.',
  },
  /*
   * ⚠ Distincte du bandeau ci-dessus, et volontairement : celui-ci prévient sur
   * les KPIs en haut de page, celle-ci explique une ABSENCE au contact des
   * jauges. Sans elle, on lit une liste de montants sans barre et on conclut
   * que les barres ont disparu.
   */
  PART_SANS_COMPARAISON: {
    fr: 'Pas de comparaison au budget ici : il porte sur tout le foyer, alors que ces montants ne portent que sur les comptes qui te sont partagés.',
    en: 'No budget comparison here: the budget covers the whole household, while these amounts cover only the accounts shared with you.',
  },

  /* --- Documents : qui voit quels dossiers --- */
  DOSS_PART_TITRE: { fr: 'Qui voit quels dossiers', en: 'Who sees which folders' },
  DOSS_PART_SOUS: {
    fr: 'Par défaut, chaque dossier est visible de tout le foyer. Restreins-en un pour que ses fichiers n’apparaissent qu’aux personnes que tu choisis.',
    en: 'By default every folder is visible to the whole household. Restrict one so its files only appear to the people you pick.',
  },
  DOSS_PART_AUCUN: {
    fr: 'Aucun dossier à régler pour l’instant. Crée un dossier depuis la liste des documents.',
    en: 'No folders to configure yet. Create one from the documents list.',
  },
  DOSS_PART_AIDE: {
    fr: 'Un dossier restreint disparaît complètement pour les autres : ses fichiers ne sortent ni dans la liste, ni dans la recherche de l’accueil, ni au téléchargement direct, ni dans l’export de leurs données. La boîte d’arrivée, elle, reste toujours commune.',
    en: 'A restricted folder disappears entirely for others: its files show up in no list, no home search, no direct download, and no data export of theirs. The inbox always stays shared.',
  },
  DOC_DOSSIER_PRIVE: { fr: 'dossier restreint', en: 'restricted folder' },

  /* --- Agenda : qui voit quel calendrier --- */
  AGC_QUI_VOIT: { fr: 'Qui voit mes agendas', en: 'Who sees my calendars' },
  AGC_AUTRE_PROPRIO: {
    fr: 'réglé par la personne qui l’a ajouté',
    en: 'managed by the person who added it',
  },

  /* --- Budget : échéances --- */
  ECH_TITRE: { fr: 'Mes échéances', en: 'My upcoming payments' },
  ECH_VIDE: {
    fr: 'Aucune échéance pour l’instant. Ajoute un loyer, une assurance, une cantine…',
    en: 'No upcoming payments yet. Add rent, insurance, school meals…',
  },
  ECH_AJOUTER: { fr: '＋ Ajouter une échéance', en: '＋ Add an upcoming payment' },
  ECH_LIBELLE: { fr: 'Intitulé', en: 'Label' },
  ECH_LIBELLE_PH: { fr: 'Loyer, assurance…', en: 'Rent, insurance…' },
  ECH_DATE: { fr: 'Date', en: 'Date' },
  ECH_SANS_DATE: { fr: 'sans date', en: 'no date' },
  ECH_MONTANT: { fr: 'Montant', en: 'Amount' },
  ECH_MONTANT_PH: { fr: 'ex. 45,90 (facultatif)', en: 'e.g. 45.90 (optional)' },
  ECH_RECURRENCE: { fr: 'Récurrence', en: 'Repeats' },
  ECH_COMPTE: { fr: 'Compte', en: 'Account' },
  ECH_COMPTE_CHOISIR: { fr: 'Choisir un compte…', en: 'Pick an account…' },
  ECH_COMPTE_AUCUN: { fr: 'Compte non précisé', en: 'No account specified' },
  AIDE_ECHEANCE_COMPTE: {
    fr: 'Le compte est obligatoire : une échéance est un prélèvement à venir, il doit être clair d’où l’argent sortira. Il porte aussi la visibilité — si le compte est restreint, l’échéance ne sera visible que des mêmes personnes.',
    en: 'The account is required: an upcoming payment has to say where the money leaves from. It also carries visibility — if the account is restricted, so is the payment.',
  },

  /* --- Notifications --- */
  NOTIF_TITRE: { fr: 'Notifications', en: 'Notifications' },
  NOTIF_SOUS: {
    fr: 'Nestync peut prévenir ton téléphone. Les notifications restent volontairement vagues — elles s’affichent sur l’écran verrouillé, visible par qui tient l’appareil. Le détail n’apparaît qu’une fois l’app ouverte.',
    en: 'Nestync can notify your phone. Notifications stay deliberately vague — they show on the lock screen, visible to whoever holds the device. Details only appear once the app is open.',
  },
  NOTIF_ACTIVER: { fr: 'Activer sur cet appareil', en: 'Enable on this device' },
  NOTIF_DESACTIVER: { fr: 'Ne plus recevoir sur cet appareil', en: 'Stop receiving on this device' },
  NOTIF_ACTIVEE: { fr: 'Notifications activées sur cet appareil.', en: 'Notifications enabled on this device.' },
  NOTIF_DESACTIVEE: { fr: 'Cet appareil ne recevra plus de notifications.', en: 'This device will no longer receive notifications.' },
  NOTIF_REFUSEE: {
    fr: 'Autorisation refusée. Tu peux la rétablir dans les réglages de ton navigateur.',
    en: 'Permission denied. You can restore it in your browser settings.',
  },
  NOTIF_INDISPO: {
    fr: 'Les notifications ne sont pas encore configurées sur ce service.',
    en: 'Notifications are not configured on this service yet.',
  },
  NOTIF_INSTALLER: {
    fr: 'Sur iPhone, les notifications ne fonctionnent que si Nestync est installé sur l’écran d’accueil : bouton Partager → « Sur l’écran d’accueil ». Rouvre ensuite l’app depuis l’icône.',
    en: 'On iPhone, notifications only work once Nestync is added to the home screen: Share → “Add to Home Screen”. Then reopen the app from its icon.',
  },
  NOTIF_COURSES: { fr: 'Liste de courses prête', en: 'Shopping list ready' },
  NOTIF_COURSES_D: {
    fr: 'Quand quelqu’un du foyer valide la liste et te l’envoie.',
    en: 'When someone in the household finalises the list and sends it to you.',
  },
  NOTIF_EVENEMENTS: { fr: 'Anniversaires et événements', en: 'Birthdays and events' },
  NOTIF_EVENEMENTS_D: {
    fr: 'Un rappel la veille. Uniquement pour ce que tu peux déjà voir dans l’app.',
    en: 'A reminder the day before. Only for what you can already see in the app.',
  },
  NOTIF_ECHEANCES: { fr: 'Échéances financières', en: 'Upcoming payments' },
  NOTIF_ECHEANCES_D: {
    fr: 'Désactivé par défaut : un rappel de prélèvement s’affiche sur l’écran verrouillé. Ne concerne que les comptes qui te sont partagés.',
    en: 'Off by default: a payment reminder shows on your lock screen. Only covers accounts shared with you.',
  },

  /* --- Courses : valider et envoyer --- */
  CS_VALIDER: { fr: '✓ Valider la liste', en: '✓ Finalise the list' },
  CS_VALIDER_TITRE: { fr: 'Prévenir qui ?', en: 'Notify whom?' },
  CS_VALIDER_SOUS: {
    fr: 'Les personnes choisies recevront une notification. La liste reste dans l’app — elle n’est pas envoyée dans le message.',
    en: 'The chosen people get a notification. The list stays in the app — it is not sent in the message.',
  },
  CS_VALIDER_ENVOYER: { fr: 'Prévenir', en: 'Notify' },
  CS_VALIDER_OK: { fr: 'Liste envoyée.', en: 'List sent.' },
  CS_VALIDER_AUCUN_ABO: {
    fr: 'Personne n’a encore activé les notifications. Chacun peut le faire depuis Réglages.',
    en: 'Nobody has enabled notifications yet. Anyone can do so from Settings.',
  },
  CS_VOIR_LISTE: { fr: 'Voir la liste', en: 'Open the list' },

  /* --- Cadeaux : garder la surprise --- */
  CAD_MASQUER: { fr: 'Ne pas montrer à', en: 'Hide from' },
  CAD_MASQUER_PERSONNE: { fr: 'Personne — visible de tout le foyer', en: 'No one — visible to the whole household' },
  CAD_CACHE_A: { fr: 'caché à', en: 'hidden from' },
  AIDE_MASQUER: {
    fr: 'La personne choisie ne verra pas ce cadeau : ni dans la liste, ni dans le budget de l’occasion. Tous les autres membres du foyer le voient normalement, y compris ceux qui rejoindront le foyer plus tard.',
    en: 'The chosen person won’t see this gift: not in the list, not in the occasion’s budget. Everyone else in the household sees it normally, including people who join later.',
  },

  AIDE_NOM_COMPTE: {
    fr: 'Le nom que TU utilises au quotidien : « Compte commun », « Livret A », « Compte de Lou »… Il apparaîtra tel quel dans l’app.',
    en: 'The name YOU use day to day: “Joint account”, “Savings”, “Lou’s account”… It appears exactly as typed in the app.',
  },
  AIDE_SOLDE_ACTUEL: {
    fr: 'Le montant qu’il y a sur ce compte aujourd’hui. Regarde ton appli bancaire et recopie. Un découvert se saisit avec un signe moins (ex. -120,50).',
    en: 'The amount on that account today. Check your banking app and copy it. Enter an overdraft with a minus sign (e.g. -120.50).',
  },

  /* --- Info-bulles d'aide (<Astuce>) : expliquer sans encombrer l'écran --- */
  AIDE_QUANTITE: {
    fr: 'Écris la quantité comme tu la dirais : « 400 g », « 2 », « 1 L ». Si tu ajoutes deux fois le même article, les quantités s’additionnent au lieu de créer une seconde ligne.',
    en: 'Write the quantity as you would say it: “400 g”, “2”, “1 L”. Adding the same item twice adds the quantities up instead of creating a second line.',
  },
  AIDE_PERSONNES: {
    fr: 'Le nombre de convives pour ce jour. Les quantités des recettes sont recalculées automatiquement : une recette prévue pour 2 affichera le double pour 4.',
    en: 'How many people eat that day. Recipe quantities are rescaled automatically: a recipe for 2 will show double for 4.',
  },
  AIDE_PERSONNES_BASE: {
    fr: 'Pour combien de personnes cette recette est-elle écrite ? C’est la référence qui permet de mettre les quantités à l’échelle du nombre de convives.',
    en: 'How many people is this recipe written for? It is the reference used to scale quantities to the number of guests.',
  },
  AIDE_DOSSIER: {
    fr: 'Un rangement simple, à un seul niveau : « Papiers », « Santé », « Impôts »… Laisse vide et le fichier ira dans « Fichiers non classés », tu le rangeras plus tard.',
    en: 'Simple, single-level filing: “Paperwork”, “Health”, “Taxes”… Leave empty and the file goes to “Unsorted files”, to be sorted later.',
  },
  AIDE_BUDGET_PREVU: {
    fr: 'Ce que tu comptes dépenser pour ce cadeau. Sert à suivre le budget d’une occasion avant l’achat — laisse vide si tu ne sais pas encore.',
    en: 'What you plan to spend on this gift. Used to track an occasion’s budget before buying — leave empty if you don’t know yet.',
  },
  AIDE_OCCASION: {
    fr: 'L’événement auquel se rattache ce cadeau : « Noël 2026 », « Anniversaire de Léa »… Saisis librement : une nouvelle occasion est créée si elle n’existe pas, et les cadeaux sont regroupés par occasion.',
    en: 'The event this gift belongs to: “Christmas 2026”, “Léa’s birthday”… Type freely: a new occasion is created if it doesn’t exist, and gifts are grouped by occasion.',
  },
  AIDE_LIEN_CADEAU: {
    fr: 'Un lien vers la page du cadeau (boutique en ligne, fiche produit…). Il devient cliquable dans la liste, à condition de commencer par http:// ou https://.',
    en: 'A link to the gift’s page (online shop, product page…). It becomes clickable in the list, as long as it starts with http:// or https://.',
  },

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
  VISIO_TELECHARGER: { fr: '⬇ Télécharger', en: '⬇ Download' },
  VISIO_TELECHARGEMENT_EN_COURS: { fr: 'Préparation…', en: 'Preparing…' },
  VISIO_ZOOM: { fr: 'Toucher pour agrandir', en: 'Tap to zoom' },
  VISIO_ERREUR: { fr: 'Ce document n’a pas pu être affiché. Tu peux le télécharger.', en: 'This document could not be displayed. You can download it.' },
  /* ⚠ Dit la vraie raison : le PDF n'a rien d'anormal, c'est le telephone qui
     ne sait pas l'afficher dans un cadre. Sans cette distinction, on croit son
     fichier abime et on reessaie. */
  VISIO_PDF_MOBILE: { fr: 'Sur téléphone, les PDF s’ouvrent depuis le téléchargement — le bouton ci-dessous.', en: 'On phones, PDFs open from the download — the button below.' },
  VISIO_CHARGEMENT: { fr: 'Lecture du fichier…', en: 'Reading the file…' },
  /* ⚠ Dit POURQUOI, et que le fichier n'a rien d'anormal : c'est sa taille qui
     ecarte l'apercu, pas son format. */
  VISIO_TEXTE_LOURD: { fr: 'Fichier trop volumineux pour un aperçu — télécharge-le pour le lire en entier.', en: 'Too large to preview — download it to read in full.' },
  VISIO_PAS_APERCU: { fr: 'Aperçu indisponible pour ce type de fichier.', en: 'No preview available for this file type.' },
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
  BUD_KPI_ECH_N: { fr: 'prélevées ce mois', en: 'due this month' },
  /* ⚠ Dit pourquoi le total ne colle pas à la liste, plutôt que de laisser
     croire à une erreur de calcul. */
  BUD_KPI_ECH_SANS: { fr: 'sans montant, non comptées', en: 'with no amount, not counted' },
  BUD_SOLDES: { fr: 'Soldes des comptes', en: 'Account balances' },
  BUD_PAR_CAT: { fr: 'Dépenses par catégorie', en: 'Spending by category' },
  BUD_MOIS_COURANT: { fr: 'mois en cours', en: 'current month' },
  /* --- Budget : historique des opérations (replié, bas de page) --- */
  HIST_TITRE: { fr: 'Voir l’historique des opérations', en: 'View transaction history' },
  HIST_TOUT: { fr: 'Tout', en: 'All' },
  HIST_REVENUS: { fr: 'Revenus', en: 'Income' },
  HIST_DEPENSES: { fr: 'Dépenses', en: 'Expenses' },
  HIST_ANNEE: { fr: 'Toute l’année', en: 'Full year' },
  HIST_CHARGEMENT: { fr: 'Chargement…', en: 'Loading…' },
  HIST_OP: { fr: 'opération', en: 'transaction' },
  HIST_OPS: { fr: 'opérations', en: 'transactions' },
  HIST_VIDE: { fr: 'Aucune opération sur cette période.', en: 'No transactions in this period.' },
  HIST_TRONQUE: {
    fr: 'liste tronquée (trop d’opérations)',
    en: 'list truncated (too many transactions)',
  },
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
  TODO_SUPPRIMER: { fr: 'Supprimer', en: 'Delete' },
  TODO_VIDER_FAITES: { fr: 'Retirer les tâches faites', en: 'Remove completed tasks' },
  TODO_VIDER_FAITES_Q: { fr: 'Supprimer définitivement toutes les tâches faites ?', en: 'Permanently delete all completed tasks?' },
  TODO_QUI: { fr: 'Qui ?', en: 'Who?' },
  TODO_QUI_AUTRE: { fr: 'Ou tape un autre nom', en: 'Or type another name' },
  TODO_PRIORITE: { fr: 'Priorité', en: 'Priority' },
  TODO_CATEGORIE: { fr: 'Catégorie', en: 'Category' },
  TODO_ECHEANCE: { fr: 'Échéance', en: 'Due date' },
  // ⚠ Le format est imposé par le stockage (texte « jj/mm/aaaa ») : l'exemple
  // dans le champ vaut mieux qu'un message d'erreur après coup.
  TODO_ECHEANCE_PH: { fr: 'Échéance (jj/mm/aaaa)', en: 'Due date (dd/mm/yyyy)' },
  TODO_RECURRENCE: { fr: 'Récurrence', en: 'Repeats' },
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
  /* --- Verser la liste de courses de la semaine --- */
  /* ⚠ Dit POURQUOI il n'y a rien a verser. Sans ce message, la section
     disparaissait et la fonction devenait introuvable. */
  AC_SANS_INGREDIENT: { fr: 'Aucun ingrédient à rassembler : les repas planifiés ne correspondent à aucune recette, ou leurs ingrédients ne sont pas renseignés.', en: 'Nothing to gather: the planned meals match no recipe, or their ingredients are missing.' },
  AC_VERSER: { fr: 'Ajouter tout à ma liste de courses', en: 'Add everything to my shopping list' },
  AC_AJOUTES: { fr: 'articles ajoutés', en: 'items added' },
  /* ⚠ « cumulés » et non « ignorés » : la quantité de l'article deja present a
     ete ADDITIONNEE, pas mise de cote. Le mot doit le dire, sinon on reverse
     une seconde fois en croyant rattraper un oubli. */
  AC_CUMULES: { fr: 'déjà en liste, quantités cumulées', en: 'already listed, quantities merged' },
  AC_RIEN: { fr: 'Rien à ajouter.', en: 'Nothing to add.' },
  AC_VOIR: { fr: 'Voir la liste', en: 'View the list' },
  REPAS_APERCU_TITRE: { fr: 'Aperçu des courses de la semaine', en: 'This week’s shopping preview' },
  REPAS_APERCU_NOTE: { fr: 'Somme des ingrédients des dîners planifiés, quantités mises à l’échelle.', en: 'Sum of the planned meals’ ingredients, quantities scaled.' },
  REPAS_NOUVELLE_RECETTE: { fr: 'Nouvelle recette', en: 'New recipe' },
  REPAS_NOM_PH: { fr: 'Nom de la recette', en: 'Recipe name' },
  REPAS_CATEGORIE: { fr: 'Catégorie', en: 'Category' },
  REPAS_TYPE: { fr: 'Type', en: 'Type' },
  REPAS_CHAUDFROID: { fr: 'Chaud/Froid', en: 'Hot/Cold' },
  /* --- Fiche d'une recette (popup) --- */
  FR_INGREDIENTS: { fr: 'Ingrédients', en: 'Ingredients' },
  FR_SANS_INGREDIENT: { fr: 'Aucun ingrédient renseigné.', en: 'No ingredients listed.' },
  FR_INSTRUCTIONS: { fr: 'Préparation', en: 'Method' },
  FR_SANS_INSTRUCTION: { fr: 'Aucune instruction pour l’instant — « Modifier » pour en ajouter.', en: 'No method yet — use “Edit” to add one.' },
  FR_POSER: { fr: 'Mettre au menu', en: 'Add to the menu' },
  FR_JOUR: { fr: 'Jour', en: 'Day' },
  FR_SERVICE: { fr: 'Service', en: 'Course' },
  FR_AJOUTER: { fr: 'Ajouter', en: 'Add' },
  /* ⚠ Prévient, n'empêche pas : remplacer le plat du mardi est une intention
     normale ; le faire sans savoir qu'il y en avait un ne l'est pas. */
  FR_REMPLACE: { fr: 'Remplacera', en: 'Will replace' },
  FR_POSEE: { fr: 'Ajoutée au menu ✓', en: 'Added to the menu ✓' },
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
  /* --- Événements : sous-listes (invités, checklist, menu) --- */
  EVT_INVITES: { fr: 'Invités', en: 'Guests' },
  EVT_CHECKLIST: { fr: 'À faire', en: 'To do' },
  EVT_MENU: { fr: 'Menu', en: 'Menu' },
  EVT_AUCUN_INVITE: { fr: 'Aucun invité pour l’instant.', en: 'No guests yet.' },
  EVT_AUCUNE_TACHE: { fr: 'Aucune tâche pour l’instant.', en: 'Nothing to do yet.' },
  EVT_AUCUN_PLAT: { fr: 'Aucun plat pour l’instant.', en: 'No dishes yet.' },
  EVT_NOM_INVITE: { fr: 'Nom', en: 'Name' },
  EVT_NB_PERS: { fr: 'Personnes', en: 'People' },
  EVT_RSVP: { fr: 'Réponse', en: 'RSVP' },
  EVT_TACHE: { fr: 'Tâche', en: 'Task' },
  EVT_RESPONSABLE: { fr: 'Qui s’en occupe', en: 'Who handles it' },
  EVT_PLAT: { fr: 'Plat ou article', en: 'Dish or item' },
  EVT_QUANTITE: { fr: 'Quantité', en: 'Quantity' },
  EVT_COUT: { fr: 'Coût estimé', en: 'Estimated cost' },
  EVT_AJOUT_INVITE: { fr: 'Ajouter', en: 'Add' },
  EVT_AJOUT_TACHE: { fr: 'Ajouter', en: 'Add' },
  EVT_AJOUT_PLAT: { fr: 'Ajouter', en: 'Add' },
  AIDE_NB_PERSONNES: {
    fr: 'Combien de personnes cette réponse couvre. Un « oui » pour une famille de quatre compte quatre couverts — c’est ce chiffre-là qu’attend un traiteur.',
    en: 'How many people this reply covers. A “yes” for a family of four counts as four seats — that is the number a caterer needs.',
  },
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
  /*
   * ⚠ DISAIT « Où / lien » JUSQU'AU 02/09/2026. Le champ ne rendait jamais un
   * lien collé ici cliquable — un vrai champ `lien` existe désormais
   * (CAD_LIEN_PH), celui-ci redevient ce qu'il a toujours été : le magasin.
   */
  CAD_OU_PH: { fr: 'Où (magasin)', en: 'Where (shop)' },
  CAD_LIEN_PH: { fr: 'Lien vers le cadeau (https://…)', en: 'Link to the gift (https://…)' },
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
  AGD_RECUR_Q: { fr: 'Rendez-vous récurrent — que supprimer ?', en: 'Recurring event — what should be deleted?' },
  AGD_RECUR_UNE: { fr: 'Cette date', en: 'This date' },
  AGD_RECUR_SERIE: { fr: 'Toute la série', en: 'The whole series' },
  /* --- Modification d'un événement --- */
  AGD_RECUR_MODIF_Q: {
    fr: 'Rendez-vous récurrent — que modifier ?',
    en: 'Recurring event — what should be changed?',
  },
  /*
   * ⚠ Dit ce qui est possible, pas ce qui est interdit. Modifier « toute la
   * série » ne touche qu'au texte : déplacer une série depuis une occurrence du
   * milieu effacerait toutes les dates antérieures. Plutôt que de laisser
   * modifier une date pour la refuser ensuite, on annonce le périmètre avant.
   */
  AGD_SERIE_TEXTE: {
    fr: 'Sur toute la série, seuls le titre, le lieu et la description changent. Pour décaler une date, choisis « cette date ».',
    en: 'Across the whole series, only the title, location and description change. To move a date, choose “this date”.',
  },
  AGD_MODIFIER_TITRE: { fr: 'Modifier l’événement', en: 'Edit event' },
  /* --- Vues jour / semaine / mois --- */
  AGD_VUE_AVENIR: { fr: 'À venir', en: 'Upcoming' },
  AGD_VUE_JOUR: { fr: 'Jour', en: 'Day' },
  AGD_VUE_SEMAINE: { fr: 'Semaine', en: 'Week' },
  AGD_VUE_MOIS: { fr: 'Mois', en: 'Month' },
  AGD_PRECEDENT: { fr: 'Période précédente', en: 'Previous period' },
  AGD_SUIVANT: { fr: 'Période suivante', en: 'Next period' },
  AGD_AUJOURDHUI: { fr: 'Aujourd’hui', en: 'Today' },
  AGD_VIDE_PERIODE: { fr: 'Rien de prévu sur cette période.', en: 'Nothing planned in this period.' },

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
    fr: "Une archive contenant tes documents rangés comme dans l'application, ton budget et tes listes au format tableur (Excel, LibreOffice, Numbers), et un fichier JSON complet. C'est ton droit à la portabilité.",
    en: 'An archive with your documents organised as in the app, your budget and lists as spreadsheets (Excel, LibreOffice, Numbers), and a complete JSON file. This is your right to data portability.',
  },
  CPT_EXPORT_APRES: {
    fr: 'Tu peux le télécharger à tout moment, y compris après la fin d’un abonnement, tant que ton compte existe.',
    en: 'You can download it at any time, including after a subscription ends, as long as your account exists.',
  },
  CPT_EXPORT_BTN: { fr: '⬇ Télécharger toutes mes données', en: '⬇ Download all my data' },
  CPT_EXPORT_JSON: { fr: 'ou le JSON seul', en: 'or the JSON alone' },
  CPT_SUPPR_TITRE: { fr: 'Supprimer mon compte', en: 'Delete my account' },
  /**
   * ⚠ Variante du propriétaire d'un foyer PARTAGÉ. Sans elle, on lui annonçait
   * un effacement immédiat alors qu'un délai de grâce s'ouvre — et surtout on ne
   * lui disait pas qu'il détruit le travail des autres, ni qu'ils seront
   * prévenus. Voir `supprimerFoyerEtUtilisateur` (lib/rgpd.ts).
   */
  CPT_SUPPR_DESC_PARTAGE: {
    fr: 'Efface définitivement ton compte. Comme tu es propriétaire d’un foyer partagé, le foyer et TOUTES ses données seront supprimés — y compris ce que les autres membres ont saisi. Ils en seront prévenus par e-mail et garderont sept jours pour exporter leurs données ; ton compte, lui, est effacé immédiatement.',
    en: 'Permanently deletes your account. As the owner of a shared household, the household and ALL its data will be deleted — including what other members entered. They will be notified by email and will keep seven days to export their data; your own account is deleted immediately.',
  },
  CPT_CHECK_PARTAGE: {
    fr: 'Je comprends que le foyer et les données des autres membres seront supprimés dans sept jours.',
    en: 'I understand that the household and the other members’ data will be deleted in seven days.',
  },
  /** Bandeau affiché aux membres restants pendant le délai de grâce. */
  SUPPR_BANDEAU: {
    fr: 'Ce foyer sera supprimé le',
    en: 'This household will be deleted on',
  },
  SUPPR_BANDEAU_B: {
    fr: 'Exporte tes données depuis « Mon compte » avant cette date.',
    en: 'Export your data from “My account” before then.',
  },
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
  // Variantes pour un MEMBRE non propriétaire : il quitte le foyer, il ne le
  // supprime pas. Annoncer le contraire ferait renoncer quelqu'un à son droit à
  // l'effacement par peur d'emporter les données des autres.
  CPT_SUPPR_DESC_MEMBRE: {
    fr: 'Efface définitivement ton compte et te retire de ce foyer. Les données du foyer (comptes, tâches, documents…) restent en place pour les autres membres. Cette action est irréversible (droit à l’effacement). Pense à exporter tes données avant si tu veux en garder une copie.',
    en: 'Permanently deletes your account and removes you from this household. The household’s data (accounts, tasks, documents…) stays in place for the other members. This action is irreversible (right to erasure). Remember to export your data first if you want to keep a copy.',
  },
  CPT_CHECK_MEMBRE: {
    fr: 'Je comprends que la suppression est définitive et que je quitte ce foyer.',
    en: 'I understand that deletion is permanent and that I am leaving this household.',
  },
  CPT_EXPORT_DESC_PARTIEL: {
    fr: 'Ton export contient les données du foyer que tu peux consulter. Les comptes bancaires qui ne te sont pas partagés n’y figurent pas.',
    en: 'Your export contains the household data you can see. Bank accounts not shared with you are not included.',
  },

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
  ABOP_OFFERT: { fr: 'Accès offert ✓', en: 'Complimentary access ✓' },
  /*
   * ⚠ CE MESSAGE REMPLACE LE BLOC D'ACHAT, il ne s'y ajoute pas. Quelqu'un à qui
   * l'accès a été offert ne doit pas voir de tarif : lui présenter « 4,99 € » et
   * une case de renonciation reviendrait à lui réclamer ce qu'on vient de lui
   * donner. Il n'a rien à faire sur cet écran, et le texte doit le dire.
   */
  ABO_OFFERT_NOTE: {
    fr: 'Ton accès est offert, sans limite de durée et sans rien à payer. Merci pour tes retours — ils font avancer Nestync.',
    en: 'Your access is complimentary, with no time limit and nothing to pay. Thank you for your feedback — it makes Nestync better.',
  },
  ABOP_IMPAYE: { fr: 'Paiement en attente — régularise pour continuer.', en: 'Payment pending — settle it to continue.' },
  ABOP_ANNULE: { fr: 'Abonnement annulé.', en: 'Subscription cancelled.' },
  ABO_ESSAI_A: { fr: 'Essai gratuit jusqu’au', en: 'Free trial until' },
  ABO_ESSAI_B: { fr: 'Abonne-toi pour ne pas perdre l’accès.', en: 'Subscribe so you don’t lose access.' },
  // ⚠ Affichage permanent de la prochaine échéance. Pour les abonnements
  // MENSUELS, c'est ce qui tient lieu d'information sur la reconduction : la
  // fenêtre légale de l'article L. 215-1 est impraticable sur un contrat d'un
  // mois. Ne pas retirer sans lire la clause 7 des conditions.
  ABO_RECOND_A: { fr: 'Reconduction automatique le', en: 'Renews automatically on' },
  ABO_RECOND_MENS: { fr: 'pour un mois', en: 'for one month' },
  ABO_RECOND_AN: { fr: 'pour un an', en: 'for one year' },
  ABO_RECOND_LIBRE: { fr: 'Tu peux résilier à tout moment d’ici là, en trois clics.', en: 'You can cancel any time before then, in three clicks.' },
  ABO_ESSAI_OUVERT: { fr: 'Essai en cours. Abonne-toi quand tu veux pour pérenniser l’accès.', en: 'Trial in progress. Subscribe whenever you like to keep access.' },
  ABO_SUSPENDU: { fr: 'Ton accès est suspendu : un abonnement actif est requis.', en: 'Your access is suspended: an active subscription is required.' },
  ABO_NON_ACTIVE: { fr: 'La facturation n’est pas activée sur cette instance.', en: 'Billing is not enabled on this instance.' },
  ABO_REDIRECTION: { fr: 'Redirection…', en: 'Redirecting…' },
  ABO_SABONNER: { fr: 'S’abonner', en: 'Subscribe' },
  ABO_REABONNER: { fr: 'Reprendre mon abonnement', en: 'Resume my subscription' },
  /* --- Abonnement : informations précontractuelles + rétractation + résiliation --- */
  ABO_AVANT_TITRE: { fr: 'Avant de t’abonner', en: 'Before you subscribe' },
  ABO_AVANT_RENOUV: {
    fr: 'L’abonnement se renouvelle automatiquement à chaque échéance, au même tarif, jusqu’à résiliation.',
    en: 'The subscription renews automatically at each term, at the same price, until cancelled.',
  },
  ABO_AVANT_RESIL: {
    fr: 'Tu peux résilier à tout moment depuis cette page. L’accès reste ouvert jusqu’à la fin de la période déjà payée, sans frais.',
    en: 'You can cancel at any time from this page. Access stays open until the end of the period already paid for, at no cost.',
  },
  // ⚠ Surtout pas « prix TTC » : la TVA n'est pas applicable (franchise en base,
  // art. 293 B du CGI), et l'article 1 des CGV le dit. Annoncer des prix TTC au
  // moment du paiement contredirait le contrat qu'on fait accepter juste en
  // dessous. À réécrire le jour du passage à la TVA.
  ABO_AVANT_TVA: { fr: 'Prix total, aucune taxe en sus. Sans engagement de durée.', en: 'Total price, no tax added. No minimum term.' },
  /**
   * ⚠ FORMULATION JURIDIQUE — art. L. 221-25, à lire avec l'article 8 des CGV.
   *
   * ⚠ ELLE NE FAIT PLUS RENONCER À QUOI QUE CE SOIT (26/08/2026). L'ancienne
   * version annonçait la perte du droit de rétractation « une fois le service
   * pleinement exécuté ». Cette perte suppose une exécution COMPLÈTE pendant les
   * quatorze jours — or un abonnement n'est jamais pleinement exécuté en deux
   * semaines. La condition n'étant pas remplie, le client conservait son droit
   * pendant que la case lui affirmait le contraire, au moment même où il payait.
   * Faire croire à un consommateur qu'il perd un droit d'ordre public est un
   * manquement en soi, indépendamment de son effet.
   *
   * Ce qui reste, et qui est nécessaire : la DEMANDE EXPRESSE d'exécution
   * immédiate, sans laquelle le service ne peut pas démarrer avant la fin du
   * délai. Ne pas y réintroduire de renonciation.
   */
  ABO_RENONCIATION: {
    fr: 'Je demande l’exécution immédiate de l’abonnement, sans attendre la fin du délai de rétractation. Je conserve mon droit de rétractation de 14 jours, avec remboursement intégral.',
    en: 'I request immediate performance of the subscription, without waiting for the withdrawal period to end. I keep my 14-day right of withdrawal, with a full refund.',
  },
  ABO_RENONCIATION_REQUISE: {
    fr: 'Coche la case ci-dessus pour démarrer l’abonnement immédiatement.',
    en: 'Tick the box above to start the subscription immediately.',
  },
  ABO_CGV_A: { fr: 'En t’abonnant, tu acceptes les', en: 'By subscribing you accept the' },
  ABO_CGV_LIEN: { fr: 'conditions générales', en: 'terms and conditions' },
  ABO_RESILIER: { fr: 'Résilier mon abonnement', en: 'Cancel my subscription' },
  ABO_GERER_FACT: { fr: 'Factures et moyen de paiement', en: 'Invoices and payment method' },
  ABO_RESILIE_A: { fr: 'Résiliation enregistrée : ton accès reste ouvert jusqu’au', en: 'Cancellation registered: your access stays open until' },
  ABO_RESILIE_B: {
    fr: 'Aucun nouveau prélèvement ne sera effectué. Tu peux réactiver l’abonnement à tout moment depuis « Gérer mon abonnement ».',
    en: 'No further payment will be taken. You can reactivate your subscription at any time from “Manage my subscription”.',
  },
  ABO_GERER: { fr: 'Gérer mon abonnement', en: 'Manage my subscription' },

  // Politique de confidentialité (gabarit)
  CONF_RETOUR: { fr: 'Retour' },
  CONF_TITRE: { fr: 'Politique de confidentialité' },
  CONF_MAJ: { fr: 'Dernière mise à jour : 30 août 2026' },
  CONF_LANGUE: { fr: 'Nestync est proposé en France, aux consommateurs résidant en France. Ce document n’existe qu’en français : seule cette version fait foi.' },
  CONF_S1_T: { fr: '1. Responsable du traitement' },
  CONF_S1_P: {
    fr: 'Le responsable du traitement des données est Mathis INGRAND-PERIGNE, personne physique éditant le service à titre individuel, joignable à l’adresse contact@nestync.app. Le service « Nestync » (ci-après « le Service ») est une application d’organisation familiale.',
  },
  CONF_S2_T: { fr: '2. Données collectées' },
  CONF_S2_LI1: {
    fr: 'Identité de connexion (via Google) : adresse e-mail, nom et photo de profil, pour l’authentification et l’accès restreint au Service.',
  },
  CONF_S2_LI2: {
    fr: 'Données saisies dans le foyer : budget (comptes, transactions, catégories, échéances), tâches et listes de courses, recettes et planning des repas, événements, cadeaux et occasions.',
  },
  CONF_S2_LI3: {
    fr: 'Documents : les fichiers que tu téléverses dans le module Documents sont hébergés par le Service, dans un espace privé propre à ton foyer. Ils ne sont accessibles qu’aux membres de ton foyer, via une adresse authentifiée (aucun lien public).',
  },
  CONF_S2_LI4: {
    fr: 'Google Agenda (facultatif) : si tu connectes ton agenda, Nestync lit les calendriers que tu as choisi de partager avec ton foyer et peut y créer des événements à ta demande. Détail complet en section 9.',
  },
  /**
   * ⚠ AJOUTÉE LE 30/08/2026, en même temps que la fonctionnalité elle-même
   * (`CaptureOrigine.tsx`, `foyers.origine`/`origine_declaree`). Le cookie
   * `nsy-origine` figurait déjà dans la liste des témoins (section 6), mais la
   * DONNÉE — conservée en base, pas seulement le cookie qui la transporte —
   * n'était déclarée nulle part ici : l'article 13 du RGPD impose les deux.
   */
  CONF_S2_LI5: {
    fr: 'Origine de ton foyer (facultatif) : si tu es arrivé via un lien identifié (ex. une publication sur un réseau social) ou si tu as répondu à la question posée lors de la prise en main, Nestync conserve ce canal — pour savoir quelles publications donnent envie d’essayer le Service, jamais pour te profiler individuellement.',
  },
  CONF_S3_T: { fr: '3. Finalités et base légale' },
  CONF_S3_P: {
    fr: 'Ces données sont traitées uniquement pour fournir le Service (organiser la vie du foyer). La base légale est l’exécution du contrat qui te lie au Service, et ton consentement pour l’accès facultatif à Google Agenda (révocable à tout moment). La connexion Google sert à t’identifier ; le Service ne demande jamais accès à tes fichiers ni à tes e-mails.',
  },
  CONF_S3_ORIGINE: {
    fr: 'L’origine de ton foyer (section 2) est traitée sur la base de notre intérêt légitime à savoir par quels canaux Nestync se fait connaître — une mesure agrégée, jamais un profil individuel ni une donnée transmise à un tiers. Tu peux t’y opposer à tout moment en écrivant à contact@nestync.app.',
  },
  // ⚠ Contrepartie de l'article 4 des CGV, qui recueille la déclaration du
  // parent. Les deux textes se lisent ensemble : retoucher l'un impose de relire
  // l'autre.
  CONF_S3_MINEURS: {
    fr: 'Un foyer peut compter des membres mineurs. Seule une personne majeure peut créer un foyer et souscrire un abonnement ; c’est elle qui invite les autres membres. Lorsqu’un mineur de moins de quinze ans est invité, le traitement de ses données repose sur le consentement donné en son nom par le titulaire de l’autorité parentale, recueilli auprès de la personne qui l’invite (article 4 des conditions générales). Les droits d’accès, de rectification et d’effacement peuvent être exercés par ce titulaire à tout moment.',
  },
  CONF_S4_T: { fr: '4. Hébergement et sous-traitants' },
  CONF_S4_LI1: { fr: 'Base de données : Neon, région Union européenne.' },
  CONF_S4_LI2: { fr: 'Hébergement de l’application et mesure d’audience sans cookie : Vercel Inc.' },
  CONF_S4_LI3: { fr: 'Google LLC : authentification (identité) et, si tu l’actives, Google Agenda — voir la section 9.' },
  /**
   * ⚠ Cette ligne annonçait « Vercel Blob » jusqu'au 13/08/2026, alors que les
   * fichiers étaient partis chez OVHcloud le 08/08. Une politique de
   * confidentialité qui nomme le mauvais sous-traitant n'est pas une imprécision
   * de rédaction : c'est une information obligatoire (art. 13 RGPD) qui devient
   * fausse. Elle sous-estimait en plus la protection réelle.
   */
  CONF_S4_LI5: { fr: 'Fichiers du module Documents : OVHcloud, région Paris, en conteneur privé et redondé sur trois zones. Le contenu est chiffré par Nestync avant l’envoi : ni l’hébergeur ni son personnel ne peuvent le lire.' },
  CONF_S4_LI6: { fr: 'Brevo (Sendinblue SAS, France) : envoi des courriels du service — invitation, relance, réponse à un message. Seules l’adresse et le contenu du courriel lui sont transmis.' },
  CONF_S4_LI4: { fr: 'Stripe Payments Europe : paiement de l’abonnement, dès l’activation de la facturation. Aucune coordonnée bancaire n’est conservée par Nestync.' },
  CONF_S5_T: { fr: '5. Durée de conservation' },
  CONF_S5_A: { fr: 'Tes données sont conservées tant que ton compte est actif. Tu peux les supprimer à tout moment depuis' },
  CONF_S5_B: { fr: ': la suppression efface définitivement ton foyer et toutes ses données.' },
  /**
   * ⚠ Exactitude juridique : sans cette précision, la phrase précédente serait
   * FAUSSE pour un abonné. Les factures déjà émises relèvent d'une obligation
   * comptable de 10 ans (art. L123-22 du code de commerce) qui survit à la
   * suppression du compte — annoncer un effacement total serait trompeur.
   */
  CONF_S5_C: {
    fr: 'Une exception : si tu as été abonné, les factures déjà émises sont conservées 10 ans par notre prestataire de paiement, comme la loi comptable l’exige. Elles ne contiennent aucune donnée de tes modules.',
  },
  /**
   * ⚠ Ces trois durées sont APPLIQUÉES chaque nuit par le ménage automatique
   * (`lib/maintenance.ts`) depuis le 07/08/2026, mais n'étaient annoncées nulle
   * part. L'article 13 du RGPD impose d'indiquer la durée de conservation :
   * purger sans le dire ne suffit pas, il faut aussi l'écrire.
   */
  CONF_S5_D: { fr: 'Trois durées s’appliquent automatiquement, sans intervention de notre part :' },
  CONF_S5_LI1: { fr: 'Compte inactif : après 3 ans sans connexion, un courriel de préavis est envoyé ; sans retour dans les 30 jours, le compte et ses données sont supprimés.' },
  CONF_S5_LI2: { fr: 'Message envoyé depuis la page d’aide : conservé 1 an, puis effacé.' },
  CONF_S5_LI3: { fr: 'Invitation non acceptée : effacée au bout de 90 jours.' },
  CONF_S6_T: { fr: '6. Cookies et mesure d’audience' },
  /**
   * ⚠ DISAIT « deux préférences (thème, langue) » JUSQU'AU 28/08/2026, alors que
   * six témoins étaient réellement posés. L'énumération en toutes lettres a été
   * remplacée par un renvoi à la liste exhaustive affichée juste en dessous
   * (`TEMOINS` dans app/confidentialite/page.tsx) : un texte qui compte lui-même
   * ses éléments se périme au premier ajout, en silence.
   */
  CONF_S6_P: {
    fr: 'Le Service n’utilise qu’un cookie de session strictement nécessaire à l’authentification, plus les préférences d’affichage ci-dessous, conservées sur ton appareil. Aucun traceur publicitaire n’est déposé, aucun profil n’est constitué et aucune donnée n’est revendue.',
  },
  CONF_S6_P3: {
    fr: 'Aucune de ces préférences ne permet de te suivre d’un site à l’autre : elles ne servent qu’à retrouver tes réglages sur cet appareil. Les effacer (vidage des données du site dans ton navigateur) remet simplement l’affichage à ses valeurs par défaut, sans rien perdre de tes données de foyer.',
  },
  CONF_S6_P2: {
    fr: 'Une mesure d’audience (Vercel Web Analytics) compte les pages vues afin d’améliorer le Service. Elle ne dépose AUCUN cookie, ne crée aucun profil et ne permet pas de te suivre d’un site à l’autre. Les adresses de pages sont en outre anonymisées avant envoi : les paramètres d’URL sont supprimés et les identifiants remplacés, de sorte qu’aucun contenu de ton foyer n’est transmis.',
  },
  CONF_S7_T: { fr: '7. Tes droits' },
  CONF_S7_A: {
    fr: 'Conformément au RGPD, tu disposes des droits d’accès, de rectification, d’effacement, de portabilité, de limitation et d’opposition. Deux de ces droits sont directement exerçables dans',
  },
  CONF_S7_LI1: { fr: 'Portabilité / accès : « Exporter mes données » (fichier JSON complet).' },
  CONF_S7_LI2: { fr: 'Effacement : « Supprimer mon compte » (suppression définitive).' },
  CONF_S7_P2: {
    fr: 'Pour les autres demandes, écris à contact@nestync.app. Tu peux aussi introduire une réclamation auprès de la CNIL (www.cnil.fr).',
  },
  /* --- Section 9 : données Google. Exigée par Google pour la vérification des
     scopes sensibles (Google API Services User Data Policy / Limited Use). --- */
  CONF_S9_T: { fr: '9. Données Google Agenda' },
  CONF_S9_INTRO: {
    fr: 'Connecter ton Google Agenda est entièrement facultatif : Nestync fonctionne sans. Si tu l’actives, voici précisément ce que nous demandons et pourquoi.',
  },
  CONF_S9_SCOPE1: {
    fr: 'Lister tes agendas (calendar.calendarlist.readonly) : afficher le NOM de tes calendriers, uniquement pour que tu choisisses ceux à partager avec ton foyer. Ce niveau d’accès ne donne aucun accès au contenu de tes événements.',
  },
  CONF_S9_SCOPE2: {
    fr: 'Gérer les événements des calendriers que tu as choisis (calendar.events) : afficher leurs événements à venir dans l’agenda du foyer, créer un événement depuis Nestync, et supprimer un événement affiché dans Nestync.',
  },
  CONF_S9_MINIMAL: {
    fr: 'Nous demandons volontairement le périmètre le plus étroit possible : Nestync ne demande PAS l’accès en lecture à l’ensemble de tes agendas, seulement la liste de leurs noms et les événements des calendriers que tu as toi-même sélectionnés.',
  },
  CONF_S9_USAGE: {
    fr: 'Ces données servent EXCLUSIVEMENT à faire fonctionner l’agenda partagé de ton foyer, à ta demande. Elles ne sont jamais utilisées à des fins publicitaires, jamais vendues ni transmises à des tiers, jamais exploitées pour entraîner des modèles d’intelligence artificielle, et aucun humain ne les consulte — sauf accord explicite de ta part pour résoudre un problème technique, ou obligation légale.',
  },
  CONF_S9_LIMITED: {
    fr: 'L’usage que Nestync fait des informations reçues des API Google respecte la Google API Services User Data Policy, y compris ses exigences d’usage limité (Limited Use).',
  },
  CONF_S9_STOCKAGE: {
    fr: 'Conservation : nous ne copions PAS le contenu de tes agendas. Les événements sont lus à la volée à chaque affichage et ne sont pas enregistrés dans notre base. Seuls sont conservés : les identifiants des calendriers que tu as choisi de partager, et les jetons d’accès Google — ces derniers étant chiffrés (AES-256-GCM) dans notre base, hébergée dans l’Union européenne.',
  },
  CONF_S9_REVOQUER: {
    fr: 'Retirer l’accès à tout moment, de deux façons : depuis la page Agenda de Nestync (« Déconnecter mon Google Agenda »), ce qui efface immédiatement les jetons conservés ; ou depuis ton compte Google, sur la page des applications tierces autorisées (myaccount.google.com/permissions). Supprimer ton compte Nestync efface également ces jetons.',
  },

  CONF_S8_T: { fr: '8. Sécurité' },
  /**
   * ⚠ Disait « restreint aux comptes autorisés » jusqu'au 13/08/2026 : c'était
   * vrai du temps de la liste blanche, abandonnée le 01/08. Se connecter est
   * ouvert à tous depuis ; ce qui est contrôlé, c'est la création d'un foyer.
   * Décrire une restriction qui n'existe plus induit le lecteur en erreur.
   */
  CONF_S8_P: {
    fr: 'L’accès au Service passe par une authentification Google : Nestync ne détient aucun mot de passe. Les échanges sont chiffrés (HTTPS) et la base est hébergée dans l’Union européenne. Les fichiers du module Documents et les jetons d’accès à Google Agenda sont en outre chiffrés au repos (AES-256-GCM), avec des clés que l’hébergeur ne détient pas.',
  },

  // Erreur générique de chargement d'une page module
  G_ERR_PAGE: { fr: 'Impossible de charger cette page :', en: 'Could not load this page:' },

  // Connexion
  CNX_ACCES: { fr: 'Connecte-toi avec ton compte Google. Pas de mot de passe à retenir.', en: 'Sign in with your Google account. No password to remember.' },
  CNX_BOUTON: { fr: 'Se connecter avec Google', en: 'Sign in with Google' },
  CNX_DECOUVRIR: { fr: '← Découvrir Nestync et les tarifs', en: '← Discover Nestync and pricing' },

  // Hors ligne
  /* --- Page 404 --- */
  NF_TITRE: { fr: 'Cette page n’existe pas', en: 'This page does not exist' },
  /* ⚠ On dit ce qui a pu se passer, pas « erreur ». Une adresse mal tapée ou un
     lien périmé n'est pas une panne, et le mot « erreur » ferait croire que
     l'application est cassée — ce qu'on cherche justement à ne pas laisser
     penser après avoir vu une page blanche en anglais. */
  NF_TXT: { fr: 'L’adresse est peut-être mal orthographiée, ou la page a été déplacée. Rien n’est cassé de votre côté.', en: 'The address may be misspelled, or the page has moved. Nothing is broken on your side.' },
  NF_ACCUEIL: { fr: 'Revenir à l’accueil', en: 'Back to home' },
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

/**
 * Traductions tenues dans un fichier PAR LANGUE, en surcouche du dictionnaire.
 *
 * Pourquoi pas directement dans `UI` : à 467 clés, ajouter `es`/`de`/`it` sur
 * chaque ligne rendrait ce fichier illisible et transformerait la moindre
 * relecture du français en fouille. Ici, ajouter une langue = ajouter un
 * fichier, et une relecture par un locuteur natif porte sur un seul fichier
 * qu'on peut lui envoyer tel quel.
 *
 * Les surcouches sont **partielles** à dessein : une clé non traduite retombe
 * sur l'anglais s'il existe, puis sur le français. Une traduction incomplète
 * dégrade donc l'affichage, elle ne le casse pas.
 */
const SURCOUCHES: Partial<Record<IdLangue, Partial<Record<CleUI, string>>>> = {
  es: ES,
  de: DE,
  it: IT,
};

/**
 * Libellé d'interface dans la langue voulue.
 *
 * Ordre de repli : surcouche de la langue → entrée du dictionnaire → anglais →
 * français. L'étape « anglais » compte : entre une interface entièrement
 * française et une phrase anglaise isolée, un lecteur hispanophone s'en sort
 * mieux avec la seconde.
 */
export function t(cle: CleUI, langue: IdLangue = LANGUE_DEFAUT): string {
  const surcouche = SURCOUCHES[langue]?.[cle];
  if (surcouche) return surcouche;
  const e = UI[cle] as Trad;
  return e[langue] ?? e.en ?? e.fr;
}
