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
} as const satisfies Record<string, Trad>;

export type CleUI = keyof typeof UI;

/** Libellé d'interface dans la langue voulue, repli sur le français. */
export function t(cle: CleUI, langue: IdLangue = LANGUE_DEFAUT): string {
  const e = UI[cle] as Trad;
  return e[langue] ?? e.fr;
}
