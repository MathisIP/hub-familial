# Facturation Stripe — abonnement par foyer

Chaque foyer paie un abonnement pour utiliser le Hub. L'accès est conditionné à
`foyers.statut_abonnement` / `abonnement_fin`.

> ⚠ **Tant que `STRIPE_SECRET_KEY` est absent, rien n'est verrouillé** (l'app
> fonctionne comme aujourd'hui). Le verrou s'active dès que les clés sont présentes.
> Commence en **mode TEST** : aucun paiement réel, cartes de test Stripe.

## 1. Créer le produit et le prix (dans Stripe, en mode Test)

1. Compte sur **https://stripe.com** → bascule en **Mode test** (interrupteur en haut).
2. **Catalogue de produits → Ajouter un produit** : nom « Hub familial », **prix
   récurrent** (ex. 4,99 €/mois). Enregistre.
3. Copie l'**ID du prix** (`price_…`) → variable `STRIPE_PRICE_ID`.
4. **Développeurs → Clés API** : copie la **clé secrète de test** (`sk_test_…`) →
   `STRIPE_SECRET_KEY`.

## 2. Configurer le webhook

Le webhook informe l'app des paiements/annulations. Deux cas :

**En local (développement)** — via la Stripe CLI :
```
stripe login
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```
La commande affiche un **secret de signature** (`whsec_…`) → `STRIPE_WEBHOOK_SECRET`.

**En production (Vercel)** — Stripe → **Développeurs → Webhooks → Ajouter** :
- URL : `https://<ton-domaine>/api/stripe/webhook`
- Événements : `checkout.session.completed`, `customer.subscription.created`,
  `customer.subscription.updated`, `customer.subscription.deleted`.
- Copie le **secret de signature** → `STRIPE_WEBHOOK_SECRET` (dans les variables Vercel).

## 3. Variables d'environnement

Dans `.env` (local) **et** dans Vercel :
```
STRIPE_SECRET_KEY=sk_test_…
STRIPE_PRICE_ID=price_…
STRIPE_WEBHOOK_SECRET=whsec_…
```

## 4. Tester

1. Ouvre **/abonnement** → « S'abonner » → tu es redirigé vers Stripe Checkout.
2. Carte de test : **4242 4242 4242 4242**, date future, CVC quelconque.
3. Après paiement, Stripe appelle le webhook → `foyers.statut_abonnement = actif`.
4. « Gérer mon abonnement » ouvre le **portail Stripe** (changer de carte, annuler).

## Comment marche l'accès

- **Essai** : à sa création, un foyer a 14 jours d'essai (`abonnement_fin`). Les
  foyers créés AVANT cette logique (dont le tien) ont un essai « ouvert » (accès
  tant que le statut reste `essai`) — abonne-toi quand tu veux, tu n'es pas bloqué.
- `exigerAcces()` (en tête de l'accueil et des modules) redirige vers **/abonnement**
  si l'accès n'est pas autorisé. `/abonnement`, `/compte`, `/confidentialite`
  restent toujours accessibles.
- Webhook = source de vérité : il met à jour le statut à chaque événement Stripe.

## Passer en production (paiements réels)

Rebascule Stripe en **Mode production**, recrée le produit/prix, prends les clés
**live** (`sk_live_…`, `price_…` live, webhook live) et mets-les dans Vercel.
Prérequis légaux : structure déclarée + CGV + politique de confidentialité complétée.
