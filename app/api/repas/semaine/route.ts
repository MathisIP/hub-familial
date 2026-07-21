import { NextResponse, type NextRequest } from 'next/server';
import { definirJour, type ChampsJour } from '@/lib/repas/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH /api/repas/semaine — définit un jour { ligne, diner, personnes, note }. */
export async function PATCH(req: NextRequest) {
  try {
    const { ligne, ...champs } = (await req.json()) as ChampsJour & { ligne: number };
    if (typeof ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    await definirJour(ligne, champs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
