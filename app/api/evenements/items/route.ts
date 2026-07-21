import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterEvenement,
  modifierEvenement,
  changerStatutEvenement,
  type ChampsEvenement,
} from '@/lib/evenements/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST — ajoute un événement au maître. */
export async function POST(req: NextRequest) {
  try {
    const c = (await req.json()) as ChampsEvenement;
    const ligne = await ajouterEvenement(c);
    return NextResponse.json({ ok: true, ligne });
  } catch (e) {
    return reponseErreur(e);
  }
}

/**
 * PATCH — { ligne, ...champs } modifie ; { ligne, statut } seul change le statut.
 */
export async function PATCH(req: NextRequest) {
  try {
    const corps = (await req.json()) as ChampsEvenement & { ligne: number; statut?: string };
    if (typeof corps.ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    const { ligne, ...champs } = corps;
    if (champs.nom === undefined && typeof champs.statut === 'string') {
      await changerStatutEvenement(ligne, champs.statut);
    } else {
      await modifierEvenement(ligne, champs);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
