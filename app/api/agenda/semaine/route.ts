import { NextResponse } from 'next/server';
import { chargerSemaineAgenda } from '@/lib/agenda/service';
import { reponseErreur } from '@/lib/api';

/** GET /api/agenda/semaine — événements de la semaine en cours (tous agendas). */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await chargerSemaineAgenda());
  } catch (e) {
    return reponseErreur(e);
  }
}
