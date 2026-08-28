import SiteVitrine from '@/components/vitrine-ds/SiteVitrine';

/**
 * Aperçu du site vitrine refondu (système de design Claude Design, 25/08/2026).
 *
 * ⚠ N'APPELLE NI `exigerAcces()` NI `foyerCourant()`. C'est une page de
 * maquette : elle ne lit aucune donnée de foyer, donc rien ne justifierait de
 * la fermer derrière un abonnement — et la regarder ne doit pas dépendre de
 * l'état de facturation. L'authentification du middleware suffit à la garder
 * privée.
 *
 * ⚠ OBSOLETE depuis le 26/08/2026 : `SiteVitrine` est servi par `/` et
 * l'ancienne vitrine a été supprimée le 28/08. Cette page fait doublon avec
 * l'accueil ; la retirer quand plus rien ne pointe dessus.
 * Le site autrefois en ligne était `components/vitrine/Vitrine.tsx`, servi
 * par `app/page.tsx` aux visiteurs non connectés. Rien n'est remplacé tant que
 * cet aperçu n'est pas validé.
 */
export const metadata = { title: 'Aperçu — nouveau site Nestync' };

export default function PageApercuSite() {
  return <SiteVitrine />;
}
