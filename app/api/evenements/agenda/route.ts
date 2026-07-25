import { NextResponse, type NextRequest } from 'next/server';
import { lierAgenda, delierAgenda } from '@/lib/evenements/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST /api/evenements/agenda — ajoute l'événement à l'agenda { id, calendarId }. */
export async function POST(req: NextRequest) {
  try {
    const { id, calendarId } = (await req.json()) as { id?: string; calendarId?: string };
    if (typeof id !== 'string' || id === '' || !calendarId) {
      return NextResponse.json({ erreur: 'Paramètres { id, calendarId } requis.' }, { status: 400 });
    }
    await lierAgenda(id, calendarId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE /api/evenements/agenda — retire l'événement de l'agenda { id }. */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }
    await delierAgenda(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
