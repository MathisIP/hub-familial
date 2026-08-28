import type { MetadataRoute } from 'next';
import { urlSite } from '@/lib/config';

/**
 * `/sitemap.xml` — les pages publiques, et elles seules.
 *
 * ⚠ N'Y METTRE QUE CE QUI EST RÉELLEMENT ACCESSIBLE SANS COMPTE. Déclarer une
 * route protégée reviendrait à envoyer les moteurs sur une redirection vers la
 * page de connexion : ils la classent en erreur, et la confiance accordée au
 * fichier baisse pour tout le reste. La liste ci-dessous est exactement celle
 * des exclusions du middleware, moins `/connexion` et `/hors-ligne` — qui sont
 * publiques mais n'ont aucun intérêt dans un index.
 *
 * ⚠ À TENIR À JOUR AVEC LE MIDDLEWARE. Les deux listes disent la même chose de
 * deux façons ; quand l'une bouge sans l'autre, le sitemap ment.
 */
export default function sitemap(): MetadataRoute.Sitemap {
  let base: string;
  try {
    base = urlSite();
  } catch {
    // Sans SITE_URL (développement), un sitemap d'URL relatives serait invalide :
    // mieux vaut un fichier vide qu'un fichier faux.
    return [];
  }

  const maj = new Date();
  return [
    { url: `${base}/`, lastModified: maj, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/decouvrir`, lastModified: maj, changeFrequency: 'monthly', priority: 0.7 },
    // Page d'essai sans compte : forte intention, on la met haut.
    { url: `${base}/demonstration`, lastModified: maj, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${base}/tarifs`, lastModified: maj, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${base}/questions`, lastModified: maj, changeFrequency: 'monthly', priority: 0.6 },
    { url: `${base}/aide`, lastModified: maj, changeFrequency: 'monthly', priority: 0.5 },
    // ⚠ `weekly` : c'est la page qui bouge le plus souvent du site public.
    { url: `${base}/mises-a-jour`, lastModified: maj, changeFrequency: 'weekly', priority: 0.4 },
    { url: `${base}/conditions`, lastModified: maj, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/confidentialite`, lastModified: maj, changeFrequency: 'yearly', priority: 0.3 },
    { url: `${base}/mentions-legales`, lastModified: maj, changeFrequency: 'yearly', priority: 0.3 },
  ];
}
