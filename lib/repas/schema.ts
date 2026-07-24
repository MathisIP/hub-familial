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

export const COL_RECETTE = {
  NOM: 1, INGREDIENTS: 2, TYPE: 3, CHAUD_FROID: 4, NOTE: 5, PERSONNES: 6,
} as const;
export const LIGNE_DONNEES_RECETTES = 2;

export const COL_SEM = { JOUR: 2, DINER: 3, NOTE: 4, PERSONNES: 5 } as const;
export const LIGNE_ENTETE_SEMAINE = 7;
export const JOUR_LIGNE_DEBUT = 8;
export const JOURS = ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche'] as const;

export const UNITES = [
  'g', 'kg', 'ml', 'L', 'pièce(s)', 'c. à soupe', 'c. à café',
  'pincée', 'sachet', 'boîte', 'tranche(s)',
] as const;
export const TYPES_RECETTE = ['Viande', 'Poisson', 'Végétarien'] as const;
export const CHAUD_FROID = ['Chaud', 'Froid'] as const;

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
  type: string;
  chaudFroid: string;
  note: string;
  personnes: number; // base : pour combien de personnes les quantités sont données
};

export type JourRepas = {
  jour: string; // Lundi … Dimanche — identifiant du jour
  diner: string; // nom de recette (ou texte libre)
  note: string;
  personnes: number; // pour ce dîner-là
};

export type DonneesRepas = {
  recettes: Recette[];
  semaine: JourRepas[];
  unites: string[];
  types: string[];
  chaudFroid: string[];
};

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Parse une quantité (« 1,5 » ou « 1.5 » ou vide) en nombre, ou null. */
export function parseQuantite(v: unknown): number | null {
  const s = S(v).replace(',', '.');
  if (!s) return null;
  const n = parseFloat(s);
  return Number.isFinite(n) ? n : null;
}

/** Formate une quantité à la française (décimale « , », zéros inutiles enlevés). */
export function formatQuantite(n: number | null): string {
  if (n == null) return '';
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

/** Parse le bloc d'ingrédients (une ligne par ingrédient). */
export function parseIngredients(bloc: unknown): Ingredient[] {
  return S(bloc)
    .split(/\r?\n/)
    .map(parseIngredient)
    .filter((x): x is Ingredient => x !== null && x.article !== '');
}

/** Sérialise un ingrédient en ligne « article | quantité | unité | rayon » (toujours 4 champs). */
export function ingredientVersLigne(i: Ingredient): string {
  return [i.article, formatQuantite(i.quantite), i.unite, i.rayon].join(' | ');
}

/** Sérialise le bloc d'ingrédients pour la cellule B. */
export function ingredientsVersBloc(ings: Ingredient[]): string {
  return ings.filter((i) => i.article.trim() !== '').map(ingredientVersLigne).join('\n');
}

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
