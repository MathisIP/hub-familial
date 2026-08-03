'use client';

import { Analytics } from '@vercel/analytics/next';

/**
 * Mesure d'audience (Vercel Web Analytics) — îlot CLIENT.
 * =====================================================
 * ⚠ Pourquoi ce composant existe : `<Analytics>` accepte une fonction
 * `beforeSend`, et une fonction ne peut PAS être passée depuis un composant
 * serveur (le layout) — Next refuse les props non sérialisables. On l'encapsule
 * donc ici, dans un composant client.
 *
 * Confidentialité : Vercel Web Analytics ne dépose **aucun cookie** et ne suit
 * pas les visiteurs d'un site à l'autre ; il agrège des pages vues. On va plus
 * loin en **nettoyant les URL** avant envoi :
 *   · les paramètres de requête sont retirés (un lien d'invitation contient un
 *     jeton dans l'URL : il ne doit jamais sortir de l'app) ;
 *   · les identifiants (UUID) présents dans un chemin sont masqués.
 */

/** Remplace les UUID d'un chemin par « : id » et supprime la query string. */
function anonymiserChemin(url: string): string {
  try {
    const u = new URL(url, 'https://nestync.app');
    const chemin = u.pathname.replace(
      /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi,
      ':id',
    );
    return chemin; // query string volontairement abandonnée
  } catch {
    return '/';
  }
}

export default function Analytique() {
  return (
    <Analytics
      beforeSend={(evenement) => ({ ...evenement, url: anonymiserChemin(evenement.url) })}
    />
  );
}
