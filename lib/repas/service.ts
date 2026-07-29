import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recettes as tRecettes, semaine as tSemaine } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  CATEGORIES_PLAT,
  CHAUD_FROID,
  JOURS,
  TYPES_RECETTE,
  UNITES,
  agregerCourses,
  personnesValides,
  type ArticleCourse,
  type DonneesRepas,
  type Ingredient,
  type JourRepas,
  type Recette,
} from '@/lib/repas/schema';

/**
 * SERVICE REPAS (serveur uniquement) — Postgres, scopé au FOYER courant.
 * Recettes : ingrédients stockés en JSONB (lus/écrits d'un bloc). Semaine : une
 * ligne par (foyer, jour) ; les jours absents sont complétés avec des valeurs par
 * défaut à la lecture. La mise à l'échelle et l'agrégation restent dans schema.ts.
 */

export async function chargerRepas(): Promise<DonneesRepas> {
  const foyerId = await idFoyerCourant();
  const d = db();

  const [lignesRec, lignesSem] = await Promise.all([
    d.select().from(tRecettes).where(eq(tRecettes.foyerId, foyerId)).orderBy(asc(tRecettes.creeLe)),
    d.select().from(tSemaine).where(eq(tSemaine.foyerId, foyerId)),
  ]);

  const recettes: Recette[] = lignesRec.map((r) => ({
    id: r.id,
    nom: r.nom,
    ingredients: r.ingredients,
    categorie: r.categorie,
    type: r.type,
    chaudFroid: r.chaudFroid,
    note: r.note,
    personnes: personnesValides(r.personnes),
    favoriBebe: r.favoriBebe,
    bebePasGoute: r.bebePasGoute,
  }));

  // Planning : on complète les 7 jours (ceux sans ligne prennent les défauts).
  // `plat` retombe sur l'ancien `diner` (compat des plannings d'avant la refonte).
  const parJour = new Map(lignesSem.map((s) => [s.jour, s]));
  const semaine: JourRepas[] = JOURS.map((jour): JourRepas => {
    const s = parJour.get(jour);
    return {
      jour,
      entree: s ? s.entree : '',
      plat: s ? s.plat || s.diner : '',
      dessert: s ? s.dessert : '',
      note: s ? s.note : '',
      personnes: personnesValides(s?.personnes),
    };
  });

  return {
    recettes,
    semaine,
    unites: [...UNITES],
    types: [...TYPES_RECETTE],
    chaudFroid: [...CHAUD_FROID],
    categoriesPlat: [...CATEGORIES_PLAT],
  };
}

/**
 * Liste de courses agrégée pour la semaine planifiée : pour chaque jour dont le
 * dîner correspond à une recette, met les ingrédients à l'échelle (personnes du
 * jour) et fusionne le tout. Utilisée par le bouton d'accueil (aperçu + envoi).
 */
export async function listeCoursesSemaine(): Promise<{ articles: ArticleCourse[]; diners: number }> {
  const { recettes, semaine } = await chargerRepas();
  const parNom = new Map(recettes.map((r) => [r.nom.trim().toLowerCase(), r]));
  const plats: { ingredients: Recette['ingredients']; base: number; personnes: number }[] = [];
  let joursPlanifies = 0;
  for (const j of semaine) {
    let jourACourse = false;
    for (const nom of [j.entree, j.plat, j.dessert]) {
      const r = parNom.get(nom.trim().toLowerCase());
      if (r) {
        plats.push({ ingredients: r.ingredients, base: r.personnes, personnes: j.personnes });
        jourACourse = true;
      }
    }
    if (jourACourse) joursPlanifies++;
  }
  return { articles: agregerCourses(plats), diners: joursPlanifies };
}

/* ------------------------------ RECETTES ------------------------------ */

export type ChampsRecette = {
  nom: string;
  ingredients: Ingredient[];
  categorie?: string;
  type?: string;
  chaudFroid?: string;
  note?: string;
  personnes: number;
  favoriBebe?: boolean;
  bebePasGoute?: boolean;
};

/** Nettoie la liste d'ingrédients (retire les lignes sans article). */
function ingredientsPropres(ings: Ingredient[]): Ingredient[] {
  return (ings ?? [])
    .filter((i) => i.article?.trim())
    .map((i) => ({
      article: i.article.trim(),
      quantite: i.quantite ?? null,
      unite: i.unite ?? '',
      rayon: i.rayon ?? '',
    }));
}

function valeurs(c: ChampsRecette) {
  return {
    nom: c.nom.trim(),
    ingredients: ingredientsPropres(c.ingredients),
    categorie: c.categorie ?? '',
    type: c.type ?? '',
    chaudFroid: c.chaudFroid ?? '',
    note: c.note ?? '',
    personnes: personnesValides(c.personnes),
    favoriBebe: !!c.favoriBebe,
    bebePasGoute: !!c.bebePasGoute,
  };
}

export async function ajouterRecette(c: ChampsRecette): Promise<string> {
  if (!c.nom?.trim()) throw new ErreurValidation('Le nom de la recette est requis.');
  const foyerId = await idFoyerCourant();
  const [row] = await db()
    .insert(tRecettes)
    .values({ foyerId, ...valeurs(c) })
    .returning({ id: tRecettes.id });
  return row.id;
}

export async function modifierRecette(id: string, c: ChampsRecette): Promise<void> {
  if (!c.nom?.trim()) throw new ErreurValidation('Le nom de la recette est requis.');
  const foyerId = await idFoyerCourant();
  const res = await db()
    .update(tRecettes)
    .set(valeurs(c))
    .where(and(eq(tRecettes.id, id), eq(tRecettes.foyerId, foyerId)))
    .returning({ id: tRecettes.id });
  if (res.length === 0) throw new ErreurValidation('Recette introuvable.');
}

export async function supprimerRecette(id: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  await db().delete(tRecettes).where(and(eq(tRecettes.id, id), eq(tRecettes.foyerId, foyerId)));
}

/* ------------------------------- SEMAINE ------------------------------- */

export type ChampsJour = {
  entree?: string;
  plat?: string;
  dessert?: string;
  personnes: number;
  note?: string;
};

/** Définit le menu d'un jour (entrée/plat/dessert, upsert sur foyer+jour). */
export async function definirJour(jour: string, c: ChampsJour): Promise<void> {
  if (!(JOURS as readonly string[]).includes(jour)) {
    throw new ErreurValidation(`Jour invalide : ${jour}.`);
  }
  const foyerId = await idFoyerCourant();
  const plat = (c.plat ?? '').trim();
  const valeurs = {
    entree: (c.entree ?? '').trim(),
    plat,
    dessert: (c.dessert ?? '').trim(),
    diner: plat, // maintient la colonne historique alignée sur le plat
    note: c.note ?? '',
    personnes: personnesValides(c.personnes),
  };
  await db()
    .insert(tSemaine)
    .values({ foyerId, jour, ...valeurs })
    .onConflictDoUpdate({ target: [tSemaine.foyerId, tSemaine.jour], set: valeurs });
}
