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

/** PATCH /api/todo/taches — change le statut d'une tâche { id, statut }. */
export async function PATCH(req: NextRequest) {
  try {
    const { id, statut } = (await req.json()) as { id?: string; statut?: string };
    if (typeof id !== 'string' || id === '' || !statut?.trim()) {
      return NextResponse.json({ erreur: 'Paramètres { id, statut } requis.' }, { status: 400 });
    }
    await changerStatutTache(id, statut);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
