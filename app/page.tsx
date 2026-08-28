import { redirect } from 'next/navigation';
import SiteVitrine from '@/components/vitrine-ds/SiteVitrine';
import { classesPolices } from '@/lib/polices-site';
import { auth } from '@/auth';
import './vitrine-ds.css';

/**
 * `/` — LE SITE VITRINE, et rien d'autre.
 *
 * ⚠ L'APPLICATION A DÉMÉNAGÉ SUR `/foyer` (25/08/2026). Les deux se
 * partageaient cette adresse : la page devait deviner, à chaque visite, si elle
 * servait un prospect ou un membre. Ce mélange rendait tout ambigu — le
 * `start_url` de la PWA, l'indexation, la charte graphique à appliquer, et
 * jusqu'aux règles du middleware.
 *
 * ⚠ UN MEMBRE CONNECTÉ EST REDIRIGÉ VERS `/foyer`, il ne voit pas la vitrine.
 * Ce n'est pas seulement un confort : c'est ce qui rattrape les installations
 * PWA existantes, dont le `start_url` pointe encore sur `/`.
 *
 * ⚠ LE NOUVEAU SITE EST SERVI ICI DEPUIS LE 26/08/2026. Il a vécu deux jours
 * sur `/apercu-site`, le temps d'être validé — mais la bascule avait été
 * oubliée au moment du déploiement : la production servait encore l'ancienne
 * vitrine, sur mobile comme sur bureau.
 *
 * ⚠ L'ANCIENNE VITRINE A ÉTÉ SUPPRIMÉE LE 28/08/2026 (`components/vitrine/`).
 * Elle n'était plus servie depuis le 26/08 mais restait dans le dépôt, avec son
 * propre bas de page et ses propres textes : toute recherche dans le code en
 * renvoyait deux versions, et il fallait à chaque fois se demander laquelle
 * comptait. L'oubli est arrivé — une analyse du bas de page a démarré sur le
 * mauvais fichier. `git log` la conserve si besoin.
 *
 * ⚠ LES POLICES SONT POSÉES ICI. `SiteVitrine` est un composant client :
 * `next/font` ne peut pas y être appelé. Sans ce pont, le site s'afficherait
 * dans les polices de l'application au lieu de Fraunces / Instrument Sans /
 * IBM Plex Mono.
 *
 * Route PUBLIQUE (cf. middleware) : le robot de Pinterest et les moteurs
 * arrivent déconnectés et voient donc bien la vitrine.
 */
export const dynamic = 'force-dynamic';

export default async function Accueil() {
  const session = await auth();
  if (session?.user) redirect('/foyer');

  return (
    <div
      className={classesPolices}
      style={
        {
          // Le pont entre les variables de next/font et les noms attendus par
          // le système de design, qui ne connaît que --font-display/corps/donnees.
          '--font-display': 'var(--font-display-site), Georgia, serif',
          '--font-corps': 'var(--font-corps-site), system-ui, sans-serif',
          '--font-donnees': 'var(--font-donnees-site), ui-monospace, monospace',
          '--wonk': "'SOFT' 20, 'WONK' 1, 'opsz' 96",
        } as React.CSSProperties
      }
    >
      <SiteVitrine />
    </div>
  );
}
