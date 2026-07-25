import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterEvenement,
  modifierEvenement,
  changerStatutEvenement,
  type ChampsEvenement,
} from '@/lib/evenements/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST — ajoute un événement. */
export async function POST(req: NextRequest) {
  try {
    const c = (await req.json()) as ChampsEvenement;
    const id = await ajouterEvenement(c);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * PATCH — { id, ...champs } modifie ; { id, statut } seul change le statut.
 */
export async function PATCH(req: NextRequest) {
  try {
    const corps = (await req.json()) as ChampsEvenement & { id: string; statut?: string };
    if (typeof corps.id !== 'string' || corps.id === '') {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }
    const { id, ...champs } = corps;
    if (champs.nom === undefined && typeof champs.statut === 'string') {
      await changerStatutEvenement(id, champs.statut);
    } else {
      await modifierEvenement(id, champs);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
