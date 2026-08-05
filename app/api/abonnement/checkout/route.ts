import { NextResponse, type NextRequest } from 'next/server';
import { creerCheckout } from '@/lib/abonnement';
import { reponseErreur } from '@/lib/api';
import type { IdOffre } from '@/lib/offres';

/** POST /api/abonnement/checkout — renvoie l'URL de paiement Stripe. */
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    // La formule vient du client : on n'accepte QUE les deux valeurs connues,
    // jamais un identifiant de prix Stripe arbitraire.
    const { formule } = await req.json().catch(() => ({ formule: undefined }));
    const choisie: IdOffre = formule === 'annuel' ? 'annuel' : 'mensuel';
    const url = await creerCheckout(req.nextUrl.origin, choisie);
    return NextResponse.json({ url });
  } catch (e) {
    return reponseErreur(e);
  }
}
