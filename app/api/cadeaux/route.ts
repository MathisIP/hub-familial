import { NextResponse } from 'next/server';
import { chargerCadeaux } from '@/lib/cadeaux/service';
import { reponseErreur } from '@/lib/api';

/** GET /api/cadeaux — cadeaux + occasions + listes. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await chargerCadeaux());
  } catch (e) {
    return reponseErreur(e);
  }
}
