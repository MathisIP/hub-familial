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
    const id = await ajouterCadeau(c);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH — modifie un cadeau { id, ...champs } ; si seul { id, statut } → change le statut. */
export async function PATCH(req: NextRequest) {
  try {
    const corps = (await req.json()) as ChampsCadeau & { id: string; statut?: string };
    if (typeof corps.id !== 'string' || corps.id === '') {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }
    const { id, ...champs } = corps;
    if (champs.idee === undefined && typeof champs.statut === 'string') {
      await changerStatutCadeau(id, champs.statut);
    } else {
      await modifierCadeau(id, champs);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE — supprime un cadeau { id }. */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }
    await supprimerCadeau(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
