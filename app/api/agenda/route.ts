import { NextResponse, type NextRequest } from 'next/server';
import {
  chargerAgenda,
  ajouterEvenement,
  modifierEvenement,
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

/**
 * PATCH /api/agenda — modifie un événement { calendarId, id, portee?, …champs }.
 *
 * ⚠ Même périmètre OAuth que la création (`calendar.events`, « consulter et
 * modifier »), déjà accordé et vérifié : modifier ne demande aucune autorisation
 * supplémentaire. On supprimait déjà, ce qui est plus destructeur.
 */
export async function PATCH(req: NextRequest) {
  try {
    const m = (await req.json()) as NouvelEvenement & { id?: string; portee?: string };
    if (!m.id || !m.calendarId) {
      return NextResponse.json({ erreur: 'calendarId et id requis.' }, { status: 400 });
    }
    await modifierEvenement({
      ...m,
      id: m.id,
      portee: m.portee === 'serie' ? 'serie' : 'occurrence',
    });
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * DELETE /api/agenda — supprime un événement { calendarId, id, portee? }.
 * `portee: 'serie'` efface tout un rendez-vous récurrent ; sinon la seule date.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { calendarId, id, portee } = (await req.json()) as {
      calendarId?: string;
      id?: string;
      portee?: string;
    };
    if (!id || !calendarId) return NextResponse.json({ erreur: 'calendarId et id requis.' }, { status: 400 });
    await supprimerEvenement(calendarId, id, portee === 'serie' ? 'serie' : 'occurrence');
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
