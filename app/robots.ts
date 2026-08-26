import type { MetadataRoute } from 'next';
import { urlSite } from '@/lib/config';

/**
 * `/robots.txt` — ce que les robots ont le droit de parcourir.
 *
 * ⚠ POURQUOI CE FICHIER EXISTE MAINTENANT (25/08/2026). Il n'y en avait aucun,
 * et le middleware d'authentification interceptait `/robots.txt` pour le
 * **rediriger vers la page de connexion**. Un robot qui demande le fichier des
 * règles et reçoit une redirection vers un formulaire de connexion n'a aucun
 * moyen d'interpréter le site — et Pinterest le demande avant de crawler, donc
 * avant de pouvoir valider la revendication du domaine. Le middleware l'exclut
 * désormais explicitement.
 *
 * ⚠ SEULE LA VITRINE S'INDEXE. Les routes de l'application sont interdites :
 * elles n'ont aucun intérêt pour un moteur (elles redirigent toutes vers la
 * connexion) et les voir apparaître dans des résultats de recherche donnerait
 * l'impression qu'un contenu de foyer peut fuir. `/apercu-site` est interdite
 * pour la même raison, plus une autre : c'est une maquette de travail.
 *
 * ⚠ L'interdiction n'est PAS une protection. Elle relève de la politesse entre
 * serveurs et personne n'est obligé de la respecter. Ce qui protège réellement
 * ces routes, c'est le middleware — `robots.txt` évite seulement d'encombrer
 * les index de pages inutiles.
 */
export default function robots(): MetadataRoute.Robots {
  // ⚠ `urlSite()` lève si SITE_URL manque — le cas en développement. Un
  // robots.txt sans ligne `Sitemap` reste parfaitement valide ; faire tomber la
  // route pour ça serait pire que l'omission.
  let base: string | undefined;
  try {
    base = urlSite();
  } catch {
    base = undefined;
  }

  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        // ⚠ Un seul préfixe suffit désormais : toute l'application vit sous
        // /foyer. C'est le bénéfice le plus concret du déplacement — avant, il
        // fallait énumérer onze routes et penser à compléter la liste à chaque
        // nouveau module.
        '/foyer',
        '/bienvenue',
        '/rejoindre',
        '/rejoindre-foyer',
        '/comptes',
        '/apercu-site',
        '/api/',
      ],
    },
    ...(base ? { sitemap: `${base}/sitemap.xml` } : {}),
  };
}
