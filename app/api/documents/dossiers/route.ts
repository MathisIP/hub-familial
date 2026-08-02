import { NextResponse, type NextRequest } from 'next/server';
import { creerDossier, renommerDossier, supprimerDossier } from '@/lib/documents/service';
import { reponseErreur } from '@/lib/api';

/**
 * Dossiers du module Documents (rangement à un niveau).
 *   POST   — créer un dossier (éventuellement vide)
 *   PATCH  — renommer un dossier (et les documents qu'il contient)
 *   DELETE — supprimer un dossier ; ses fichiers repartent dans la boîte d'arrivée
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { nom } = await req.json();
    await creerDossier(String(nom ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const { ancien, nouveau } = await req.json();
    await renommerDossier(String(ancien ?? ''), String(nouveau ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { nom } = await req.json();
    await supprimerDossier(String(nom ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
