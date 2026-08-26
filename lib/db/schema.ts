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
   * Périodicité souscrite : `mensuel` ou `annuel` (`null` tant qu'aucun
   * abonnement payant n'existe).
   *
   * ⚠ Renseignée depuis l'INTERVALLE Stripe (`price.recurring.interval`), pas
   * par comparaison d'identifiants de tarif : créer un nouveau prix — une hausse,
   * une promotion — change l'identifiant mais pas l'intervalle. Une comparaison
   * d'identifiants cesserait silencieusement de reconnaître les annuels, et
   * l'avis obligatoire ne partirait plus.
   *
   * ⚠ Seuls les ANNUELS reçoivent l'avis de reconduction de l'article L. 215-1 :
   * cette colonne est ce qui les distingue.
   */
  offre: text('offre'),
  /**
   * Prise en main effectuée (nom du foyer choisi, proches invités) ?
   * ⚠ Défaut `true` À DESSEIN : les foyers déjà en service ne doivent pas se
   * voir imposer l'onboarding. Ce sont les foyers NOUVELLEMENT créés qui posent
   * explicitement `false` (cf. `foyerCourant`).
   */
  onboardingFait: boolean('onboarding_fait').notNull().default(true),
  /**
   * Date à laquelle l'abonné a demandé l'exécution immédiate du service et
   * reconnu perdre son droit de rétractation (art. L221-25 du code de la
   * consommation, repris à l'article 8 des CGV).
   *
   * ⚠ C'est une PREUVE, pas un confort : sans cette reconnaissance recueillie
   * AVANT le paiement, le délai de rétractation de 14 jours court normalement
   * et l'abonnement peut être annulé avec remboursement. On horodate donc le
   * consentement au moment où il est donné.
   */
  retractationRenonceeLe: timestamp('retractation_renoncee_le', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

/** Un utilisateur (identité de connexion), indépendamment de son/ses foyers. */
export const utilisateurs = pgTable('utilisateurs', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  nom: text('nom'),
  image: text('image'),
  /**
   * Dernière venue observée. Sert à repérer les comptes abandonnés : le RGPD
   * demande une durée de conservation bornée, ce qui suppose de savoir qui est
   * inactif — impossible sans cette colonne.
   *
   * ⚠ Écrite au plus une fois par jour et par personne (`SEUIL_CONNEXION` dans
   * [lib/foyer.ts]) : la résolution de l'utilisateur est sur le chemin critique
   * de CHAQUE page et de CHAQUE route d'API. Une écriture à chaque requête
   * annulerait le travail d'optimisation fait sur `foyerCourant()`.
   *
   * `null` = jamais observée depuis l'ajout de la colonne. Ne PAS traiter un
   * `null` comme « inactif depuis toujours » : ce sont des comptes bien vivants
   * dont on n'a simplement pas encore la trace.
   */
  derniereConnexion: timestamp('derniere_connexion', { withTimezone: true }),
  /**
   * Date d'envoi de la relance annonçant la suppression du compte inactif.
   *
   * ⚠ **Remise à `null` dès que la personne revient** (cf. `marquerPassage`) :
   * sans cela, quelqu'un qui reviendrait puis redeviendrait inactif des années
   * plus tard serait supprimé **immédiatement**, sans nouvelle relance — le
   * préavis n'aurait servi qu'une fois dans la vie du compte.
   */
  relanceInactiviteLe: timestamp('relance_inactivite_le', { withTimezone: true }),
  creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
});

/**
 * MARQUEUR DE BAC À SABLE — une seule ligne, jamais présente en production.
 *
 * ⚠ C'est un garde-fou d'exécution, pas de la documentation. Les scripts qui
 * écrivent des données FICTIVES (`npm run bac:garnir`) refusent de s'exécuter si
 * cette ligne est absente : impossible, même en collant la mauvaise chaîne de
 * connexion, de déverser un foyer de démonstration sur les données d'un client.
 *
 * Poser le marqueur est un geste explicite (`npm run bac:init`) qu'on ne fait
 * que sur sa base de développement. La production ne l'a pas, et ne doit jamais
 * l'avoir — c'est la seule chose qui distingue les deux bases de façon fiable,
 * une URL pouvant toujours être recopiée de travers.
 */
export const bacASable = pgTable('bac_a_sable', {
  id: uuid('id').primaryKey().defaultRandom(),
  note: text('note').notNull().default(''),
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

/* ========================== NOTIFICATIONS PUSH ========================== */
/**
 * Un appareil abonné aux notifications. Une personne peut en avoir plusieurs
 * (téléphone, tablette, PC), d'où la clé sur `endpoint` et non sur l'utilisateur.
 *
 * ⚠ `endpoint` est unique GLOBALEMENT, pas par foyer : c'est une URL fournie par
 * le navigateur, déjà unique au monde. La contrainte protège du doublon quand un
 * même appareil se réabonne — cas courant, le navigateur pouvant renouveler
 * l'abonnement sans prévenir.
 *
 * ⚠ Ces lignes sont des données personnelles (elles identifient un appareil) :
 * cascade sur l'utilisateur, pour qu'un compte supprimé n'en laisse aucune.
 */
export const abonnementsPush = pgTable(
  'abonnements_push',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    endpoint: text('endpoint').notNull().unique(),
    p256dh: text('p256dh').notNull(),
    auth: text('auth').notNull(),
    /** Libellé indicatif de l'appareil, pour que la personne s'y retrouve. */
    appareil: text('appareil').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('abonnements_push_utilisateur_idx').on(t.utilisateurId)],
);

/**
 * Ce que chaque personne accepte de recevoir.
 *
 * ⚠ `echeances` est à **false** par défaut, contrairement aux deux autres. Une
 * notification financière s'affiche sur un écran verrouillé, visible de
 * quiconque tient le téléphone : on ne l'active que si la personne le demande
 * explicitement. Les rappels d'anniversaire n'ont pas cette sensibilité.
 */
export const preferencesNotif = pgTable(
  'preferences_notif',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    /** « La liste de courses est prête » — envoyé à la demande, pas automatique. */
    courses: boolean('courses').notNull().default(true),
    /** Rappel la veille d'une occasion ou d'un événement. */
    evenements: boolean('evenements').notNull().default(true),
    /** Rappel la veille d'une échéance financière. Opt-in explicite. */
    echeances: boolean('echeances').notNull().default(false),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('preferences_notif_foyer_utilisateur').on(t.foyerId, t.utilisateurId)],
);

export type LigneAbonnementPush = typeof abonnementsPush.$inferSelect;
export type LignePreferencesNotif = typeof preferencesNotif.$inferSelect;

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
 * `ajoutePar` : l'utilisateur dont le jeton Google donne accès au calendrier.
 *
 * ⚠ **Obligatoire depuis le 06/08/2026** (migration 0021). La colonne acceptait
 * `null`, ce qui signifiait « accès par le compte de service ». Ce dernier ayant
 * été retiré — il imposait le scope `auth/calendar`, le plus large de l'API,
 * intenable face au principe de moindre privilège exigé à la vérification
 * Google — un rattachement sans `ajoute_par` ne mène plus nulle part.
 *
 * `onDelete: 'cascade'` et non `set null` : le rattachement ne vaut que tant que
 * la personne dont il porte le jeton existe. La mettre à `null` fabriquerait
 * exactement le genre de ligne morte que cette migration supprime.
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
    ajoutePar: uuid('ajoute_par')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    /**
     * `foyer` (défaut) ou `restreint` — cf. [lib/visibilite.ts].
     * ⚠ Réglé par CELUI QUI A RATTACHÉ (`ajoute_par`), pas par le propriétaire du
     * foyer : c'est son compte Google et ses événements. Personne d'autre n'a à
     * décider qui lit l'agenda professionnel de quelqu'un.
     */
    partage: text('partage').notNull().default('foyer'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index('foyer_agendas_foyer_idx').on(t.foyerId),
    unique('foyer_agendas_foyer_cal').on(t.foyerId, t.calendarId),
  ],
);

/** Qui a accès à un agenda `restreint`. Voir `comptesAcces` pour le motif. */
export const agendasAcces = pgTable(
  'agendas_acces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    agendaId: uuid('agenda_id')
      .notNull()
      .references(() => foyerAgendas.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('agendas_acces_agenda_utilisateur').on(t.agendaId, t.utilisateurId),
    index('agendas_acces_foyer_idx').on(t.foyerId),
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
    /*
     * Le masquage vit dans `cadeaux_masques` (plusieurs personnes possibles) —
     * voir cette table. `pour_qui` (texte libre) reste ici : beaucoup de cadeaux
     * visent des gens hors du foyer (« Mamie »), sans compte utilisateur.
     */
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
/**
 * LISTE NOIRE : qui ne doit PAS voir ce cadeau.
 *
 * ⚠ Plusieurs personnes, et c'est le cas courant : les enfants qui préparent un
 * cadeau commun doivent le cacher aux DEUX parents. Une seule colonne
 * `masque_a` ne couvrait que la moitié des situations.
 *
 * ⚠ Pourquoi une liste noire et pas une liste blanche comme les comptes ou les
 * dossiers : un cadeau doit rester visible du foyer ENTIER, y compris de
 * quelqu'un qui le rejoint après la saisie. Une liste blanche le lui masquerait
 * — contresens exact de ce qu'on veut. La surprise doit survivre à l'arrivée
 * d'un nouveau membre.
 *
 * `cascade` sur l'utilisateur : si la personne quitte le foyer, le cadeau
 * redevient simplement visible de tous plutôt que de disparaître.
 */
export const cadeauxMasques = pgTable(
  'cadeaux_masques',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    cadeauId: uuid('cadeau_id')
      .notNull()
      .references(() => cadeaux.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('cadeaux_masques_cadeau_utilisateur').on(t.cadeauId, t.utilisateurId),
    index('cadeaux_masques_foyer_idx').on(t.foyerId),
  ],
);

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

/**
 * SOUS-LISTES D'UN ÉVÉNEMENT — invités, checklist, menu & courses.
 * ===============================================================
 * Reprennent les trois sous-onglets du classeur d'origine, qui référençaient
 * l'événement par son **nom** (deux événements homonymes mélangeaient donc leurs
 * invités, et renommer un événement orphelinait ses listes). Ici, le lien est un
 * `evenement_id` avec cascade : plus d'ambiguïté, et supprimer un événement
 * emporte ses listes.
 *
 * ⚠ `foyer_id` est porté **en plus** de `evenement_id`, alors qu'il serait
 * déductible par jointure. C'est délibéré : la règle d'isolation impose un
 * `where foyer_id = …` sur CHAQUE requête, et l'oublier ici — sur une table
 * atteinte par un identifiant venant du client — laisserait lire les invités
 * d'un autre foyer. Une colonne redondante vaut mieux qu'une fuite.
 */

/** Réponse d'un invité. Liste fermée : sert au décompte des confirmés. */
export const RSVP = ['Oui', 'Non', 'Peut-être', 'Sans réponse'] as const;

export const evInvites = pgTable(
  'ev_invites',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    evenementId: uuid('evenement_id')
      .notNull()
      .references(() => evenements.id, { onDelete: 'cascade' }),
    nom: text('nom').notNull(),
    contact: text('contact').notNull().default(''), // e-mail ou téléphone, saisie libre
    rsvp: text('rsvp').notNull().default('Sans réponse'),
    /** Nombre de personnes que cette réponse couvre (un couple, une famille…). */
    nbPersonnes: integer('nb_personnes').notNull().default(1),
    note: text('note').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ev_invites_evenement_idx').on(t.evenementId)],
);

export const evChecklist = pgTable(
  'ev_checklist',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    evenementId: uuid('evenement_id')
      .notNull()
      .references(() => evenements.id, { onDelete: 'cascade' }),
    tache: text('tache').notNull(),
    responsable: text('responsable').notNull().default(''),
    echeance: text('echeance').notNull().default(''), // jj/mm/aaaa, comme le reste du module
    fait: boolean('fait').notNull().default(false),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ev_checklist_evenement_idx').on(t.evenementId)],
);

export const evMenu = pgTable(
  'ev_menu',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    evenementId: uuid('evenement_id')
      .notNull()
      .references(() => evenements.id, { onDelete: 'cascade' }),
    libelle: text('libelle').notNull(),
    quantite: text('quantite').notNull().default(''),
    /** Coût estimé, en texte comme partout dans ce module (saisie libre). */
    cout: text('cout').notNull().default(''),
    achete: boolean('achete').notNull().default(false),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('ev_menu_evenement_idx').on(t.evenementId)],
);

/**
 * MESSAGES REÇUS VIA LA PAGE D'AIDE.
 * =================================
 * ⚠ Enregistrés EN BASE, et pas seulement expédiés par courriel. Les mentions
 * légales et la politique de confidentialité promettent une réponse sous 30 jours
 * pour les demandes relatives aux données : un courriel égaré ou classé en
 * indésirable, et le délai court sans qu'on le sache. La base sert de preuve
 * horodatée — de ce qui a été demandé, et de quand.
 *
 * `foyerId` est **nullable** à dessein : quelqu'un qui n'arrive pas à se
 * connecter, ou qui n'a pas encore de compte, doit pouvoir écrire. C'est même le
 * cas où l'aide est la plus nécessaire.
 *
 * ⚠ Contient des données personnelles fournies librement (nom, e-mail, et un
 * message dont on ne maîtrise pas le contenu). Durée de conservation bornée :
 * voir la purge dans [lib/maintenance.ts].
 */
export const SUJETS_CONTACT = ['question', 'probleme', 'donnees', 'facturation', 'autre'] as const;

export const messagesContact = pgTable(
  'messages_contact',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    /** Foyer de l'expéditeur s'il était connecté ; `null` sinon. */
    foyerId: uuid('foyer_id').references(() => foyers.id, { onDelete: 'set null' }),
    email: text('email').notNull(),
    nom: text('nom').notNull().default(''),
    sujet: text('sujet').notNull().default('question'),
    message: text('message').notNull(),
    /** Marqué à la main quand la demande a été traitée (suivi des délais). */
    traite: boolean('traite').notNull().default(false),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('messages_contact_cree_idx').on(t.creeLe)],
);

export type LigneMessageContact = typeof messagesContact.$inferSelect;

export type LigneEvInvite = typeof evInvites.$inferSelect;
export type LigneEvChecklist = typeof evChecklist.$inferSelect;
export type LigneEvMenu = typeof evMenu.$inferSelect;

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
    /**
     * Qui voit ce compte : `foyer` (tous les membres) ou `restreint` (seulement
     * les personnes listées dans `comptes_acces`).
     *
     * ⚠ Le défaut `foyer` est délibéré : les comptes déjà en service, et ceux
     * créés sans se poser la question, restent visibles de tout le foyer. Un
     * défaut `restreint` aurait fait disparaître leur budget aux yeux de tous
     * les foyers existants le jour de la migration.
     */
    partage: text('partage').notNull().default('foyer'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('comptes_foyer_idx').on(t.foyerId)],
);

/**
 * Qui a accès à un compte `restreint`. Une ligne = une personne autorisée.
 *
 * Le besoin : dans une famille, les parents voient tout et chaque enfant ne voit
 * que son compte ; en colocation, chacun ne voit que le sien plus le compte
 * commun. Un simple rôle ne suffisait pas (deux parents, un seul propriétaire).
 *
 * ⚠ `foyer_id` est porté EN PLUS de `compte_id`, redondant par jointure : la
 * règle d'isolation impose un `where foyer_id` sur chaque requête, et les
 * routes de réglage reçoivent un identifiant venu du client.
 *
 * ⚠ Aucun privilège implicite : le propriétaire du foyer ne voit PAS les comptes
 * restreints dont il n'est pas membre. Il peut seulement en régler le partage —
 * administrer n'est pas lire. Sans cela, le cas colocation serait vide de sens.
 */
export const comptesAcces = pgTable(
  'comptes_acces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    compteId: uuid('compte_id')
      .notNull()
      .references(() => comptes.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('comptes_acces_compte_utilisateur').on(t.compteId, t.utilisateurId),
    index('comptes_acces_foyer_idx').on(t.foyerId),
  ],
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
    /**
     * Compte rattaché — l'échéance hérite alors de SA visibilité. `null` (défaut)
     * = échéance commune, visible de tout le foyer.
     *
     * ⚠ `set null` et non `cascade` : fermer un compte ne doit pas effacer
     * « assurance habitation », qui reste due. L'échéance redevient commune.
     */
    compteId: uuid('compte_id').references(() => comptes.id, { onDelete: 'set null' }),
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
    /**
     * `foyer` (défaut) ou `restreint` — cf. [lib/visibilite.ts]. Réglé par le
     * propriétaire du foyer (les dossiers n'ont pas de créateur enregistré).
     *
     * ⚠ Le lien vers les fichiers est `documents.dossier`, du **TEXTE**, pas une
     * clé étrangère (voir le commentaire de `documents`). Restreindre un dossier
     * n'a donc de sens que si l'on garde fermées les deux portes latérales :
     * déplacer un fichier HORS d'un dossier restreint, et en faire entrer un
     * DEDANS en tapant son nom. Les deux sont contrôlées dans
     * [lib/documents/service.ts].
     */
    partage: text('partage').notNull().default('foyer'),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('dossiers_foyer_idx').on(t.foyerId), unique('dossiers_foyer_nom').on(t.foyerId, t.nom)],
);

/** Qui a accès à un dossier `restreint`. Voir `comptesAcces` pour le motif. */
export const dossiersAcces = pgTable(
  'dossiers_acces',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    dossierId: uuid('dossier_id')
      .notNull()
      .references(() => dossiers.id, { onDelete: 'cascade' }),
    utilisateurId: uuid('utilisateur_id')
      .notNull()
      .references(() => utilisateurs.id, { onDelete: 'cascade' }),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    unique('dossiers_acces_dossier_utilisateur').on(t.dossierId, t.utilisateurId),
    index('dossiers_acces_foyer_idx').on(t.foyerId),
  ],
);

export type LigneDocument = typeof documents.$inferSelect;
export type LigneDossier = typeof dossiers.$inferSelect;

/**
 * Comptes du PROJET (dépenses engagées, recettes à venir).
 *
 * ⚠ **Volontairement SANS `foyer_id`** — et c'est la seule table dans ce cas.
 * Ce ne sont pas des données de foyer mais la comptabilité du porteur de projet :
 * les autres membres de son propre foyer n'ont aucune raison de la voir. La
 * règle d'isolation par foyer ne s'applique donc pas ici ; l'accès est gardé
 * autrement, par l'adresse déclarée dans `EMAIL_ADMIN` ([lib/comptes/service.ts]).
 *
 * ⚠ La **source de vérité reste le fichier** `comptes.json` tenu hors dépôt ;
 * cette table n'en est qu'une copie, remplacée intégralement à chaque
 * `npm run comptes`. Ne jamais écrire ici depuis l'application.
 *
 * `montant` est en **centimes** (entier) : un flottant qui traîne finit toujours
 * par afficher 20,999999 €. `null` = montant pas encore renseigné.
 */
export const mouvementsProjet = pgTable('mouvements_projet', {
  id: text('id').primaryKey(), // l'identifiant lisible du fichier, pas un UUID
  date: text('date').notNull(), // aaaa-mm-jj — premier paiement si récurrent
  libelle: text('libelle').notNull(),
  categorie: text('categorie').notNull().default(''),
  sens: text('sens').notNull(), // 'depense' | 'recette'
  montantCentimes: integer('montant_centimes'), // null = à compléter
  recurrence: text('recurrence'), // null | 'mensuel' | 'annuel'
  fin: text('fin'), // aaaa-mm-jj ou null (toujours actif)
  note: text('note').notNull().default(''),
});

export type LigneMouvementProjet = typeof mouvementsProjet.$inferSelect;


/**
 * TRACE DES AVIS DE RECONDUCTION (article L. 215-1).
 *
 * ⚠ CETTE TABLE EST UNE PREUVE, PAS UN CONFORT TECHNIQUE. En cas de litige,
 * c'est au professionnel de démontrer qu'il a informé le consommateur dans la
 * fenêtre légale. Un envoi dont il ne reste aucune trace ne prouve rien : le
 * client serait fondé à résilier gratuitement et à se faire rembourser tout ce
 * qui a été prélevé depuis la reconduction.
 *
 * ⚠ Elle sert AUSSI d'idempotence. Le ménage quotidien peut être rejoué — une
 * reprise après incident, deux déclenchements le même jour — et un avis en
 * double se lit comme une erreur de facturation. L'unicité
 * `(foyer, échéance, type)` rend le second envoi impossible plutôt
 * qu'improbable.
 *
 * L'adresse servie est conservée telle quelle : la preuve porte sur ce qui a
 * été envoyé ce jour-là, pas sur l'adresse actuelle du compte, qui peut changer.
 */
export const avisReconduction = pgTable(
  'avis_reconduction',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    foyerId: uuid('foyer_id')
      .notNull()
      .references(() => foyers.id, { onDelete: 'cascade' }),
    /** Date de reconduction visée — ce qui distingue l'avis d'une année sur l'autre. */
    echeance: timestamp('echeance', { withTimezone: true }).notNull(),
    /** `legal` (45 j, l'avis obligatoire) ou `rappel` (7 j, filet). */
    type: text('type').notNull(),
    /** Adresse réellement servie, gardée comme élément de preuve. */
    email: text('email').notNull(),
    envoyeLe: timestamp('envoye_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique('avis_reconduction_foyer_echeance_type').on(t.foyerId, t.echeance, t.type)],
);
