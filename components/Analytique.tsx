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

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

/**
 * Nettoie l'URL d'un événement : supprime la query string et le fragment, et
 * masque les identifiants du chemin.
 *
 * ⚠ Renvoie une URL **absolue** : Vercel parse cette valeur, et un chemin relatif
 * fait échouer le traitement (l'événement est alors abandonné en silence).
 * En cas de doute on renvoie l'URL d'origine plutôt que de perdre la mesure.
 */
function anonymiserUrl(url: string): string {
  try {
    const u = new URL(url);
    u.search = '';
    u.hash = '';
    u.pathname = u.pathname.replace(UUID, ':id');
    return u.toString();
  } catch {
    return url;
  }
}

export default function Analytique() {
  return <Analytics beforeSend={(evenement) => ({ ...evenement, url: anonymiserUrl(evenement.url) })} />;
}
