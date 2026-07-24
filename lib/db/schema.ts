import {
  pgTable,
  uuid,
  text,
  timestamp,
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
