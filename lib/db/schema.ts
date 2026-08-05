import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
  integer,
  doublePrecision,
  jsonb,
  unique,
  index,
} from 'drizzle-orm/pg-core';

/**
 * SCHÉMA MULTI-FOYER (Postgres / Drizzle) — socle de la version vendable.
 * ======================================================================
 * Chaque « foyer » est un client (locataire / tenant). Un foyer regroupe
 * plusieurs utilisateurs (les membres de la famille) et, à terme, TOUTES ses
 * données de modules (cadeaux, tâches, budget…), chacune portant `foyer_id`
 * pour l'isolation. On garde des noms français, cohérents avec le reste du code.
 *
 * ⚠ Auth : on NE branche PAS l'adaptateur Drizzle d'Auth.js. On conserve la
 * stratégie JWT actuelle (indispensable au flux de refresh token Google pour
 * Drive/Agenda). Les tables ci-dessous sont NOTRE modèle métier ; l'utilisateur
 * est simplement « upserté » ici à la connexion (callbacks Auth.js).
 */

/** Rôles d'un membre dans un foyer. `proprietaire` gère l'abonnement + le foyer. */
export const ROLES_MEMBRE = ['proprietaire', 'membre'] as const;
export type RoleMembre = (typeof ROLES_MEMBRE)[number];

/** Statuts d'abonnement (miroir simplifié de Stripe). */
export const STATUTS_ABONNEMENT = ['essai', 'actif', 'impaye', 'annule'] as const;
export type StatutAbonnement = (typeof STATUTS_ABONNEMENT)[number];

/** Un client : un foyer. Porte ses préférences et l'état de son abonnement. */
export const foyers = pgTable('foyers', {
  id: uuid('id').primaryKey().defaultRandom(),
  nom: text('nom').notNull(),
  theme: text('theme').notNull().default('rose'),
  langue: text('langue').notNull().default('fr'),
  // Abonnement (rempli par le module de facturation Stripe, phase ultérieure).
  statutAbonnement: text('statut_abonnement').notNull().default('essai'),
  stripeCustomerId: text('stripe_customer_id'),
  abonnementFin: timestamp('abonnement_fin', { withTimezone: true }),
  /**
   * Résiliation demandée, effective à la fin de la période payée.
   * ⚠ Stripe garde le statut `active` jusqu'au terme : sans ce drapeau, l'app
   * afficherait « abonnement actif » à quelqu'un qui vient de résilier, sans
   * jamais l'informer de la date d'arrêt.
   */
  annulationProgrammee: boolean('annulation_programmee').notNull().default(false),
  /**
   * Prise en main effectuée (nom du foyer choisi, proches invités) ?
   * ⚠ Défaut `true` À DESSEIN : les foyers déjà en service ne doivent pas se
   * voir imposer l'onboarding. Ce sont les foyers NOUVELLEMENT créés qui posent
   * explicitement `false` (cf. `foyerCourant`).
   */
  onboardingFait: boolean('onboarding_fait').notNull().default(true),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

/** Un utilisateur (identité de connexion), indépendamment de son/ses foyers. */
export const utilisateurs = pgTable('utilisateurs', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nom: text('nom'),
  image: text('image'),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

/** Appartenance d'un utilisateur à un foyer, avec son rôle. Un user ↔ un foyer unique. */
export const membres = pgTable(
  'membres',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('membre'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('membres_foyer_utilisateur').on(t.foyerId, t.utilisateurId),
    index('membres_utilisateur_idx').on(t.utilisateurId),
  ],
);

/** Invitation d'un email à rejoindre un foyer (jeton à usage unique, expirable). */
export const invitations = pgTable(
  'invitations',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    email: text('email').notNull(),
    jeton: text('jeton').notNull().unique(),
    role: text('role').notNull().default('membre'),
    expireLe: timestamp('expire_le', { withTimezone: true }).notNull(),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('invitations_email_idx').on(t.email)],
);

/**
 * Demandes d'adhésion — le pendant « inversé » des invitations.
 * Une invitation part du foyer vers une personne ; ici, c'est la personne qui
 * FRAPPE À LA PORTE : elle indique l'e-mail du responsable du foyer, et celui-ci
 * accepte ou refuse depuis « Mon foyer ». Utile quand le responsable n'a pas
 * pensé (ou pas su) envoyer un lien d'invitation.
 *
 * `statut` : en_attente | acceptee | refusee. On garde la ligne après décision
 * pour éviter qu'une même personne relance en boucle.
 */
export const STATUTS_DEMANDE = ['en_attente', 'acceptee', 'refusee'] as const;
export type StatutDemande = (typeof STATUTS_DEMANDE)[number];

export const demandesAdhesion = pgTable(
  'demandes_adhesion',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    demandeurId: uuid('demandeur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    // Copies figées : le responsable doit voir QUI demande, même si le compte change.
    demandeurEmail: text('demandeur_email').notNull(),
    demandeurNom: text('demandeur_nom'),
    message: text('message').notNull().default(''),
    statut: text('statut').notNull().default('en_attente'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('demandes_foyer_idx').on(t.foyerId),
    // Une seule demande vivante par (foyer, demandeur) : la relance met à jour.
    unique('demandes_foyer_demandeur').on(t.foyerId, t.demandeurId),
  ],
);

/**
 * Agendas Google rattachés à un foyer (module Agenda).
 *
 * ⚠ Remplace la variable d'environnement globale `AGENDA_IDS`, qui faisait voir
 * LES MÊMES agendas à tous les foyers — une fuite de données dès le 2ᵉ foyer.
 * Chaque foyer ne voit désormais que les calendriers qui lui sont rattachés.
 *
 * `ajoutePar` : l'utilisateur dont le jeton Google donne accès au calendrier
 * (étape 2, OAuth par utilisateur). `null` = accès par le compte de service
 * (mode historique, calendriers partagés manuellement avec lui).
 */
export const foyerAgendas = pgTable(
  'foyer_agendas',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    calendarId: text('calendar_id').notNull(),
    nom: text('nom').notNull().default(''),
    ajoutePar: uuid('ajoute_par').references(() => utilisateurs.id, { onDelete: 'set null' }),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('foyer_agendas_foyer_idx').on(t.foyerId),
    unique('foyer_agendas_foyer_cal').on(t.foyerId, t.calendarId),
  ],
);

/**
 * Autorisation Google Agenda accordée par un utilisateur (OAuth « incrémental »).
 *
 * Pourquoi une table et pas la session : le jeton doit rester utilisable **côté
 * serveur, hors de toute requête de l'utilisateur** (afficher l'agenda du foyer à
 * un autre membre, par exemple). Le `refresh_token` permet de renouveler l'accès
 * sans redemander l'autorisation.
 *
 * ⚠ SÉCURITÉ : les jetons sont des identifiants durables donnant accès au
 * calendrier de la personne. Ils sont **chiffrés au repos** ([lib/crypto.ts])
 * afin qu'une fuite de la base ne les livre pas en clair.
 */
export const comptesGoogle = pgTable('comptes_google', {
  id: uuid('id').primaryKey().defaultRandom(),
  utilisateurId: uuid('utilisateur_id')
    .notNull()
    .unique()
    .references(() => utilisateurs.id, { onDelete: 'cascade' }),
  accessTokenChiffre: text('access_token_chiffre').notNull(),
  refreshTokenChiffre: text('refresh_token_chiffre'),
  expireLe: timestamp('expire_le', { withTimezone: true }),
  scope: text('scope').notNull().default(''),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

export type Foyer = typeof foyers.$inferSelect;
export type LigneDemandeAdhesion = typeof demandesAdhesion.$inferSelect;
export type LigneFoyerAgenda = typeof foyerAgendas.$inferSelect;
export type LigneCompteGoogle = typeof comptesGoogle.$inferSelect;
export type Utilisateur = typeof utilisateurs.$inferSelect;
export type Membre = typeof membres.$inferSelect;
export type Invitation = typeof invitations.$inferSelect;

/* =========================== MODULE CADEAUX =========================== */
/**
 * Données du module Cadeaux, en base (remplace les onglets Sheets Cadeaux/
 * Occasions). TOUT porte `foyer_id` : chaque requête du service est scopée au
 * foyer courant. Les montants restent en texte (saisie libre « 20 € »), les
 * nombres sont recalculés à la lecture (parseEuro), comme en version Sheets.
 */

/** Occasions d'un foyer (Noël, anniversaires…). Nom unique par foyer. */
export const occasions = pgTable(
  'occasions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    date: text('date'), // saisie libre ; ISO calculé à la lecture
    budget: text('budget'),
    note: text('note'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('occasions_foyer_nom').on(t.foyerId, t.nom),
    index('occasions_foyer_idx').on(t.foyerId),
  ],
);

/** Idées / cadeaux d'un foyer, rattachés à une occasion par son nom (texte). */
export const cadeaux = pgTable(
  'cadeaux',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    pourQui: text('pour_qui').notNull().default(''),
    occasion: text('occasion').notNull().default(''),
    idee: text('idee').notNull(),
    statut: text('statut').notNull().default('Idée'),
    budgetPrevu: text('budget_prevu').notNull().default(''),
    prixPaye: text('prix_paye').notNull().default(''), // coût (total si cadeau à plusieurs)
    // Cadeau fait à plusieurs : ta participation (part réellement payée par le foyer).
    partage: boolean('partage').notNull().default(false),
    participation: text('participation').notNull().default(''),
    offertPar: text('offert_par').notNull().default(''),
    ou: text('ou').notNull().default(''),
    note: text('note').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('cadeaux_foyer_idx').on(t.foyerId)],
);

export type LigneOccasion = typeof occasions.$inferSelect;
export type LigneCadeau = typeof cadeaux.$inferSelect;

/* ======================== MODULE TO-DO & COURSES ======================== */
/**
 * Tâches du foyer (avec récurrence) et liste de courses partagée (cases à cocher).
 * Remplace les onglets Tâches/Courses. L'échéance est stockée en texte
 * « jj/mm/aaaa » (comme la saisie), l'ISO est recalculé à la lecture.
 */

export const taches = pgTable(
  'taches',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    statut: text('statut').notNull().default('À faire'),
    tache: text('tache').notNull(),
    assigne: text('assigne').notNull().default(''),
    categorie: text('categorie').notNull().default(''),
    priorite: text('priorite').notNull().default(''),
    echeance: text('echeance').notNull().default(''), // label jj/mm/aaaa (ou vide)
    recurrence: text('recurrence').notNull().default('Aucune'),
    note: text('note').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('taches_foyer_idx').on(t.foyerId)],
);

export const courses = pgTable(
  'courses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    fait: boolean('fait').notNull().default(false),
    article: text('article').notNull(),
    quantite: text('quantite').notNull().default(''), // texte libre : « 400 g », « 2 »…
    rayon: text('rayon').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('courses_foyer_idx').on(t.foyerId)],
);

export type LigneTache = typeof taches.$inferSelect;
export type LigneCourse = typeof courses.$inferSelect;

/* =========================== MODULE REPAS =========================== */
/**
 * Recettes (ingrédients en JSONB : une recette = sa liste d'ingrédients, lue et
 * réécrite d'un bloc par l'éditeur) et planning de la semaine (une ligne par jour
 * et par foyer). Remplace les onglets Recettes/Semaine.
 */

type IngredientJSON = { article: string; quantite: number | null; unite: string; rayon: string };

export const recettes = pgTable(
  'recettes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    ingredients: jsonb('ingredients').$type<IngredientJSON[]>().notNull(),
    categorie: text('categorie').notNull().default(''), // Entrée / Plat / Dessert
    type: text('type').notNull().default(''),
    chaudFroid: text('chaud_froid').notNull().default(''),
    note: text('note').notNull().default(''),
    personnes: integer('personnes').notNull().default(2),
    // Repères « bébé » : recette appréciée de bébé / pas encore goûtée par bébé.
    favoriBebe: boolean('favori_bebe').notNull().default(false),
    bebePasGoute: boolean('bebe_pas_goute').notNull().default(false),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('recettes_foyer_idx').on(t.foyerId)],
);

export const semaine = pgTable(
  'semaine',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    jour: text('jour').notNull(), // Lundi … Dimanche
    // Menu du jour en 3 services. `diner` (historique) reste comme repli du `plat`.
    entree: text('entree').notNull().default(''),
    plat: text('plat').notNull().default(''),
    dessert: text('dessert').notNull().default(''),
    diner: text('diner').notNull().default(''),
    note: text('note').notNull().default(''),
    personnes: integer('personnes').notNull().default(2),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('semaine_foyer_jour').on(t.foyerId, t.jour),
    index('semaine_foyer_idx').on(t.foyerId),
  ],
);

export type LigneRecette = typeof recettes.$inferSelect;
export type LigneSemaine = typeof semaine.$inferSelect;

/* ========================= MODULE ÉVÉNEMENTS ========================= */
/**
 * Événements (table maître). Les sous-listes (invités / checklist / menu) sont
 * une extension future : pour l'instant seul le maître est en base (comme l'app
 * n'éditait que lui). `agenda_lien` = « calendarId|eventId » (ex-colonne K),
 * rempli quand l'événement est poussé dans Google Agenda.
 */
export const evenements = pgTable(
  'evenements',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    type: text('type').notNull().default(''),
    date: text('date').notNull().default(''), // label jj/mm/aaaa
    heure: text('heure').notNull().default(''),
    lieu: text('lieu').notNull().default(''),
    budgetPrevu: text('budget_prevu').notNull().default(''),
    depense: text('depense').notNull().default(''),
    statut: text('statut').notNull().default(''),
    note: text('note').notNull().default(''),
    agendaLien: text('agenda_lien').notNull().default(''), // calendarId|eventId
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('evenements_foyer_idx').on(t.foyerId)],
);

export type LigneEvenement = typeof evenements.$inferSelect;

/* ============================ MODULE BUDGET ============================ */
/**
 * Budget « source de vérité » en base : comptes (avec solde initial), catégories
 * (dépense avec budget mensuel / revenu), transactions et échéances. Le dashboard
 * (soldes, KPIs du mois, réel vs budget) est RECALCULÉ côté serveur à partir de
 * ces tables (le tableur ne calcule plus rien). Montants en `double precision`
 * (comme le tableur), arrondis à l'affichage.
 */

export const comptes = pgTable(
  'comptes',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    soldeInitial: doublePrecision('solde_initial').notNull().default(0),
    ordre: integer('ordre').notNull().default(0),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comptes_foyer_idx').on(t.foyerId)],
);

export const budgetCategories = pgTable(
  'budget_categories',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    type: text('type').notNull(), // 'depense' | 'revenu'
    budgetMensuel: doublePrecision('budget_mensuel').notNull().default(0),
    ordre: integer('ordre').notNull().default(0),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('budget_categories_foyer_idx').on(t.foyerId)],
);

export const transactions = pgTable(
  'transactions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    date: text('date').notNull().default(''), // label jj/mm/aaaa
    dateIso: text('date_iso'), // aaaa-mm-jj (filtre par mois / tri), null si sans date
    type: text('type').notNull(), // Dépense / Revenu / Virement interne
    compte: text('compte').notNull().default(''),
    dest: text('dest').notNull().default(''),
    categorie: text('categorie').notNull().default(''),
    libelle: text('libelle').notNull().default(''),
    montant: doublePrecision('montant').notNull().default(0),
    note: text('note').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('transactions_foyer_idx').on(t.foyerId)],
);

export const echeances = pgTable(
  'echeances',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    libelle: text('libelle').notNull(),
    date: text('date').notNull().default(''),
    dateIso: text('date_iso'),
    recurrence: text('recurrence').notNull().default('Aucune'),
    note: text('note').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('echeances_foyer_idx').on(t.foyerId)],
);

export type LigneCompte = typeof comptes.$inferSelect;
export type LigneBudgetCategorie = typeof budgetCategories.$inferSelect;
export type LigneTransaction = typeof transactions.$inferSelect;
export type LigneEcheance = typeof echeances.$inferSelect;

/* ========================= MODULE DOCUMENTS ========================= */
/**
 * Fichiers du foyer (remplace l'ancien explorateur Google Drive). Le CONTENU
 * vit dans le stockage objet (cf. `lib/stockage/`), la base ne garde que les
 * métadonnées + la `cle` qui pointe vers le fichier stocké.
 * `dossier` = rangement à UN niveau (texte libre, comme les rayons des courses).
 */
export const documents = pgTable(
  'documents',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    dossier: text('dossier').notNull().default(''),
    cle: text('cle').notNull(), // chemin dans le stockage objet
    type: text('type').notNull().default(''), // type MIME
    taille: integer('taille').notNull().default(0), // octets
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('documents_foyer_idx').on(t.foyerId)],
);

/**
 * Dossiers du module Documents. Ils existent **indépendamment** des fichiers :
 * c'est ce qui permet de créer un dossier VIDE puis d'y déposer des documents.
 * `documents.dossier` porte le NOM du dossier (pas de FK) : renommer un dossier
 * met à jour la ligne ici + les documents concernés, en une passe.
 */
export const dossiers = pgTable(
  'dossiers',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('dossiers_foyer_idx').on(t.foyerId), unique('dossiers_foyer_nom').on(t.foyerId, t.nom)],
);

export type LigneDocument = typeof documents.$inferSelect;
export type LigneDossier = typeof dossiers.$inferSelect;
