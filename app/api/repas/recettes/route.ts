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
    const ligne = await ajouterRecette(c);
    return NextResponse.json({ ok: true, ligne });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH /api/repas/recettes — modifie une recette { ligne, ...champs }. */
export async function PATCH(req: NextRequest) {
  try {
    const { ligne, ...champs } = (await req.json()) as ChampsRecette & { ligne: number };
    if (typeof ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    await modifierRecette(ligne, champs);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** DELETE /api/repas/recettes — supprime une recette { ligne }. */
export async function DELETE(req: NextRequest) {
  try {
    const { ligne } = (await req.json()) as { ligne?: number };
    if (typeof ligne !== 'number') {
      return NextResponse.json({ erreur: 'ligne requise.' }, { status: 400 });
    }
    await supprimerRecette(ligne);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
