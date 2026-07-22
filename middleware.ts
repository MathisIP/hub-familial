export { auth as middleware } from '@/auth';

/**
 * Protège toutes les routes SAUF : les routes Auth.js (/api/auth), la page de
 * connexion (/connexion), la page de repli hors ligne (/hors-ligne), le service
 * worker (/sw.js), les fichiers statiques Next, et les assets publics
 * (.png/.ico/.webmanifest — icônes, favicon, manifest). Tout le reste exige une
 * session : sinon Auth.js redirige vers /connexion.
 */
export const config = {
  matcher: ['/((?!api/auth|connexion|hors-ligne|sw.js|_next/static|_next/image|.*\\.(?:png|ico|webmanifest)).*)'],
};
