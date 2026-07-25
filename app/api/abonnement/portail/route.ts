import { NextResponse, type NextRequest } from 'next/server';
import { creerPortail } from '@/lib/abonnement';
import { reponseErreur } from '@/lib/api';

/** POST /api/abonnement/portail — renvoie l'URL du portail de facturation Stripe. */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const url = await creerPortail(req.nextUrl.origin);
    return NextResponse.json({ url });
  } catch (e) {
    return reponseErreur(e);
  }
}
