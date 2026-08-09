export { auth as middleware } from '@/auth';

/**
 * Protège toutes les routes SAUF :
 *  - `/` exactement (le `$` en tête du lookahead) — c'est la VITRINE publique
 *    pour un visiteur non connecté, et le tableau de bord une fois connecté
 *    (l'arbitrage se fait dans `app/page.tsx`) ;
 *  - les routes Auth.js (/api/auth), le webhook Stripe (/api/stripe) et la tâche
 *    planifiée (/api/maintenance) — aucune session ne peut exister pour un appel
 *    déclenché par une machine ; ces trois routes portent leur propre garde-fou
 *    (signature Stripe, `CRON_SECRET`) ;
 *  - les pages publiques : /connexion, /conditions (CGV-CGU), /confidentialite,
 *    /mentions-legales, /aide, /hors-ligne ;
 *  - le service worker (/sw.js), les fichiers statiques Next et les assets
 *    publics (.png/.ico/.svg/.webmanifest).
 * Tout le reste exige une session : sinon Auth.js redirige vers /connexion.
 *
 * ⚠ Les pages légales DOIVENT rester accessibles sans compte : mentions légales,
 * conditions et confidentialité s'adressent d'abord à quelqu'un qui ne s'est pas
 * encore inscrit — et les obliger à se connecter pour les lire viderait
 * l'obligation d'information de son sens. Même raison pour la page d'aide :
 * celui qui n'arrive pas à se connecter est précisément celui qui a besoin
 * d'écrire.
 */
export const config = {
  matcher: ['/((?!$|api/auth|api/stripe|api/maintenance|connexion|conditions|confidentialite|mentions-legales|aide|hors-ligne|sw.js|_next/static|_next/image|.*\\.(?:png|ico|svg|webmanifest)).*)'],
};
