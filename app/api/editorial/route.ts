import { NextResponse, type NextRequest } from 'next/server';
import { chargerPostsEditorial, definirStatutPost, modifierEtatPost, type ChampsEtatPost } from '@/lib/editorial/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/editorial — les 16 posts (contenu fixe + état de suivi du foyer). */
export async function GET() {
  try {
    return NextResponse.json(await chargerPostsEditorial());
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * PATCH /api/editorial — deux gestes distincts sur la même route :
 *  - { numero, statut } change le statut ;
 *  - { numero, ...champs } modifie visuel/résultats.
 * `statut` prime, comme app/api/todo/taches/route.ts.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { numero, statut, ...champs } = (await req.json()) as { numero?: number; statut?: string } & ChampsEtatPost;
    if (typeof numero !== 'number') {
      return NextResponse.json({ erreur: 'Paramètre { numero } requis.' }, { status: 400 });
    }
    if (typeof statut === 'string' && statut.trim()) {
      await definirStatutPost(numero, statut);
      return NextResponse.json({ ok: true });
    }
    await modifierEtatPost(numero, champs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
