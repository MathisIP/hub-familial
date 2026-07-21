import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterCadeau,
  modifierCadeau,
  changerStatutCadeau,
  supprimerCadeau,
  type ChampsCadeau,
} from '@/lib/cadeaux/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST — ajoute un cadeau. */
export async function POST(req: NextRequest) {
  try {
    const c = (await req.json()) as ChampsCadeau;
    const ligne = await ajouterCadeau(c);
    return NextResponse.json({ ok: true, ligne });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH — modifie un cadeau { ligne, ...champs } ; si seul { ligne, statut } → change le statut. */
export async function PATCH(req: NextRequest) {
  try {
    const corps = (await req.json()) as ChampsCadeau & { ligne: number; statut?: string };
    if (typeof corps.ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    const { ligne, ...champs } = corps;
    if (champs.idee === undefined && typeof champs.statut === 'string') {
      await changerStatutCadeau(ligne, champs.statut);
    } else {
      await modifierCadeau(ligne, champs);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE — supprime un cadeau { ligne }. */
export async function DELETE(req: NextRequest) {
  try {
    const { ligne } = (await req.json()) as { ligne?: number };
    if (typeof ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    await supprimerCadeau(ligne);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
