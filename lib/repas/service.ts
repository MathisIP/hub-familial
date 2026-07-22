import 'server-only';
import { lireBatch, ecrirePlage, viderPlage } from '@/lib/google/sheets';
import { ErreurValidation } from '@/lib/erreurs';
import { nomOnglet, plage } from '@/lib/i18n';
import {
  CHAUD_FROID,
  COL_RECETTE,
  JOURS,
  JOUR_LIGNE_DEBUT,
  LIGNE_DONNEES_RECETTES,
  LIGNE_ENTETE_SEMAINE,
  TYPES_RECETTE,
  UNITES,
  agregerCourses,
  ingredientsVersBloc,
  parseIngredients,
  personnesValides,
  type ArticleCourse,
  type DonneesRepas,
  type Ingredient,
  type JourRepas,
  type Recette,
} from '@/lib/repas/schema';

/**
 * SERVICE REPAS (serveur uniquement). Onglets résolus par clé canonique.
 */
const CL = 'REPAS' as const;

function pl(onglet: 'RECETTES' | 'SEMAINE', a1: string): string {
  return plage(nomOnglet(CL, onglet), a1);
}
const S = (v: unknown): string => (v == null ? '' : String(v).trim());

export async function chargerRepas(): Promise<DonneesRepas> {
  const [brutRec, brutSem] = await lireBatch(CL, [
    pl('RECETTES', 'A2:F'),
    pl('SEMAINE', `B${JOUR_LIGNE_DEBUT}:E${JOUR_LIGNE_DEBUT + JOURS.length - 1}`),
  ]);

  const recettes: Recette[] = brutRec
    .map((l, i): Recette => ({
      ligne: LIGNE_DONNEES_RECETTES + i,
      nom: S(l[COL_RECETTE.NOM - 1]),
      ingredients: parseIngredients(l[COL_RECETTE.INGREDIENTS - 1]),
      type: S(l[COL_RECETTE.TYPE - 1]),
      chaudFroid: S(l[COL_RECETTE.CHAUD_FROID - 1]),
      note: S(l[COL_RECETTE.NOTE - 1]),
      personnes: personnesValides(l[COL_RECETTE.PERSONNES - 1]),
    }))
    .filter((r) => r.nom !== '');

  const semaine: JourRepas[] = JOURS.map((jourDefaut, i): JourRepas => {
    const l = brutSem[i] ?? [];
    // Colonnes lues à partir de B : index 0=B(Jour) 1=C(Dîner) 2=D(Note) 3=E(Personnes)
    return {
      ligne: JOUR_LIGNE_DEBUT + i,
      jour: S(l[0]) || jourDefaut,
      diner: S(l[1]),
      note: S(l[2]),
      personnes: personnesValides(l[3]),
    };
  });

  return {
    recettes,
    semaine,
    unites: [...UNITES],
    types: [...TYPES_RECETTE],
    chaudFroid: [...CHAUD_FROID],
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
  const plats = semaine
    .map((j) => ({ j, r: parNom.get(j.diner.trim().toLowerCase()) }))
    .filter((x): x is { j: JourRepas; r: Recette } => !!x.r)
    .map((x) => ({ ingredients: x.r.ingredients, base: x.r.personnes, personnes: x.j.personnes }));
  return { articles: agregerCourses(plats), diners: plats.length };
}

/* ------------------------------ EN-TÊTES ------------------------------ */
/** Pose les en-têtes des colonnes ajoutées par l'app (idempotent). */
async function assurerEntetes(): Promise<void> {
  await Promise.all([
    ecrirePlage(CL, pl('RECETTES', 'F1'), [['Personnes']]),
    ecrirePlage(CL, pl('SEMAINE', `E${LIGNE_ENTETE_SEMAINE}`), [['Personnes']]),
  ]);
}

/* ------------------------------ RECETTES ------------------------------ */

export type ChampsRecette = {
  nom: string;
  ingredients: Ingredient[];
  type?: string;
  chaudFroid?: string;
  note?: string;
  personnes: number;
};

/** Prochaine ligne libre de Recettes, repérée par la colonne Nom. */
async function prochaineLigneRecette(): Promise<number> {
  const [col] = await lireBatch(CL, [pl('RECETTES', `A${LIGNE_DONNEES_RECETTES}:A`)]);
  let derniere = LIGNE_DONNEES_RECETTES - 1;
  col.forEach((l, i) => {
    if (S(l[0]) !== '') derniere = LIGNE_DONNEES_RECETTES + i;
  });
  return derniere + 1;
}

function ligneRecette(c: ChampsRecette): unknown[][] {
  return [[
    c.nom.trim(),
    ingredientsVersBloc(c.ingredients),
    c.type ?? '',
    c.chaudFroid ?? '',
    c.note ?? '',
    personnesValides(c.personnes),
  ]];
}

export async function ajouterRecette(c: ChampsRecette): Promise<number> {
  if (!c.nom?.trim()) throw new ErreurValidation('Le nom de la recette est requis.');
  await assurerEntetes();
  const ligne = await prochaineLigneRecette();
  await ecrirePlage(CL, pl('RECETTES', `A${ligne}:F${ligne}`), ligneRecette(c));
  return ligne;
}

export async function modifierRecette(ligne: number, c: ChampsRecette): Promise<void> {
  if (ligne < LIGNE_DONNEES_RECETTES) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  if (!c.nom?.trim()) throw new ErreurValidation('Le nom de la recette est requis.');
  await assurerEntetes();
  await ecrirePlage(CL, pl('RECETTES', `A${ligne}:F${ligne}`), ligneRecette(c));
}

/** Supprime une recette : relit, retire la ligne, réécrit compacté (comme les courses). */
export async function supprimerRecette(ligne: number): Promise<void> {
  if (ligne < LIGNE_DONNEES_RECETTES) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  const [brut] = await lireBatch(CL, [pl('RECETTES', 'A2:F')]);
  const gardees = brut.filter((_, i) => LIGNE_DONNEES_RECETTES + i !== ligne && S(brut[i][0]) !== '');
  await viderPlage(CL, pl('RECETTES', 'A2:F'));
  if (gardees.length) {
    const norm = gardees.map((l) => {
      const r = l.slice(0, 6);
      while (r.length < 6) r.push('');
      return r;
    });
    await ecrirePlage(CL, pl('RECETTES', 'A2'), norm);
  }
}

/* ------------------------------- SEMAINE ------------------------------- */

export type ChampsJour = { diner: string; personnes: number; note?: string };

/** Définit un dîner (nom de recette / texte), le nb de personnes et la note d'un jour. */
export async function definirJour(ligne: number, c: ChampsJour): Promise<void> {
  if (ligne < JOUR_LIGNE_DEBUT || ligne > JOUR_LIGNE_DEBUT + JOURS.length - 1) {
    throw new ErreurValidation(`Jour invalide (ligne ${ligne}).`);
  }
  await assurerEntetes();
  // Écrit C (Dîner), D (Note), E (Personnes) en une plage.
  await ecrirePlage(CL, pl('SEMAINE', `C${ligne}:E${ligne}`), [[
    c.diner.trim(),
    c.note ?? '',
    personnesValides(c.personnes),
  ]]);
}
