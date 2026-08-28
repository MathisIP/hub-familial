import type { Ingredient } from '@/lib/repas/schema';

/**
 * DONNÉES DU FOYER DE DÉMONSTRATION — fictives, et elles doivent le rester.
 *
 * ⚠ **CLARA, ANTOINE, NOÉ**, comme partout ailleurs sur la vitrine. La règle de
 * confidentialité du projet interdit toute donnée réelle sur un support public,
 * et le gabarit d'origine livrait « Mathis » — le prénom du créateur.
 *
 * ⚠ **AUCUN CALCUL ICI.** Ce fichier ne contient que des données. Tout ce qui
 * compte — mise à l'échelle, agrégation, fusion des quantités, grille du mois —
 * est fait par les fonctions RÉELLES des modules, importées par le composant.
 * C'est la seule façon d'être sûr que la démonstration montre le produit : si
 * la fusion des quantités change un jour, la page change avec elle, sans que
 * personne ait à y penser.
 */

export type RecetteDemo = {
  nom: string;
  categorie: 'Entrée' | 'Plat' | 'Dessert';
  personnes: number;
  ingredients: Ingredient[];
};

const ing = (article: string, quantite: number | null, unite: string, rayon: string): Ingredient => ({
  article,
  quantite,
  unite,
  rayon,
});

/**
 * ⚠ Les rayons sont ceux de `RAYONS` (lib/todo/schema) — « Fruits & légumes »
 * avec une esperluette, « Crèmerie » avec un accent grave. Les réécrire de
 * mémoire produirait des rayons fantômes qui ne se regrouperaient avec rien.
 */
export const RECETTES_DEMO: RecetteDemo[] = [
  {
    nom: 'Velouté de courgettes',
    categorie: 'Entrée',
    personnes: 4,
    ingredients: [
      ing('Courgettes', 500, 'g', 'Fruits & légumes'),
      ing('Crème fraîche', 100, 'ml', 'Crèmerie'),
      ing('Oignon jaune', 1, 'pièce(s)', 'Fruits & légumes'),
    ],
  },
  {
    nom: 'Salade de lentilles',
    categorie: 'Entrée',
    personnes: 4,
    ingredients: [
      ing('Lentilles', 250, 'g', 'Épicerie'),
      ing('Échalote', 1, 'pièce(s)', 'Fruits & légumes'),
      ing('Persil', 1, 'sachet', 'Fruits & légumes'),
    ],
  },
  {
    nom: 'Soupe de potiron',
    categorie: 'Entrée',
    personnes: 4,
    ingredients: [
      ing('Potiron', 800, 'g', 'Fruits & légumes'),
      ing('Crème fraîche', 100, 'ml', 'Crèmerie'),
    ],
  },
  {
    nom: 'Gratin de courgettes',
    categorie: 'Plat',
    personnes: 4,
    ingredients: [
      ing('Courgettes', 600, 'g', 'Fruits & légumes'),
      ing('Crème fraîche', 200, 'ml', 'Crèmerie'),
      ing('Parmesan', 60, 'g', 'Crèmerie'),
      ing('Œufs', 2, 'pièce(s)', 'Crèmerie'),
    ],
  },
  {
    nom: 'Poêlée de courgettes au chèvre',
    categorie: 'Plat',
    personnes: 4,
    ingredients: [
      ing('Courgettes', 400, 'g', 'Fruits & légumes'),
      ing('Bûche de chèvre', 150, 'g', 'Crèmerie'),
      ing('Oignon jaune', 1, 'pièce(s)', 'Fruits & légumes'),
      ing('Huile d’olive', 2, 'c. à soupe', 'Épicerie'),
    ],
  },
  {
    nom: 'Pizza maison',
    categorie: 'Plat',
    personnes: 4,
    ingredients: [
      ing('Farine', 500, 'g', 'Épicerie'),
      ing('Mozzarella', 250, 'g', 'Crèmerie'),
      ing('Coulis de tomate', 400, 'ml', 'Épicerie'),
    ],
  },
  {
    nom: 'Poulet rôti',
    categorie: 'Plat',
    personnes: 4,
    ingredients: [
      ing('Poulet', 1.2, 'kg', 'Boucherie'),
      ing('Pommes de terre', 800, 'g', 'Fruits & légumes'),
      // ⚠ Quantité `null` : « selon le goût ». Le module sait lister un
      // ingrédient non chiffré ; la démonstration doit le montrer aussi.
      ing('Thym', null, '', 'Fruits & légumes'),
    ],
  },
  {
    nom: 'Tarte aux pommes',
    categorie: 'Dessert',
    personnes: 4,
    ingredients: [
      ing('Pommes', 700, 'g', 'Fruits & légumes'),
      ing('Farine', 250, 'g', 'Épicerie'),
      ing('Beurre', 125, 'g', 'Crèmerie'),
    ],
  },
  {
    nom: 'Mousse au chocolat',
    categorie: 'Dessert',
    personnes: 4,
    ingredients: [
      ing('Chocolat noir', 200, 'g', 'Épicerie'),
      ing('Œufs', 4, 'pièce(s)', 'Crèmerie'),
    ],
  },
  {
    nom: 'Salade de fruits',
    categorie: 'Dessert',
    personnes: 4,
    ingredients: [
      ing('Pommes', 300, 'g', 'Fruits & légumes'),
      ing('Oranges', 3, 'pièce(s)', 'Fruits & légumes'),
    ],
  },
];

/** Planning de départ. Le dimanche est vide : un créneau libre est normal. */
export const PLANNING_DEMO: Record<string, { Entrée?: string; Plat?: string; Dessert?: string }> = {
  Lundi: { Plat: 'Poulet rôti' },
  Mardi: { Entrée: 'Velouté de courgettes', Plat: 'Gratin de courgettes' },
  Mercredi: { Plat: 'Pizza maison', Dessert: 'Salade de fruits' },
  Jeudi: { Entrée: 'Salade de lentilles', Plat: 'Poêlée de courgettes au chèvre' },
  Vendredi: { Plat: 'Pizza maison', Dessert: 'Tarte aux pommes' },
  Samedi: { Entrée: 'Soupe de potiron', Plat: 'Poulet rôti', Dessert: 'Mousse au chocolat' },
  Dimanche: {},
};

/** Articles qui ne viennent d'aucune recette — le cas du gel douche. */
export const ARTICLES_DEMO: Ingredient[] = [
  ing('Pain de mie', 1, 'pièce(s)', 'Boulangerie'),
  ing('Liquide vaisselle', 1, 'pièce(s)', 'Entretien'),
];

/* ------------------------------------------------------------------ */

export type PersonneDemo = 'Commun' | 'Clara' | 'Antoine' | 'Noé';

export type EvenementDemo = {
  /** Décalage en jours depuis le 1er du mois affiché. */
  jourDuMois: number;
  heure: string;
  titre: string;
  qui: PersonneDemo;
};

/**
 * Récurrents du foyer, posés par jour de semaine (1 = lundi … 0 = dimanche).
 *
 * ⚠ **UN MOIS DOIT ÊTRE REMPLI.** Les rendez-vous d'un foyer ne se concentrent
 * pas sur une semaine : une grille presque vide donne l'impression d'un agenda
 * qui ne sert à rien, ce qui est l'inverse du message.
 */
export const RECURRENTS_DEMO: { jours: number[]; heure: string; titre: string; qui: PersonneDemo }[] = [
  { jours: [1, 2, 3, 4, 5], heure: '08:30', titre: 'Crèche', qui: 'Noé' },
  { jours: [2], heure: '09:00', titre: 'Télétravail', qui: 'Antoine' },
  { jours: [4], heure: '17:30', titre: 'Piscine', qui: 'Noé' },
  { jours: [6], heure: '10:00', titre: 'Marché', qui: 'Commun' },
];

/** Rendez-vous ponctuels, répartis sur tout le mois. */
export const PONCTUELS_DEMO: EvenementDemo[] = [
  { jourDuMois: 3, heure: '12:30', titre: 'Déjeuner Camille', qui: 'Clara' },
  { jourDuMois: 6, heure: '18:00', titre: 'Pédiatre', qui: 'Commun' },
  { jourDuMois: 9, heure: '20:00', titre: 'Cinéma', qui: 'Clara' },
  { jourDuMois: 12, heure: '14:00', titre: 'Dentiste', qui: 'Antoine' },
  { jourDuMois: 14, heure: '19:30', titre: 'Dîner Ferrand', qui: 'Commun' },
  { jourDuMois: 17, heure: '11:00', titre: 'Contrôle technique', qui: 'Antoine' },
  { jourDuMois: 19, heure: '16:00', titre: 'Anniversaire Léa', qui: 'Noé' },
  { jourDuMois: 21, heure: '09:30', titre: 'Kiné', qui: 'Clara' },
  { jourDuMois: 23, heure: '13:00', titre: 'Déjeuner parents', qui: 'Commun' },
  { jourDuMois: 26, heure: '18:30', titre: 'Réunion école', qui: 'Commun' },
  { jourDuMois: 28, heure: '20:30', titre: 'Concert', qui: 'Clara' },
  { jourDuMois: 30, heure: '10:00', titre: 'Brunch', qui: 'Commun' },
];

/* ------------------------------------------------------------------ */

export const COMPTES_DEMO = [
  { nom: 'Compte commun', initial: 1240.5 },
  { nom: 'Compte Clara', initial: 680.2 },
];

/** ⚠ Les catégories viennent de `CATEGORIES_DEPENSE` — ne pas en inventer. */
export const ENVELOPPES_DEMO = [
  { nom: 'Courses', budget: 450 },
  { nom: 'Logement', budget: 900 },
  { nom: 'Loisirs', budget: 150 },
  { nom: 'Santé', budget: 80 },
  { nom: 'Transports', budget: 120 },
];

export const OPERATIONS_DEMO = [
  { compte: 'Compte commun', categorie: 'Courses', montant: 87.4, libelle: 'Supermarché du samedi' },
  { compte: 'Compte commun', categorie: 'Logement', montant: 820, libelle: 'Loyer de septembre' },
  { compte: 'Compte Clara', categorie: 'Loisirs', montant: 34, libelle: 'Cinéma avec Noé' },
  { compte: 'Compte commun', categorie: 'Courses', montant: 52.1, libelle: 'Marché' },
  { compte: 'Compte commun', categorie: 'Transports', montant: 62, libelle: 'Plein d’essence' },
];
