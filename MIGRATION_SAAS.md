# Version vendable (multi-foyer) — état & mise en route base

Ce document a piloté le passage de l'app **mono-foyer (Google Sheets)** à un **produit
multi-locataire (SaaS)** où chaque foyer est un client, avec ses données dans une
base Postgres. Décisions actées :

- **Socle** : Postgres + **Auth.js** (on garde la connexion Google + le flux de
  refresh token pour Drive/Agenda) + **Drizzle** (ORM).
- **Drive + Agenda conservés** : ils passent par Google OAuth (déjà en place),
  indépendamment de la base.

## ✅ Migration TERMINÉE (état actuel)

**Les 6 modules sont sur Postgres.** Google Sheets n'est plus utilisé (le code Sheets
a été retiré — voir « Ménage Sheets » dans [CLAUDE.md](CLAUDE.md)). En place :

- `lib/db/schema.ts` — toutes les tables, chacune scopée `foyer_id` : socle (`foyers`,
  `utilisateurs`, `membres`, `invitations`) + données des modules (comptes, transactions,
  budget_categories, echeances, taches, courses, recettes, semaine, evenements, cadeaux,
  occasions).
- `lib/db/index.ts` — client Drizzle **paresseux** (`db()`) + `baseDisponible()`.
- `lib/foyer.ts` — `idFoyerCourant()` / `utilisateurCourant()`, provisionnement du
  foyer à la 1re connexion ; chaque requête de module scope au foyer courant.
- `drizzle.config.ts` + scripts `db:generate` / `db:migrate` / `db:studio` + migrations
  dans `lib/db/migrations/`.
- Complété par : **RGPD** (export + suppression, page confidentialité), **Stripe**
  (abonnement par foyer, voir [STRIPE.md](STRIPE.md)), **membres/invitations** (page
  « Mon foyer »).

> ⚠ `DATABASE_URL` est désormais **requis** (local **et** Vercel) : sans lui, aucun
> module ne charge. La section ci-dessous reste la référence pour (re)créer la base.

Reste ouvert (extensions) : onboarding (nom du foyer à la 1re connexion), sous-listes
Événements (invités/checklist/menu) en base, i18n es/de/it.

## Ce que TU dois faire : créer la base Neon

1. Crée un compte sur **https://neon.tech** (offre gratuite suffisante pour démarrer).
2. **New Project** → choisis une **région Europe** (ex. `Europe (Frankfurt)`) pour
   le RGPD → crée le projet.
3. Dans **Connection Details**, copie la chaîne **Pooled connection** (elle contient
   `-pooler` et finit par `?sslmode=require`).
4. Colle-la dans `.env` :

   ```
   DATABASE_URL=postgresql://<user>:<password>@<host>-pooler.<region>.aws.neon.tech/<db>?sslmode=require
   ```

5. Plus tard (déploiement) : ajoute la **même** variable dans Vercel
   (Project → Settings → Environment Variables).

## Gestion de la base (migrations)

Le schéma vit dans `lib/db/schema.ts`. Après toute modification :

```powershell
npm run db:generate   # génère une migration SQL depuis le schéma (lib/db/migrations/)
npm run db:migrate    # applique les migrations en attente à la base Neon
npm run db:studio     # (optionnel) explorateur visuel des tables
```

> ⚠ `drizzle-kit` s'appuie sur `esbuild`, dont le script d'installation a pu être
> bloqué localement. Si `db:generate` échoue là-dessus, on l'autorisera
> (`npm install-scripts approve esbuild`) ou on lancera la migration côté CI.

## Rappels d'architecture pour la suite

- **Isolation** : toute table de données de module porte `foyer_id` (FK vers
  `foyers`), et chaque requête est **scopée au foyer du user connecté** via
  `idFoyerCourant()` ([lib/foyer.ts](lib/foyer.ts)). Jamais de lecture/écriture sans
  filtre `foyer_id`.
- **`configFoyer()`** ([lib/config.ts](lib/config.ts)) ne porte plus que la config des
  services Google externes (agendas) ; le scope des **données** se fait par `idFoyerCourant()`.
- **Facturation** : Stripe → `foyers.statut_abonnement`, accès conditionné à un
  abonnement actif/essai (en place, voir [STRIPE.md](STRIPE.md)).
- **RGPD** : hébergement UE (Neon EU + hébergeur UE ou Vercel), export + suppression
  de compte, politique de confidentialité, CGV/CGU.
