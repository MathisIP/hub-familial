import 'server-only';
import Stripe from 'stripe';

/**
 * Client Stripe (serveur uniquement), créé paresseusement depuis STRIPE_SECRET_KEY.
 * Tant que la clé est absente, la facturation est INACTIVE et l'accès n'est PAS
 * verrouillé (cf. lib/abonnement.ts) — l'usage actuel continue sans Stripe.
 */
let _stripe: Stripe | null = null;

export function stripeDisponible(): boolean {
  return !!process.env.STRIPE_SECRET_KEY;
}

export function stripe(): Stripe {
  if (_stripe) return _stripe;
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY manquant : facturation non configurée.');
  _stripe = new Stripe(key);
  return _stripe;
}
