# Déploiement — Hub familial (Vercel + connexion Google)

Objectif : mettre l'app en ligne pour l'ouvrir sur le téléphone même PC éteint,
avec un accès protégé (connexion Google restreinte à vos adresses).

Trois briques :
- **Vercel** héberge l'app (gratuit, HTTPS automatique).
- **Compte de service Google** (déjà en place) → lit/écrit vos données (Sheets, Agenda).
- **Client OAuth Google** (nouveau) → sert uniquement à la *connexion* (qui peut ouvrir l'app).

---

## 1. Mettre le code en ligne

`.gitignore` est déjà configuré pour **exclure les secrets** (`.env`,
`credentials.json` ne partent jamais). Git n'est pas installé sur ce PC — choisis
l'option qui te convient :

### Option A — GitHub Desktop (le plus simple, sans ligne de commande)
1. Installer **GitHub Desktop** : https://desktop.github.com
2. *File → Add local repository* → choisir le dossier du projet → *create a repository*.
3. *Publish repository* → cocher **Keep this code private**.
4. Vérifier dans la liste des fichiers que **`.env` et `credentials.json` n'y sont
   PAS** (ils doivent être grisés / ignorés).

### Option B — Vercel CLI (déploie sans GitHub)
1. `npm i -g vercel`
2. Dans le dossier du projet : `vercel` (suivre les invites). Puis passer
   directement à l'étape 3 (les variables d'env se règlent pareil).

### Option C — Git en ligne de commande
Installer Git (https://git-scm.com/download/win), puis :
```powershell
git init; git add -A; git commit -m "Hub familial"
git remote add origin https://github.com/<toi>/hub-familial.git
git branch -M main; git push -u origin main
```

> ⚠ Dans tous les cas : `credentials.json` et `.env` ne doivent JAMAIS se
> retrouver en ligne. Ils sont dans `.gitignore` — vérifie quand même avant de publier.

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

   | Variable | Valeur |
   |---|---|
   | `BUDGET_SHEET_ID` … `EVENEMENTS_SHEET_ID` | les 5 IDs (comme dans `.env`) |
   | `AGENDA_IDS` | les 3 IDs d'agenda séparés par des virgules |
   | `DRIVE_A_CLASSER_URL` | l'URL du dossier Drive |
   | `GOOGLE_CREDENTIALS_JSON` | **tout le contenu** de `credentials.json` (copier-coller le fichier entier) |
   | `AUTH_SECRET` | la valeur générée (dans `.env`), ou en régénérer une |
   | `AUTH_GOOGLE_ID` | le client ID OAuth (étape 2) |
   | `AUTH_GOOGLE_SECRET` | le secret OAuth (étape 2) |
   | `EMAILS_AUTORISES` | vos adresses, ex. `toi@gmail.com,lou@gmail.com` |

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
  = personne ne peut entrer (refus par défaut). Le compte de service et ses accès
  aux Sheets/Agenda ne changent pas.
- **Tester la connexion en local** : renseigner `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET`
  dans `.env` (le client OAuth autorise déjà `localhost:3000`), puis `npm run dev`.
- **Mises à jour** : chaque `git push` sur `main` redéploie automatiquement.
- **Pas encore de mode hors-ligne** (pas de service worker) : l'app a besoin d'une
  connexion internet à l'ouverture.
