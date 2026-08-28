import type { ReactNode } from 'react';

/**
 * QUESTIONS FRÉQUENTES — source unique, partagée par trois pages.
 *
 * ⚠ **EXTRAIT DE `SiteVitrine.tsx` LE 28/08/2026.** La liste vivait dans un
 * composant client de l'accueil : la page `/questions`, rendue côté serveur, ne
 * pouvait pas la lire. La recopier aurait créé deux vérités — et une réponse
 * corrigée d'un seul côté est pire qu'une réponse absente, parce que rien ne
 * signale la divergence.
 *
 * ⚠ Ces réponses sont des **engagements commerciaux**. « Résiliation en trois
 * clics », « aucun accès bancaire », « données en Europe » se retrouvent dans
 * les conditions générales : les modifier ici impose de vérifier là-bas.
 */

export type Question = { q: string; r: ReactNode };

const BRUT: [string, string][] = [
  ["Faut-il une carte bancaire pour l'essai ?", 'Non. Les 30 jours démarrent sans moyen de paiement, et rien ne se déclenche à la fin de l’essai si vous ne faites rien.'],
  ['Les autres membres du foyer doivent-ils payer ?', 'Non. Un seul abonnement couvre tout le foyer : la personne qui paie invite les autres, qui accèdent à tous les modules gratuitement.'],
  ['Nestync se connecte-t-il à ma banque ?', 'Jamais. Aucun identifiant bancaire n’est demandé et aucune agrégation de comptes n’est proposée. Vous saisissez ce que vous voulez suivre.'],
  ['Comment se passe la résiliation ?', 'En trois clics dans les réglages, sans e-mail à envoyer ni justification à donner. L’accès continue jusqu’à la fin de la période payée.'],
  ['Où sont hébergées mes données ?', 'En Europe, sous régime RGPD, sans transfert hors UE. L’export complet et la suppression définitive sont accessibles dans les réglages.'],
  ['La liste de courses se remplit-elle vraiment toute seule ?', 'Oui. On place des recettes dans le planning, on indique le nombre de convives, et les ingrédients arrivent dans la liste rangés par rayon, quantités ajustées et doublons additionnés.'],
  ["Peut-on l'utiliser à deux sans enfants ?", 'Oui. Le foyer peut compter deux personnes comme cinq. Les modules qui ne vous servent pas se rangent hors de l’accueil.'],
  /*
   * ⚠ CETTE RÉPONSE ÉTAIT UN TEXTE DE CHANTIER, EN PRODUCTION, jusqu'au
   * 28/08/2026 : « Emplacement à compléter : préciser iOS, Android… ». Sur une
   * page qui doit convaincre, un aveu de brouillon coûte plus cher qu'une
   * fonction manquante.
   *
   * ⚠ Elle dit la vérité SANS S'EXCUSER. Nestync n'est pas sur les magasins, et
   * c'est une absence réelle — mais l'installation depuis le navigateur a de
   * vrais avantages, qu'il serait absurde de taire pour présenter la situation
   * comme un manque. Ne pas transformer cette réponse en promesse datée : le
   * lancement sur les stores dépend d'un seuil de clients, pas d'un calendrier.
   */
  [
    'Sur quels appareils fonctionne l’application ?',
    'Sur iPhone, iPad, Android, Mac et PC — Nestync s’installe directement depuis votre navigateur, en deux gestes, et s’ouvre ensuite comme n’importe quelle application, avec son icône sur l’écran d’accueil. Il n’y a rien à télécharger sur l’App Store ou le Play Store : vous n’attendez aucune validation de mise à jour, et vous n’accordez aucune autorisation à un magasin d’applications. Des versions publiées sur ces magasins viendront ; elles sont annoncées sur la page des mises à jour.',
  ],
];
/** Les questions de l'accueil et de la page `/questions`. */
export const QUESTIONS_SITE: Question[] = BRUT.map(([q, r]) => ({ q, r }));
