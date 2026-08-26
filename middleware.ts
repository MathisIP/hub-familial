export { auth as middleware } from '@/auth';

/**
 * Protège toutes les routes SAUF :
 *  - `/` exactement (le `$` en tête du lookahead) — la VITRINE publique.
 *    ⚠ Depuis le 25/08/2026 elle ne sert QUE la vitrine : l'application a
 *    déménagé sous `/foyer`, protégé comme le reste. `app/page.tsx` se contente
 *    de rediriger un membre connecté vers `/foyer`. Avant ce déplacement, la
 *    même URL servait un prospect ou un membre selon la session — ce qui
 *    obligeait la page à deviner son rôle à chaque visite ;
 *  - les routes Auth.js (/api/auth), le webhook Stripe (/api/stripe) et la tâche
 *    planifiée (/api/maintenance) — aucune session ne peut exister pour un appel
 *    déclenché par une machine ; ces trois routes portent leur propre garde-fou
 *    (signature Stripe, `CRON_SECRET`) ;
 *  - les pages publiques : /connexion, /conditions (CGV-CGU), /confidentialite,
 *    /mentions-legales, /aide, /hors-ligne ;
 *  - le service worker (/sw.js), les fichiers statiques Next et les assets
 *    publics (.png/.ico/.svg/.webmanifest) ;
 *  - `/robots.txt` et `/sitemap.xml`. ⚠ Sans cette exclusion, un robot qui
 *    demande les règles du site reçoit une REDIRECTION VERS LA PAGE DE
 *    CONNEXION — il n'a alors aucun moyen d'interpréter le site. Pinterest
 *    demande `robots.txt` avant de crawler, donc avant de pouvoir valider la
 *    revendication du domaine ; Google fait de même avant toute indexation.
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
  /*
   * ⚠ CETTE LISTE D'EXTENSIONS EST UN PIÈGE SILENCIEUX. Tout ce qui n'y figure
   * pas passe par l'authentification : un visiteur non connecté reçoit une
   * redirection vers /connexion à la place du fichier. Pour une image ça se
   * voit — icône cassée et texte alternatif ; pour une police ou un manifeste,
   * ça casse sans rien afficher.
   *
   * ⚠ CONSTATÉ LE 26/08/2026 : les captures du carrousel sont passées de PNG à
   * WebP pour alléger la page (8,9 Mo → 772 Ko) et se sont mises à renvoyer du
   * HTML. Le format n'était pas dans la liste. Rien ne l'avait signalé — ni le
   * build, ni les types, ni le lint : la page compilait parfaitement, seul le
   * navigateur d'un visiteur NON CONNECTÉ voyait le problème, et on est
   * toujours connecté quand on teste.
   *
   * En ajoutant un type d'actif servi depuis `public/`, l'ajouter ICI aussi.
   */
  matcher: ['/((?!$|api/auth|api/stripe|api/maintenance|connexion|conditions|confidentialite|mentions-legales|aide|hors-ligne|robots.txt|sitemap.xml|sw.js|_next/static|_next/image|.*\\.(?:png|jpe?g|webp|avif|ico|svg|webmanifest)).*)'],
};
