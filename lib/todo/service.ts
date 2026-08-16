import 'server-only';
import { and, asc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { taches as tTaches, courses as tCourses } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { envoyer, membresDuFoyer, pushDisponible } from '@/lib/notifications/service';
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
  sommeQuantites,
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
    quantite: r.quantite,
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
export async function ajouterCourse(article: string, rayon = '', quantite = ''): Promise<void> {
  const art = article.trim();
  if (!art) throw new ErreurValidation("L'article est requis.");
  const foyerId = await idFoyerCourant();
  await db()
    .insert(tCourses)
    .values({ foyerId, fait: false, article: art, quantite: quantite.trim(), rayon: rayon.trim() });
}

/** Modifie un article (libellé, quantité, rayon) avant l'achat, adressé par id. */
export async function modifierCourse(
  id: string,
  champs: { article?: string; quantite?: string; rayon?: string },
): Promise<void> {
  const foyerId = await idFoyerCourant();
  const set: { article?: string; quantite?: string; rayon?: string } = {};
  if (champs.article !== undefined) {
    const art = champs.article.trim();
    if (!art) throw new ErreurValidation("L'article est requis.");
    set.article = art;
  }
  if (champs.quantite !== undefined) set.quantite = champs.quantite.trim();
  if (champs.rayon !== undefined) set.rayon = champs.rayon.trim();
  if (Object.keys(set).length === 0) return;
  const res = await db()
    .update(tCourses)
    .set(set)
    .where(and(eq(tCourses.id, id), eq(tCourses.foyerId, foyerId)))
    .returning({ id: tCourses.id });
  if (res.length === 0) throw new ErreurValidation('Article introuvable.');
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
 * Ajoute plusieurs articles d'un coup (cases décochées). Un même article (libellé
 * insensible à la casse) déjà présent — dans la liste OU dans le lot — n'ajoute
 * PAS une nouvelle ligne : sa QUANTITÉ monte (somme des quantités quand elles sont
 * chiffrées et de même unité). Renvoie le nombre de lignes ajoutées et le nombre
 * de lignes existantes dont la quantité a été cumulée. Alimente le bouton d'accueil.
 */
export async function ajouterCoursesEnLot(
  items: { article: string; quantite?: string; rayon?: string }[],
): Promise<{ ajoutes: number; cumules: number }> {
  const nettoyes = items
    .map((i) => ({
      article: (i.article ?? '').trim(),
      quantite: (i.quantite ?? '').trim(),
      rayon: (i.rayon ?? '').trim(),
    }))
    .filter((i) => i.article !== '');
  if (nettoyes.length === 0) return { ajoutes: 0, cumules: 0 };

  const foyerId = await idFoyerCourant();
  const d = db();
  const existants = await d
    .select({ id: tCourses.id, article: tCourses.article, quantite: tCourses.quantite })
    .from(tCourses)
    .where(eq(tCourses.foyerId, foyerId));

  type Rec = { id: string | null; article: string; quantite: string; rayon: string; touche: boolean };
  const parCle = new Map<string, Rec>();
  for (const e of existants) {
    parCle.set(e.article.trim().toLowerCase(), {
      id: e.id, article: e.article, quantite: e.quantite, rayon: '', touche: false,
    });
  }

  let ajoutes = 0;
  let cumules = 0;
  for (const it of nettoyes) {
    const cle = it.article.toLowerCase();
    const ex = parCle.get(cle);
    if (ex) {
      ex.quantite = sommeQuantites(ex.quantite, it.quantite);
      if (ex.id) { if (!ex.touche) cumules++; ex.touche = true; } // ligne existante cumulée
    } else {
      parCle.set(cle, { id: null, article: it.article, quantite: it.quantite, rayon: it.rayon, touche: true });
      ajoutes++;
    }
  }

  const aInserer: { foyerId: string; fait: boolean; article: string; quantite: string; rayon: string }[] = [];
  for (const rec of parCle.values()) {
    if (rec.id === null) {
      aInserer.push({ foyerId, fait: false, article: rec.article, quantite: rec.quantite, rayon: rec.rayon });
    } else if (rec.touche) {
      await d
        .update(tCourses)
        .set({ quantite: rec.quantite })
        .where(and(eq(tCourses.id, rec.id), eq(tCourses.foyerId, foyerId)));
    }
  }
  if (aInserer.length > 0) await d.insert(tCourses).values(aInserer);

  return { ajoutes, cumules };
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

/* ---------------------------------------------------------------------------
 * VALIDER LA LISTE DE COURSES
 *
 * Remplace l'envoi « par message », retiré le 16/08/2026. Celui-ci envoyait la
 * liste en clair dans l'historique de messages de deux téléphones, hors de toute
 * règle de visibilité et hors du chiffrement que le reste du produit s'impose.
 * La liste ne quitte plus l'app : la notification dit seulement qu'elle est prête.
 *
 * ⚠ LA NOTIFICATION NE CONTIENT PAS LA LISTE. Elle s'affiche sur un écran
 * verrouillé : y déverser « 12 articles dont test de grossesse » serait exposer
 * le foyer à quiconque tient le téléphone. Le clic ouvre l'app sur la liste à
 * cocher, après authentification.
 * ------------------------------------------------------------------------- */

/** Ce que l'écran de validation a besoin de savoir avant d'envoyer. */
export type ApercuValidation = {
  articles: number;
  membres: { utilisateurId: string; nom: string }[];
  /** Faux si les clés VAPID manquent : on le dit plutôt que d'échouer en silence. */
  pushDisponible: boolean;
};

export async function apercuValidationCourses(): Promise<ApercuValidation> {
  const foyerId = await idFoyerCourant();
  const [lignes, membres] = await Promise.all([
    db()
      .select({ id: tCourses.id })
      .from(tCourses)
      .where(and(eq(tCourses.foyerId, foyerId), eq(tCourses.fait, false))),
    membresDuFoyer(),
  ]);
  return { articles: lignes.length, membres, pushDisponible: pushDisponible() };
}

/**
 * Prévient les personnes choisies que la liste est prête.
 *
 * Les destinataires sont validés contre les membres du foyer : la route reçoit
 * des identifiants du client, et rien n'empêcherait sinon de notifier quelqu'un
 * d'un autre foyer.
 */
export async function validerCourses(utilisateurIds: string[]): Promise<{ envoyes: number; articles: number }> {
  const foyerId = await idFoyerCourant();

  const lignes = await db()
    .select({ id: tCourses.id })
    .from(tCourses)
    .where(and(eq(tCourses.foyerId, foyerId), eq(tCourses.fait, false)));
  if (lignes.length === 0) {
    throw new ErreurValidation('La liste est vide : rien à envoyer.');
  }

  const membres = await membresDuFoyer();
  const duFoyer = new Set(membres.map((m) => m.utilisateurId));
  const retenus = [...new Set(utilisateurIds)].filter((u) => duFoyer.has(u));
  if (retenus.length === 0) {
    throw new ErreurValidation('Choisis au moins une personne à prévenir.');
  }

  const envoyes = await envoyer(retenus, 'courses', {
    titre: 'La liste de courses est prête',
    corps:
      lignes.length === 1
        ? '1 article à prendre. Touchez pour l’ouvrir.'
        : `${lignes.length} articles à prendre. Touchez pour l’ouvrir.`,
    url: '/todo?onglet=courses',
    tag: 'courses',
  });

  return { envoyes, articles: lignes.length };
}
