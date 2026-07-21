import { NextResponse, type NextRequest } from 'next/server';
import { ajouterTache, changerStatutTache, type NouvelleTache } from '@/lib/todo/service';
import { reponseErreur } from '@/lib/api';

export const dynamic = 'force-dynamic';

/** POST /api/todo/taches — ajoute une tâche. */
export async function POST(req: NextRequest) {
  try {
    const corps = (await req.json()) as NouvelleTache;
    if (!corps?.tache?.trim()) {
      return NextResponse.json({ erreur: 'Titre requis.' }, { status: 400 });
    }
    await ajouterTache(corps);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH /api/todo/taches — change le statut d'une tâche { ligne, statut }. */
export async function PATCH(req: NextRequest) {
  try {
    const { ligne, statut } = (await req.json()) as { ligne?: number; statut?: string };
    if (typeof ligne !== 'number' || !statut?.trim()) {
      return NextResponse.json({ erreur: 'Paramètres { ligne, statut } requis.' }, { status: 400 });
    }
    await changerStatutTache(ligne, statut);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
