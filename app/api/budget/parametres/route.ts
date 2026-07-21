import { NextResponse } from 'next/server';
import { chargerParametresSaisie } from '@/lib/budget/service';
import { reponseErreur } from '@/lib/api';

/** GET /api/budget/parametres — listes déroulantes de la saisie (comptes, catégories…). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await chargerParametresSaisie());
  } catch (e) {
    return reponseErreur(e);
  }
}
