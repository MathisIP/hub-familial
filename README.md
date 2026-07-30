# Nestync

Application **PWA** (Next.js 15 / React 19 / TypeScript) qui centralise l'organisation
d'un foyer. Pensée **privée d'abord**, puis **multi-foyer / vendable** (SaaS).

Six modules, tous adossés à une base **Postgres** (Neon, région UE), multi-locataire
(chaque requête est scopée `foyer_id`) :

- **Budget** — comptes, transactions, budgets par catégorie, échéances (dashboard recalculé côté serveur).
- **To-Do & Courses** — tâches (récurrences répliquées) et liste de courses partagée.
- **Repas** — planning de la semaine (entrée/plat/dessert) et recettes avec quantités mises à l'échelle.
- **Événements** — réceptions, budget, synchro Google Agenda.
- **Cadeaux** — idées, budget et suivi par occasion.
- **Agenda** — agenda familial (Google Calendar, plusieurs agendas fusionnés).

> Historique : le projet est né par-dessus 5 classeurs Google Sheets. **Tous les
> modules ont migré en base** ; le code Sheets a été retiré. Restent branchés sur
> Google, comme services externes : **Agenda** (Calendar) et **Drive** (explorateur + import).

## Stack

- **Next.js App Router** (server components + îlots client, `server-only`).
- **Drizzle ORM** + **postgres.js** sur **Neon** (UE).
- **Auth.js v5** + Google OAuth (accès restreint par liste blanche en phase privée ;
  jetons OAuth pour Drive/Agenda).
- **Stripe** — abonnement par foyer.
- **PWA** — installable (iOS/Android/PC), service worker (coquille hors-ligne), thèmes
  clair/sombre + gammes de couleur, i18n (FR complet, EN quasi complet).

## Commandes

```powershell
npm run dev          # Serveur de dev (http://localhost:3000)
npm run build        # Build de prod (vérifie aussi les types)
npm run lint         # ESLint
npm run db:generate  # Génère une migration Drizzle depuis lib/db/schema.ts
npm run db:migrate   # Applique les migrations à la base (Neon)
npm run db:studio    # Explorateur Drizzle Studio
```

## Configuration

Copier `.env.example` vers `.env` et renseigner. Variable **requise** : `DATABASE_URL`
(Postgres Neon). Voir le tableau complet dans [DEPLOIEMENT.md](DEPLOIEMENT.md).

⚠ `.env`, `credentials.json` et tout fichier de secret **ne sont jamais versionnés**
(`.gitignore`).

## Documentation

- [CLAUDE.md](CLAUDE.md) — architecture, règles non négociables, état d'avancement (référence).
- [DEPLOIEMENT.md](DEPLOIEMENT.md) — mise en ligne Vercel + connexion Google + variables d'env.
- [MIGRATION_SAAS.md](MIGRATION_SAAS.md) — base Postgres (multi-foyer) & gestion des migrations.
- [STRIPE.md](STRIPE.md) — configuration de l'abonnement.

## Déploiement

Hébergé sur **Vercel** : chaque `git push` sur `main` redéploie automatiquement.
