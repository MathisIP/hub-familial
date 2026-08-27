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
    id: '2026-08-27',
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
