# Version vendable (multi-foyer) — guide de mise en route

Ce document pilote le passage de l'app **mono-foyer (Google Sheets)** à un **produit
multi-locataire (SaaS)** où chaque foyer est un client, avec ses données dans une
base Postgres. Décisions actées :

- **Socle** : Postgres + **Auth.js** (on garde la connexion Google + le flux de
  refresh token pour Drive/Agenda) + **Drizzle** (ORM).
- **Toi = client n°1** : à terme, tes données quittent Google Sheets pour la base
  (dogfooding). La migration se fait **module par module**, l'app reste utilisable.
- **Drive + Agenda conservés** : ils passent par Google OAuth (déjà en place),
  indépendamment de la base.

## Où on en est (Phase 0 — fondations)

Posé :
- `lib/db/schema.ts` — tables `foyers`, `utilisateurs`, `membres`, `invitations`.
- `lib/db/index.ts` — client Drizzle **paresseux** (`db()`), + `baseDisponible()`.
  Sans `DATABASE_URL`, rien ne se connecte : l'app continue sur Sheets.
- `drizzle.config.ts` + scripts `db:generate` / `db:migrate` / `db:studio`.

Reste (une fois la base créée) : 1re migration, branchement d'Auth.js sur la base
(créer l'utilisateur + son foyer à la connexion), évolution de `configFoyer()`,
puis migration du module pilote **Cadeaux**.

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

## Une fois `DATABASE_URL` en place

Dis-le-moi — j'enchaîne :

```powershell
npm run db:generate   # génère la 1re migration SQL depuis le schéma
npm run db:migrate    # l'applique à la base Neon
npm run db:studio      # (optionnel) explorateur visuel des tables
```

> ⚠ `drizzle-kit` s'appuie sur `esbuild`, dont le script d'installation a pu être
> bloqué localement. Si `db:generate` échoue là-dessus, on l'autorisera
> (`npm install-scripts approve esbuild`) ou on lancera la migration côté CI.

## Rappels d'architecture pour la suite

- **Isolation** : toute table de données de module portera `foyer_id` (FK vers
  `foyers`), et chaque requête sera **scopée au foyer du user connecté**. Jamais de
  lecture/écriture sans filtre `foyer_id`.
- **`configFoyer()`** ([lib/config.ts](lib/config.ts)) reste le point de bascule :
  il résoudra le foyer courant depuis la base (session → foyer) au lieu de `.env`.
- **Facturation** (phase ultérieure) : Stripe → `foyers.statut_abonnement`,
  accès conditionné à un abonnement actif/essai.
- **RGPD** : hébergement UE (Neon EU + hébergeur UE ou Vercel), export + suppression
  de compte, politique de confidentialité, CGV/CGU.
