import { NextResponse, type NextRequest } from 'next/server';
import { ajouterCourse, cocherCourse, viderCoursesFaites } from '@/lib/todo/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST /api/todo/courses — ajoute un article { article, rayon? }. */
export async function POST(req: NextRequest) {
  try {
    const { article, rayon } = (await req.json()) as { article?: string; rayon?: string };
    if (!article?.trim()) {
      return NextResponse.json({ erreur: 'Article requis.' }, { status: 400 });
    }
    await ajouterCourse(article, rayon ?? '');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH /api/todo/courses — coche/décoche un article { id, fait }. */
export async function PATCH(req: NextRequest) {
  try {
    const { id, fait } = (await req.json()) as { id?: string; fait?: boolean };
    if (typeof id !== 'string' || id === '' || typeof fait !== 'boolean') {
      return NextResponse.json({ erreur: 'Paramètres { id, fait } requis.' }, { status: 400 });
    }
    await cocherCourse(id, fait);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE /api/todo/courses — retire tous les articles cochés. */
export async function DELETE() {
  try {
    const retires = await viderCoursesFaites();
    return NextResponse.json({ ok: true, retires });
  } catch (e) {
    return reponseErreur(e);
  }
}
