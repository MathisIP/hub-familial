import { NextResponse, type NextRequest } from 'next/server';
import { lierAgenda, delierAgenda } from '@/lib/evenements/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST /api/evenements/agenda — ajoute l'événement à l'agenda { ligne, calendarId }. */
export async function POST(req: NextRequest) {
  try {
    const { ligne, calendarId } = (await req.json()) as { ligne?: number; calendarId?: string };
    if (typeof ligne !== 'number' || !calendarId) {
      return NextResponse.json({ erreur: 'Paramètres { ligne, calendarId } requis.' }, { status: 400 });
    }
    await lierAgenda(ligne, calendarId);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE /api/evenements/agenda — retire l'événement de l'agenda { ligne }. */
export async function DELETE(req: NextRequest) {
  try {
    const { ligne } = (await req.json()) as { ligne?: number };
    if (typeof ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    await delierAgenda(ligne);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
