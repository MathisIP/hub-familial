# 🏡 Hub d'organisation familiale → Application — Récapitulatif complet & objectifs

> Document de synthèse autonome (2026-07-18). Il explique **tout ce qui a été construit jusqu'ici** (l'écosystème Google Sheets / Apps Script) puis **les nouveaux objectifs** (une application qui remplace le Site QG). Il est pensé pour servir de **contexte de départ** à la nouvelle base de code, dans VS Code avec Claude Code.  
>   
> Document de référence détaillé et vivant : `Cahier_de_projet_hub_familial.md` (dans le Projet Claude). Ce récapitulatif en est la version « lisible d'une traite ».

---

## 1\. En bref (résumé exécutif)

Nous avons transformé un ensemble de fichiers Google (tableurs \+ formulaires \+ agenda \+ site) bricolés au fil de l'eau en un **hub d'organisation familiale propre, cohérent et maintenable** : 5 Google Sheets consolidés, harmonisés graphiquement, dotés de menus d'installation « en un clic », de modes d'emploi intégrés, d'un **sélecteur de 9 thèmes de couleurs** (dont un mode sombre) et d'un **cadre multilingue** (français prêt, anglais / espagnol à venir).

**Nouvelle direction :** au-delà des tableurs, on démarre une **application** (React \+ Vite, en PWA) qui **remplace le Site QG** et, progressivement, reprendra certaines fonctions aujourd'hui gérées dans les Sheets. **Privée d'abord** (pour le foyer), puis **pensée pour être vendable** à d'autres foyers. C'est le chantier qui commence maintenant.

---

## 2\. Le point de départ — le « Hub familial » dans Google

Un système 100 % gratuit dans l'écosystème Google, partagé en temps réel entre les deux membres du foyer (droit « Éditeur »), simple à utiliser (menus déroulants, formulaires, automatismes), avec un **design pastel** cohérent. Il se compose de :

**5 Google Sheets (les « classeurs »), chacun un projet Apps Script :**

| Classeur | Rôle | Points clés |
| :---- | :---- | :---- |
| **Budget\_familial** | Comptes, dépenses, revenus, virements internes, épargne, échéances | 3 types d'opérations (Dépense / Revenu / Virement interne) ; onglet vitrine « 🌸 Vue d'ensemble » (KPIs, camembert dynamique, suivi budget, objectifs d'épargne) ; e-mails automatiques (échéances \+ récap mensuel) ; formulaire de saisie mobile |
| **ToDo\_familiale** | Tâches du foyer \+ liste de courses partagée | Vues perso (Lou / Mati / Nous deux) via QUERY ; récurrences automatiques ; rappels e-mail ; 2 formulaires (ajout tâche, ajout courses multi-articles) |
| **Repas\_semaine** | Planning des dîners \+ banque de recettes | Liste déroulante « Dîner » ; couleurs par Type (Viande/Poisson/Végé) et Chaud/Froid ; bouton « envoyer les ingrédients » → écrit dans les Courses de ToDo |
| **Événements** | Réceptions & événements \+ logistique | Invités (RSVP), checklist, menu & courses ; **synchronisation avec l'Agenda familial** (à la demande) ; statuts (À planifier → Passé) |
| **Suivi cadeaux** | Idées cadeaux, budget, avancement | Statuts (Idée → À acheter → Commandé → Reçu → Emballé → Offert) ; occasions (\< 30 j surlignées) ; lien budget « Cadeaux » |

**Autour des classeurs :** 3 **Google Forms** (tâche, courses, budget), un **Agenda Google** familial, un tableau de bord **Looker Studio** (budget), et un **Site Google (« Site QG »)** qui sert de portail (boutons vers les outils, bouton SMS courses).

**Charte graphique de départ :** police Arial, palette pastel « Rose / Bleu », formats `#,##0.00 €` et dates `JJ/MM/AAAA`.

---

## 3\. Ce que nous avons fait — les phases A → H

Le « grand chantier » a consisté à professionnaliser l'ensemble, phase par phase.

### ✅ Phase A — Mise au propre des scripts (terminée)

Chaque classeur a été réorganisé en **un projet Apps Script clair**, découpé en fichiers numérotés logiques (`00_Constantes.gs`, `01_Menu.gs`, …), fonctions bien nommées et commentées, **doublons supprimés**, constantes centralisées, `onOpen`/menus cohérents. Comportement métier **inchangé**, déclencheurs préservés.

### ✅ Phase B — Harmonisation du design (terminée)

Tous les onglets alignés sur la charte pastel : police, en-têtes, mises en forme conditionnelles, onglets colorés, lignes d'en-tête figées, formats € et dates. Socle commun de helpers (`base_`, `head_`, `title_`, `softFont_`).

### ✅ Phase C — Menus d'installation par fichier (terminée)

Chaque classeur a, sous **⚙️ Configuration**, trois actions : **🚀 Tout installer / configurer**, **🔍 Vérifier la configuration**, **♻️ Réinitialiser les exemples** (protégée par confirmation tapée `RESET`). But : un nouveau foyer met tout en place en quelques clics, sans ouvrir l'éditeur de code.

### ✅ Phase D — Modes d'emploi intégrés (terminée)

Chaque classeur a un onglet **« Lisez-moi »** riche (8 sections : à quoi ça sert, démarrage, les onglets un par un, le quotidien, le menu, formules à coller, FAQ, partage), régénéré par `remplirLisezMoi()`. Les formules « à coller à la main » y sont affichées en texte (jamais évaluées).

### ✅ Phase E — Version vierge / gabarit distribuable (faite, non finalisée)

Un dossier **`Gabarit/`** contient un clone **dépersonnalisé** des 5 projets (IDs en saisie guidée, membres « Membre A / B », zéro donnée perso) \+ un guide de distribution. Jugé **pas encore abouti** en pratique → on a préféré avancer d'abord sur la prod (voir pivot ci-dessous).

### 📋 Phase F — Outillage de synchronisation (procédure documentée)

Procédure **clasp** (`@google/clasp`) pour pousser/mettre à jour les `.gs` sans copier-coller. Repli tant que clasp n'est pas installé : **copier-coller** dans l'éditeur Apps Script.

### ✅ Phase G — Système de thèmes de couleurs (livré sur les 5 classeurs)

Chaque classeur porte un **registre `THEMES` de 9 coloris** — 🌸 Rose (défaut), 🌊 Océan, 🌿 Sauge, 🍂 Terracotta, 🪻 Lila, 🌹 Rouge, 🤎 Marron, 🩶 Gris, 🌙 Nuit — avec, pour chaque thème, les mêmes **rôles de couleur** (encre, en-têtes, fonds, \+ les couleurs de statut propres à chaque outil). Un **menu « 🎨 Thème »** applique un coloris **instantanément** et de façon **non destructive** (recoloration seule, aucune donnée ni formule touchée). Un rôle `CELL` peint le fond des cellules → le **mode 🌙 Nuit** reste lisible. Le défaut « Rose » reproduit exactement les valeurs d'origine (zéro changement visuel par défaut).

### ✅ Phase H — Cadre multilingue / i18n (livré sur les 5 classeurs, FR de référence)

Chaque classeur porte un **registre `LANGUES`** (même patron que `THEMES`) : noms d'onglets et libellés d'interface par langue. Le code n'écrit **plus jamais un nom d'onglet en dur** — il passe par `nomOnglet_('CLE')` / `t_('CLE')`. Un menu **« 🌍 Langue »** change la langue en **renommant réellement les onglets** (décision : renommage complet). **Français \= référence complète, comportement inchangé.** L'anglais et l'espagnol restent à remplir (le cadre est prêt pour les accueillir sans retoucher au reste du code).

---

## 4\. La réconciliation G+H (le travail récent — 2026-07-18)

**Le problème :** en appliquant la Phase H (langues) sur 4 des 5 classeurs, la Phase G (thèmes) avait été **« fait sauter »** — les versions en service avaient perdu le système de thèmes. Autrement dit, sur To-Do, Événements, Repas et Cadeaux, il fallait **réunir** les deux : le cadre langues (récent) **et** le sélecteur de thème (perdu). Le Budget, lui, avait déjà les deux.

**La solution :** pour chaque classeur, on avait les **deux morceaux** — le thème G conservé dans le Projet Claude, le cadre langues H dans les fichiers en service. On a donc **refusionné fidèlement** (pas réinventé) :

- **Budget** — les deux phases déjà présentes : vérifié, validé, resynchronisé.  
- **To-Do** (9 fichiers), **Événements** (6), **Repas** (7), **Cadeaux** (5) — thème G **réinjecté** dans la version langues H.

**Choix de réconciliation appliqués partout :** couleurs d'onglets (`TABCOL`) re-keyées par **clés canoniques** (compatibles avec `nomOnglet_`) ; le **Lisez-moi se re-thème** désormais (il lit la palette au lieu d'une palette fixe) ; les **libellés métier** (statuts, priorités, types de transaction, Chaud/Froid…) restent en dur — ils sont considérés comme des **données**, hors du cadre i18n pour l'instant.

**Validation à chaque étape :** contrôle de syntaxe fichier par fichier **et** projet concaténé dans l'ordre (espace de noms Apps Script unique), aucun doublon de fonction, clés `nomOnglet_` toutes présentes dans le registre, aucun nom d'onglet français resté en dur. Les **\~37 fichiers `.gs`** des 5 classeurs (Budget 10, To-Do 9, Repas 7, Événements 6, Cadeaux 5\) ont été livrés, prêts à coller dans l'éditeur Apps Script, et le **Projet Claude a été entièrement resynchronisé** (fichiers \+ cahier de projet).

---

## 5\. État actuel — où on en est

- **Les 5 classeurs de prod** ont chacun : le **sélecteur de 9 thèmes** (menu 🎨 Thème), le **cadre langues** avec le français de référence (menu 🌍 Langue), les menus d'installation (⚙️ Configuration) et le Lisez-moi. **Par défaut (Rose \+ Français), le comportement est strictement identique à l'origine.**  
- **Tout est sauvegardé dans le Projet Claude** : les fichiers `.gs` des 5 classeurs \+ le cahier de projet à jour.  
- **Déploiement** : copier-coller des `.gs` dans Extensions ▸ Apps Script de chaque classeur (clasp pas encore installé).

**Reste ouvert côté Sheets (non bloquant) :** remplir l'anglais puis l'espagnol sur les 5 ; décider du sort des libellés métier pour un EN/ES complet ; valider les couleurs à l'œil (surtout le mode Nuit) ; décliner le thème hors-Sheets (Looker) ; reporter le tout sur le `Gabarit/` distribuable.

---

## 6\. Les nouveaux objectifs — l'Application (« Phase I »)

### 6.1 Vision

Remplacer le **Site QG** (Google Sites) par une **vraie application**. À terme, une **app complète** qui non seulement **affiche/synthétise** les données du foyer, mais **reprend progressivement** certaines fonctions aujourd'hui dans les Sheets (saisie, listes, suivi) — sans casser les tableurs tant que la bascule fonction par fonction n'est pas faite. **Ambition produit :** usage **privé d'abord** (le foyer), puis version **distribuable / vendable** à d'autres foyers.

### 6.2 Décisions prises

1. **Périmètre \= app complète** (pas seulement un portail de liens).  
2. **Stack \= React \+ Vite, en PWA** — installable sur l'écran d'accueil du téléphone, hébergement statique gratuit possible (Vercel / Netlify / GitHub Pages). Bien outillée pour Claude Code.  
3. **Données \= lecture (et écriture) de l'écosystème Google existant** (les 5 Sheets \+ l'Agenda), via l'**API Google Sheets/Calendar** ou un **Web App Apps Script**. **Pas de duplication** au départ : les **Sheets restent la source de vérité**.  
4. **Accès \= privé d'abord** (foyer, avec login), **mais architecturé pour la revente** dès le départ.

### 6.3 ⚠ Contraintes d'architecture (à cause de l'ambition « vendable »)

- **Multi-locataire (multi-foyer) par conception.** Chaque foyer aura SES propres classeurs / son propre compte Google → **zéro identifiant en dur** dans l'app. Les IDs aujourd'hui codés dans les Sheets (`Budget ID`, `TODO_ID`, `CAL_ID`, IDs de formulaires) deviennent de la **configuration par utilisateur** (connexion Google \+ choix des fichiers, ou saisie d'IDs).  
- **Authentification** en **Google OAuth** recommandée (on lit les données Google au nom de l'utilisateur connecté). Prévoir une vraie gestion de comptes pour l'échelle « vente ».  
- **Secrets & sécurité :** appeler l'API Google **directement côté client** expose des clés → pour une version vendable, préférer un **petit back-end** (fonctions serverless, ou Web App Apps Script côté propriétaire du fichier). **Décision à trancher** : Vite seul \+ back séparé, ou **Next.js** si on veut des routes serveur intégrées.  
- **i18n & thèmes dès le départ :** réutiliser le cadre langues (Phase H) et les 9 coloris (Phase G), transposés en **design system** de l'app.

### 6.4 À réutiliser de l'existant (spéc & design system)

- **Modules fonctionnels \= miroir des 5 classeurs** : Budget · To-Do \+ Courses · Repas · Événements · Cadeaux (logique, onglets, colonnes → voir §2 et l'annexe).  
- **Design system** : les **9 thèmes** \+ **rôles de couleur** \+ mode sombre → **tokens CSS / thème React** ; le sélecteur de thème de l'app peut reprendre exactement ces coloris.  
- **Localisation** : le registre `LANGUES` sert de **table de libellés de référence** (FR prêt).  
- **Règles métier** : 3 types de transactions ; statuts To-Do / Cadeaux / Événements ; Chaud/Froid \+ Type des recettes ; RSVP invités ; occasions \< 30 j…

### 6.5 Décisions restées ouvertes (à trancher en session Claude Code)

- **Mode d'accès aux données** : API Google côté client **vs** Web App Apps Script **vs** back-end/serverless (impacte sécurité \+ revente). En découle : **Vite seul** ou **Next.js**.  
- **Multi-foyer pour la vente** : chaque foyer branche son propre Google, **ou** migration vers une base propre (Firebase / Supabase) à terme.  
- **Ordre de bascule Sheets → app** : quelle fonction migrer en premier (candidat naturel : **Courses / To-Do**, très interactif sur mobile).  
- **Offline / cache (PWA)** et **monétisation / distribution** (licence, abonnement ?) — plus tard.

---

## 7\. Prochaines étapes suggérées (pour démarrer l'app)

1. **Trancher l'accès aux données** (API client vs Apps Script Web App vs back-end) — c'est la décision qui conditionne tout le reste (dont Vite seul vs Next.js).  
2. **Échafauder le projet** : React \+ Vite \+ PWA, structure de dossiers, i18n, thème (tokens CSS des 9 coloris).  
3. **Poser l'authentification** (Google OAuth) et le **modèle de configuration multi-foyer** (aucun ID en dur).  
4. **Brancher une première source de données** en lecture seule (ex. la « Vue d'ensemble » du Budget, ou les Courses de To-Do) pour valider la chaîne bout-en-bout.  
5. **Choisir le premier module à migrer** (recommandé : Courses / To-Do) et itérer.

>   
> Astuce Claude Code : commencer par un `CLAUDE.md` à la racine du repo qui reprend la stack, les conventions, et surtout la contrainte **multi-foyer / zéro ID en dur**. (Je peux te le préparer si tu veux.)

---

## Annexe — Inventaire technique (référence rapide)

> ⚠ Ces identifiants appartiennent au foyer et sont codés en dur dans les Sheets aujourd'hui. Dans l'app, ils deviennent de la **configuration par utilisateur** (cf. §6.3).

| Composant | Type | Identifiant / lien |
| :---- | :---- | :---- |
| Budget\_familial | Google Sheet | `14T-5m2p2IqzRYTW8OcYRoFysZCn7L9BgGWgGlP2LnxY` |
| ToDo\_familiale | Google Sheet | `1HnbbcYnu5aPLVldLr4mMvAhBHwyIOVtS34Ea-j5JO10` |
| Suivi cadeaux | Google Sheet | `1-lTIFIHKRgomfe9ws62EdaihHkn7wP_vL0jI7KoVUfg` |
| Événements | Google Sheet | `1XiD-jlA-yDhuredym0f22DPJz1NaAynfD6q2MisbHyk` |
| Repas\_semaine | Google Sheet | `1mhw6AC8jZ9NBaTE4J6rGOVv0MvUtu3QtN547YCALx0s` |
| Looker Studio (budget) | Looker | [https://datastudio.google.com/s/ge2SzIevUxw](https://datastudio.google.com/s/ge2SzIevUxw) |
| Site QG (à remplacer) | Google Sites | [https://sites.google.com/view/qg-famille-ingrand-perigne/accueil](https://sites.google.com/view/qg-famille-ingrand-perigne/accueil) |
| Agenda familial | Google Agenda | `family00543545316284784143@group.calendar.google.com` |
| Formulaire « Ajouter une tâche » | Google Forms | [https://forms.gle/jx7Y77LvtKzHMMVe7](https://forms.gle/jx7Y77LvtKzHMMVe7) |
| Formulaire budget | Google Forms | [https://forms.gle/LeSY5Ux2sp8x9rZ57](https://forms.gle/LeSY5Ux2sp8x9rZ57) |
| Formulaire « Ajouter aux courses » | Google Forms | [https://docs.google.com/forms/d/e/1FAIpQLSd93vRJ6MopwTjFgExE-GPYoNE06oFnndUYN4qnaKSwRkuR1Q/viewform](https://docs.google.com/forms/d/e/1FAIpQLSd93vRJ6MopwTjFgExE-GPYoNE06oFnndUYN4qnaKSwRkuR1Q/viewform) |

**Les 9 thèmes (design system) :** 🌸 Rose/Bleu (défaut) · 🌊 Océan · 🌿 Sauge · 🍂 Terracotta · 🪻 Lila · 🌹 Rouge · 🤎 Marron · 🩶 Gris · 🌙 Nuit. Rôles de couleur communs (encre `INK`, en-tête `HEAD`, fond de page `PAGE`, fond cellule `CELL`, liens `LINK_TX`…) \+ couleurs de statut propres à chaque module. Valeurs hex exactes : registre `THEMES` de chaque `00_Constantes.gs` (dans le Projet Claude).

**Règles métier de référence, par module :**

- **Budget** — opérations : Dépense / Revenu / Virement interne. Vue d'ensemble \= KPIs \+ camembert dynamique \+ suivi budget \+ objectifs d'épargne. E-mails auto (échéances J-7/J-1/J, récap mensuel).  
- **To-Do** — statuts À faire / En cours / Fait ; priorités Haute / Moyenne / Basse ; assignation Lou / Mati / Les deux ; récurrences ; courses cochables (sans doublon).  
- **Repas** — recettes (Type Viande/Poisson/Végé, Chaud/Froid, ingrédients « article | rayon ») ; planning hebdo ; envoi des ingrédients vers les Courses de To-Do.  
- **Événements** — statuts À planifier / En préparation / Prêt / Passé ; RSVP Oui/Non/Peut-être/ En attente ; synchro Agenda (dédoublonnage via un ID d'événement mémorisé).  
- **Cadeaux** — statuts Idée / À acheter / Commandé / Reçu / Emballé / Offert ; occasions (\< 30 j surlignées) ; budget prévu vs prix payé.

---

*Rédigé le 2026-07-18. Source détaillée et à jour : `Cahier_de_projet_hub_familial.md` (Projet Claude).*  
