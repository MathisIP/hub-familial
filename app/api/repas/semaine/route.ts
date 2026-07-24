import { NextResponse, type NextRequest } from 'next/server';
import { definirJour, type ChampsJour } from '@/lib/repas/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH /api/repas/semaine — définit un jour { jour, diner, personnes, note }. */
export async function PATCH(req: NextRequest) {
  try {
    const { jour, ...champs } = (await req.json()) as ChampsJour & { jour: string };
    if (typeof jour !== 'string' || jour === '') {
      return NextResponse.json({ erreur: 'jour requis.' }, { status: 400 });
    }
    await definirJour(jour, champs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
