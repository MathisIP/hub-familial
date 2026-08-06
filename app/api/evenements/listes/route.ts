import { NextResponse, type NextRequest } from 'next/server';
import {
  ajouterInvite,
  modifierInvite,
  supprimerInvite,
  ajouterTacheEvenement,
  modifierTacheEvenement,
  supprimerTacheEvenement,
  ajouterPlat,
  modifierPlat,
  supprimerPlat,
} from '@/lib/evenements/service';
import { reponseErreur } from '@/lib/api';

/**
 * Sous-listes d'un événement : invités, checklist, menu & courses.
 *
 * Une seule route pour les trois, distinguées par le champ `liste`. Elles ont la
 * même forme (ajouter / modifier / supprimer un élément rattaché à un événement)
 * et le même contrôle d'appartenance : trois routes jumelles n'apporteraient que
 * trois occasions d'oublier une vérification.
 *
 * ⚠ `evenementId` vient du client : le service vérifie systématiquement qu'il
 * appartient au foyer courant avant toute écriture.
 */
export const dynamic = 'force-dynamic';

type Liste = 'invites' | 'checklist' | 'menu';

function verifier(corps: { evenementId?: unknown; liste?: unknown }) {
  const evenementId = typeof corps.evenementId === 'string' ? corps.evenementId : '';
  const liste = corps.liste as Liste;
  if (!evenementId) return { erreur: 'evenementId requis.' };
  if (!['invites', 'checklist', 'menu'].includes(liste)) return { erreur: 'liste inconnue.' };
  return { evenementId, liste };
}

export async function POST(req: NextRequest) {
  try {
    const corps = await req.json();
    const v = verifier(corps);
    if ('erreur' in v) return NextResponse.json(v, { status: 400 });

    const id =
      v.liste === 'invites'
        ? await ajouterInvite(v.evenementId, corps)
        : v.liste === 'checklist'
          ? await ajouterTacheEvenement(v.evenementId, corps)
          : await ajouterPlat(v.evenementId, corps);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const corps = await req.json();
    const v = verifier(corps);
    if ('erreur' in v) return NextResponse.json(v, { status: 400 });
    if (typeof corps.id !== 'string' || !corps.id) {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }

    if (v.liste === 'invites') await modifierInvite(v.evenementId, corps.id, corps);
    else if (v.liste === 'checklist') await modifierTacheEvenement(v.evenementId, corps.id, corps);
    else await modifierPlat(v.evenementId, corps.id, corps);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const corps = await req.json();
    const v = verifier(corps);
    if ('erreur' in v) return NextResponse.json(v, { status: 400 });
    if (typeof corps.id !== 'string' || !corps.id) {
      return NextResponse.json({ erreur: 'id requis.' }, { status: 400 });
    }

    if (v.liste === 'invites') await supprimerInvite(v.evenementId, corps.id);
    else if (v.liste === 'checklist') await supprimerTacheEvenement(v.evenementId, corps.id);
    else await supprimerPlat(v.evenementId, corps.id);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
