import 'server-only';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { foyers } from '@/lib/db/schema';
import { foyerCourant, utilisateurCourant, SansFoyer } from '@/lib/foyer';
import { stripe, stripeDisponible } from '@/lib/stripe';
import { ErreurValidation } from '@/lib/erreurs';
import type { IdOffre } from '@/lib/offres';

/**
 * ABONNEMENT (serveur) — chaque foyer paie un abonnement Stripe pour utiliser le
 * produit. L'accès est conditionné à `foyers.statut_abonnement` / `abonnement_fin`.
 *
 * ⚠ SÉCURITÉ : si Stripe n'est pas configuré (STRIPE_SECRET_KEY absent), l'accès
 * est OUVERT — l'app fonctionne comme avant tant que la facturation n'est pas
 * branchée. Le verrou ne s'active qu'une fois les clés Stripe présentes.
 *
 * Essai : un foyer en `essai` avec `abonnement_fin` future (ou nulle = essai non
 * démarré) a accès ; sinon il faut un abonnement `actif`.
 */

export type EtatAbonnement = {
  autorise: boolean;
  statut: string; // 'libre' si Stripe non configuré, sinon le statut du foyer
  finEssai: string | null; // ISO, ou null
  gereParStripe: boolean;
  aDejaPaye: boolean; // possède un client Stripe (peut ouvrir le portail)
};

export async function etatAbonnement(): Promise<EtatAbonnement> {
  if (!stripeDisponible()) {
    return { autorise: true, statut: 'libre', finEssai: null, gereParStripe: false, aDejaPaye: false };
  }
  // Personne sans foyer : état neutre plutôt qu'une exception, pour que les pages
  // de réglages restent affichables. `exigerAcces` la renvoie vers /bienvenue.
  let foyer;
  try {
    foyer = await foyerCourant();
  } catch (err) {
    if (err instanceof SansFoyer) {
      return { autorise: false, statut: 'sans_foyer', finEssai: null, gereParStripe: true, aDejaPaye: false };
    }
    throw err;
  }
  const fin = foyer.abonnementFin ? new Date(foyer.abonnementFin) : null;
  const essaiValide = foyer.statutAbonnement === 'essai' && (fin === null || fin.getTime() > Date.now());
  const autorise = foyer.statutAbonnement === 'actif' || essaiValide;
  return {
    autorise,
    statut: foyer.statutAbonnement,
    finEssai: fin ? fin.toISOString() : null,
    gereParStripe: true,
    aDejaPaye: !!foyer.stripeCustomerId,
  };
}

/**
 * À appeler en tête des pages protégées. Trois verrous, dans cet ordre :
 *  1. **appartenance à un foyer** — sinon /bienvenue (rejoindre un foyer) ;
 *  2. **prise en main faite** — sinon /demarrage (nommer le foyer, inviter) ;
 *  3. **abonnement/essai valide** — sinon /abonnement.
 *
 * ⚠ Le 1er verrou est explicite car `etatAbonnement()` sort AVANT de toucher au
 * foyer quand Stripe n'est pas configuré : sans cela, une personne sans foyer
 * passerait le contrôle et planterait plus loin, au premier accès aux données.
 * (`foyerCourant` est mémoïsé par requête : ce double appel ne coûte rien.)
 */
export async function exigerAcces(): Promise<void> {
  let sansFoyer = false;
  let onboardingAFaire = false;
  try {
    const foyer = await foyerCourant();
    onboardingAFaire = !foyer.onboardingFait;
  } catch (err) {
    if (!(err instanceof SansFoyer)) throw err;
    sansFoyer = true;
  }
  // `redirect()` lève une exception de contrôle : jamais depuis un bloc `try`.
  if (sansFoyer) redirect('/bienvenue');
  if (onboardingAFaire) redirect('/demarrage');

  const e = await etatAbonnement();
  if (!e.autorise) redirect('/abonnement');
}

/**
 * Identifiant de prix Stripe pour une formule.
 * ⚠ Deux prix distincts : la vitrine annonce mensuel ET annuel — un seul
 * `STRIPE_PRICE_ID` ne permettrait pas d'honorer l'offre annoncée.
 * `STRIPE_PRICE_ID` (sans suffixe) reste accepté comme repli pour le mensuel.
 */
function idPrix(formule: IdOffre): string {
  const cle = formule === 'annuel' ? 'STRIPE_PRICE_ID_ANNUEL' : 'STRIPE_PRICE_ID_MENSUEL';
  const id = process.env[cle] || (formule === 'mensuel' ? process.env.STRIPE_PRICE_ID : undefined);
  if (!id) throw new ErreurValidation(`Tarif non configuré (${cle} absent).`);
  return id;
}

/** Crée (ou réutilise) le client Stripe du foyer et renvoie l'URL de paiement. */
export async function creerCheckout(origin: string, formule: IdOffre = 'mensuel'): Promise<string> {
  const priceId = idPrix(formule);

  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  const s = stripe();

  let customerId = foyer.stripeCustomerId;
  if (!customerId) {
    const c = await s.customers.create({
      email: user.email,
      name: foyer.nom,
      metadata: { foyerId: foyer.id },
    });
    customerId = c.id;
    await db().update(foyers).set({ stripeCustomerId: customerId }).where(eq(foyers.id, foyer.id));
  }

  const session = await s.checkout.sessions.create({
    mode: 'subscription',
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/abonnement?ok=1`,
    cancel_url: `${origin}/abonnement`,
    metadata: { foyerId: foyer.id },
    subscription_data: { metadata: { foyerId: foyer.id } },
  });
  if (!session.url) throw new ErreurValidation('Session de paiement invalide.');
  return session.url;
}

/** Ouvre le portail de facturation Stripe (gérer / annuler l'abonnement). */
export async function creerPortail(origin: string): Promise<string> {
  const foyer = await foyerCourant();
  if (!foyer.stripeCustomerId) throw new ErreurValidation('Aucun abonnement à gérer.');
  const session = await stripe().billingPortal.sessions.create({
    customer: foyer.stripeCustomerId,
    return_url: `${origin}/abonnement`,
  });
  return session.url;
}

/* ------------------------------- WEBHOOK ------------------------------- */

/** Statut Stripe → statut interne (`foyers.statut_abonnement`). */
function mapStatut(s: Stripe.Subscription.Status): string {
  if (s === 'active' || s === 'trialing') return 'actif';
  if (s === 'past_due' || s === 'unpaid') return 'impaye';
  if (s === 'canceled' || s === 'incomplete_expired') return 'annule';
  return 'impaye';
}

/** Fin de la période courante (au niveau de l'item depuis l'API Stripe 2025). */
function finPeriode(sub: Stripe.Subscription): Date | null {
  const item = sub.items?.data?.[0] as unknown as { current_period_end?: number } | undefined;
  const ts = item?.current_period_end;
  return ts ? new Date(ts * 1000) : null;
}

/** Applique l'état d'un abonnement Stripe au foyer correspondant. */
async function appliquerAbonnement(sub: Stripe.Subscription): Promise<void> {
  const foyerId = sub.metadata?.foyerId;
  const customerId = typeof sub.customer === 'string' ? sub.customer : sub.customer.id;
  const fin = finPeriode(sub);
  const set = {
    statutAbonnement: mapStatut(sub.status),
    abonnementFin: fin,
    stripeCustomerId: customerId,
  };
  const d = db();
  if (foyerId) await d.update(foyers).set(set).where(eq(foyers.id, foyerId));
  else await d.update(foyers).set(set).where(eq(foyers.stripeCustomerId, customerId));
}

/** Traite un événement Stripe déjà vérifié (signature). */
export async function traiterWebhook(event: Stripe.Event): Promise<void> {
  switch (event.type) {
    case 'checkout.session.completed': {
      const sess = event.data.object as Stripe.Checkout.Session;
      if (sess.subscription) {
        const sub = await stripe().subscriptions.retrieve(String(sess.subscription));
        // reporte le foyerId de la session sur l'abonnement si absent
        if (!sub.metadata?.foyerId && sess.metadata?.foyerId) {
          sub.metadata = { ...sub.metadata, foyerId: sess.metadata.foyerId };
        }
        await appliquerAbonnement(sub);
      }
      break;
    }
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted': {
      await appliquerAbonnement(event.data.object as Stripe.Subscription);
      break;
    }
    default:
      break;
  }
}
