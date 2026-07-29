import { NextResponse } from 'next/server';
import { listeCoursesSemaine } from '@/lib/repas/service';
import { ajouterCoursesEnLot } from '@/lib/todo/service';
import { formatQuantite } from '@/lib/repas/schema';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/courses/semaine — liste de courses agrégée de la semaine planifiée. */
export async function GET() {
  try {
    return NextResponse.json(await listeCoursesSemaine());
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * POST /api/courses/semaine — verse la liste dans la liste de courses (avec sa
 * colonne QUANTITÉ). Un article déjà présent voit sa quantité cumulée plutôt que
 * dupliquée en ligne (cf. ajouterCoursesEnLot). Recalcule côté serveur.
 */
export async function POST() {
  try {
    const { articles } = await listeCoursesSemaine();
    const items = articles.map((a) => ({
      article: a.article,
      quantite:
        a.quantite != null ? `${formatQuantite(a.quantite)}${a.unite ? ' ' + a.unite : ''}`.trim() : '',
      rayon: a.rayon,
    }));
    const res = await ajouterCoursesEnLot(items);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return reponseErreur(e);
  }
}
