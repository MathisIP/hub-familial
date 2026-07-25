import { NextResponse, type NextRequest } from 'next/server';
import { creerCheckout } from '@/lib/abonnement';
import { reponseErreur } from '@/lib/api';

/** POST /api/abonnement/checkout — renvoie l'URL de paiement Stripe. */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const url = await creerCheckout(req.nextUrl.origin);
    return NextResponse.json({ url });
  } catch (e) {
    return reponseErreur(e);
  }
}
