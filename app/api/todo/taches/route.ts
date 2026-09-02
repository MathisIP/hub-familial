import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterTache,
  changerStatutTache,
  modifierTache,
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

/**
 * PATCH /api/todo/taches — deux gestes distincts sur la même route :
 *  - { id, statut } change le statut (régénère l'occurrence suivante si
 *    la tâche est récurrente et passe à « Fait » — voir changerStatutTache) ;
 *  - { id, ...champs } modifie les champs descriptifs (titre, assigné,
 *    priorité, catégorie, échéance, récurrence, note), jamais le statut.
 * `statut` distingue les deux : sa présence prime, pour ne jamais faire
 * silencieusement les deux à la fois sur un corps mal formé.
 */
export async function PATCH(req: NextRequest) {
  try {
    const { id, statut, ...champs } = (await req.json()) as { id?: string; statut?: string } & Record<
      string,
      unknown
    >;
    if (typeof id !== 'string' || id === '') {
      return NextResponse.json({ erreur: 'Paramètre { id } requis.' }, { status: 400 });
    }
    if (typeof statut === 'string' && statut.trim()) {
      await changerStatutTache(id, statut);
      return NextResponse.json({ ok: true });
    }
    await modifierTache(id, champs);
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
