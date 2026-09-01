import { NextResponse, type NextRequest } from 'next/server';
import { ajouterCourse, cocherCourse, modifierCourse, supprimerCourse, viderCoursesFaites } from '@/lib/todo/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST /api/todo/courses — ajoute un article { article, quantite?, rayon? }. */
export async function POST(req: NextRequest) {
  try {
    const { article, quantite, rayon } = (await req.json()) as {
      article?: string;
      quantite?: string;
      rayon?: string;
    };
    if (!article?.trim()) {
      return NextResponse.json({ erreur: 'Article requis.' }, { status: 400 });
    }
    await ajouterCourse(article, rayon ?? '', quantite ?? '');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PUT /api/todo/courses — modifie un article { id, article?, quantite?, rayon? }. */
export async function PUT(req: NextRequest) {
  try {
    const { id, article, quantite, rayon } = (await req.json()) as {
      id?: string;
      article?: string;
      quantite?: string;
      rayon?: string;
    };
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'Paramètre { id } requis.' }, { status: 400 });
    }
    await modifierCourse(id, { article, quantite, rayon });
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

/**
 * DELETE /api/todo/courses — retire un article, ou tous les articles cochés.
 *
 * ⚠ DEUX COMPORTEMENTS SUR LA MÊME ROUTE, DISTINGUÉS PAR LE CORPS. Un corps
 * `{ id }` retire CET article précis, coché ou non ; un appel sans corps (ou
 * un corps vide) garde le comportement historique — vider tout ce qui est
 * coché. Pas de nouvelle route pour ne pas dupliquer la sémantique DELETE.
 */
export async function DELETE(req: NextRequest) {
  try {
    let id: string | undefined;
    try {
      ({ id } = (await req.json()) as { id?: string });
    } catch {
      // Corps absent ou vide : comportement historique (vider les cochés).
    }
    if (typeof id === 'string' && id !== '') {
      await supprimerCourse(id);
      return NextResponse.json({ ok: true });
    }
    const retires = await viderCoursesFaites();
    return NextResponse.json({ ok: true, retires });
  } catch (e) {
    return reponseErreur(e);
  }
}
