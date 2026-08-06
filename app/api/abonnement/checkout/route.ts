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
    const corps = await req.json().catch(() => ({}));
    const choisie: IdOffre = corps?.formule === 'annuel' ? 'annuel' : 'mensuel';
    // La renonciation au droit de rétractation est revérifiée côté serveur : une
    // case cochée dans le navigateur ne prouve rien à elle seule.
    const url = await creerCheckout(req.nextUrl.origin, choisie, corps?.renonciation === true);
    return NextResponse.json({ url });
  } catch (e) {
    return reponseErreur(e);
  }
}
