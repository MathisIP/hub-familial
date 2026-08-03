export { auth as middleware } from '@/auth';

/**
 * Protège toutes les routes SAUF :
 *  - `/` exactement (le `$` en tête du lookahead) — c'est la VITRINE publique
 *    pour un visiteur non connecté, et le tableau de bord une fois connecté
 *    (l'arbitrage se fait dans `app/page.tsx`) ;
 *  - les routes Auth.js (/api/auth) et le webhook Stripe (/api/stripe) ;
 *  - les pages publiques : /connexion, /conditions (CGV-CGU), /confidentialite,
 *    /hors-ligne ;
 *  - le service worker (/sw.js), les fichiers statiques Next et les assets
 *    publics (.png/.ico/.svg/.webmanifest).
 * Tout le reste exige une session : sinon Auth.js redirige vers /connexion.
 */
export const config = {
  matcher: ['/((?!$|api/auth|api/stripe|connexion|conditions|confidentialite|hors-ligne|sw.js|_next/static|_next/image|.*\\.(?:png|ico|svg|webmanifest)).*)'],
};
