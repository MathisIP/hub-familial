import { NextResponse } from 'next/server';
import { chargerEvenements } from '@/lib/evenements/service';
import { reponseErreur } from '@/lib/api';

/** GET /api/evenements — événements (union maître + sous-onglets) + listes. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await chargerEvenements());
  } catch (e) {
    return reponseErreur(e);
  }
}
