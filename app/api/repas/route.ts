import { NextResponse } from 'next/server';
import { chargerRepas } from '@/lib/repas/service';
import { reponseErreur } from '@/lib/api';

/** GET /api/repas — recettes + planning de la semaine + listes. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await chargerRepas());
  } catch (e) {
    return reponseErreur(e);
  }
}
