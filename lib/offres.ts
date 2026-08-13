/**
 * OFFRES COMMERCIALES — source unique des tarifs affichés.
 * =======================================================
 * Utilisé par la vitrine ET les conditions de vente : un seul endroit à changer
 * si le prix bouge. ⚠ Ces montants doivent rester alignés sur le prix réel
 * configuré dans Stripe (`STRIPE_PRICE_ID`) — ils ne le pilotent pas.
 */

/**
 * Durée de l'essai gratuit, en jours.
 *
 * ⚠ **30, et pas 14, à dessein** (13/08/2026). Le module Budget ne montre sa
 * valeur qu'après **une clôture de mois** : échéances tombées, soldes qui
 * bougent, dépenses par catégorie remplies. Un essai de 14 jours se terminait
 * avant que la personne ait vu la seule chose qui distingue vraiment Nestync de
 * ses concurrents. FamilyWall en offre 30.
 *
 * ⚠ **À ne pas confondre avec les 14 jours du droit de rétractation**, qui sont
 * fixés par la loi (art. L221-18 du code de la consommation) et n'ont rien à
 * voir avec cette durée commerciale. Les mentions de « 14 jours » dans
 * [app/conditions](../app/conditions/page.tsx), [lib/abonnement.ts] et le
 * dictionnaire i18n relèvent de ce droit : **ne pas les aligner sur celle-ci**.
 */
export const ESSAI_JOURS = 30;

/** Formule d'abonnement (sert aussi de clé pour le prix Stripe). */
export type IdOffre = 'mensuel' | 'annuel';

export type Offre = {
  id: IdOffre;
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
