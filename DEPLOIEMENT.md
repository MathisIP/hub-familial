# Déploiement — Nestync (Vercel + connexion Google)

> Note : le dépôt GitHub (`MathisIP/hub-familial`) et le projet Google Cloud
> (`hub-familial-app`) gardent leur nom technique historique — seul le **nom
> commercial** de l'app devient **Nestync**.

Objectif : mettre l'app en ligne pour l'ouvrir sur le téléphone même PC éteint,
avec un accès protégé (connexion Google restreinte à vos adresses).

Briques :
- **Vercel** héberge l'app (gratuit, HTTPS automatique).
- **Base Postgres (Neon, UE)** — **source de vérité de tous les modules** (`DATABASE_URL`). Voir [MIGRATION_SAAS.md](MIGRATION_SAAS.md).
- **Compte de service Google** (déjà en place) → **Google Agenda** (module Agenda). *(L'explorateur Drive de l'accueil passe, lui, par le jeton OAuth de l'utilisateur, pas par le compte de service.)*
- **Client OAuth Google** → sert à la *connexion* (qui peut ouvrir l'app) et aux accès Drive de l'utilisateur.

---

## 1. Mettre le code en ligne

**Déjà en place** : le dépôt est sur GitHub (`MathisIP/hub-familial`, branche `main`)
et **chaque `git push` sur `main` redéploie automatiquement sur Vercel**. Le workflow
courant est donc simplement :

```powershell
git add -A; git commit -m "..."; git push origin main
```

`.gitignore` **exclut les secrets** (`.env`, `credentials.json`, `*.b64` ne partent
jamais). Réflexe avant chaque commit :

```powershell
git diff --cached --name-only | Select-String -Pattern '\.env$|credentials|\.b64|gserviceaccount'
```
(aucune ligne = pas de secret sur le point d'être versionné.)

---

## 2. Créer le client OAuth Google (pour la connexion)

Dans la console Google Cloud, projet **hub-familial-app** :

1. **Écran de consentement OAuth** (API et services → Écran de consentement) :
   - Type **Externe**, renseigner un nom d'app + ton e-mail.
   - Ajouter les utilisateurs de test : **vos deux adresses Google** (ou publier l'app).
2. **Identifiants → Créer des identifiants → ID client OAuth** :
   - Type d'application : **Application Web**.
   - **Origines JavaScript autorisées** :
     - `http://localhost:3000`
     - `https://<ton-domaine>.vercel.app` (à compléter après le 1er déploiement)
   - **URI de redirection autorisés** :
     - `http://localhost:3000/api/auth/callback/google`
     - `https://<ton-domaine>.vercel.app/api/auth/callback/google`
   - Récupérer le **client ID** et le **secret**.

> Tu pourras revenir compléter le domaine Vercel exact après l'étape 3.

---

## 3. Déployer sur Vercel

1. Se connecter sur https://vercel.com avec GitHub.
2. **Add New → Project** → importer le dépôt `hub-familial`. Framework détecté :
   Next.js (rien à configurer côté build).
3. **Variables d'environnement** (Settings → Environment Variables) — tout ceci :

   | Variable | Valeur | Requis |
   |---|---|---|
   | `DATABASE_URL` | chaîne Postgres Neon (pooled, `sslmode=require`) — **source de vérité** | ✅ |
   | `AUTH_SECRET` | la valeur générée (dans `.env`), ou en régénérer une | ✅ |
   | `AUTH_GOOGLE_ID` | le client ID OAuth (étape 2) | ✅ |
   | `AUTH_GOOGLE_SECRET` | le secret OAuth (étape 2) | ✅ |
   | `EMAILS_AUTORISES` | vos adresses, ex. `toi@gmail.com,lou@gmail.com` | ✅ |
   | `GOOGLE_CREDENTIALS_JSON` | **tout le contenu** de `credentials.json` (Agenda) | ✅ |
   | `AGENDA_IDS` | IDs d'agenda séparés par des virgules | selon usage |
   | `DRIVE_HUB_URL` | URL du dossier Drive racine (explorateur) | selon usage |
   | `DRIVE_A_CLASSER_URL` | URL du dossier Drive « À classer » (import) | selon usage |
   | `STRIPE_SECRET_KEY` / `STRIPE_PRICE_ID` / `STRIPE_WEBHOOK_SECRET` | abonnement — voir [STRIPE.md](STRIPE.md) | pour facturer |

   > ⚠ Sans `DATABASE_URL`, l'app ne peut charger aucun module (la base est la source
   > de vérité). Sans `STRIPE_SECRET_KEY`, l'accès n'est **pas** verrouillé (facturation off).

4. **Deploy**. Noter le domaine attribué (`https://xxx.vercel.app`).
5. Retourner à l'étape 2 : ajouter ce domaine dans **Origines** et **URI de
   redirection** du client OAuth, puis enregistrer.

---

## 4. Vérifier

- Ouvrir `https://<ton-domaine>.vercel.app` → doit rediriger vers **/connexion**.
- « Se connecter avec Google » → seul un compte de `EMAILS_AUTORISES` est accepté
  (les autres sont refusés).
- Une fois connecté : l'accueil, les 6 modules et l'agenda fonctionnent.
- Sur le téléphone : ouvrir l'URL, se connecter, puis **« Ajouter à l'écran
  d'accueil »**. L'app s'ouvre en plein écran avec l'icône maison, PC éteint.

---

## Notes

- **Sécurité** : la liste blanche `EMAILS_AUTORISES` est le garde-fou. Liste vide
  = personne ne peut entrer (refus par défaut). Le compte de service (Agenda) ne change pas.
- **Tester la connexion en local** : renseigner `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
  dans `.env` (le client OAuth autorise déjà `localhost:3000`), puis `npm run dev`.
- **Mises à jour** : chaque `git push` sur `main` redéploie automatiquement.
- **Mode hors-ligne** : un service worker met en cache la coquille de l'app → elle
  **s'ouvre sans réseau** (les données, elles, viennent des API à la requête).
- **Pour finaliser le lancement** (domaine, OAuth en production, stores, RGPD) :
  voir le guide dédié `docs/GUIDE_FINALISATION.pdf` (hors dépôt, sur ta machine).
