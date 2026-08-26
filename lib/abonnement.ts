import 'server-only';
import { redirect } from 'next/navigation';
import { and, eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { db } from '@/lib/db';
import { foyers, membres, utilisateurs } from '@/lib/db/schema';
import { foyerCourant, utilisateurCourant, SansFoyer } from '@/lib/foyer';
import { stripe, stripeDisponible } from '@/lib/stripe';
import { ErreurValidation } from '@/lib/erreurs';
import { envoyerResiliation } from '@/lib/email/messages';
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
  annulationProgrammee: boolean; // résilié, mais actif jusqu'à `finEssai`
  /** 'mensuel' | 'annuel' | null (aucun abonnement payant). */
  offre: string | null;
};

export async function etatAbonnement(): Promise<EtatAbonnement> {
  if (!stripeDisponible()) {
    return { autorise: true, statut: 'libre', finEssai: null, gereParStripe: false, aDejaPaye: false, annulationProgrammee: false, offre: null };
  }
  // Personne sans foyer : état neutre plutôt qu'une exception, pour que les pages
  // de réglages restent affichables. `exigerAcces` la renvoie vers /bienvenue.
  let foyer;
  try {
    foyer = await foyerCourant();
  } catch (err) {
    if (err instanceof SansFoyer) {
      return { autorise: false, statut: 'sans_foyer', finEssai: null, gereParStripe: true, aDejaPaye: false, annulationProgrammee: false, offre: null };
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
    annulationProgrammee: foyer.annulationProgrammee,
    // ⚠ Sert l'affichage permanent de la prochaine échéance. Pour les
    // abonnements MENSUELS, c'est ce qui tient lieu d'information sur la
    // reconduction : la fenêtre légale de l'article L. 215-1 est impraticable
    // sur un contrat d'un mois, l'affichage permanent la remplace.
    offre: foyer.offre,
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
  if (onboardingAFaire) redirect('/foyer/demarrage');

  const e = await etatAbonnement();
  if (!e.autorise) redirect('/foyer/abonnement');
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
/**
 * Ouvre le paiement Stripe.
 *
 * ⚠ `renonciation` n'est pas une formalité : pour un service numérique dont
 * l'accès est immédiat, la loi (art. L221-25 du code de la consommation) exige
 * que le consommateur ait EXPRESSÉMENT demandé l'exécution immédiate et reconnu
 * perdre son droit de rétractation. Sans cette reconnaissance recueillie AVANT
 * le paiement, le délai de 14 jours s'applique et l'abonnement est annulable
 * avec remboursement. On refuse donc de créer la session, et on horodate le
 * consentement pour pouvoir en faire la preuve.
 */
export async function creerCheckout(
  origin: string,
  formule: IdOffre = 'mensuel',
  renonciation = false,
): Promise<string> {
  if (!renonciation) {
    throw new ErreurValidation(
      'Pour démarrer l’abonnement immédiatement, coche la case de demande d’exécution immédiate.',
    );
  }
  const priceId = idPrix(formule);

  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  const s = stripe();

  await db()
    .update(foyers)
    .set({ retractationRenonceeLe: new Date() })
    .where(eq(foyers.id, foyer.id));

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

/**
 * Annule la résiliation programmée : l'abonnement repart normalement.
 *
 * On RÉACTIVE l'abonnement existant plutôt que d'en créer un nouveau — la
 * personne n'a rien à repayer et conserve sa date d'échéance. Un nouveau
 * paiement serait à la fois inutile et incompréhensible pour elle.
 */
export async function reactiverAbonnement(): Promise<void> {
  const foyer = await foyerCourant();
  if (!foyer.stripeCustomerId) throw new ErreurValidation('Aucun abonnement à réactiver.');

  const s = stripe();
  const subs = await s.subscriptions.list({ customer: foyer.stripeCustomerId, status: 'active', limit: 1 });
  const sub = subs.data[0];
  if (!sub) throw new ErreurValidation('Aucun abonnement en cours à réactiver.');

  // ⚠ Stripe REFUSE `cancel_at` et `cancel_at_period_end` dans le même appel
  // (« Please pass in only one »). On efface donc uniquement la forme réellement
  // posée sur cet abonnement — les deux existent selon la version d'API.
  const effacement = sub.cancel_at
    ? { cancel_at: null }
    : { cancel_at_period_end: false };
  const maj = await s.subscriptions.update(sub.id, effacement);
  // Application immédiate : ne pas dépendre du délai d'arrivée du webhook.
  await appliquerAbonnement(maj);
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

/**
 * Portail Stripe ouvert DIRECTEMENT sur l'écran de résiliation.
 *
 * ⚠ Obligation « résiliation en trois clics » (art. L215-1-1, en vigueur depuis
 * juin 2023) : un contrat souscrit en ligne doit pouvoir être résilié par une
 * fonction accessible en trois clics au plus. Le portail Stripe générique n'y
 * suffit pas — il faut encore y chercher l'abonnement puis le bouton. Avec
 * `flow_data`, le parcours devient : « Abonnement » → « Résilier » → confirmer.
 */
export async function creerPortailResiliation(origin: string): Promise<string> {
  const foyer = await foyerCourant();
  if (!foyer.stripeCustomerId) throw new ErreurValidation('Aucun abonnement à résilier.');
  const s = stripe();

  // Le flux de résiliation vise UN abonnement : il faut donc le retrouver.
  // `status: 'active'` seul manquerait un abonnement en période d'essai ou en
  // retard de paiement, qui reste tout aussi résiliable.
  const abos = await s.subscriptions.list({
    customer: foyer.stripeCustomerId,
    status: 'all',
    limit: 10,
  });
  const vivant = abos.data.find((a) =>
    ['active', 'trialing', 'past_due', 'unpaid'].includes(a.status),
  );
  if (!vivant) throw new ErreurValidation('Aucun abonnement en cours à résilier.');

  const session = await s.billingPortal.sessions.create({
    customer: foyer.stripeCustomerId,
    return_url: `${origin}/abonnement`,
    flow_data: {
      type: 'subscription_cancel',
      subscription_cancel: { subscription: vivant.id },
    },
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

/**
 * Périodicité souscrite, lue sur l'INTERVALLE du tarif.
 *
 * ⚠ Surtout pas par comparaison avec `STRIPE_PRICE_ID_ANNUEL` : une hausse de
 * prix ou une promotion crée un NOUVEL identifiant de tarif, et la comparaison
 * cesserait alors de reconnaître les annuels — sans rien casser de visible, mais
 * en éteignant l'avis de reconduction obligatoire. L'intervalle, lui, ne change
 * pas de nature.
 */
function periodicite(sub: Stripe.Subscription): string | null {
  const intervalle = sub.items?.data?.[0]?.price?.recurring?.interval;
  if (intervalle === 'year') return 'annuel';
  if (intervalle === 'month') return 'mensuel';
  return null;
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
    offre: periodicite(sub),
    // Résiliation demandée : Stripe laisse le statut `active` jusqu'au terme.
    // ⚠ DEUX représentations selon la version d'API : les versions récentes
    // posent `cancel_at` (horodatage d'arrêt) en laissant `cancel_at_period_end`
    // à `false`. Ne surveiller que ce dernier fait manquer toutes les
    // résiliations — constaté en conditions réelles.
    annulationProgrammee: !!(sub.cancel_at || sub.cancel_at_period_end),
  };
  const d = db();

  /*
   * On relit l'etat AVANT d'ecrire : c'est ce qui permet de n'envoyer l'e-mail
   * de resiliation qu'au moment ou l'annulation apparait.
   *
   * ⚠ Stripe reemet le meme evenement plusieurs fois (nouvelle tentative,
   * `customer.subscription.updated` a chaque changement mineur). Sans cette
   * comparaison, le client recevrait « ton abonnement est resilie » a repetition
   * — le genre de detail qui fait douter du serieux du service au pire moment.
   */
  const [avant] = foyerId
    ? await d.select().from(foyers).where(eq(foyers.id, foyerId)).limit(1)
    : await d.select().from(foyers).where(eq(foyers.stripeCustomerId, customerId)).limit(1);

  if (foyerId) await d.update(foyers).set(set).where(eq(foyers.id, foyerId));
  else await d.update(foyers).set(set).where(eq(foyers.stripeCustomerId, customerId));

  const vientDeResilier =
    !!avant && !avant.annulationProgrammee && set.annulationProgrammee;
  if (vientDeResilier) await prevenirResiliation(avant.id, fin);
}

/**
 * Previent le proprietaire du foyer qu'il a resilie : on lui demande pourquoi,
 * et on lui rappelle qu'il peut recuperer ses donnees.
 *
 * ⚠ Adresse au PROPRIETAIRE seul : c'est lui qui paie et qui a decide. Prevenir
 * tout le foyer annoncerait la nouvelle a des gens qui n'ont rien demande.
 *
 * N'echoue jamais : un e-mail qui ne part pas ne doit pas faire echouer le
 * traitement du webhook, sous peine de voir Stripe le rejouer indefiniment.
 */
async function prevenirResiliation(foyerId: string, finAcces: Date | null): Promise<void> {
  try {
    const [proprio] = await db()
      .select({ email: utilisateurs.email, nom: utilisateurs.nom })
      .from(membres)
      .innerJoin(utilisateurs, eq(utilisateurs.id, membres.utilisateurId))
      .where(and(eq(membres.foyerId, foyerId), eq(membres.role, 'proprietaire')))
      .limit(1);
    if (proprio) await envoyerResiliation(proprio.email, proprio.nom, finAcces);
  } catch (e) {
    console.error('[abonnement] e-mail de resiliation non envoye', e instanceof Error ? e.message : e);
  }
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
