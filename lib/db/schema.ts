import {
  pgTable,
  uuid,
  text,
  timestamp,
  boolean,
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

export type Foyer = typeof foyers.$inferSelect;
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
    prixPaye: text('prix_paye').notNull().default(''),
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
    rayon: text('rayon').notNull().default(''),
    creeLe: timestamp('cree_le', { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index('courses_foyer_idx').on(t.foyerId)],
);

export type LigneTache = typeof taches.$inferSelect;
export type LigneCourse = typeof courses.$inferSelect;
