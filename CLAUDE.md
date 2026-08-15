# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Langue

Projet, code, commentaires et réponses en **français**.

## Ce qu'est ce projet

**Nestync** (anciennement « Hub familial ») : application PWA (Next.js) qui remplace un ancien « Site QG » Google Sites, portail unifié des modules du foyer (Budget, ToDo, Repas, Événements, Cadeaux, Agenda). **La source de vérité est désormais Postgres (Neon, UE)**, multi-foyer, scopé `foyer_id`. Le projet est né par-dessus **5 classeurs Google Sheets** (pilotés par des Apps Script) mais **tous les modules ont migré en base** ; les Sheets ne sont plus lus ni écrits par l'app (le code Sheets a été retiré, voir « Ménage Sheets » plus bas). Reste branché sur Google, comme **service externe** (pas comme base) : **Google Agenda** (module Agenda). Les **fichiers** ne passent plus par Google Drive mais par le **module Documents** (stockage propre) — voir plus bas.

Ambition produit : **privé d'abord** (le foyer), puis **distribuable à d'autres foyers**. Cette contrainte de revente dicte l'architecture — voir « Règles d'architecture » plus bas.

**Nommage (30/07/2026)** : le **nom commercial** est **Nestync** (partout dans l'UI, les métadonnées, le manifest). Gardent leur **nom technique historique** (ce sont des ressources réelles, ne pas renommer) : le **dépôt GitHub** `hub-familial`, le **projet Google Cloud** `hub-familial-app`, le **compte de service** `claude-sheet-access@hub-familial-app…`, le **dossier Drive** « Hub Familial », et les **clés de stockage local/cookies** `hub-*` (`hub-theme`, `hub-neon`, `hub-nom`, `hub-langue`, `hub-install-ios`) — inchangées pour ne pas réinitialiser les préférences des utilisateurs existants.

Le contexte complet est dans [Contexte/Recapitulatif_projet_et_objectifs.md](Contexte/Recapitulatif_projet_et_objectifs.md). Les `Contexte/*/​*.gs` sont les **Apps Script d'origine** (jamais déployés par l'app) : ils gardent leur valeur d'archive (schéma métier, thèmes, i18n d'origine) mais **ne décrivent plus la source de vérité** — celle-ci est le schéma Drizzle [lib/db/schema.ts](lib/db/schema.ts).

## Commandes

```powershell
npm run dev          # Serveur de dev (http://localhost:3000)
npm run build        # Build de prod — vérifie aussi les types TypeScript
npm run lint         # ESLint (next lint)
npm run db:generate  # Génère une migration Drizzle depuis lib/db/schema.ts
npm run db:migrate   # Applique les migrations à la base (Neon)
npm run db:studio    # Explorateur Drizzle Studio (base du foyer)

# --- Bac à sable local (voir la section PUBLICATION juste en dessous) ---
npm run bac:init     # Arme une base de dev (pose le marqueur bac_a_sable)
npm run bac:garnir   # Remplit le foyer fictif « Foyer Lambert »
npm run bac:reset    # db:migrate + bac:garnir
npm run verif:isolation  # Contrôles « qui voit quoi » (refuse hors bac à sable)
```

## ⚠ PUBLICATION — bac à sable local avant la production (15/08/2026)

**Nestync a des clients réels. Plus rien ne part directement en production.**

Cycle imposé : **bac à sable local** (`npm run dev`, base séparée, données fictives) →
Mathis teste → **il décide** → promotion en production.

| Interdit de sa propre initiative | À faire à la place |
|---|---|
| `git push origin main` | pousser sur la branche de travail |
| `npm run db:migrate` sur la base de prod | migrer le bac à sable |
| Annoncer « c'est en ligne » | donner le protocole de test |

⚠ **Le piège d'origine** : `.env` ne contenait qu'un seul `DATABASE_URL`, celui de la
**production**. `npm run dev` en local travaillait donc sur les données des clients, sans
que rien ne le signale. Trois protections, par ordre d'importance :

1. **Marqueur en base** — table `bac_a_sable`. `bac:garnir` et `verif:isolation` refusent
   de démarrer sans lui. Le test ne porte **pas sur l'URL** : une chaîne de connexion se
   recopie de travers, et c'est justement l'erreur à rendre impossible.
2. **Bandeau permanent** en développement ([BandeauBacASable.tsx](components/BandeauBacASable.tsx)) :
   vert « bac à sable », rouge « BASE DE PRODUCTION ».
3. **`.env.local` prioritaire sur `.env`** — pour l'app (Next.js), les scripts
   ([scripts/_env.mjs](scripts/_env.mjs)) **et** drizzle-kit. Sans ça, `dev` viserait le
   bac à sable pendant que `db:migrate` modifierait la production.

Commandes : `bac:init` (arme la base), `bac:garnir` (foyer fictif « Foyer Lambert »),
`bac:reset` (migre + garnit), `verif:isolation` (contrôles « qui voit quoi »).

⚠ **`STOCKAGE_LOCAL`** met les fichiers du module Documents sur le disque
([lib/stockage/index.ts](lib/stockage/index.ts)). Sans lui, tester Documents en local
viserait le **vrai** conteneur OVH — et une suppression y détruirait le fichier d'un client.
Ne s'active jamais en production (double condition avec `NODE_ENV`).

⚠ **`npm run build` n'applique PAS les migrations** (`drizzle-kit migrate` est manuel).
C'est une protection : aucun déploiement ne change le schéma tout seul. C'est aussi une
responsabilité : ne pas se tromper de base.

- **Un protocole de test accompagne chaque livraison** : quoi ouvrir, quoi observer, et
  surtout **ce qui doit échouer**. Les contrôles d'isolation se vérifient en direct sur les
  API — un filtre d'interface ne prouve rien.
- Contrôle des secrets avant chaque commit : `.env`, `.env.local`, `credentials.json`,
  `*.b64`, `gserviceaccount` ne doivent jamais être indexés.

⚠ **`DOCUMENTS_SECRET` est OBLIGATOIRE (15/08/2026).** `chiffrerFichier()` renvoyait
auparavant les données en clair quand la clé manquait : un bail ou un carnet de santé
partait non chiffré chez l'hébergeur **sans que rien ne le signale**. C'est désormais un
refus (503). La lecture reste tolérante, pour que les fichiers déposés avant cette règle
restent lisibles. ⚠ Ne jamais changer la clé sans re-chiffrer.

Mise en place : [docs/PUBLICATION.md](docs/PUBLICATION.md) ·
base locale : [docs/POSTGRES_LOCAL.md](docs/POSTGRES_LOCAL.md).

## Règles d'architecture (non négociables)

Ces trois règles viennent des échecs de la version précédente et de la contrainte de revente. Les enfreindre casse silencieusement.

1. **Zéro identifiant en dur.** Aucun identifiant de foyer ni d'agenda dans le code. ⚠ **Cette règle a atteint son but et a changé de forme (13/08/2026)** : `configFoyer()` a été **supprimé**, faute d'appelant. Tout ce qu'il portait est passé **en base et par foyer** — les agendas dans `foyer_agendas` (migration 0014), les données dans leurs tables scopées. [lib/config.ts](lib/config.ts) ne garde que ce qui n'appartient à aucun foyer (`urlSite()`, `ConfigManquante`). Le scope se fait par `idFoyerCourant()` ([lib/foyer.ts](lib/foyer.ts)) sur chaque requête.

2. **Isolation stricte par foyer.** Toute requête base porte un `where foyer_id = idFoyerCourant()`. Une donnée d'un foyer ne doit jamais fuiter vers un autre. C'est la contrainte n°1 du multi-foyer vendable.

3. **Secrets côté serveur uniquement.** Tout l'accès Google est dans [lib/google/](lib/google/), marqué `import 'server-only'`, et l'accès base dans [lib/db/](lib/db/). Une importation depuis un composant client devient une **erreur de compilation**, pas une fuite. `credentials.json` / `DATABASE_URL` ne doivent jamais atteindre le bundle navigateur.

> **Historique (règle abandonnée).** L'ancienne règle « jamais de nom d'onglet en dur » (via `nomOnglet()`/`plage()`) n'a plus lieu d'être : plus aucun module ne lit un Sheet. Les pièges de l'API Sheets (`values` omis sur plage vide, `append` sur colonne à cases à cocher, déclencheurs `onEdit` non exécutés via API) sont archivés — ils ne concernent plus le code actif. Voir « Ménage Sheets » plus bas.

## Structure

- [lib/config.ts](lib/config.ts) — ce qui n'appartient à **aucun** foyer (`server-only`) : `urlSite()` et `ConfigManquante`. ⚠ Réduit à cela le 13/08/2026 — `configFoyer()` n'avait plus d'appelant depuis que les agendas sont passés en base.
- [lib/i18n.ts](lib/i18n.ts) — dictionnaire UI multilingue `t()` / `tEnum()` (FR complet, EN quasi complet, ES/DE/IT à venir avec repli FR). Cookie `hub-langue`. (Le registre d'onglets Sheets + `nomOnglet()`/`plage()` ont été retirés.)
- [lib/themes.ts](lib/themes.ts) — **REFONTE « Corail » (25/07/2026)** : les 9 anciens thèmes sont remplacés par une teinte principale **Corail** en **clair (`corail`, défaut) + sombre (`nuit`)**. Nouveaux rôles `ACC`/`ACC_DEEP`/`ON_ACC`/`GLOW`/`GLOW2` (marque corail + halos) en plus des rôles historiques. Polices via **next/font** dans [layout.tsx](app/layout.tsx) : titres **Fraunces** (variable `--police-titre`), corps **Quicksand** (`--police-corps`). Les 5 autres gammes validées en maquette (Améthyste/Lagon/Menthe/Ambre/Indigo) seront ajoutées comme thèmes (mêmes rôles). Maquettes de référence dans [maquettes/](maquettes/). `cssDesThemes()` génère le CSS de tous les thèmes. Extension To-Do ([lib/todo/theme.ts](lib/todo/theme.ts)) mise à jour (corail/nuit). [[refonte-ui-corail]]
- [lib/db/](lib/db/) — socle Postgres : `schema.ts` (Drizzle, toutes les tables scopées `foyer_id`), client `postgres.js` (Neon UE), migrations. **Source de vérité de tous les modules.**
- [lib/google/](lib/google/) — services Google externes (`server-only`) : `auth.ts` (`googleAuth(scopes)`) + Agenda (`lib/agenda/`). Plus de client Sheets **ni de Drive**.
- [lib/stockage/](lib/stockage/) — couche de stockage de fichiers (`server-only`), **Vercel Blob en accès `private`**. Abstraction volontaire : changer de fournisseur (R2/S3) = réécrire **ce seul fichier**.
- [lib/documents/](lib/documents/) — module Documents : `schema.ts` (types + helpers purs, importable côté client) et `service.ts` (Postgres + stockage, scopé foyer).
- [app/](app/) — App Router. `layout.tsx` injecte le CSS des thèmes + un script inline anti-flash + `SideBar`. `page.tsx` = accueil (tableau de bord). `manifest.ts` = PWA.
- [components/](components/) — îlots client (`SideBar`, `ReglagesApparence`, `BasculeNeon`, cartes d'accueil, vues de modules…).

## État d'avancement

Échafaudage posé et **vérifié** (build vert, les 5 classeurs accessibles, le 21/07/2026 — au temps où l'app lisait les Sheets ; depuis, tout a migré en base).

**Ménage Sheets (30/07/2026)** : les 5 modules étant tous sur Postgres, le code Google Sheets **devenu dormant a été supprimé** — `lib/google/sheets.ts`, l'endpoint `app/api/etat/`, le composant orphelin `BandeauEtat.tsx`, le script `scripts/diag.mjs` (+ commande `npm run diag`), le registre d'onglets et `nomOnglet()`/`plage()` de [lib/i18n.ts](lib/i18n.ts), et les `*_SHEET_ID` de `.env`/`.env.example`. `lib/config.ts` ne porte plus que les agendas. **Aucun module ne lit/écrit un Sheet.** Les 5 classeurs peuvent être « dé-partagés » du compte de service sans rien casser. (`googleAuth()` reste — utilisé par l'Agenda.)

**Module To-Do & Courses : terminé et vérifié** (21/07/2026). Route `/todo`, API sous `app/api/todo/`, service `lib/todo/`. Fonctionnalités : liste des tâches triée (retards/priorité), ajout, changement de statut avec **régénération des tâches récurrentes**, liste de courses groupée par rayon, cases à cocher, ajout d'article, retrait des articles cochés. Rôles de couleur du module dans `lib/todo/theme.ts`.
- **⚡ MIGRÉ EN BASE (version vendable, 24/07/2026)** — 2ᵉ module SaaS. Service sur **Postgres** scopé au foyer (`idFoyerCourant()`), tables `taches` + `courses` ([lib/db/schema.ts](lib/db/schema.ts), chacune `foyer_id`). **Identifiant = `id` (UUID)**. Récurrence répliquée en base (cocher « Fait » une tâche récurrente insère la prochaine occurrence via `prochaineOccurrenceLabel`). Listes : statuts/priorités/récurrences = **constantes** ; personnes/catégories/rayons **dérivées** des données existantes → champs Assigné/Rayon passés en **saisie libre (Combobox maison)** pour ne pas rester bloqués si la liste est vide. `viderCoursesFaites` = DELETE des articles cochés. Échéance stockée en texte « jj/mm/aaaa ». Validé contre Neon. ⚠ `DATABASE_URL` requis (local + Vercel).
- **Courses — quantité + édition + cumul (29/07/2026)** : colonne **`quantite`** (texte libre « 400 g ») sur `courses`. Ajout manuel = article + quantité + rayon ; **édition inline** d'un article (libellé/quantité/rayon) via `modifierCourse` (PUT `/api/todo/courses`). `ajouterCoursesEnLot` **ne dédoublonne plus en ignorant** : un même article (libellé insensible à la casse), déjà en liste OU dans le lot, **cumule sa quantité** (`sommeQuantites` : additionne si même unité, sinon liste les deux) au lieu de créer une 2ᵉ ligne. Helpers `decouperQuantite`/`sommeQuantites` dans [lib/todo/schema.ts](lib/todo/schema.ts).

**Module Budget : dashboard + saisie, terminé et vérifié** (21/07/2026). Route `/budget`, API `app/api/budget/` (GET lecture, POST saisie), service `lib/budget/`. L'app **ne recalcule rien à l'affichage** : elle lit les valeurs déjà agrégées de l'onglet moteur « Tableau de bord » (KPIs du mois, dépenses par catégorie, soldes des comptes) et les repère **par libellé** (scan de la colonne A), pas par n° de ligne figé. Affiche : 4 tuiles KPI, tuiles de comptes, jauges Réel/Budget par catégorie (dépassement = statut réservé, ⚠ + couleur `--over-*`), dernières transactions, échéances à venir. Le Budget n'utilise que les rôles du socle (`lib/themes.ts`), pas d'extension de thème.
- Schéma Transactions : A Date · B Type · C Compte · D Compte destination · E Catégorie · F Libellé · G Montant · H Note (source). Types : Dépense / Revenu / Virement interne.
- **Saisie** ([SaisieTransaction.tsx](components/budget/SaisieTransaction.tsx), client) : reproduit la logique du formulaire Google (`Contexte/Budget/06_Formulaire.gs`) — virement → catégorie vidée + destination requise ; sinon destination vidée. Écrit à la ligne libre calculée (`prochaineLigneTx`), source = « App ». Après succès, `router.refresh()` relance le rendu serveur → soldes/KPIs recalculés par les formules. Listes déroulantes (comptes, types, catégories dépense/revenu) lues dans Paramètres et incluses dans le payload GET.
- Testé sur le vrai classeur : les 3 types écrivent, le virement sans destination est refusé (400), les soldes bougent correctement (ex. Compte Lou −0,04 € pour une dépense 0,01 + un virement 0,03).
- **Sélecteur de mois** ([SelecteurMois.tsx](components/budget/SelecteurMois.tsx), PATCH `/api/budget`) : écrit les cellules moteur `Tableau de bord!B3` (année) / `B4` (mois, numéro), au **format masqué `;;;`** — donc lues en **UNFORMATTED** (`lireBrut`), une lecture formatée les renvoie vides. Écrire ces cellules déclenche le recalcul des formules (KPIs + catégories du mois) ; les soldes/patrimoine sont cumulés, indépendants du mois. Le service réplique aussi `majSousTitre_` (le déclencheur onEdit ne s'exécute pas sur écriture API) : met à jour le sous-titre de la Vue d'ensemble en préservant le suffixe. Noms de mois exacts = `MOIS_FR` (schema), doivent matcher `Budget/00_Constantes.gs`.
- **⚠ État partagé** : le mois est unique pour tout le classeur ; le changer depuis l'app le change pour tous (comme le sélecteur natif). Testé : bascule Juin↔Juillet correcte, restauration parfaite.
- **⚡ MIGRÉ EN BASE (version vendable, 25/07/2026)** — 5ᵉ et dernier module SaaS, le plus lourd. **Le tableur ne calcule plus rien : le dashboard est RECALCULÉ côté serveur** ([lib/budget/service.ts](lib/budget/service.ts)) depuis 4 tables scopées `foyer_id` ([lib/db/schema.ts](lib/db/schema.ts)) : `comptes` (nom + **solde_initial**), `budget_categories` (nom + type `depense`/`revenu` + **budget_mensuel**), `transactions`, `echeances`. Modèle relevé du classeur : **solde = solde_initial + Σ transactions** (revenu +, dépense −, virement source − / dest +) ; patrimoine = Σ soldes ; KPIs = Σ du mois ; réel catégorie = Σ dépenses du mois. `DonneesBudget` **inchangé** → VueBudget/SaisieTransaction intacts. **Sélecteur de mois = simple filtre d'URL** (`/budget?annee=&mois=`) — fini l'état partagé, `changerMois`/PATCH supprimés. **Données perso importées** (91 transactions, 4 comptes, 15 catégories) et **soldes recalculés validés au centime** contre le Sheet (Lou −17,52 · Mati 402,83 · commun 57,16 · Épargne 5 200,39 · TOTAL 5 642,86). ⚠ `DATABASE_URL` requis.

**⚡ LES 5 MODULES SONT DÉSORMAIS SUR POSTGRES (version vendable multi-foyer).** Socle : `lib/db/` (Drizzle, Neon UE), `lib/foyer.ts` (`idFoyerCourant()`, `utilisateurCourant()`, provisionnement à la 1re connexion). Chaque module scope toutes ses requêtes au foyer courant.

**RGPD (25/07/2026)** : droits de la personne exposés dans **`/compte`** (protégée) — **export** (portabilité) via `GET /api/compte/export` (JSON complet du foyer, [lib/rgpd.ts](lib/rgpd.ts) `exporterDonneesFoyer`), et **effacement** via l'action serveur `supprimerCompte` ([app/actions.ts](app/actions.ts)) qui supprime le foyer (cascade sur toutes les tables `foyer_id`) + l'utilisateur PUIS `signOut` (atomique, pour ne pas re-provisionner un foyer vide) ; UI garde-fou par case à cocher ([ZoneSuppression.tsx](components/compte/ZoneSuppression.tsx)). **Politique de confidentialité** publique **`/confidentialite`** ([app/confidentialite/page.tsx](app/confidentialite/page.tsx), exclue de l'auth dans `middleware.ts`) = **GABARIT** avec champs `[À COMPLÉTER]` (responsable, email de contact, hébergeur) — à finaliser + faire relire avant vente. Menu : liens « Mon compte » / « Confidentialité ». Cookies : seulement la session d'auth (strictement nécessaire) → pas de bandeau.

**Facturation Stripe (25/07/2026)** : abonnement par foyer, accès conditionné. [lib/stripe.ts](lib/stripe.ts) (client paresseux), [lib/abonnement.ts](lib/abonnement.ts) — `etatAbonnement()` (autorise si `actif`, ou `essai` avec `abonnement_fin` future/nulle), `exigerAcces()` (redirige vers `/abonnement`, appelé en tête de l'accueil + des 6 modules), `creerCheckout`/`creerPortail` (Checkout + billing portal hébergés), `traiterWebhook` (source de vérité : `checkout.session.completed` + `customer.subscription.*` → `foyers.statut_abonnement`/`abonnement_fin`/`stripe_customer_id`). ⚠ **Fin de période = `sub.items.data[0].current_period_end`** (déplacé au niveau item dans l'API Stripe 2025). Routes : `app/api/abonnement/{checkout,portail}` (POST, auth) + `app/api/stripe/webhook` (POST, **public** — exclu de l'auth `middleware.ts` via `api/stripe`, runtime nodejs, signature `STRIPE_WEBHOOK_SECRET` sur corps brut). Page `/abonnement` + `BoutonsAbonnement`. **Essai 30 j** (`ESSAI_JOURS` dans [lib/offres.ts](lib/offres.ts) — porté de 14 à 30 le 13/08/2026 : le Budget ne se juge qu'après une clôture de mois) posé à la création du foyer (`lib/foyer.ts`, qui lit la constante et ne la recopie plus) ; foyers antérieurs = essai « ouvert ». **⚠ SÉCURITÉ : sans `STRIPE_SECRET_KEY`, `exigerAcces` n'a aucun effet** (accès ouvert) — le verrou ne s'active qu'avec les clés (mode test d'abord). Env : `STRIPE_SECRET_KEY`/`STRIPE_PRICE_ID`/`STRIPE_WEBHOOK_SECRET`. Guide : [STRIPE.md](STRIPE.md).

**Membres du foyer (25/07/2026)** : plusieurs personnes partagent un foyer. [lib/membres.ts](lib/membres.ts) — `chargerFoyerMembres`, `inviterMembre` (crée une `invitations` avec jeton, remplace l'existante), `revoquerInvitation`, `retirerMembre`, `renommerFoyer`, `invitationParJeton`, `accepterInvitation` (ajoute le membre, `onConflictDoNothing` sur `unique(foyer_id, utilisateur_id)`, consomme l'invitation ; **l'e-mail connecté doit == l'e-mail invité**). Actions serveur [app/foyer/actions.ts](app/foyer/actions.ts). Page **/foyer** (membres + rôles, inviter, invitations en attente avec **lien à copier** [LienInvitation.tsx](components/foyer/LienInvitation.tsx), renommer — gestion réservée au **propriétaire**). Page **/rejoindre?jeton=** (accepte ; **n'appelle PAS `foyerCourant`** pour ne pas provisionner un foyer perso → utilise `utilisateurCourant`). Menu : « Mon foyer ». Validé contre Neon.

**Demandes d'adhésion (01/08/2026)** — sens inverse de l'invitation : la personne frappe à la porte. Table `demandes_adhesion` (migration 0012, `unique(foyer_id, demandeur_id)` → une relance met à jour au lieu d'empiler). [lib/membres.ts](lib/membres.ts) : `demanderAdhesion` (résout le foyer par l'e-mail du **propriétaire**), `demandesEnAttente`, `maDemande`, `accepterDemande` (même règle de rattachement que les invitations), `refuserDemande`. Page **/rejoindre-foyer** + bouton bien visible sur la vitrine ; le propriétaire accepte/refuse dans **/foyer**.

**⚡ POLITIQUE D'ACCÈS REFONDUE (01/08/2026)** — la liste blanche `EMAILS_AUTORISES` bloquait la **connexion elle-même**, ce qui créait un **blocage circulaire** : pour être invité ou demander à rejoindre un foyer, il faut d'abord pouvoir se connecter. Nouveau modèle ([lib/acces.ts](lib/acces.ts)) :
- **Se connecter est ouvert à tous** (plus aucun filtre dans `auth.ts`). Créer une identité ne donne accès à **rien** : c'est seulement ce qui permet d'être invité, de demander une adhésion, et plus tard de s'abonner.
- **Créer un NOUVEAU foyer** (= démarrer l'essai) est ce qui est contrôlé : `INSCRIPTION_OUVERTE=true` → tout le monde (lancement public) ; sinon (défaut) → seules les adresses de `EMAILS_AUTORISES`. Les **membres existants gardent toujours leur accès** (le contrôle n'intervient qu'après avoir constaté l'absence de foyer).
- `foyerCourant()` lève **`SansFoyer`** au lieu de provisionner ; `exigerAcces()` l'attrape et redirige vers **/bienvenue** (rejoindre un foyer, ou le créer si les inscriptions sont ouvertes). `foyerCourantOuBienvenue()` fait de même pour les pages qui n'appellent pas `exigerAcces` (ex. /foyer).
- ⚠ `utilisateurCourant()` **crée désormais la ligne utilisateur** si absente : une identité doit pouvoir exister **sans** foyer (sinon un nouvel arrivant plantait sur /rejoindre-foyer).
- **Jour du lancement : passer `INSCRIPTION_OUVERTE=true`, rien d'autre.**

**Prise en main / onboarding (01/08/2026)** — colonne `foyers.onboarding_fait` (migration 0013). ⚠ **Défaut `true` à dessein** : les foyers déjà en service ne subissent pas l'onboarding ; seuls les foyers **nouvellement créés** posent `false` (dans `foyerCourant`). Page **/demarrage** ([Demarrage.tsx](components/onboarding/Demarrage.tsx)) en 3 étapes : nommer le foyer → inviter ses proches (sautable) → récapitulatif des 7 modules + astuce d'installation. `terminerOnboarding` clôture. ⚠ **/demarrage n'appelle PAS `exigerAcces()`** (ce serait une boucle de redirection) : il utilise `foyerCourantOuBienvenue()` et repart vers `/` si l'onboarding est déjà fait. Ordre des verrous dans `exigerAcces()` : foyer → onboarding → abonnement.

Reste à faire : onboarding (nom du foyer à la 1re connexion), sous-listes Événements, finaliser le gabarit de confidentialité, config Stripe (test). [[pivot-saas-multi-foyer]]

Erreurs métier : `ErreurValidation` ([lib/erreurs.ts](lib/erreurs.ts)) → 400 via `reponseErreur` ([lib/api.ts](lib/api.ts)) ; `ConfigManquante` → 503. Une saisie invalide ne doit jamais remonter en 500.

**Module Repas : planning + recettes avec quantités/personnes, terminé et vérifié** (21/07/2026). Route `/repas`, API `app/api/repas/` (GET + `recettes` POST/PATCH/DELETE + `semaine` PATCH), service `lib/repas/`.
- **Extension de schéma** (décidée avec l'utilisateur) : la colonne Ingrédients de l'onglet Recettes passe au format enrichi **« article | quantité | unité | rayon »** (une ligne par ingrédient), + nouvelle colonne **F « Personnes »** (base). Onglet Semaine : nouvelle colonne **E « Personnes »** (par jour). Les en-têtes sont posés idempotemment par `assurerEntetes()`.
- **Parsing rétro-compatible** ([schema.ts](lib/repas/schema.ts) `parseIngredient`) : 2 champs = ancien « article | rayon » (quantité vide), 4 champs = nouveau. Les 8 recettes existantes ne sont PAS migrées destructivement — elles se convertissent quand on les édite dans l'app (qui réécrit toujours en 4 champs). ⚠ Conséquence : l'ancien bouton Apps Script `envoyerVersCourses` (qui lit « article | rayon » sur le 1er `|`) devient obsolète sur les recettes éditées par l'app — remplacé par le futur bouton d'accueil.
- **Mise à l'échelle** : quantités × personnesJour / personnesBase (`mettreALechelle`). `agregerCourses()` (pur) somme les ingrédients des dîners planifiés par article+unité → alimente l'aperçu des courses **et** le futur bouton « envoyer vers les courses » (accueil, pas encore fait).
- Unités = liste fixe (`UNITES`). Défaut foyer = `PERSONNES_DEFAUT = 2`.
- UI : onglets Semaine (planning par jour, nb de personnes → quantités recalculées + aperçu courses agrégé par rayon) et Recettes (éditeur complet : ingrédients avec qté/unité/rayon, personnes de base, type, chaud/froid ; ajout/édition/suppression).
- **⚡ MIGRÉ EN BASE (version vendable, 24/07/2026)** — 3ᵉ module SaaS. Service sur **Postgres** scopé au foyer, tables `recettes` (ingrédients en **JSONB**, une recette = son bloc) + `semaine` (une ligne par foyer+jour, upsert `onConflictDoUpdate` sur `unique(foyer_id, jour)`) dans [lib/db/schema.ts](lib/db/schema.ts). **Recette = `id` (UUID)** ; **jour identifié par son nom** (Lundi…Dimanche, plus de n° de ligne). `chargerRepas` complète les 7 jours avec des défauts pour ceux sans ligne. La logique métier (parse, `mettreALechelle`, `agregerCourses`, `listeCoursesSemaine`) reste dans [schema.ts](lib/repas/schema.ts). Validé contre Neon (JSONB, upsert, cascade). **Données perso importées** du Sheet une fois (script jetable, dédoublonné par nom). ⚠ `DATABASE_URL` requis.
- **Menu 3 services + catégorie + repères bébé (29/07/2026)** : la `semaine` porte **`entree`/`plat`/`dessert`** (colonne `diner` historique conservée = repli du plat, tenue à jour par `definirJour`). `JourRepas` = `{ jour, entree, plat, dessert, note, personnes }`. `listeCoursesSemaine` agrège les recettes des **3 services** de chaque jour (mises à l'échelle). Recettes : colonne **`categorie`** (Entrée/Plat/Dessert, `CATEGORIES_PLAT`) → chaque **créneau du jour ne propose que les recettes de sa catégorie** (+ les non catégorisées) ; + booléens **`favori_bebe`** et **`bebe_pas_goute`** (cases dans l'éditeur, badges sur la carte). Constante `SERVICES` dans [schema.ts](lib/repas/schema.ts) (`CATEGORIE_PAR_SERVICE` retiree le 13/08/2026, jamais appelee). Migrations 0007/0008.

**Module Cadeaux : terminé et vérifié** (21/07/2026). Route `/cadeaux`, API `app/api/cadeaux/` (GET + `items` POST/PATCH/DELETE), service `lib/cadeaux/`. UI : cadeaux regroupés par occasion (date + « dans N j » si <30 j + budget prévu/payé vs budget occasion), statut (Idée→Offert), ajout/édition/suppression.
- **⚡ MIGRÉ EN BASE (version vendable, 24/07/2026)** — module **pilote** du passage SaaS. Le service ne lit plus Google Sheets mais **Postgres**, scopé au foyer courant (`idFoyerCourant()`), via les tables `cadeaux` + `occasions` de [lib/db/schema.ts](lib/db/schema.ts) (chacune `foyer_id`, isolation stricte sur CHAQUE requête). **Identifiant = `id` (UUID)**, plus `ligne`. Montants stockés en texte (saisie libre), nombres recalculés à la lecture (`parseEuro`). Statuts = constante `STATUTS_DEFAUT` (plus l'onglet Paramètres) ; « offert par » dérivé des cadeaux existants ; l'occasion est un champ **libre (datalist)** qui **crée l'occasion** en base si absente (`assurerOccasion`, upsert sur `unique(foyer_id, nom)`). L'ancienne lecture Sheets (colonnes A→I / Occasions A→D) sert de référence pour le futur **import** Sheets→base. Validé contre Neon (défauts, unicité, cascade). ⚠ `DATABASE_URL` doit être défini (local **et** Vercel) sinon `/cadeaux` échoue (`FoyerIndisponible`).

**Module Événements : terminé et vérifié** (21/07/2026). Route `/evenements`, API `app/api/evenements/` (GET + `items` POST/PATCH), service `lib/evenements/`. Onglet maître Événements (A Nom · B Type · C Date · D Heure · E Lieu · F Nb invités · G Budget · H Dépensé · I Statut · J Note · **K AgendaID — jamais écrite par l'app**, préservée). Sous-onglets Invités / Checklist / Menu & Courses référencent l'événement par son NOM (colonne A).
- **Le maître peut être vide** alors que les sous-onglets portent des événements : la liste affichée est l'**union** des noms (maître + sous-onglets). Un événement « stub » (présent seulement dans les sous-onglets) est éditable → crée une ligne dans le maître.
- Récapitulatifs calculés depuis les sous-onglets (par nom) : invités confirmés (RSVP=Oui) + personnes, avancement checklist (fait/total, jauge), nb plats du menu + coût estimé.
- Écriture du maître en colonnes A→J uniquement lors des éditions normales. Statuts/Types lus dans Paramètres (A types, B statuts).
- **Sync Agenda ↔ Événements** (22/07/2026) : bouton « Ajouter à l'agenda » sur chaque événement daté → crée l'événement dans l'agenda choisi (parmi `AGENDA_IDS`) via `lib/agenda/service` et mémorise **`calendarId|eventId`** (dédoublonnage). Badge « dans l'agenda · <nom> » + bouton « retirer » (supprime l'event d'agenda + vide le lien). API `app/api/evenements/agenda/` (POST/DELETE), service `lierAgenda`/`delierAgenda`. `chargerEvenements` expose `agendaLien` + la liste `agendas` (via `listerAgendas()`, défensif si Agenda indispo).
- **⚡ MIGRÉ EN BASE (version vendable, 25/07/2026)** — 4ᵉ module SaaS. Service sur **Postgres** scopé au foyer, table `evenements` (maître) dans [lib/db/schema.ts](lib/db/schema.ts). **Événement = `id` (UUID)** ; la col K devient la colonne `agenda_lien`. La **synchro Google Agenda est conservée** (lier/délier passent toujours par `lib/agenda/service` ; seul le stockage du lien migre). Plus de logique « stub » (chaque événement est une ligne). Type en **saisie libre (datalist)**, statuts = `STATUTS_DEFAUT`. Validé contre Neon. Événements perso **non importés**. ⚠ `DATABASE_URL` requis.
- **✅ SOUS-LISTES EN BASE (06/08/2026)** — dernier module incomplet, désormais bouclé. Tables `ev_invites` / `ev_checklist` / `ev_menu` (migration 0020), route `app/api/evenements/listes/`, panneau [SousListes.tsx](components/evenements/SousListes.tsx) (onglets repliés par défaut, avec compteurs). ⚠ **Le lien est `evenement_id`, plus le NOM** : le classeur d'origine liait par nom, ce qui mélangeait les invités de deux événements homonymes et orphelinait les listes au renommage. Cascade vérifiée. ⚠ **`foyer_id` est porté EN PLUS de `evenement_id`** (redondant par jointure, mais la règle d'isolation impose un `where foyer_id` partout, et ces routes reçoivent un id du client) ; chaque mutation passe d'abord par `evenementDuFoyer()`. `agregerSousListes()` (pur, dans [schema.ts](lib/evenements/schema.ts)) : **`personnesOui` compte les PERSONNES, pas les réponses** — un « oui » pour une famille de quatre pèse quatre couverts.

**Carte d'accueil « Liste de courses »** ([CoursesSemaine.tsx](components/CoursesSemaine.tsx), **remaniée le 29/07/2026**). Elle ne fait plus l'agrégation des repas — c'est un raccourci vers la **liste de courses** elle-même. Deux actions :
- **＋ Ajouter à ma liste** : révèle (au clic) un champ **produit + quantité** pour ajouter un article **ponctuel** (ex. gel douche), indépendant des repas → POST `/api/todo/courses`.
- **💬 Envoyer par message** : lit la liste de courses **entière** (GET `/api/todo`, articles **non cochés** groupés par rayon, quantités incluses) et l'envoie via `navigator.share` (repli lien `sms:?body=`).
- L'ancienne agrégation repas→liste et le bouton « Copier » ont été retirés de la carte (décision utilisateur). `listeCoursesSemaine()`/`ajouterCoursesEnLot()` restent utilisés côté service/API mais ne sont plus câblés sur cette carte.

Helpers monétaires/dates partagés par les nouveaux modules : [lib/argent.ts](lib/argent.ts) (`parseEuro`, `formatEuro`, `versISO`, `joursJusqua`). Le Budget garde ses helpers historiques.

**Les 5 modules sont désormais branchés.**

**Accueil refondu** (21/07/2026, remanié le 23/07/2026) : marque (logo app + titre serif) + **menu déroulant** haut-droite ([MenuPrincipal.tsx](components/MenuPrincipal.tsx) : modules + thème + déconnexion), puis dans l'ordre — **comptes encadrés** (hors épargne, via `chargerAccueilBudget()` : soldes + params de saisie en 1 aller-retour ; exclut « épargne »), action rapide (ajout d'opération), **vue Agenda de la semaine**, **section Courses**, **section Documents en pied de page**. Les 4 sections (comptes / agenda / courses / documents) partagent le même style de carte (`var(--cell)`, radius 1rem). La grille de modules et le bandeau d'état ont été retirés de l'accueil (modules → menu).
- **Section Courses** ([CoursesSemaine.tsx](components/CoursesSemaine.tsx)) : design de la maquette validée — **chargée automatiquement** au montage (comme agenda/Drive), en-tête avec compteur « N dîners planifiés », CTA plein `.bouton-primaire` (Envoyer par message) + secondaire (Ajouter a ma liste). ⚠ Le groupage par rayon et les pastilles `.cs-q` ont ete retires avec la refonte du 29/07/2026 ; leur CSS mort a ete supprime le 13/08/2026. `listeCoursesSemaine()` renvoie désormais `{ articles, diners }`.
- **Ajout d'opération déplacé sur l'accueil** en **bouton + modale** ([SaisieTransaction.tsx](components/budget/SaisieTransaction.tsx), désormais modale ; retiré de `/budget`). `router.refresh()` après écriture met à jour les soldes de l'accueil.
- **Section « Documents »** ([SectionDocuments.tsx](components/documents/SectionDocuments.tsx)) — voir « Module Documents » ci-dessous. (Remplace l'ancienne section Google Drive, supprimée.)

**Module Agenda : terminé et vérifié en conditions réelles** (21/07/2026 — API Calendar activée, 3 agendas partagés : Crèche, Travail Lou, Travail Mati). Route `/agenda`, API `app/api/agenda/` (GET/POST/DELETE), service `lib/agenda/`. Source = **Google Agenda** (pas un Sheet), via le compte de service + scope `calendar`. Affiche les événements à venir (30 j) des 3 agendas fusionnés/triés, groupés par jour ; ajout (journée entière ou horaire, fuseau `Europe/Paris`) dans l'agenda choisi ; suppression. Lecture + ajout + suppression testés OK.
- **Multi-agendas** : ⚠ **`AGENDA_IDS` / `AGENDA_ID` n’ont plus aucun effet** (lecture supprimee le 13/08/2026 avec `configFoyer()`) — les agendas se rattachent depuis `/agenda` et vivent dans `foyer_agendas`. Les événements des agendas sont fusionnés et triés ; chacun reçoit une couleur d'identité (`COULEURS_AGENDA`) et son nom (via `calendars.get`). L'ajout choisit l'agenda cible ; la suppression connaît l'agenda d'origine (`calendarId` porté par chaque événement).
- **Contrairement à Drive, ça marche avec le compte de service** (pas de quota) — mais il faut : (1) **activer l'API Google Calendar** dans le projet GCP `hub-familial-app`, (2) **partager chaque agenda** avec `claude-sheet-access@…` (droit « modifier les événements »), (3) `AGENDA_IDS` dans `.env`.
- La page dégrade proprement si non configuré : message d'aide ciblé (API à activer / agenda à partager / `AGENDA_ID` manquant). Vérifié : `/agenda` répond 200 avec le message de config, pas de crash.
- **Non encore vérifié en conditions réelles** (API Calendar désactivée au moment du build) — à re-tester une fois les 3 étapes faites.
- **⚠ ÉVÉNEMENTS RÉCURRENTS : la suppression demande sa portée (11/08/2026).** On liste avec `singleEvents: true`, donc Google renvoie les **occurrences**, pas les séries : un rendez-vous hebdomadaire arrive en autant de lignes qu'il a de dates, chacune avec son id propre (`abc_20260812`). `events.delete` sur une de ces lignes renvoie **204** mais n'annule **que cette date** — l'app affichait donc « supprimé » pendant que l'événement restait dans Google Agenda, ce qui la faisait passer pour cassée. `EvenementAgenda.serieId` (= `recurringEventId`, `''` si non récurrent) permet de poser la question, comme le fait Google Calendar : « Cette date » / « Toute la série ». `supprimerEvenement(calendarId, id, portee)` résout la série via `events.get` **côté serveur** — une donnée d'affichage périmée ne doit pas décider ce qu'on efface. Les 3 cas (occurrence, série, événement simple) sont vérifiés contre la vraie API.

**Icônes PWA : faites** (21/07/2026). Icône « maison familiale » (SVG, palette rose) rasterisée par `sharp` (dépendance Next, fonctionne). Générées par `node scripts/generer-icones.mjs` (script maintenu, réexécutable) → `public/icon-192.png`, `public/icon-512.png` (manifest, dont maskable plein cadre), `app/icon.png` (favicon auto Next), `app/apple-icon.png` (iOS). Manifest (`app/manifest.ts`) + balises `<link>` (manifest/icon/apple-touch-icon/theme-color) vérifiés servis. L'app est installable « sur l'écran d'accueil » (iOS Safari + Android).

**Installation iPhone** (23/07/2026) : iOS **n'a pas d'invite automatique** (seul Android l'a via le service worker). Balises `appleWebApp` (`capable`/`title: 'Hub'`/`statusBarStyle`) dans `layout.tsx` → lancement plein écran une fois ajoutée à l'accueil. Comme iOS ne propose rien, [AstuceInstallIOS.tsx](components/AstuceInstallIOS.tsx) (client) affiche un **bandeau de rappel** « Partager → Sur l'écran d'accueil », uniquement sur iOS (`/iphone|ipad|ipod/`), masqué si déjà installé (`navigator.standalone`) ou fermé (localStorage `hub-install-ios`).

**Service worker / hors ligne : fait** (23/07/2026). [public/sw.js](public/sw.js) enregistré par [EnregistrerSW.tsx](components/EnregistrerSW.tsx) (**production uniquement**, inclus dans `layout.tsx`) → l'app **s'ouvre sans réseau**, invite d'installation Android active. ⚠ **Pas d'offline des données** : elles viennent des API Google à la requête ; le worker ne cache QUE la coquille. Stratégies : écritures/`/api/*` → réseau direct (jamais en cache) ; statiques hashés → cache-first ; navigations → network-first avec repli sur la copie en cache puis sur `/hors-ligne` ([app/hors-ligne/page.tsx](app/hors-ligne/page.tsx), statique, publique). `middleware.ts` exclut `/sw.js` et `/hors-ligne` de l'auth. Bump du nom de cache pour invalider l'ancien lors d'un changement de stratégie.
- **⚠ CORRECTION SÉCURITÉ (08/08/2026) — les pages authentifiées ne sont PLUS mises en cache** (`nestync-v2`). Le worker conservait le HTML de toutes les pages visitées, soldes et documents compris : après déconnexion elles restaient lisibles, et sur un **appareil partagé** — le cas d'usage même d'une app de foyer — un membre pouvait retrouver les pages d'un autre. Le bénéfice était illusoire (les données viennent des API, jamais mises en cache : une page rouverte hors ligne n'affichait qu'une coquille vide). Les navigations vont désormais au réseau **sans conserver de copie**, avec repli sur `/hors-ligne`, page publique. ⚠ **Ne jamais remettre de `cache.put()` sur une navigation.** Symptôme qui a révélé le problème : des agendas listés alors qu'ils n'étaient plus rattachés en base.

**Déploiement + connexion (en cours, 21/07/2026).** Objectif : app hébergée (Vercel) accessible depuis le téléphone, PC éteint, avec accès protégé.
- **Auth d'accès = Auth.js v5 (`next-auth@beta`) + Google OAuth**, **ouverte à tous** depuis le 01/08/2026 (voir « Politique d'accès refondue »). Fichiers : `auth.ts` (config + callbacks), `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` (protège tout sauf `/`, `/connexion`, `/conditions`, `/confidentialite`, `/hors-ligne`, `/api/auth`, `/api/stripe`, statics/assets), `app/connexion/page.tsx` (honore `callbackUrl`, avec garde-fou anti open-redirect). ⚠ `auth.ts` tourne en **edge** : ne jamais y importer la base ni `lib/acces.ts`. ⚠ C'est l'auth d'ACCÈS (qui ouvre l'app), distincte du **compte de service** qui lit/écrit les données Google — inchangé.
- **Échappatoire dev** (`auth.ts` callback `authorized`) : si `NODE_ENV !== 'production'` ET `AUTH_GOOGLE_ID` absent → accès local ouvert (pour ne pas se bloquer avant d'avoir le client OAuth). **En production, toujours protégé.** Donc `npm run dev` reste ouvert tant que l'OAuth local n'est pas configuré ; `next start` (prod) est gaté.
- **Identifiants Google portables** : `lib/google/auth.ts` (`googleAuth(scopes)`) — lit `GOOGLE_CREDENTIALS_JSON` (env, pour Vercel) sinon le fichier `credentials.json` (local). Sheets et Agenda passent par ce helper.
- **Env** : voir `.env.example` (ajouts : `GOOGLE_CREDENTIALS_JSON`, `AUTH_SECRET`, `AUTH_GOOGLE_ID/SECRET`, `EMAILS_AUTORISES`). Guide pas-à-pas : `DEPLOIEMENT.md` (GitHub/Vercel, création du client OAuth, variables d'env). Git n'est pas installé sur la machine de dev.

Restent des extensions possibles : sélecteur de mois hors Budget, édition des sous-onglets Événements depuis l'app, EN/ES i18n, cache offline des données (nécessiterait une base locale). **Changement de logo à venir** ([[changement-logo-app]]) : quand l'utilisateur fournira le nouveau visuel, relancer `node scripts/generer-icones.mjs` (l'accueil et `LienAccueil` suivent automatiquement via `/icon-192.png`) et remplacer l'emoji `🏡` de `app/connexion/page.tsx` par l'icône réelle.

## ⚠ Piège de test (encodage)

`Invoke-RestMethod`/`Invoke-WebRequest` de PowerShell 5.1 **décodent mal l'UTF-8** des réponses JSON (« Pâtes » → « PÃ¢tes »). Ne JAMAIS refaire écrire une valeur accentuée lue via ces cmdlets vers le Sheet : cela corrompt la donnée réelle (arrivé une fois sur Semaine!C8, réparé). Pour tester des écritures avec accents, passer par un script Node (`googleapis` lit/écrit l'UTF-8 correctement), ou n'écrire que des valeurs sans accents. L'app elle-même (navigateur → Next → googleapis) est correcte en UTF-8 de bout en bout.

**Onglets réels par classeur** (relevés le 21/07/2026, langue = français ; ils dépendent de la langue) :

| Classeur | Onglets |
|---|---|
| Budget_familial | Réponses au formulaire 1 · Lisez-moi · Paramètres · Transactions · Échéances · Tableau de bord · Vue annuelle · Épargne · Import CSV · 🌸 Vue d'ensemble |
| ToDo_familiale | Réponses au formulaire 1 · Lisez-moi · Aperçu · Tâches · Courses · Paramètres · Lou · Mati · Nous deux |
| Repas_semaine | Lisez-moi · Semaine · Recettes · Recherche |
| Suivi_cadeaux | Lisez-moi · Aperçu · Occasions · Cadeaux · Paramètres |
| Evenements | Lisez-moi · Aperçu · Événements · Invités · Checklist · Menu & Courses · Paramètres |

**Prochain module recommandé** : Courses / To-Do (le plus interactif sur mobile). Attention, deux logiques de « courses » coexistent : onglet `Courses` de ToDo **et** `Menu & Courses` d'Événements — regarder `Contexte/Repas/02_Courses.gs` (fonction `envoyerVersCourses`) et `Contexte/Evenements/` avant de concevoir.

**Décisions déjà prises** : stack Next.js + back-end propre ; accès via compte de service en phase privée. **Restées ouvertes** : OAuth par utilisateur pour le multi-foyer ; base propre (Supabase/Firebase) éventuelle à terme ; icônes PWA à fournir (`public/icon-192.png`, `public/icon-512.png`).

**Module Documents : fait (01/08/2026) — remplace Google Drive.**
Fichiers du foyer stockés **par nous**, plus aucun accès Google Drive. Route : section d'accueil ([SectionDocuments.tsx](components/documents/SectionDocuments.tsx)), API `app/api/documents/` (GET liste · POST téléversement multipart · PATCH renommer/ranger · DELETE) + `app/api/documents/[id]/` (contenu du fichier). Service [lib/documents/service.ts](lib/documents/service.ts), table `documents` (migration 0010).
- **Pourquoi** : le scope `auth/drive` est **restreint** → il aurait imposé un **audit de sécurité CASA annuel** (coûteux) à la mise en vente. Le périmètre OAuth est désormais **`openid email profile` uniquement** ([auth.ts](auth.ts)) — ⚠ **ne jamais réintroduire un scope Drive/Gmail sans mesurer cette conséquence**.
- **Confidentialité** : stockage **`access: 'private'`** (aucune URL publique). Le contenu n'est servi **que** par `GET /api/documents/<id>`, qui vérifie d'abord l'appartenance au foyer (`fluxDocument` renvoie `null` sinon → 404, sans révéler l'existence). C'est ce qui rend un bail ou un carnet de santé réellement privé.
- **Organisation** : dossiers à **un seul niveau** (champ texte libre + datalist, comme les rayons des courses) ; regroupement à l'affichage par `grouperParDossier` (« sans dossier » en dernier, noms normalisés → « Papiers » et « papiers » fusionnent). Renommage/rangement/suppression en **édition inline**. Limite **25 Mo/fichier** (`TAILLE_MAX`).
- **Suppression** : DELETE en base **puis** suppression du fichier stocké — et seulement si une ligne du **bon foyer** a été supprimée (garde-fou d'isolation).
- ⚠ **`BLOB_READ_WRITE_TOKEN` requis** (créer un store Blob sur Vercel → variable injectée automatiquement ; en local, la coller dans `.env`). Sans elle, le module répond **503** avec un message clair, le reste de l'app fonctionne.
- **Changer de fournisseur** (Cloudflare R2, S3…) = réécrire **le seul** [lib/stockage/index.ts](lib/stockage/index.ts) (`televerser`/`supprimerFichier`/`lireFichier`). Le reste du code ne connaît pas le fournisseur.
- **⚡ MIGRÉ CHEZ OVHCLOUD + CHIFFRÉ (08/08/2026).** Les fichiers sont désormais sur **OVHcloud Object Storage**, région **Paris**, conteneur **3-AZ** (ISO 27001/27017/27018/27701 + **HDS**, sortie de données gratuite). Vercel Blob reste en **repli automatique** si `OVH_S3_*` est absent — la bascule est une affaire de **configuration, pas de déploiement**.
  - **Trois choses ne partent plus en clair** vers l'hébergeur : le **contenu** (AES-256-GCM, [lib/stockage/chiffrement.ts](lib/stockage/chiffrement.ts)), le **nom du fichier** (la clé de stockage est un UUID opaque) et le **type MIME** (déclaré neutre). Nom et type vivent en base, d'où la route de téléchargement les tire. `televerser()` ne reçoit donc plus que des octets — ce n'est pas un oubli.
  - ⚠ **`DOCUMENTS_SECRET` est une clé DÉDIÉE, jamais `AUTH_SECRET`** : une clé à double usage forcerait à choisir entre faire tourner un secret compromis et détruire les données de l'autre (leçon des jetons Google). **La perdre = perdre tous les documents.** Ne jamais la changer sans re-chiffrer.
  - En-tête magique `NSY1` : le format est auto-descriptif, un fichier déposé avant le chiffrement se relit sans qu'on ait à deviner.
  - ⚠ Limite assumée : le serveur doit déchiffrer pour servir un document au foyer. Ce n'est **pas** du bout-en-bout — c'est « seule l'application peut lire, l'hébergeur non ». Un vrai bout-en-bout est hors d'atteinte (authentification Google, donc aucun mot de passe dont dériver une clé ; et le partage entre membres imposerait un échange de clés).
  - `lireFichier` **rapatrie le fichier entier** avant de le rendre : AES-GCM ne peut vérifier son marqueur d'intégrité qu'une fois tout le corps lu. Acceptable, les documents étant plafonnés à 25 Mo.

**Comptes du projet : fait (11/08/2026).** Page **`/comptes`** — combien Nestync a coûté et rapporté. Table `mouvements_projet` (migration 0023), service [lib/comptes/service.ts](lib/comptes/service.ts), calculs purs [lib/comptes/schema.ts](lib/comptes/schema.ts).
- ⚠ **SEULE TABLE SANS `foyer_id`, à dessein.** Ce n'est pas une donnée de foyer mais la comptabilité du porteur de projet : un conjoint membre du même foyer n'a pas à la voir. La garde porte donc sur l'**adresse** (`EMAIL_ADMIN`), pas sur le foyer. **Sans la variable, personne n'entre** — l'inverse transformerait un oubli de configuration en fuite. Refus = `notFound()`, jamais un « accès refusé » qui révélerait qu'il y a quelque chose à trouver.
- ⚠ **N'appelle pas `exigerAcces()`** : lier ses propres comptes à l'abonnement du foyer se fermerait la porte le jour où l'essai expire — précisément quand on veut les regarder.
- **La source de vérité est un FICHIER hors dépôt** (`COMPTES_FICHIER` → `comptes.json`, avec son `LISEZMOI.md`). `npm run comptes` valide puis **remplace intégralement** la table. Ne jamais écrire dans cette table depuis l'app.
- **Un récurrent ne s'écrit qu'une fois** : on note le 1er paiement + `mensuel`/`annuel` (+ `fin` pour arrêter, sans supprimer la ligne), et `occurrences()` déduit le cumul du temps écoulé. Montants en **centimes** (un flottant finit toujours par afficher 20,999999 €). 22 cas de bord vérifiés (échéance à la veille/au jour, abonnement arrêté, montant manquant, recettes).

**Aide et contact : fait (08/08/2026).** Page **publique** `/aide` ([app/aide/page.tsx](app/aide/page.tsx)) : FAQ repliable + formulaire. Publique à dessein — celui qui n'arrive pas à se connecter est celui qui a besoin d'écrire.
- Les messages sont **enregistrés en base** (`messages_contact`, migration 0022) **avant** d'être expédiés par Brevo : un courriel égaré ferait courir en silence le délai de 30 jours promis par les mentions légales. `foyer_id` nullable (un visiteur sans compte doit pouvoir écrire).
- Anti-robots par **champ piège** hors écran (pas `display:none`, que certains robots détectent) plutôt que captcha — lequel ferait entrer un tiers et son traçage. Anti-inondation plafonné **par adresse e-mail, pas par IP** : une IP serait une donnée personnelle de plus à justifier.
- Conservation **1 an**, purgée par le ménage quotidien : le champ message est du **texte libre non maîtrisé**.

## Accès Google (vérifié 21/07/2026)

Compte de service `claude-sheet-access@hub-familial-app.iam.gserviceaccount.com`, clé dans `credentials.json` (ou `GOOGLE_CREDENTIALS_JSON`). Utilisé désormais **uniquement** pour **Google Agenda** (module Agenda). Le partage historique avec les 5 classeurs Sheets n'est plus utilisé (voir « Ménage Sheets »), et l'accès **Google Drive a été entièrement retiré** (voir « Module Documents »). **Ne pas reconfigurer le compte de service.**

⚠ **Périmètre OAuth de CONNEXION = `openid email profile`** (identité seule). C'est un **choix structurant** : tout scope « restreint » (Drive, Gmail…) déclencherait un audit de sécurité annuel payant à la mise en vente. Le scope Drive a été **retiré de la console** (04/08/2026).

**Agenda multi-foyer (05/08/2026) — vérifié en conditions réelles.** Deux chantiers menés à la suite :
1. **Isolation** (migration 0014, table `foyer_agendas`) : le module lisait `AGENDA_IDS`, variable **globale** → tous les foyers voyaient et pouvaient modifier les mêmes calendriers. Chaque requête est désormais scopée `idFoyerCourant()`. ⚠ Faille corrigée au passage : `supprimerEvenement()` ne vérifiait pas que le `calendarId` reçu du client appartenait au foyer.
2. **OAuth par utilisateur** (migration 0015, table `comptes_google`) : chacun connecte **son** Google Agenda depuis `/agenda` et choisit les calendriers à partager. Flux **séparé d'Auth.js** (`/api/agenda/connexion` + `/api/agenda/callback`, `state` en cookie httpOnly anti-CSRF) pour que le périmètre de connexion reste minimal. **Jetons chiffrés au repos** (AES-256-GCM, clé dérivée d'`AUTH_SECRET` — [lib/crypto.ts](lib/crypto.ts)) : un `refresh_token` est un accès durable au calendrier d'une personne. Renouvellement auto ; autorisation révoquée = nettoyage + reconnexion proposée.
- `clientPour()` choisit la source par calendrier : jeton de `ajoute_par`, sinon compte de service (mode historique). Un calendrier inaccessible est **ignoré**, sans casser l'agenda du foyer.
- **Périmètre volontairement ÉTROIT** (05/08/2026) : `calendar.calendarlist.readonly` (lire le **nom** des calendriers, pour l'écran de sélection — aucun accès au contenu) + `calendar.events` (lire/écrire les événements des calendriers choisis). ⚠ **Ne pas revenir à `calendar.readonly`** : il donnerait accès en lecture à **tous** les agendas alors qu'on n'a besoin que d'en lister les noms — plus intrusif et bien plus difficile à justifier en vérification. Conséquence assumée : `calendars.get` (donc `nomAgenda()`) échoue pour les calendriers OAuth → le nom est mémorisé dans `foyer_agendas.nom` au rattachement, et la fonction ne sert plus qu'aux calendriers historiques du compte de service.
- **Console Google** : URI `<origine>/api/agenda/callback` déclarée, scopes `calendar.calendarlist.readonly` + `calendar.events` ajoutés.
- **✅ VÉRIFICATION GOOGLE OBTENUE (13/08/2026)** — `calendar.events` approuvé pour `hub-familial-app` (le second scope, non sensible, n'avait pas à l'être). Pas d'audit CASA, conformément au choix d'écarter les scopes restreints. L'avertissement « Google n'a pas validé cette application » ne s'affiche plus. ⚠ **Toute modification de l'écran de consentement OAuth impose une NOUVELLE vérification** (nom de l'app, logo, e-mail d'assistance, URL d'accueil ou de politique, domaines autorisés, scopes) — plusieurs semaines. Renommer le **dépôt GitHub** ou le **projet Vercel** reste sans effet. Dossier et historique : `docs/VERIFICATION_GOOGLE.md`.

## Performance (06/08/2026) — latence, pas poids

Les pages mettaient plusieurs secondes à s'afficher. Le poids des bundles n'y était pour rien (103–137 kB de JS, sain) : **tout était de la latence réseau**, par quatre causes qui se cumulaient.

1. **⚠ RÈGLE : la fonction doit tourner à côté de la base.** [vercel.json](vercel.json) épingle `"regions": ["fra1"]` (Francfort) parce que Neon est en `eu-central-1`. Sans ce fichier, Vercel place les fonctions dans sa région par défaut **`iad1` (Washington)** et **chaque requête SQL fait un aller-retour transatlantique (~95 ms)** — invisible en dev, dévastateur en prod. Vérifiable à tout moment sur l'en-tête `x-vercel-id` d'une réponse : on veut lire `cdg1::fra1::`, pas `cdg1::iad1::`. Bonus non négligeable : les traitements restent en UE, ce que la politique de confidentialité annonce déjà. **Ne pas supprimer `vercel.json` ni changer la région sans déplacer la base avec.**
2. **Connexion Neon poolée.** `lib/db/index.ts` réécrit l'hôte vers l'endpoint `-pooler` (convention Neon : `ep-xxx` → `ep-xxx-pooler`). Sans pooler, chaque démarrage à froid refait une poignée de main TCP+TLS complète avant la 1re requête, et les instances Vercel épuisent la limite de connexions. `prepare: false` (déjà là) est ce que le mode transaction de PgBouncer exige. Réglages serverless : `max: 3`, `idle_timeout: 20`, `connect_timeout: 10`.
3. **`foyerCourant()` est sur le chemin critique de TOUT.** Il tournait en 4 requêtes séquentielles (dont une écriture) à chaque page **et** chaque route d'API. Désormais **une seule jointure indexée** dans le cas courant ; les écritures ne subsistent qu'à la première venue de la personne. Idem `utilisateurCourant()` (lecture d'abord). ⚠ En ajoutant du code ici, penser que son coût est payé **partout**.
4. **[app/loading.tsx](app/loading.tsx)** : toutes les pages étant `force-dynamic`, l'écran restait figé sur la page précédente pendant tout le rendu serveur — le clic semblait ignoré. Un squelette (`.sk*` dans [globals.css](app/globals.css)) s'affiche désormais instantanément.

Mesuré après coup sur les pages publiques (qui ne touchent même pas la base) : **~60 ms** contre 200–365 ms. Le gain est bien plus large sur les pages authentifiées, qui payaient 4 à 5 allers-retours base transatlantiques.

## Fichiers sensibles

`credentials.json` et `.env` sont en clair, exclus par `.gitignore`. Le projet n'est **pas** sous git : aucune modification n'est réversible. Une sauvegarde de l'ancienne version Express existe hors projet dans `Orga_Familial_SAUVEGARDE_20260720_213114/` (elle contient les fichiers de contexte obsolètes désormais retirés du projet : `README_CONTEXTE_PROJET.md`, `PLAN_PROJET.md`, `export_context.js`).
