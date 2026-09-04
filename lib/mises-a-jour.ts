/**
 * NOTES DE VERSION PUBLIQUES — le contenu de `/mises-a-jour`.
 * ==========================================================
 * ⚠ LES DONNÉES SONT ICI, LA PAGE NE FAIT QUE LES RENDRE. Ajouter une version
 * doit être un geste d'écriture, pas de mise en page : on empile une entrée en
 * tête du tableau et c'est tout. Sans cette séparation, chaque publication
 * demanderait de retoucher du JSX, et la tentation serait grande de sauter
 * l'exercice — c'est ainsi qu'une page de mises à jour cesse d'être à jour.
 *
 * ⚠ ÉCRIT DU CÔTÉ DU LECTEUR, jamais du côté du code. Il ne veut pas savoir
 * qu'une requête a été corrigée : il veut savoir que son bouton marche. Cette
 * page est publique — un prospect la lit aussi, et y jugera le soin apporté au
 * produit autant que les corrections elles-mêmes.
 *
 * ⚠ POUR PUBLIER UNE VERSION : ajouter une entrée EN TÊTE de `VERSIONS`, avec le
 * numéro suivant et la date du jour. Ne jamais modifier ni renuméroter les
 * précédentes — elles ont été lues, et certaines ont peut-être été citées.
 *
 * ⚠ AUCUN NOM DE PERSONNE. Les corrections viennent des testeurs, et on le dit
 * globalement ; citer quelqu'un dans une page publique n'a été demandé par
 * personne.
 */

/** Nature d'un changement. La couleur de la rubrique en découle. */
export type Nature = 'corrige' | 'nouveau' | 'ameliore';

export type Changement = {
  nature: Nature;
  /** Une phrase, en gras dans la page. Ce que la personne verra changer. */
  titre: string;
  /** Le contexte : pourquoi c'est mieux, ou ce que ça remplace. */
  texte: string;
  /**
   * Précision secondaire, affichée plus discrètement.
   * `alerte: true` quand le lecteur a quelque chose à VÉRIFIER chez lui — une
   * note de version doit distinguer ce qu'on lit de ce qu'on doit faire.
   */
  detail?: string;
  alerte?: boolean;
};

export type Version = {
  /** Identifiant d'ancre, stable : on peut pointer une version précise. */
  id: string;
  /**
   * Numéro de version, façon `majeur.mineur.correctif`.
   *
   * ⚠ TROIS NOMBRES, DONC TROIS PROMESSES. Une numérotation de cette forme
   * annonce une distinction, et le lecteur la lira comme telle. Pour qu'elle ne
   * devienne pas décorative, elle se décide ainsi :
   *
   *   · **correctif** (1.1.0 → 1.1.1) — que des corrections, rien de nouveau ;
   *   · **mineur**    (1.0.0 → 1.1.0) — au moins une fonction qui n'existait pas ;
   *   · **majeur**    (1.x.x → 2.0.0) — un changement de fond dans la façon
   *     d'utiliser l'application, pas une accumulation de petites choses.
   *
   * ⚠ LE 2.0.0 EST DÉJÀ RÉSERVÉ : ce sera la publication sur l'App Store et le
   * Play Store. Elle n'aura lieu que si le nombre de clients rend l'opération
   * neutre financièrement — ce n'est donc pas une date, c'est un seuil. Aucune
   * accumulation de fonctions ne doit faire passer le premier chiffre d'ici là :
   * le jour où il change, il doit vouloir dire cette chose-là et rien d'autre.
   *
   * ⚠ NE JAMAIS RÉUTILISER NI RENUMÉROTER une version publiée. Le numéro sert à
   * désigner une publication dans un échange (« c'est arrivé en 1.1.0 ») : le
   * décaler rendrait faux tout ce qui a été dit avant.
   */
  numero: string;
  /** Date affichée, en toutes lettres. */
  date: string;
  /** Date ISO, pour l'ordre et pour `<time>`. */
  dateISO: string;
  titre: string;
  resume: string;
  changements: Changement[];
};

export const RUBRIQUES: { nature: Nature; libelle: string }[] = [
  { nature: 'corrige', libelle: 'Corrigé' },
  { nature: 'nouveau', libelle: 'Nouveau' },
  { nature: 'ameliore', libelle: 'Amélioré' },
];

/** La plus récente EN PREMIER — c'est ce qu'on vient lire. */
export const VERSIONS: Version[] = [
  {
    id: '2026-09-04',
    numero: '1.3.11',
    date: '4 septembre 2026',
    dateISO: '2026-09-04',
    titre: 'Un avertissement pour les jours 29, 30 et 31',
    resume: 'Choisir un jour du mois qui n’existe pas partout le signale désormais clairement.',
    changements: [
      {
        nature: 'corrige',
        titre: 'Un avertissement s’affiche pour les jours 29, 30 et 31.',
        texte:
          'Ces jours n’existent pas dans tous les mois (février n’a pas de 30). Le calcul reportait déjà correctement la tâche au dernier jour du mois, mais rien ne le signalait à la saisie — un message l’indique désormais.',
      },
    ],
  },
  {
    id: '2026-09-03-3',
    numero: '1.3.10',
    date: '3 septembre 2026',
    dateISO: '2026-09-03',
    titre: 'Choisir le jour d’une tâche récurrente',
    resume: 'Une tâche hebdomadaire ou mensuelle peut désormais fixer précisément le jour où elle revient.',
    changements: [
      {
        nature: 'nouveau',
        titre: 'Fixer le jour d’une récurrence hebdomadaire ou mensuelle.',
        texte:
          'En choisissant « Hebdomadaire », un nouveau champ propose le jour de la semaine (lundi, mardi…). En choisissant « Mensuelle », il propose le jour du mois (1 à 31). La prochaine occurrence retombe toujours sur ce jour, même si l’échéance précédente a été traitée en retard.',
      },
    ],
  },
  {
    id: '2026-09-03-2',
    numero: '1.3.9',
    date: '3 septembre 2026',
    dateISO: '2026-09-03',
    titre: 'Choisir sa vue sur l’agenda de l’accueil',
    resume: 'La carte Agenda de l’accueil propose désormais les mêmes vues que l’onglet complet.',
    changements: [
      {
        nature: 'ameliore',
        titre: 'La carte Agenda de l’accueil propose Avenir / Jour / Semaine / Mois.',
        texte:
          'Jusqu’ici limitée à la semaine en cours, elle offre maintenant le même sélecteur de vues que l’onglet Agenda, avec la navigation d’une période à l’autre. La modification d’un événement reste réservée à l’onglet complet.',
      },
    ],
  },
  {
    id: '2026-09-03',
    numero: '1.3.8',
    date: '3 septembre 2026',
    dateISO: '2026-09-03',
    titre: 'Vider le planning de la semaine',
    resume: 'Un bouton permet de repartir de zéro, en choisissant précisément ce qui doit être vidé.',
    changements: [
      {
        nature: 'ameliore',
        titre: 'Réinitialiser tout ou partie du planning de la semaine.',
        texte:
          'Un bouton « Réinitialiser » à côté de l’onglet Midi / Soir ouvre une fenêtre où choisir quoi vider : toute la semaine, un seul moment (midi ou soir), ou certains jours précis.',
        detail: 'Le nombre de personnes par défaut peut être remis à part, sur simple case à cocher — il n’est pas vidé avec les menus.',
      },
    ],
  },
  {
    id: '2026-09-02-4',
    numero: '1.3.7',
    date: '2 septembre 2026',
    dateISO: '2026-09-02',
    titre: 'Ajouter une tâche prend moins de place',
    resume: 'Le formulaire d’ajout d’une tâche s’ouvre désormais dans une fenêtre, plutôt que de rester déplié en permanence.',
    changements: [
      {
        nature: 'ameliore',
        titre: 'Le formulaire d’ajout d’une tâche s’ouvre dans une fenêtre.',
        texte:
          'Il occupait le haut de l’onglet Tâches en permanence, même sans rien à ajouter. Un bouton « + Nouvelle tâche » ouvre maintenant les mêmes champs dans une fenêtre, comme pour les recettes et les cadeaux.',
      },
    ],
  },
  {
    id: '2026-09-02-3',
    numero: '1.3.6',
    date: '2 septembre 2026',
    dateISO: '2026-09-02',
    titre: 'Un lien vers le cadeau, cliquable',
    resume: 'Le champ « Où » d’un cadeau accepte désormais un lien, qui devient cliquable dans la liste.',
    changements: [
      {
        nature: 'ameliore',
        titre: 'Un lien vers le cadeau devient cliquable dans la liste.',
        texte:
          'Un nouveau champ dédié accueille l’adresse de la page du cadeau (boutique en ligne, fiche produit…). Une fois enregistré, le nom du cadeau devient un lien qui ouvre directement cette page.',
      },
    ],
  },
  {
    // ⚠ NUMÉRO FIXÉ PAR L'UTILISATEUR (02/09/2026) : 1.3.5.
    id: '2026-09-02-2',
    numero: '1.3.5',
    date: '2 septembre 2026',
    dateISO: '2026-09-02',
    titre: 'Modifier une tâche en un clic',
    resume: 'Cliquer le titre d’une tâche ouvre désormais son édition, sans passer par une suppression.',
    changements: [
      {
        nature: 'nouveau',
        titre: 'Modifier une tâche en cliquant sur son titre.',
        texte:
          'Le titre, la personne assignée, la priorité, la catégorie, l’échéance et la récurrence se modifient directement, sans supprimer la tâche pour la recréer.',
      },
    ],
  },
  {
    // ⚠ NUMÉRO FIXÉ PAR L'UTILISATEUR (02/09/2026) : 1.3.4, PAS 1.4.0.
    id: '2026-09-02',
    numero: '1.3.4',
    date: '2 septembre 2026',
    dateISO: '2026-09-02',
    titre: 'Un repas de midi, en plus du soir',
    resume:
      'La planification de la semaine distingue désormais midi et soir, avec un menu propre à chacun.',
    changements: [
      {
        nature: 'nouveau',
        titre: 'Planifier un repas de midi, en plus de celui du soir.',
        texte:
          'Un onglet « Midi / Soir » au-dessus du planning de la semaine bascule entre les deux — chaque jour garde un menu propre à chaque moment, sans les afficher l’un sur l’autre.',
        detail:
          'La liste de courses reste unique : elle réunit les repas de midi et du soir de la semaine.',
      },
    ],
  },
  {
    id: '2026-09-01-4',
    numero: '1.3.3',
    date: '1er septembre 2026',
    dateISO: '2026-09-01',
    titre: 'Retirer un article de la liste de courses',
    resume:
      'Un article de la liste de courses se retire désormais d’un geste, sans passer par la case à cocher.',
    changements: [
      {
        nature: 'nouveau',
        titre: 'Retirer un seul article de la liste de courses.',
        texte:
          'Chaque article a désormais un bouton pour le retirer directement, en plus du crayon pour le modifier. Auparavant, seul « Vider les cochés » permettait d’en enlever — en bloc, jamais un seul à la fois.',
      },
    ],
  },
  {
    id: '2026-09-01-2',
    numero: '1.3.2',
    date: '1er septembre 2026',
    dateISO: '2026-09-01',
    titre: 'Télécharger un document depuis un iPhone',
    resume:
      'Le bouton « Télécharger » d’un document ouvrait le fichier au lieu de proposer de l’enregistrer, sur iPhone.',
    changements: [
      {
        nature: 'corrige',
        titre: 'Télécharger un document depuis un iPhone proposait de l’ouvrir, pas de l’enregistrer.',
        texte:
          'Le bouton « Télécharger » de la visionneuse ouvrait le PDF au lieu de proposer la feuille de partage iOS. C’est désormais elle qui s’ouvre, avec la possibilité d’enregistrer dans Fichiers.',
      },
    ],
  },
  {
    id: '2026-09-01',
    numero: '1.3.1',
    date: '1er septembre 2026',
    dateISO: '2026-09-01',
    titre: 'Une coupure du service, résolue',
    resume:
      'Une migration des données côté serveur ne s’est pas déroulée correctement et a rendu le service inaccessible pendant plusieurs heures. C’est corrigé, et rien n’a été perdu.',
    changements: [
      {
        nature: 'corrige',
        titre: 'Le service a été inaccessible pendant plusieurs heures.',
        texte:
          'Une migration des données côté serveur ne s’est pas appliquée correctement, ce qui a bloqué l’accès à l’application dans son ensemble.',
        detail: 'Aucune donnée n’a été perdue. Le service est de nouveau pleinement accessible.',
        alerte: true,
      },
    ],
  },
  {
    id: '2026-08-30',
    numero: '1.3.0',
    date: '30 août 2026',
    dateISO: '2026-08-30',
    titre: 'Un médiateur désigné, et des textes qui disent vrai',
    resume:
      'Le médiateur de la consommation est nommé, deux textes du site qui se contredisaient sont corrigés, et le site occupe mieux les grands écrans.',
    changements: [
      {
        nature: 'corrige',
        titre: 'Un médiateur de la consommation est désigné dans les conditions générales.',
        texte:
          'L’article 15 annonçait qu’un médiateur serait nommé avant l’ouverture des abonnements. C’est fait : MCP Médiation, joignable directement en ligne ou par courrier.',
      },
      {
        nature: 'corrige',
        titre: 'Le site annonçait huit modules, il y en a sept.',
        texte:
          'Le tableau de bord de l’accueil comptait pour un module à part dans une des pages du site. Les conditions générales et la page Tarifs, elles, ont toujours compté juste.',
      },
      {
        nature: 'corrige',
        titre: 'Documents ne surveille aucune échéance — une phrase du site laissait croire le contraire.',
        texte:
          'Le carrousel de l’accueil promettait un rappel avant l’expiration d’une assurance ; ce n’est pas ce que fait ce module. Pour un rappel avant une date à ne pas manquer, c’est le module Budget qui s’en charge, avec ses propres échéances.',
      },
      {
        nature: 'ameliore',
        titre: 'La politique de confidentialité précise l’origine déclarée à la création d’un foyer.',
        texte:
          'Comment vous avez connu Nestync (un lien suivi, ou une réponse donnée à la création du foyer) fait désormais partie des données décrites en toutes lettres, avec sa finalité.',
      },
      {
        nature: 'corrige',
        titre: 'Les premières captures du site portaient une bande de couleur parasite en haut et en bas.',
        texte:
          'Un reste de l’outil ayant servi à les prendre, visible surtout sur grand écran. Corrigé sur les neuf captures du site.',
      },
      {
        nature: 'ameliore',
        titre: 'Le site occupe mieux l’espace sur les grands écrans.',
        texte:
          'Il restait confiné à une largeur fixe, entouré d’un vide grandissant à mesure que l’écran s’élargit — au point de devoir zoomer pour lire confortablement. Le contenu s’étire désormais avec la taille de l’écran.',
      },
    ],
  },
  {
    id: '2026-08-28',
    numero: '1.2.0',
    date: '28 août 2026',
    dateISO: '2026-08-28',
    titre: 'Un site qu’on peut essayer, et des textes qui disent vrai',
    resume:
      'Une page pour essayer Nestync sans créer de compte, trois nouvelles pages publiques, et une relecture complète des documents légaux.',
    changements: [
      {
        nature: 'nouveau',
        titre: 'Une page pour essayer Nestync sans créer de compte.',
        texte:
          'Sur nestync.app/demonstration : composez une semaine de repas et regardez la liste de courses se remplir, basculez l’agenda du jour à la semaine ou au mois, saisissez une dépense et voyez les soldes bouger.',
        detail:
          'Ce ne sont pas des images : les calculs sont ceux de l’application elle-même. Rien n’y est enregistré, aucun compte n’est créé.',
      },
      {
        nature: 'nouveau',
        titre: 'Trois nouvelles pages : Découvrir, Tarifs, Questions fréquentes.',
        texte:
          'Chacune existe pour elle-même et se partage par lien. Auparavant, ces liens du bas de page renvoyaient à des sections de l’accueil — depuis n’importe quelle autre page, ils ne menaient nulle part.',
        detail:
          'La page Découvrir présente le service sans argumentaire commercial, avec des captures libres d’usage et un contact dédié.',
      },
      {
        nature: 'corrige',
        titre: 'Le carrousel des modules fonctionne enfin sur tablette.',
        texte:
          'Les captures se chevauchaient et semblaient monter et descendre sans raison. Les tablettes reçoivent désormais le même carrousel que les téléphones, au lieu d’un éventail conçu pour les grands écrans.',
      },
      {
        nature: 'corrige',
        titre: 'La simulation de coût affiche le prix de la formule choisie.',
        texte:
          'Elle indiquait 4,16 € sans préciser qu’il s’agissait du tarif annuel ramené au mois. Quelqu’un qui souscrivait au mois payait 4,99 €, soit 20 % de plus que le chiffre affiché.',
        detail:
          'Un sélecteur mensuel / annuel a été ajouté, et la mention « prix annuel ramené au mois » apparaît quand elle s’applique.',
      },
      {
        nature: 'corrige',
        titre: 'Les mentions légales nomment le bon hébergeur pour vos documents.',
        texte:
          'Elles désignaient encore Vercel. Vos fichiers sont hébergés depuis le 8 août chez OVHcloud, à Paris, sur une infrastructure certifiée ISO 27001 et HDS — et ils sont chiffrés avant d’y être transmis.',
        detail:
          'L’hébergeur ne connaît ni le contenu de vos fichiers, ni leur nom d’origine, ni leur type. Les conditions générales portent désormais la même information.',
      },
      {
        nature: 'ameliore',
        titre: 'La politique de confidentialité liste tous les témoins déposés sur votre appareil.',
        texte:
          'Elle en annonçait deux, il y en a six : thème, langue, effet lumineux, prénom affiché, vue d’agenda préférée, et le rappel d’installation sur iPhone. Chacun est désormais nommé, avec son rôle et sa durée.',
        detail:
          'Aucun n’est publicitaire et aucun ne permet de vous suivre d’un site à l’autre. C’est l’exactitude de la déclaration qui était en défaut, pas le respect de votre vie privée.',
      },
      {
        nature: 'corrige',
        titre: 'Refonte des conditions générales, à la suite d’erreurs retrouvées à la relecture.',
        texte:
          'Plusieurs clauses ont été reprises pour décrire exactement ce que fait le service.',
      },
      {
        nature: 'corrige',
        titre: 'La question « sur quels appareils ? » a enfin sa réponse.',
        texte:
          'Nestync s’installe depuis le navigateur sur iPhone, iPad, Android, Mac et PC, et s’ouvre ensuite comme une application ordinaire — sans rien télécharger sur un magasin d’applications.',
      },
      {
        nature: 'corrige',
        titre: 'Le menu de la page d’aide s’affichait en sombre sur fond clair.',
        texte:
          'Le sélecteur « De quoi s’agit-il ? » empruntait les couleurs de l’application au lieu de celles du site. Le même défaut touchait plusieurs champs de saisie et les cases à cocher.',
      },
      {
        nature: 'ameliore',
        titre: 'Le bas de page est réorganisé en colonnes.',
        texte:
          'Le produit, les informations légales et l’accès à votre foyer sont séparés. « Se connecter » et « Rejoindre un foyer » sont enfin visibles depuis toutes les pages, y compris sur téléphone où le menu du haut est masqué.',
        detail:
          '« Contact » s’appelle désormais « Aide et contact » : la page est d’abord une foire aux questions, et celui qui cherchait de l’aide ne cliquait pas.',
      },
      {
        nature: 'ameliore',
        titre: 'La page d’accueil s’appuie sur des données sourcées.',
        texte:
          'La section qui décrit le problème citait des chiffres à venir. Elle en porte maintenant trois, chacun avec son organisme et son année.',
      },
    ],
  },
  {
    id: '2026-08-27-b',
    numero: '1.1.0',
    date: '27 août 2026',
    dateISO: '2026-08-27',
    titre: 'Suppression des tâches, et trois gestes qui manquaient',
    resume: 'Sept changements, tous issus des retours reçus depuis la première version.',
    changements: [
      {
        nature: 'nouveau',
        titre: 'Une tâche peut enfin être supprimée.',
        texte:
          'Une croix au bout de chaque ligne. Jusqu’ici on pouvait la cocher « faite », jamais la retirer — la liste ne faisait que s’allonger.',
        detail:
          'Le bouton est présent sur toutes les tâches, pas seulement les faites : une tâche saisie par erreur n’a pas à être cochée avant d’être effacée. Une confirmation est demandée.',
      },
      {
        nature: 'nouveau',
        titre: '« Retirer les tâches faites » vide la liste d’un coup.',
        texte:
          'Le bouton apparaît sous les tâches dès qu’il y en a à retirer, avec leur nombre.',
      },
      {
        nature: 'corrige',
        titre: 'Le bouton qui envoie les ingrédients vers la liste de courses ne disparaît plus.',
        texte:
          'Il était rattaché à l’aperçu, lequel s’effaçait entièrement quand il n’y avait rien à rassembler — la fonction devenait alors introuvable, sans qu’on puisse savoir qu’elle existait.',
        detail:
          'Quand il n’y a rien à verser, l’application dit maintenant pourquoi : les repas planifiés ne correspondent à aucune recette, ou leurs ingrédients ne sont pas renseignés.',
      },
      {
        nature: 'corrige',
        titre: 'Le rayon d’un ingrédient se choisit dans une liste.',
        texte:
          'Il s’écrivait encore à la main alors que les courses étaient passées en liste fixe. Un « Epicerie » sans accent créait un rayon à part dans la liste de courses, séparé de l’« Épicerie » du reste.',
      },
      {
        nature: 'corrige',
        titre: 'L’invitation à installer l’application ne s’affiche plus sur l’écran de connexion.',
        texte:
          'Elle proposait d’installer une application à quelqu’un qui n’y était pas encore entré, et recouvrait le bas de l’écran au moment le moins opportun.',
      },
      {
        nature: 'ameliore',
        titre: 'Ajouter un événement propose la date du jour affiché.',
        texte:
          'Si vous consultez le 12 septembre, le nouvel événement part du 12 septembre — et non d’aujourd’hui, qu’il fallait corriger à chaque fois.',
        detail:
          'En vue « À venir », qui couvre trente jours et ne désigne aucun jour en particulier, la date reste celle d’aujourd’hui.',
      },
      {
        nature: 'ameliore',
        titre: 'Une adresse inexistante affiche une vraie page.',
        texte:
          'On tombait auparavant sur un message en anglais, sur fond blanc, avec des morceaux de l’application autour — de quoi croire à une panne alors qu’il n’y a qu’une adresse mal tapée.',
      },
    ],
  },
  {
    id: '2026-08-27',
    numero: '1.0.0',
    date: '27 août 2026',
    dateISO: '2026-08-27',
    titre: 'Première vague de correctifs',
    resume:
      'Vingt-et-un changements, presque tous issus des retours des premiers testeurs. Voici ce que vous verrez.',
    changements: [
      /* ------------------------------- Corrigé ------------------------------ */
      {
        nature: 'corrige',
        titre: 'Les fichiers texte s’affichent enfin.',
        texte:
          'Un .txt, un .md, un .csv ou un .json se lit directement dans la visionneuse, au lieu du message « aperçu indisponible ». Au-delà de 200 Ko, le téléchargement reste proposé.',
      },
      {
        nature: 'corrige',
        titre: 'Ouvrir un PDF sur Android n’enferme plus dans l’application.',
        texte:
          'Le document prenait tout l’écran, sans aucun moyen de revenir : il fallait fermer l’application. Sur téléphone, les PDF passent désormais par le bouton de téléchargement, comme c’était déjà le cas sur iPhone.',
      },
      {
        nature: 'corrige',
        titre: 'Les bulles d’aide « ? » ne débordent plus de l’écran sur téléphone.',
        texte:
          'Elles se placent maintenant d’elles-mêmes pour rester lisibles en entier. Les quatorze de l’application sont concernées.',
      },
      {
        nature: 'corrige',
        titre: 'Le Budget occupe de nouveau tout l’écran sur un ordinateur.',
        texte:
          'Les comptes, les échéances et le partage restaient collés dans une colonne étroite à gauche. Sur téléphone, rien ne change.',
      },
      {
        nature: 'corrige',
        titre: 'Une échéance peut enfin porter un montant.',
        texte:
          'Le champ est facultatif : les échéances qui ne sont que des rappels de date — visite médicale, papiers à renouveler — se saisissent toujours sans rien y mettre.',
      },
      {
        nature: 'corrige',
        titre: 'Les dates s’écrivent sans taper les « / ».',
        texte:
          'Il suffit d’entrer les huit chiffres : 27082026 devient 27/08/2026 tout seul. Le pavé numérique de beaucoup de téléphones n’a pas de « / », ce qui obligeait à changer de clavier au milieu de la date.',
      },

      /* ------------------------------- Nouveau ------------------------------ */
      {
        nature: 'nouveau',
        titre: 'L’agenda s’affiche en Jour, Semaine ou Mois.',
        texte:
          'Quatre onglets en haut de la page : « À venir » (l’affichage habituel, toujours par défaut), puis Jour, Semaine et Mois, avec des flèches pour naviguer.',
        detail: 'Dans la vue Mois, toucher un jour l’ouvre en détail.',
      },
      {
        nature: 'nouveau',
        titre: 'Un événement d’agenda se modifie après coup.',
        texte:
          'Un bouton ✎ sur chaque ligne permet de corriger le titre, la date, l’heure, le lieu ou la description ; il fallait jusqu’ici supprimer et recréer.',
        detail:
          'Sur un rendez-vous récurrent, l’application demande d’abord s’il s’agit de cette date ou de toute la série.',
      },
      {
        nature: 'nouveau',
        titre: 'Une recette s’ouvre en fiche.',
        texte:
          'Touchez son nom : ingrédients, préparation, et de quoi la mettre au menu d’un jour sans repasser par le planning. La préparation se saisit maintenant sur plusieurs lignes.',
      },
      {
        nature: 'nouveau',
        titre: 'Vous recevez une copie de vos messages.',
        texte:
          'Quand vous écrivez depuis « Aide et contact », un courriel vous confirme la réception et vous renvoie votre message daté. Il vaut preuve de votre demande — gardez-le.',
      },
      {
        nature: 'nouveau',
        titre: 'Un objet « réclamation » a été ajouté au formulaire d’aide,',
        texte: 'pour les litiges et les demandes de remboursement.',
      },

      /* ------------------------------ Amélioré ------------------------------ */
      {
        nature: 'ameliore',
        titre: 'Le planning de la semaine verse sa liste de courses.',
        texte:
          'Un bouton sous l’aperçu ajoute tous les ingrédients d’un coup, groupés et mis à l’échelle du nombre de personnes. Un article déjà en liste voit sa quantité cumulée plutôt que dupliquée.',
      },
      {
        nature: 'ameliore',
        titre: 'Les quantités acceptent les fractions.',
        texte: '« 1/2 citron » s’écrit tel quel, sans unité.',
        detail:
          'Jusqu’ici « 1/2 » était enregistré comme 1, sans que rien ne le signale : pensez à vérifier vos recettes qui en contenaient.',
        alerte: true,
      },
      {
        nature: 'ameliore',
        titre: 'Les rayons de courses et les catégories de dépense sont des listes fixes,',
        texte:
          'identiques pour tous, avec un choix « Autre » (« Divers » pour les dépenses) qui est une vraie entrée du menu. Deux personnes du même foyer ne rangeront plus le même produit à deux endroits.',
      },
      {
        nature: 'ameliore',
        titre: 'On choisit le rayon en ajoutant un produit depuis l’accueil.',
        texte: 'Le champ manquait : l’article atterrissait en bas de la liste, sans rayon.',
      },
      {
        nature: 'ameliore',
        titre: 'Le champ « Qui » des tâches propose les membres du foyer.',
        texte:
          'Ils apparaissent en tête de la liste. Vous pouvez toujours taper un autre nom — la nounou, une grand-mère — et le menu le rappelle désormais.',
      },
      {
        nature: 'ameliore',
        titre: 'Les tuiles du Budget mènent à leur détail.',
        texte:
          '« Revenus » et « Dépenses » ouvrent l’historique du mois déjà filtré, « Patrimoine » descend aux soldes, « Échéances » à la liste.',
      },
      {
        nature: 'ameliore',
        titre: 'Les échéances du mois sont totalisées,',
        texte:
          'dans une quatrième tuile du tableau de bord. Celles sans montant sont comptées à part, pour que le total ne paraisse jamais faux.',
      },
      {
        nature: 'ameliore',
        titre: 'Les dépenses par catégorie s’affichent même sans budget déclaré.',
        texte: 'La section restait vide tant qu’aucun budget mensuel n’était renseigné.',
      },
      {
        nature: 'ameliore',
        titre: 'L’historique des opérations se filtre',
        texte: 'par Tout / Revenus / Dépenses.',
      },
      {
        nature: 'ameliore',
        titre: 'L’agenda retient la vue choisie.',
        texte:
          'Si vous préférez le mois, vous le retrouverez au retour. La date, elle, repart toujours sur aujourd’hui.',
      },
      {
        nature: 'ameliore',
        titre: 'La durée de conservation de vos messages est annoncée précisément',
        texte: 'sur le formulaire : un an, dix-huit mois pour une réclamation, puis effacement.',
      },
    ],
  },
];
