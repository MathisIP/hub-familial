import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { taches as tTaches, courses as tCourses } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  RECURRENCES_ACTIVES,
  STATUT_FAIT,
  STATUTS_DEFAUT,
  PRIORITES_DEFAUT,
  RECURRENCES_DEFAUT,
  aujourdhuiISO,
  construireTache,
  prochaineOccurrenceLabel,
  rangPriorite,
  versISO,
  type Course,
  type DonneesTodo,
  type Parametres,
  type Tache,
} from '@/lib/todo/schema';

/**
 * SERVICE TO-DO & COURSES (serveur uniquement) — Postgres, scopé au FOYER.
 * Chaque requête filtre sur `foyer_id` (idFoyerCourant()). Remplace la version
 * Google Sheets. La récurrence (régénération d'une tâche cochée « Fait ») est
 * répliquée en base, comme elle l'était pour compenser l'absence d'onEdit Sheets.
 */

/** Valeurs distinctes non vides d'une colonne, triées. */
function distinct(valeurs: (string | null)[]): string[] {
  return [...new Set(valeurs.map((v) => (v ?? '').trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );
}

export async function chargerTodo(): Promise<DonneesTodo> {
  const foyerId = await idFoyerCourant();
  const d = db();
  const today = aujourdhuiISO();

  const [lignesTaches, lignesCourses] = await Promise.all([
    d.select().from(tTaches).where(eq(tTaches.foyerId, foyerId)),
    d.select().from(tCourses).where(eq(tCourses.foyerId, foyerId)).orderBy(asc(tCourses.creeLe)),
  ]);

  const taches: Tache[] = lignesTaches.map((r) => construireTache(r, today));

  // Tri d'affichage : non-faites d'abord, puis retard, puis priorité, puis échéance.
  taches.sort((a, b) => {
    const fa = a.statut === STATUT_FAIT ? 1 : 0;
    const fb = b.statut === STATUT_FAIT ? 1 : 0;
    if (fa !== fb) return fa - fb;
    if (a.enRetard !== b.enRetard) return a.enRetard ? -1 : 1;
    const rp = rangPriorite(a.priorite) - rangPriorite(b.priorite);
    if (rp !== 0) return rp;
    return (a.echeance ?? '9999').localeCompare(b.echeance ?? '9999');
  });

  const courses: Course[] = lignesCourses.map((r) => ({
    id: r.id,
    fait: r.fait,
    article: r.article,
    rayon: r.rayon,
  }));

  // Listes : statuts/priorités/récurrences fixes ; personnes/catégories/rayons
  // dérivées des données existantes (alimentent selects, datalists et filtre).
  const parametres: Parametres = {
    statuts: STATUTS_DEFAUT,
    personnes: distinct(lignesTaches.map((t) => t.assigne)),
    priorites: PRIORITES_DEFAUT,
    recurrences: RECURRENCES_DEFAUT,
    categories: distinct(lignesTaches.map((t) => t.categorie)),
    rayons: distinct(lignesCourses.map((c) => c.rayon)),
  };

  return { taches, courses, parametres };
}

/* ----------------------------- MUTATIONS TÂCHES ----------------------------- */

export type NouvelleTache = {
  tache: string;
  assigne?: string;
  categorie?: string;
  priorite?: string;
  echeanceLabel?: string; // jj/mm/aaaa
  recurrence?: string;
  note?: string;
};

/** Ajoute une tâche (statut initial « À faire »). */
export async function ajouterTache(t: NouvelleTache): Promise<string> {
  const titre = t.tache.trim();
  if (!titre) throw new ErreurValidation('Le titre de la tâche est requis.');
  const foyerId = await idFoyerCourant();
  const [row] = await db()
    .insert(tTaches)
    .values({
      foyerId,
      statut: 'À faire',
      tache: titre,
      assigne: t.assigne ?? '',
      categorie: t.categorie ?? '',
      priorite: t.priorite ?? '',
      echeance: t.echeanceLabel ?? '',
      recurrence: t.recurrence ?? 'Aucune',
      note: t.note ?? '',
    })
    .returning({ id: tTaches.id });
  return row.id;
}

/**
 * Change le statut d'une tâche (adressée par id). Si elle passe à « Fait » et
 * qu'elle est récurrente, engendre la prochaine occurrence (nouvelle tâche
 * « À faire » à la date suivante).
 */
export async function changerStatutTache(id: string, statut: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const d = db();

  const [cible] = await d
    .select()
    .from(tTaches)
    .where(and(eq(tTaches.id, id), eq(tTaches.foyerId, foyerId)))
    .limit(1);
  if (!cible) throw new ErreurValidation('Tâche introuvable.');

  await d
    .update(tTaches)
    .set({ statut })
    .where(and(eq(tTaches.id, id), eq(tTaches.foyerId, foyerId)));

  if (statut === STATUT_FAIT && RECURRENCES_ACTIVES.includes(cible.recurrence.trim().toLowerCase())) {
    const baseISO = cible.echeance ? versISO(cible.echeance) : null;
    const prochaine = prochaineOccurrenceLabel(baseISO, cible.recurrence);
    await d.insert(tTaches).values({
      foyerId,
      statut: 'À faire',
      tache: cible.tache,
      assigne: cible.assigne,
      categorie: cible.categorie,
      priorite: cible.priorite,
      echeance: prochaine,
      recurrence: cible.recurrence,
      note: cible.note,
    });
  }
}

/* ----------------------------- MUTATIONS COURSES ---------------------------- */

/** Ajoute un article à la liste de courses (case décochée). */
export async function ajouterCourse(article: string, rayon = ''): Promise<void> {
  const art = article.trim();
  if (!art) throw new ErreurValidation("L'article est requis.");
  const foyerId = await idFoyerCourant();
  await db().insert(tCourses).values({ foyerId, fait: false, article: art, rayon: rayon.trim() });
}

/** Coche / décoche un article (adressé par id). */
export async function cocherCourse(id: string, fait: boolean): Promise<void> {
  const foyerId = await idFoyerCourant();
  const res = await db()
    .update(tCourses)
    .set({ fait })
    .where(and(eq(tCourses.id, id), eq(tCourses.foyerId, foyerId)))
    .returning({ id: tCourses.id });
  if (res.length === 0) throw new ErreurValidation('Article introuvable.');
}

/**
 * Ajoute plusieurs articles d'un coup (cases décochées), en sautant ceux déjà
 * présents (dédoublonnage sur le libellé, insensible à la casse). Renvoie le
 * nombre ajouté et le nombre ignoré. Alimente le bouton d'accueil « courses ».
 */
export async function ajouterCoursesEnLot(
  items: { article: string; rayon?: string }[],
): Promise<{ ajoutes: number; ignores: number }> {
  const nettoyes = items
    .map((i) => ({ article: (i.article ?? '').trim(), rayon: (i.rayon ?? '').trim() }))
    .filter((i) => i.article !== '');
  if (nettoyes.length === 0) return { ajoutes: 0, ignores: 0 };

  const foyerId = await idFoyerCourant();
  const d = db();
  const existants = await d
    .select({ article: tCourses.article })
    .from(tCourses)
    .where(eq(tCourses.foyerId, foyerId));
  const dejaLa = new Set(existants.map((e) => e.article.trim().toLowerCase()).filter(Boolean));

  const aAjouter: { foyerId: string; fait: boolean; article: string; rayon: string }[] = [];
  let ignores = 0;
  for (const it of nettoyes) {
    const cle = it.article.toLowerCase();
    if (dejaLa.has(cle)) { ignores++; continue; }
    dejaLa.add(cle); // évite aussi les doublons dans le lot lui-même
    aAjouter.push({ foyerId, fait: false, article: it.article, rayon: it.rayon });
  }
  if (aAjouter.length === 0) return { ajoutes: 0, ignores };

  await d.insert(tCourses).values(aAjouter);
  return { ajoutes: aAjouter.length, ignores };
}

/** Retire (supprime) les articles cochés. Renvoie le nombre retiré. */
export async function viderCoursesFaites(): Promise<number> {
  const foyerId = await idFoyerCourant();
  const res = await db()
    .delete(tCourses)
    .where(and(eq(tCourses.foyerId, foyerId), eq(tCourses.fait, true)))
    .returning({ id: tCourses.id });
  return res.length;
}
