import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterRecette,
  modifierRecette,
  supprimerRecette,
  type ChampsRecette,
} from '@/lib/repas/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST /api/repas/recettes — ajoute une recette. */
export async function POST(req: NextRequest) {
  try {
    const c = (await req.json()) as ChampsRecette;
    const id = await ajouterRecette(c);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH /api/repas/recettes — modifie une recette { id, ...champs }. */
export async function PATCH(req: NextRequest) {
  try {
    const { id, ...champs } = (await req.json()) as ChampsRecette & { id: string };
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }
    await modifierRecette(id, champs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE /api/repas/recettes — supprime une recette { id }. */
export async function DELETE(req: NextRequest) {
  try {
    const { id } = (await req.json()) as { id?: string };
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }
    await supprimerRecette(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
