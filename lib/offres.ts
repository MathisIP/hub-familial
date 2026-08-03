/**
 * OFFRES COMMERCIALES — source unique des tarifs affichés.
 * =======================================================
 * Utilisé par la vitrine ET les conditions de vente : un seul endroit à changer
 * si le prix bouge. ⚠ Ces montants doivent rester alignés sur le prix réel
 * configuré dans Stripe (`STRIPE_PRICE_ID`) — ils ne le pilotent pas.
 */

export const ESSAI_JOURS = 14;

export type Offre = {
  id: 'mensuel' | 'annuel';
  nom: string;
  prix: number; // € TTC par période
  periode: string;
  parMois: number; // prix ramené au mois, pour comparer
  economie?: string; // mis en avant sur l'annuel
};

export const OFFRES: Offre[] = [
  {
    id: 'mensuel',
    nom: 'Mensuel',
    prix: 4.99,
    periode: 'par mois',
    parMois: 4.99,
  },
  {
    id: 'annuel',
    nom: 'Annuel',
    prix: 47.9,
    periode: 'par an',
    parMois: 47.9 / 12,
    economie: '2 mois offerts',
  },
];

/** Ce que l'abonnement inclut — identique pour les deux formules. */
export const INCLUS: string[] = [
  'Les 7 modules, sans limite',
  'Tout le foyer inclus (invitations illimitées)',
  'Documents privés, 2 Go inclus',
  'Synchronisation instantanée entre appareils',
  'Application installable (iPhone, Android, ordinateur)',
  'Données hébergées dans l’Union européenne',
  'Export de vos données à tout moment',
  'Résiliation en ligne, en 3 clics',
];

export function formatPrix(n: number): string {
  return n.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' €';
}
