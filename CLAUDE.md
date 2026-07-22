# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Langue

Projet, code, commentaires et réponses en **français**.

## Ce qu'est ce projet

**Hub familial** : application PWA (Next.js) qui remplace un ancien « Site QG » Google Sites et sert de portail unifié à un écosystème de **5 classeurs Google Sheets** (Budget, ToDo, Repas, Événements, Cadeaux), chacun piloté par des Apps Script. Les Sheets restent la **source de vérité** ; l'app lit (et écrira) par-dessus, module par module, sans les dupliquer.

Ambition produit : **privé d'abord** (le foyer), puis **distribuable à d'autres foyers**. Cette contrainte de revente dicte l'architecture — voir « Règles d'architecture » plus bas.

Le contexte complet est dans [Contexte/Recapitulatif_projet_et_objectifs.md](Contexte/Recapitulatif_projet_et_objectifs.md). Les `Contexte/*/​*.gs` sont les **Apps Script de référence** (non déployés par l'app, mais ils définissent le schéma réel des onglets, les thèmes et l'i18n — s'y référer avant de deviner quoi que ce soit).

## Commandes

```powershell
npm run dev     # Serveur de dev (http://localhost:3000)
npm run build   # Build de prod — vérifie aussi les types TypeScript
npm run lint    # ESLint (next lint)
npm run diag    # Vérifie l'accès aux 5 classeurs + liste leurs onglets réels
```

`npm run diag` est l'outil à lancer après tout changement de partage, de clé ou de langue dans les Sheets. Il est autonome (JS pur, sans Next) pour tourner même si le build casse.

## Règles d'architecture (non négociables)

Ces trois règles viennent des échecs de la version précédente et de la contrainte de revente. Les enfreindre casse silencieusement.

1. **Zéro identifiant en dur.** Aucun ID de classeur hors de `.env`, et aucune lecture de `process.env.*_SHEET_ID` hors de [lib/config.ts](lib/config.ts). Tout passe par `configFoyer()` / `idClasseur()`. Le jour du multi-foyer, **seul ce fichier** change (config par foyer au lieu de `.env`).

2. **Jamais de nom d'onglet en dur.** Les Apps Script renomment réellement les onglets selon la langue active (registre `LANGUES`). On désigne un onglet par sa **clé canonique** (`SEMAINE`, `TACHES`, `VUE_ENSEMBLE`…) et on résout via `nomOnglet()` de [lib/i18n.ts](lib/i18n.ts). Construire les plages A1 avec `plage()` (elle échappe apostrophes, emojis, `&`). L'ancien code codait `'Semaine!A:B'` en dur : il cassait au premier changement de langue.

3. **Secrets côté serveur uniquement.** Tout l'accès Google est dans [lib/google/](lib/google/), marqué `import 'server-only'`. Une importation depuis un composant client devient une **erreur de compilation**, pas une fuite. `credentials.json` ne doit jamais atteindre le bundle navigateur. C'est la raison du choix back-end (Next.js) plutôt qu'appels API côté client.

Pièges API rencontrés (ne pas réintroduire) :
- `spreadsheets.values.get` **omet** `values` quand la plage est vide (au lieu d'un tableau vide). Les lectures renvoient donc toujours `[]`.
- **Ne pas utiliser `append`** pour ajouter une ligne dans un onglet dont une colonne porte des cases à cocher/validation sur toute sa hauteur (cas de `Courses`, grille 1001 lignes) : l'API considère toute la colonne comme « la table » et place la nouvelle ligne en bas de grille (~ligne 1001), détachée des données. Calculer la prochaine ligne libre et écrire avec `ecrirePlage` (cf. `prochaineLigne()` dans `lib/todo/service.ts`).
- Les déclencheurs `onEdit`/`onFormSubmit` des Apps Script **ne s'exécutent PAS** sur les écritures via l'API. Toute logique qu'ils portaient (ex. régénération d'une tâche récurrente cochée « Fait ») doit être répliquée côté service.

## Structure

- [lib/config.ts](lib/config.ts) — config du foyer, point de bascule mono→multi-foyer (`server-only`).
- [lib/i18n.ts](lib/i18n.ts) — registre `LANGUES` (FR complet, EN/ES à venir), `nomOnglet()`, `t()`, `plage()`. Transposition de la Phase H des Apps Script.
- [lib/themes.ts](lib/themes.ts) — les **9 thèmes** (🌸 Rose défaut … 🌙 Nuit) en tokens CSS. Valeurs reprises de `Contexte/Budget/00_Constantes.gs`, **sauf le fond `PAGE` des 8 thèmes clairs**, volontairement plus teinté qu'en Sheets pour bien distinguer les coloris à l'écran (divergence assumée, documentée en tête du fichier ; thème sombre `nuit` inchangé). Ne pas retoucher les **autres** rôles (accents, cartes, statuts) : ils cadrent avec les classeurs. `cssDesThemes()` génère le CSS de tous les thèmes.
- [lib/google/sheets.ts](lib/google/sheets.ts) — client Sheets (compte de service), `lirePlage()`, `inspecterClasseur()` (`server-only`).
- [app/](app/) — App Router. `layout.tsx` injecte le CSS des thèmes + un script inline anti-flash. `page.tsx` = portail des 5 modules. `api/etat/route.ts` = diagnostic de connexion. `manifest.ts` = PWA.
- [components/](components/) — `SelecteurTheme` et `BandeauEtat` (client).
- `scripts/diag.mjs` — cf. `npm run diag`.

## État d'avancement

Échafaudage posé et **vérifié** (build vert, `/api/etat` renvoie `tousOk: true` sur les 5 classeurs, le 21/07/2026).

**Module To-Do & Courses : terminé et vérifié** (lecture + écriture testées bout-en-bout sur le vrai classeur, le 21/07/2026). Route `/todo`, API sous `app/api/todo/`, service `lib/todo/`. Fonctionnalités : liste des tâches triée (retards/priorité), ajout, changement de statut avec **régénération des tâches récurrentes** (réplique de l'`onEdit`), liste de courses groupée par rayon, cases à cocher, ajout d'article, retrait des articles cochés. Rôles de couleur du module dans `lib/todo/theme.ts` (patron d'extension de thème par module).

**Module Budget : dashboard + saisie, terminé et vérifié** (21/07/2026). Route `/budget`, API `app/api/budget/` (GET lecture, POST saisie), service `lib/budget/`. L'app **ne recalcule rien à l'affichage** : elle lit les valeurs déjà agrégées de l'onglet moteur « Tableau de bord » (KPIs du mois, dépenses par catégorie, soldes des comptes) et les repère **par libellé** (scan de la colonne A), pas par n° de ligne figé. Affiche : 4 tuiles KPI, tuiles de comptes, jauges Réel/Budget par catégorie (dépassement = statut réservé, ⚠ + couleur `--over-*`), dernières transactions, échéances à venir. Le Budget n'utilise que les rôles du socle (`lib/themes.ts`), pas d'extension de thème.
- Schéma Transactions : A Date · B Type · C Compte · D Compte destination · E Catégorie · F Libellé · G Montant · H Note (source). Types : Dépense / Revenu / Virement interne.
- **Saisie** ([SaisieTransaction.tsx](components/budget/SaisieTransaction.tsx), client) : reproduit la logique du formulaire Google (`Contexte/Budget/06_Formulaire.gs`) — virement → catégorie vidée + destination requise ; sinon destination vidée. Écrit à la ligne libre calculée (`prochaineLigneTx`), source = « App ». Après succès, `router.refresh()` relance le rendu serveur → soldes/KPIs recalculés par les formules. Listes déroulantes (comptes, types, catégories dépense/revenu) lues dans Paramètres et incluses dans le payload GET.
- Testé sur le vrai classeur : les 3 types écrivent, le virement sans destination est refusé (400), les soldes bougent correctement (ex. Compte Lou −0,04 € pour une dépense 0,01 + un virement 0,03).
- **Sélecteur de mois** ([SelecteurMois.tsx](components/budget/SelecteurMois.tsx), PATCH `/api/budget`) : écrit les cellules moteur `Tableau de bord!B3` (année) / `B4` (mois, numéro), au **format masqué `;;;`** — donc lues en **UNFORMATTED** (`lireBrut`), une lecture formatée les renvoie vides. Écrire ces cellules déclenche le recalcul des formules (KPIs + catégories du mois) ; les soldes/patrimoine sont cumulés, indépendants du mois. Le service réplique aussi `majSousTitre_` (le déclencheur onEdit ne s'exécute pas sur écriture API) : met à jour le sous-titre de la Vue d'ensemble en préservant le suffixe. Noms de mois exacts = `MOIS_FR` (schema), doivent matcher `Budget/00_Constantes.gs`.
- **⚠ État partagé** : le mois est unique pour tout le classeur ; le changer depuis l'app le change pour tous (comme le sélecteur natif). Testé : bascule Juin↔Juillet correcte, restauration parfaite.

Erreurs métier : `ErreurValidation` ([lib/erreurs.ts](lib/erreurs.ts)) → 400 via `reponseErreur` ([lib/api.ts](lib/api.ts)) ; `ConfigManquante` → 503. Une saisie invalide ne doit jamais remonter en 500.

**Module Repas : planning + recettes avec quantités/personnes, terminé et vérifié** (21/07/2026). Route `/repas`, API `app/api/repas/` (GET + `recettes` POST/PATCH/DELETE + `semaine` PATCH), service `lib/repas/`.
- **Extension de schéma** (décidée avec l'utilisateur) : la colonne Ingrédients de l'onglet Recettes passe au format enrichi **« article | quantité | unité | rayon »** (une ligne par ingrédient), + nouvelle colonne **F « Personnes »** (base). Onglet Semaine : nouvelle colonne **E « Personnes »** (par jour). Les en-têtes sont posés idempotemment par `assurerEntetes()`.
- **Parsing rétro-compatible** ([schema.ts](lib/repas/schema.ts) `parseIngredient`) : 2 champs = ancien « article | rayon » (quantité vide), 4 champs = nouveau. Les 8 recettes existantes ne sont PAS migrées destructivement — elles se convertissent quand on les édite dans l'app (qui réécrit toujours en 4 champs). ⚠ Conséquence : l'ancien bouton Apps Script `envoyerVersCourses` (qui lit « article | rayon » sur le 1er `|`) devient obsolète sur les recettes éditées par l'app — remplacé par le futur bouton d'accueil.
- **Mise à l'échelle** : quantités × personnesJour / personnesBase (`mettreALechelle`). `agregerCourses()` (pur) somme les ingrédients des dîners planifiés par article+unité → alimente l'aperçu des courses **et** le futur bouton « envoyer vers les courses » (accueil, pas encore fait).
- Unités = liste fixe (`UNITES`). Défaut foyer = `PERSONNES_DEFAUT = 2`.
- UI : onglets Semaine (planning par jour, nb de personnes → quantités recalculées + aperçu courses agrégé par rayon) et Recettes (éditeur complet : ingrédients avec qté/unité/rayon, personnes de base, type, chaud/froid ; ajout/édition/suppression).

**Module Cadeaux : terminé et vérifié** (21/07/2026). Route `/cadeaux`, API `app/api/cadeaux/` (GET + `items` POST/PATCH/DELETE), service `lib/cadeaux/`. Onglet Cadeaux (A Pour qui · B Occasion · C Idée · D Statut · E Budget prévu · F Prix payé · G Offert par · H Où/lien · I Note), onglet Occasions (A Occasion · B Date · C Budget · D Note). UI : cadeaux regroupés par occasion (date + « dans N j » si <30 j + budget prévu/payé vs budget occasion), statut (Idée→Offert), ajout/édition/suppression. Statuts lus dans Paramètres (A statuts, B offert par, dès la ligne 4).

**Module Événements : terminé et vérifié** (21/07/2026). Route `/evenements`, API `app/api/evenements/` (GET + `items` POST/PATCH), service `lib/evenements/`. Onglet maître Événements (A Nom · B Type · C Date · D Heure · E Lieu · F Nb invités · G Budget · H Dépensé · I Statut · J Note · **K AgendaID — jamais écrite par l'app**, préservée). Sous-onglets Invités / Checklist / Menu & Courses référencent l'événement par son NOM (colonne A).
- **Le maître peut être vide** alors que les sous-onglets portent des événements : la liste affichée est l'**union** des noms (maître + sous-onglets). Un événement « stub » (présent seulement dans les sous-onglets) est éditable → crée une ligne dans le maître.
- Récapitulatifs calculés depuis les sous-onglets (par nom) : invités confirmés (RSVP=Oui) + personnes, avancement checklist (fait/total, jauge), nb plats du menu + coût estimé.
- Écriture du maître en colonnes A→J uniquement lors des éditions normales. Statuts/Types lus dans Paramètres (A types, B statuts).
- **Sync Agenda ↔ Événements** (22/07/2026) : bouton « Ajouter à l'agenda » sur chaque événement daté du maître → crée l'événement dans l'agenda choisi (parmi `AGENDA_IDS`) via `lib/agenda/service` et mémorise **`calendarId|eventId` en colonne K** (dédoublonnage). Badge « dans l'agenda · <nom> » + bouton « retirer » (supprime l'event d'agenda + vide K). API `app/api/evenements/agenda/` (POST/DELETE), service `lierAgenda`/`delierAgenda`. `chargerEvenements` expose `agendaLien` (col K) + la liste `agendas` (via `listerAgendas()`, défensif si Agenda indispo). ⚠ Format K = `calendarId|eventId` (l'ancien Apps Script `synchroniserAgenda` stockait un id CalendarApp seul → obsolète, remplacé par l'app). Testé lier+délier (mécaniques Sheets K + Calendar create/delete) OK.

**Bouton d'accueil « Courses de la semaine » : terminé et vérifié** ([CoursesSemaine.tsx](components/CoursesSemaine.tsx), API `app/api/courses/semaine/`). GET agrège la liste des dîners planifiés (`listeCoursesSemaine()` dans `lib/repas/service.ts` → `agregerCourses`, quantités mises à l'échelle). Deux actions :
- **Envoyer par message** : `navigator.share` (partage natif mobile → SMS/WhatsApp/…) avec repli sur un lien `sms:?body=` (l'ancien « bouton SMS courses » du Site QG). Texte groupé par rayon, quantités incluses.
- **Ajouter à ma liste de courses** : POST → `ajouterCoursesEnLot()` (lib/todo/service) verse dans l'onglet Courses de ToDo, **dédoublonné** (idempotent : un 2e envoi ignore tout). La quantité est intégrée au libellé (« Pâtes (400 g) ») car l'onglet Courses n'a pas de colonne quantité.

Helpers monétaires/dates partagés par les nouveaux modules : [lib/argent.ts](lib/argent.ts) (`parseEuro`, `formatEuro`, `versISO`, `joursJusqua`). Le Budget garde ses helpers historiques.

**Les 5 modules sont désormais branchés.**

**Accueil refondu** (21/07/2026, remanié le 23/07/2026) : marque (logo app + titre serif) + **menu déroulant** haut-droite ([MenuPrincipal.tsx](components/MenuPrincipal.tsx) : modules + thème + déconnexion), puis dans l'ordre — **comptes encadrés** (hors épargne, via `chargerAccueilBudget()` : soldes + params de saisie en 1 aller-retour ; exclut « épargne »), action rapide (ajout d'opération), **vue Agenda de la semaine**, **section Courses**, **section Drive familial en pied de page**. Les 4 sections (comptes / agenda / courses / Drive) partagent le même style de carte (`var(--cell)`, radius 1rem). La grille de modules et le bandeau d'état ont été retirés de l'accueil (modules → menu).
- **Section Courses** ([CoursesSemaine.tsx](components/CoursesSemaine.tsx)) : design de la maquette validée — **chargée automatiquement** au montage (comme agenda/Drive), en-tête avec compteur « N dîners planifiés », articles groupés par rayon avec **pastilles de quantité** (`.cs-q`, teinte `--head`), CTA plein `.bouton-primaire` (Envoyer par message) + secondaire (Ajouter à ma liste) + Copier. `listeCoursesSemaine()` renvoie désormais `{ articles, diners }`.
- **Ajout d'opération déplacé sur l'accueil** en **bouton + modale** ([SaisieTransaction.tsx](components/budget/SaisieTransaction.tsx), désormais modale ; retiré de `/budget`). `router.refresh()` après écriture met à jour les soldes de l'accueil.
- **Section « Drive familial »** (entre les comptes et l'agenda) : explorateur du Drive « Hub Familial » ([DriveExplorer.tsx](components/DriveExplorer.tsx), API `app/api/drive/liste/`, service [lib/google/driveBrowse.ts](lib/google/driveBrowse.ts)). Navigation dans les dossiers (fil d'Ariane), ouverture des fichiers dans un nouvel onglet (`webViewLink`). **Lecture au nom de l'utilisateur** via son jeton OAuth Drive (comme l'import ; le compte de service ne peut pas lire un Drive personnel). Racine = `DRIVE_HUB_URL` (`.env`) ; si absente, message d'aide `config`.
- **Bouton « Importer »** ([ImportDrive.tsx](components/ImportDrive.tsx)) : intégré dans la section Drive. **Vrai téléversement** dans « À classer » via le jeton OAuth Drive de l'utilisateur (`DRIVE_A_CLASSER_URL`/`DRIVE_A_CLASSER_ID`), API `app/api/drive/import/`. Nécessite : l'**API Drive activée** dans le projet GCP + une session avec le scope Drive (reconnexion si `tokenError`). En cas d'échec, la vraie raison est affichée en rouge ; `onImporte` rafraîchit l'explorateur après succès. (L'ancienne version « ouvre juste le dossier, pas d'upload » est obsolète.)

**Module Agenda : terminé et vérifié en conditions réelles** (21/07/2026 — API Calendar activée, 3 agendas partagés : Crèche, Travail Lou, Travail Mati). Route `/agenda`, API `app/api/agenda/` (GET/POST/DELETE), service `lib/agenda/`. Source = **Google Agenda** (pas un Sheet), via le compte de service + scope `calendar`. Affiche les événements à venir (30 j) des 3 agendas fusionnés/triés, groupés par jour ; ajout (journée entière ou horaire, fuseau `Europe/Paris`) dans l'agenda choisi ; suppression. Lecture + ajout + suppression testés OK.
- **Multi-agendas** : `AGENDA_IDS` dans `.env` = un ou plusieurs IDs séparés par des virgules (lu via `configFoyer().agendaIds` ; `AGENDA_ID` seul reste accepté). Les événements des agendas sont fusionnés et triés ; chacun reçoit une couleur d'identité (`COULEURS_AGENDA`) et son nom (via `calendars.get`). L'ajout choisit l'agenda cible ; la suppression connaît l'agenda d'origine (`calendarId` porté par chaque événement).
- **Contrairement à Drive, ça marche avec le compte de service** (pas de quota) — mais il faut : (1) **activer l'API Google Calendar** dans le projet GCP `hub-familial-app`, (2) **partager chaque agenda** avec `claude-sheet-access@…` (droit « modifier les événements »), (3) `AGENDA_IDS` dans `.env`.
- La page dégrade proprement si non configuré : message d'aide ciblé (API à activer / agenda à partager / `AGENDA_ID` manquant). Vérifié : `/agenda` répond 200 avec le message de config, pas de crash.
- **Non encore vérifié en conditions réelles** (API Calendar désactivée au moment du build) — à re-tester une fois les 3 étapes faites.

**Icônes PWA : faites** (21/07/2026). Icône « maison familiale » (SVG, palette rose) rasterisée par `sharp` (dépendance Next, fonctionne). Générées par `node scripts/generer-icones.mjs` (script maintenu, réexécutable) → `public/icon-192.png`, `public/icon-512.png` (manifest, dont maskable plein cadre), `app/icon.png` (favicon auto Next), `app/apple-icon.png` (iOS). Manifest (`app/manifest.ts`) + balises `<link>` (manifest/icon/apple-touch-icon/theme-color) vérifiés servis. L'app est installable « sur l'écran d'accueil » (iOS Safari + Android).

**Service worker / hors ligne : fait** (23/07/2026). [public/sw.js](public/sw.js) enregistré par [EnregistrerSW.tsx](components/EnregistrerSW.tsx) (**production uniquement**, inclus dans `layout.tsx`) → l'app **s'ouvre sans réseau**, invite d'installation Android active. ⚠ **Pas d'offline des données** : elles viennent des API Google à la requête ; le worker ne cache QUE la coquille. Stratégies : écritures/`/api/*` → réseau direct (jamais en cache) ; statiques hashés → cache-first ; navigations → network-first avec repli sur la copie en cache puis sur `/hors-ligne` ([app/hors-ligne/page.tsx](app/hors-ligne/page.tsx), statique, publique). `middleware.ts` exclut `/sw.js` et `/hors-ligne` de l'auth. Bump du nom de cache (`hub-familial-v1`) pour invalider l'ancien cache lors d'un changement de stratégie. Les pages authentifiées sont mises en cache côté appareil (PWA perso, acceptable).

**Déploiement + connexion (en cours, 21/07/2026).** Objectif : app hébergée (Vercel) accessible depuis le téléphone, PC éteint, avec accès protégé.
- **Auth d'accès = Auth.js v5 (`next-auth@beta`) + Google OAuth**, restreint à une liste blanche `EMAILS_AUTORISES`. Fichiers : `auth.ts` (config + callbacks), `app/api/auth/[...nextauth]/route.ts`, `middleware.ts` (protège tout sauf `/connexion`, `/api/auth`, statics/assets), `app/connexion/page.tsx`. ⚠ C'est l'auth d'ACCÈS (qui ouvre l'app), distincte du **compte de service** qui lit/écrit les données Google — inchangé.
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

## Accès Google (vérifié 21/07/2026)

Compte de service `claude-sheet-access@hub-familial-app.iam.gserviceaccount.com`, clé dans `credentials.json`, accès lecture/écriture aux 5 classeurs. `.env` porte les 5 IDs. **Ne pas reconfigurer.** (Un ancien compte `node-app-connector` n'avait accès qu'à ToDo — piste morte.)

## Fichiers sensibles

`credentials.json` et `.env` sont en clair, exclus par `.gitignore`. Le projet n'est **pas** sous git : aucune modification n'est réversible. Une sauvegarde de l'ancienne version Express existe hors projet dans `Orga_Familial_SAUVEGARDE_20260720_213114/` (elle contient les fichiers de contexte obsolètes désormais retirés du projet : `README_CONTEXTE_PROJET.md`, `PLAN_PROJET.md`, `export_context.js`).
