import { NextResponse, type NextRequest } from 'next/server';
import {
  chargerAgenda,
  ajouterEvenement,
  supprimerEvenement,
} from '@/lib/agenda/service';
import type { NouvelEvenement } from '@/lib/agenda/schema';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** GET /api/agenda — événements à venir de l'agenda familial. */
export async function GET() {
  try {
    return NextResponse.json(await chargerAgenda());
  } catch (e) {
    return reponseErreur(e);
  }
}

/** POST /api/agenda — crée un événement. */
export async function POST(req: NextRequest) {
  try {
    const n = (await req.json()) as NouvelEvenement;
    const id = await ajouterEvenement(n);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE /api/agenda — supprime un événement { calendarId, id }. */
export async function DELETE(req: NextRequest) {
  try {
    const { calendarId, id } = (await req.json()) as { calendarId?: string; id?: string };
    if (!id || !calendarId) return NextResponse.json({ erreur: 'calendarId et id requis.' }, { status: 400 });
    await supprimerEvenement(calendarId, id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
