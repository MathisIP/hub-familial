import 'server-only';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { recettes as tRecettes, semaine as tSemaine } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  CATEGORIES_PLAT,
  CHAUD_FROID,
  JOURS,
  MOMENTS,
  PERSONNES_DEFAUT,
  TYPES_RECETTE,
  UNITES,
  agregerCourses,
  personnesValides,
  type ArticleCourse,
  type DonneesRepas,
  type Ingredient,
  type JourRepas,
  type Moment,
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

  // Planning : on complète les 7 jours × 2 moments (les combinaisons sans
  // ligne prennent les défauts). `plat` retombe sur l'ancien `diner` (compat
  // des plannings d'avant la refonte des 3 services, tous « soir »).
  const parJourMoment = new Map(lignesSem.map((s) => [`${s.jour}|${s.moment}`, s]));
  const semaine: JourRepas[] = JOURS.flatMap((jour) =>
    MOMENTS.map((moment): JourRepas => {
      const s = parJourMoment.get(`${jour}|${moment}`);
      return {
        jour,
        moment,
        entree: s ? s.entree : '',
        plat: s ? s.plat || s.diner : '',
        dessert: s ? s.dessert : '',
        note: s ? s.note : '',
        personnes: personnesValides(s?.personnes),
      };
    }),
  );

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
 * Liste de courses agrégée pour la semaine planifiée : pour chaque repas dont
 * un service correspond à une recette, met les ingrédients à l'échelle
 * (personnes de ce repas) et fusionne le tout. Utilisée par le bouton
 * d'accueil (aperçu + envoi).
 *
 * ⚠ MIDI ET SOIR ENSEMBLE, SANS DISTINCTION (02/09/2026). `semaine` porte
 * maintenant les deux moments par jour ; cette fonction ne filtre pas dessus
 * volontairement — un repas planifié reste un repas planifié, la liste de
 * courses doit refléter tout ce qui est prévu dans la semaine.
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

/**
 * Définit le menu d'un jour pour UN moment (midi ou soir), upsert sur
 * foyer+jour+moment. `moment` par défaut `'soir'` : un appelant qui ne le
 * précise pas garde le comportement d'avant cette colonne.
 */
export async function definirJour(jour: string, c: ChampsJour, moment: Moment = 'soir'): Promise<void> {
  if (!(JOURS as readonly string[]).includes(jour)) {
    throw new ErreurValidation(`Jour invalide : ${jour}.`);
  }
  if (!(MOMENTS as readonly string[]).includes(moment)) {
    throw new ErreurValidation(`Moment invalide : ${moment}.`);
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
    .values({ foyerId, jour, moment, ...valeurs })
    .onConflictDoUpdate({ target: [tSemaine.foyerId, tSemaine.jour, tSemaine.moment], set: valeurs });
}

/**
 * Vide les menus (entrée/plat/dessert/note) des jours × moments choisis.
 *
 * ⚠ UN `UPDATE` EN MASSE, PAS UNE BOUCLE SUR `definirJour`. Un jour sans
 * ligne existante (jamais planifié) n'a rien à vider — `definirJour` en
 * créerait une par upsert, ce qui ferait apparaître des lignes vides en base
 * pour des combinaisons jour/moment qu'on n'a jamais touchées. `UPDATE ...
 * WHERE` ne modifie que ce qui existe déjà.
 *
 * ⚠ `personnes` N'EST TOUCHÉ QUE SI DEMANDÉ, explicitement. Le nombre de
 * personnes est un réglage du foyer (qui mange, en général), pas une
 * planification à refaire chaque semaine — le confondre avec les recettes
 * effacerait un réglage qu'on n'a pas demandé de perdre.
 */
export async function reinitialiserSemaine(criteres: {
  jours?: string[];
  moments?: Moment[];
  remettrePersonnes?: boolean;
}): Promise<void> {
  const foyerId = await idFoyerCourant();
  const clauses = [eq(tSemaine.foyerId, foyerId)];
  if (criteres.jours && criteres.jours.length > 0) {
    clauses.push(inArray(tSemaine.jour, criteres.jours));
  }
  if (criteres.moments && criteres.moments.length > 0) {
    clauses.push(inArray(tSemaine.moment, criteres.moments));
  }
  const valeurs: { entree: string; plat: string; dessert: string; diner: string; note: string; personnes?: number } = {
    entree: '',
    plat: '',
    dessert: '',
    diner: '',
    note: '',
  };
  if (criteres.remettrePersonnes) valeurs.personnes = PERSONNES_DEFAUT;
  await db()
    .update(tSemaine)
    .set(valeurs)
    .where(and(...clauses));
}
