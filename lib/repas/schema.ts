/**
 * MODULE REPAS — SCHÉMA & HELPERS PURS (partagés serveur ↔ client).
 * =================================================================
 * Onglet Recettes — en-têtes ligne 1, données ligne 2+ :
 *   A Recette · B Ingrédients · C Type · D Chaud/Froid · E Note · F Personnes (base)
 *
 *   La colonne B est ENRICHIE : une ligne par ingrédient, au format
 *     « article | quantité | unité | rayon »
 *   Parsing RÉTRO-COMPATIBLE avec l'ancien format « article | rayon » (2 champs),
 *   pour ne pas casser les recettes déjà saisies : elles se migrent au fil des
 *   éditions dans l'app (qui réécrit toujours en 4 champs).
 *
 * Onglet Semaine — en-têtes ligne 7, jours lignes 8→14 :
 *   B Jour · C Dîner (nom de recette) · D Note · E Personnes (pour ce dîner)
 *
 * Mise à l'échelle : quantité affichée = quantité_base × personnesJour / personnesBase.
 */

/*
 * ⚠ Les constantes de géométrie du tableur (COL_RECETTE, COL_SEM,
 * LIGNE_DONNEES_RECETTES, LIGNE_ENTETE_SEMAINE, JOUR_LIGNE_DEBUT) ont été
 * retirées le 13/08/2026. Elles décrivaient l'emplacement des cellules dans
 * l'onglet Google Sheets, abandonné à la migration en base : une recette est
 * désormais un UUID et un jour se désigne par son nom. Plus aucun numéro de
 * ligne ni de colonne ne circule dans le code.
 */
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const UNITES = [
  'g', 'kg', 'ml', 'L', 'pièce(s)', 'c. à soupe', 'c. à café',
  'pincée', 'sachet', 'boîte', 'tranche(s)',
] as const;
export const TYPES_RECETTE = ['Viande', 'Poisson', 'Végétarien'] as const;
export const CHAUD_FROID = ['Chaud', 'Froid'] as const;

/** Catégories d'une recette selon le service. */
export const CATEGORIES_PLAT = ['Entrée', 'Plat', 'Dessert'] as const;
/** Nombre de personnes par défaut du foyer (Lou & Mati) si rien n'est renseigné. */
export const PERSONNES_DEFAUT = 2;

export type Ingredient = {
  article: string;
  quantite: number | null; // null = non chiffré (ex. « selon goût »)
  unite: string;
  rayon: string;
};

export type Recette = {
  id: string;
  nom: string;
  ingredients: Ingredient[];
  categorie: string; // Entrée / Plat / Dessert (ou vide)
  type: string;
  chaudFroid: string;
  note: string;
  personnes: number; // base : pour combien de personnes les quantités sont données
  favoriBebe: boolean; // recette appréciée de bébé
  bebePasGoute: boolean; // bébé n'a pas encore goûté
};

/** Les 3 services d'un menu de jour. */
export const SERVICES = ['entree', 'plat', 'dessert'] as const;
export type Service = (typeof SERVICES)[number];

export type JourRepas = {
  jour: string; // Lundi … Dimanche — identifiant du jour
  entree: string; // nom de recette (ou texte libre)
  plat: string;
  dessert: string;
  note: string;
  personnes: number; // pour ce repas-là
};

export type DonneesRepas = {
  recettes: Recette[];
  semaine: JourRepas[];
  unites: string[];
  types: string[];
  chaudFroid: string[];
  categoriesPlat: string[];
};

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Parse une quantité (« 1,5 » ou « 1.5 » ou vide) en nombre, ou null. */
/**
 * Quantité saisie → nombre. Accepte les FRACTIONS.
 *
 * ⚠ `parseFloat('1/2')` renvoie **1**, sans la moindre erreur. Quelqu'un qui
 * écrivait « 1/2 citron » enregistrait donc « 1 citron », et rien ne le
 * signalait — ni à la saisie, ni à la relecture de la recette, ni dans la liste
 * de courses. Une demi-quantité est pourtant la façon la plus naturelle
 * d'écrire un demi-citron ou un demi-oignon.
 *
 * Formes acceptées : « 1/2 », « 3/4 », « 1 1/2 » (entier + fraction), « 0,5 »,
 * « 1.5 ». Le résultat est un nombre, ce qui laisse `mettreALechelle` faire son
 * travail sans rien connaître des fractions.
 */
export function parseQuantite(v: unknown): number | null {
  const s = S(v).replace(',', '.').trim();
  if (!s) return null;

  // « 1 1/2 » : partie entière puis fraction.
  const mixte = s.match(/^(\d+)\s+(\d+)\s*\/\s*(\d+)$/);
  if (mixte) {
    const [, e, num, den] = mixte;
    const d = Number(den);
    if (d === 0) return null;
    return Number(e) + Number(num) / d;
  }

  // « 1/2 » seul.
  const fraction = s.match(/^(\d+)\s*\/\s*(\d+)$/);
  if (fraction) {
    const [, num, den] = fraction;
    const d = Number(den);
    if (d === 0) return null; // ⚠ « 1/0 » donnerait Infinity, qu'on stockerait
    return Number(num) / d;
  }

  // ⚠ Le nombre doit occuper TOUTE la chaîne. `parseFloat` s'arrête au premier
  // caractère qu'il ne comprend pas et rendrait 1 pour « 1/2 » — le défaut
  // qu'on corrige ici. Une saisie qui n'est pas un nombre reste « non chiffré ».
  if (!/^\d*\.?\d+$/.test(s)) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Fractions rendues telles qu'on les écrit dans une recette.
 *
 * ⚠ Uniquement celles qu'on emploie en cuisine. « 0,5 citron » se lit mal ;
 * « 3,33 » n'a en revanche aucune écriture fractionnaire utile, et forcer un
 * « 10/3 » serait pire que le décimal.
 */
const FRACTIONS: [number, string][] = [
  [0.25, '1/4'],
  [1 / 3, '1/3'],
  [0.5, '1/2'],
  [2 / 3, '2/3'],
  [0.75, '3/4'],
];

/**
 * Formate une quantité à la française — en FRACTION quand c'en est une.
 *
 * ⚠ Le va-et-vient doit être stable : ce qu'on affiche doit se resaisir à
 * l'identique. « 1/2 » lu, stocké 0.5, doit se réafficher « 1/2 » et non
 * « 0,5 » — sinon la recette change d'apparence à chaque passage dans
 * l'éditeur, et on finit par ne plus savoir ce qui a été saisi.
 */
export function formatQuantite(n: number | null): string {
  if (n == null) return '';

  const entier = Math.floor(n);
  const reste = n - entier;
  const proche = FRACTIONS.find(([v]) => Math.abs(reste - v) < 0.005);
  if (proche) {
    // « 1 1/2 » plutôt que « 3/2 » : c'est ainsi qu'on lit une recette.
    return entier > 0 ? `${entier} ${proche[1]}` : proche[1];
  }

  const arrondi = Math.round(n * 100) / 100;
  return String(arrondi).replace('.', ',');
}

/** Nombre de personnes valide (entier ≥ 1), sinon le défaut. */
export function personnesValides(v: unknown, defaut = PERSONNES_DEFAUT): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) && n >= 1 ? n : defaut;
}

/**
 * Parse une ligne d'ingrédient. Tolérant au nombre de champs :
 *   4 → article | quantité | unité | rayon   (nouveau)
 *   3 → article | quantité | unité            (sans rayon)
 *   2 → article | rayon                       (ANCIEN format, pas de quantité)
 *   1 → article
 */
export function parseIngredient(ligne: string): Ingredient | null {
  const brut = ligne.trim();
  if (!brut) return null;
  const f = brut.split('|').map((x) => x.trim());
  if (f.length >= 4) {
    return { article: f[0], quantite: parseQuantite(f[1]), unite: f[2], rayon: f[3] };
  }
  if (f.length === 3) {
    return { article: f[0], quantite: parseQuantite(f[1]), unite: f[2], rayon: '' };
  }
  if (f.length === 2) {
    return { article: f[0], quantite: null, unite: '', rayon: f[1] }; // ancien « article | rayon »
  }
  return { article: f[0], quantite: null, unite: '', rayon: '' };
}

/** Sérialise un ingrédient en ligne « article | quantité | unité | rayon » (toujours 4 champs). */
export function ingredientVersLigne(i: Ingredient): string {
  return [i.article, formatQuantite(i.quantite), i.unite, i.rayon].join(' | ');
}

/*
 * `parseIngredients` et `ingredientsVersBloc` ont été retirés le 13/08/2026 :
 * ils lisaient et écrivaient les ingrédients sous forme de **bloc de texte**
 * dans une cellule du tableur. Ils sont stockés en JSONB depuis la migration en
 * base ; `parseIngredient` (au singulier) survit, lui, pour la saisie libre.
 */

/**
 * Met les ingrédients à l'échelle : quantité × personnesJour / personnesBase.
 * Les ingrédients non chiffrés restent tels quels (quantité null).
 */
export function mettreALechelle(
  ings: Ingredient[],
  personnesBase: number,
  personnesJour: number,
): Ingredient[] {
  const base = personnesBase >= 1 ? personnesBase : PERSONNES_DEFAUT;
  const facteur = personnesJour / base;
  return ings.map((i) => ({
    ...i,
    quantite: i.quantite == null ? null : i.quantite * facteur,
  }));
}

/** Clé d'agrégation pour la liste de courses : article + unité (insensible casse). */
export function cleAgregation(i: Ingredient): string {
  return `${i.article.toLowerCase()}|${i.unite.toLowerCase()}`;
}

export type ArticleCourse = { article: string; quantite: number | null; unite: string; rayon: string };

/**
 * Construit la liste de courses agrégée à partir de plats planifiés : chaque plat
 * est mis à l'échelle (base → personnes), puis les ingrédients identiques
 * (même article + même unité) sont fusionnés en additionnant les quantités.
 * Un article présent sans quantité chiffrée reste listé (quantité null).
 * C'est la fonction que réutilisera le futur bouton « envoyer vers les courses ».
 */
export function agregerCourses(
  plats: { ingredients: Ingredient[]; base: number; personnes: number }[],
): ArticleCourse[] {
  const parCle = new Map<string, ArticleCourse>();
  for (const plat of plats) {
    for (const ing of mettreALechelle(plat.ingredients, plat.base, plat.personnes)) {
      if (!ing.article.trim()) continue;
      const cle = cleAgregation(ing);
      const existant = parCle.get(cle);
      if (!existant) {
        parCle.set(cle, {
          article: ing.article,
          quantite: ing.quantite,
          unite: ing.unite,
          rayon: ing.rayon,
        });
      } else if (ing.quantite != null) {
        existant.quantite = (existant.quantite ?? 0) + ing.quantite;
      }
    }
  }
  return [...parCle.values()];
}
