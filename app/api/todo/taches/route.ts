import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterTache,
  changerStatutTache,
  supprimerTache,
  viderTachesFaites,
  type NouvelleTache,
} from '@/lib/todo/service';
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

/**
 * DELETE /api/todo/taches — supprime UNE tâche { id }, ou TOUTES celles qui sont
 * faites { faites: true }.
 *
 * ⚠ Deux gestes distincts sur la même route, et le second ne s'obtient jamais
 * par défaut : sans `faites: true` explicite, un corps mal formé effacerait
 * toute la liste au lieu d'échouer.
 */
export async function DELETE(req: NextRequest) {
  try {
    const { id, faites } = (await req.json()) as { id?: string; faites?: boolean };
    if (faites === true) {
      const n = await viderTachesFaites();
      return NextResponse.json({ ok: true, supprimees: n });
    }
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'Paramètre { id } requis.' }, { status: 400 });
    }
    await supprimerTache(id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
