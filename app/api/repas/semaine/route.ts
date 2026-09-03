import { NextResponse, type NextRequest } from 'next/server';
import { definirJour, reinitialiserSemaine, type ChampsJour } from '@/lib/repas/service';
import type { Moment } from '@/lib/repas/schema';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** PATCH /api/repas/semaine — définit un jour { jour, moment?, diner, personnes, note }. */
export async function PATCH(req: NextRequest) {
  try {
    const { jour, moment, ...champs } = (await req.json()) as ChampsJour & { jour: string; moment?: Moment };
    if (typeof jour !== 'string' || jour === '') {
      return NextResponse.json({ erreur: 'jour requis.' }, { status: 400 });
    }
    await definirJour(jour, champs, moment);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * DELETE /api/repas/semaine — vide les menus des jours × moments choisis
 * { jours?, moments?, remettrePersonnes? }. Un tableau absent ou vide veut
 * dire « tous » pour ce critère (voir `reinitialiserSemaine`).
 */
export async function DELETE(req: NextRequest) {
  try {
    const corps = (await req.json()) as { jours?: string[]; moments?: Moment[]; remettrePersonnes?: boolean };
    await reinitialiserSemaine(corps);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
