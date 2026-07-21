import { NextResponse } from 'next/server';
import { listeCoursesSemaine } from '@/lib/repas/service';
import { ajouterCoursesEnLot } from '@/lib/todo/service';
import { formatQuantite } from '@/lib/repas/schema';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/courses/semaine — liste de courses agrégée de la semaine planifiée. */
export async function GET() {
  try {
    return NextResponse.json({ articles: await listeCoursesSemaine() });
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * POST /api/courses/semaine — verse la liste dans l'onglet Courses de ToDo
 * (dédoublonnée). La quantité est intégrée au libellé (« Pâtes (400 g) »),
 * car l'onglet Courses n'a pas de colonne quantité. Recalcule côté serveur.
 */
export async function POST() {
  try {
    const articles = await listeCoursesSemaine();
    const items = articles.map((a) => ({
      article:
        a.quantite != null
          ? `${a.article} (${formatQuantite(a.quantite)}${a.unite ? ' ' + a.unite : ''})`
          : a.article,
      rayon: a.rayon,
    }));
    const res = await ajouterCoursesEnLot(items);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return reponseErreur(e);
  }
}
