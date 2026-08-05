import { NextResponse, type NextRequest } from 'next/server';
import { stripe } from '@/lib/stripe';
import { traiterWebhook } from '@/lib/abonnement';

/**
 * POST /api/stripe/webhook — reçoit les événements Stripe (paiement, abonnement).
 * PUBLIC (Stripe appelle sans session ; exclu de l'auth dans middleware.ts).
 * Signature vérifiée avec STRIPE_WEBHOOK_SECRET sur le corps BRUT.
 */
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get('stripe-signature');

  // Deux causes DISTINCTES, deux réponses distinctes : confondues, on ne peut
  // pas savoir à distance si le secret est déployé ou si l'appelant est mal formé.
  if (!secret) {
    return NextResponse.json(
      { erreur: 'Webhook non configuré côté serveur (STRIPE_WEBHOOK_SECRET absent).' },
      { status: 500 },
    );
  }
  if (!signature) {
    return NextResponse.json({ erreur: 'Signature Stripe manquante.' }, { status: 400 });
  }

  const brut = await req.text();
  let event;
  try {
    event = stripe().webhooks.constructEvent(brut, signature, secret);
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'signature invalide';
    return NextResponse.json({ erreur: `Signature Stripe invalide : ${msg}` }, { status: 400 });
  }

  try {
    await traiterWebhook(event);
    return NextResponse.json({ received: true });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'erreur de traitement';
    return NextResponse.json({ erreur: msg }, { status: 500 });
  }
}
