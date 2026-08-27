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

/**
 * GET /api/agenda — événements du foyer.
 *
 * Sans paramètre : les 30 jours à venir. Avec `?debut=aaaa-mm-jj&fin=aaaa-mm-jj` :
 * exactement cette plage, ce dont les vues jour, semaine et mois ont besoin.
 *
 * ⚠ Les deux bornes sont exigées ensemble et validées : une plage à moitié
 * renseignée, ou une date fantaisiste, doit retomber sur le comportement par
 * défaut plutôt que de produire une fenêtre absurde côté Google.
 */
const JOUR_ISO = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const debut = p.get('debut') ?? '';
    const fin = p.get('fin') ?? '';
    const plage = JOUR_ISO.test(debut) && JOUR_ISO.test(fin) && debut <= fin ? { debut, fin } : 30;
    return NextResponse.json(await chargerAgenda(plage));
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
