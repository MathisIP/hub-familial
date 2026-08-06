import { NextResponse, type NextRequest } from 'next/server';
import { creerPortailResiliation } from '@/lib/abonnement';
import { reponseErreur } from '@/lib/api';

/**
 * POST /api/abonnement/resiliation — URL Stripe ouverte SUR l'écran de résiliation.
 *
 * Route distincte du portail générique : l'obligation de « résiliation en trois
 * clics » suppose d'arriver directement sur la fonction de résiliation, pas sur
 * un tableau de bord où il faut encore la chercher.
 */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const url = await creerPortailResiliation(req.nextUrl.origin);
    return NextResponse.json({ url });
  } catch (e) {
    return reponseErreur(e);
  }
}
