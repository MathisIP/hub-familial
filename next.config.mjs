/** @type {import('next').NextConfig} */
const nextConfig = {
  // `googleapis` reste côté serveur : les jetons OAuth des utilisateurs ne
  // doivent jamais approcher le bundle client. Tout l'accès Google passe par
  // lib/agenda/*, marqué server-only — une importation accidentelle depuis un
  // composant client devient une erreur de compilation, pas une fuite.
  serverExternalPackages: ['googleapis'],

  /**
   * ⚠ ANCIENNES ADRESSES DE L'APPLICATION → /foyer (25/08/2026).
   *
   * L'application vivait à la racine : `/budget`, `/todo`, `/agenda`… Elle est
   * passée sous `/foyer` pour ne plus partager d'espace d'adresses avec le site
   * vitrine. Ces redirections rattrapent tout ce qui pointe encore sur les
   * anciens chemins — favoris, historique de navigation, liens dans d'anciens
   * courriels de notification, et les raccourcis PWA déjà installés.
   *
   * ⚠ ELLES SONT PERMANENTES (308) : c'est un déménagement définitif, et le dire
   * aux navigateurs comme aux moteurs évite de traîner l'ancienne adresse
   * pendant des mois. Le corollaire, c'est qu'un 308 se met en cache
   * durablement — ne pas réutiliser ces chemins pour autre chose.
   *
   * ⚠ `/foyer` n'y figure pas : l'ancienne page de gestion des membres portait
   * ce nom, et elle est devenue `/foyer/membres`. Une redirection de `/foyer`
   * vers `/foyer/membres` enverrait tout le monde sur la gestion du foyer au
   * lieu du tableau de bord — exactement l'inverse de ce qu'on veut.
   */
  async redirects() {
    const modules = [
      'budget',
      'todo',
      'repas',
      'agenda',
      'evenements',
      'cadeaux',
      'documents',
      'parametres',
      'compte',
      'abonnement',
      'demarrage',
    ];
    return modules.flatMap((m) => [
      { source: `/${m}`, destination: `/foyer/${m}`, permanent: true },
      { source: `/${m}/:chemin*`, destination: `/foyer/${m}/:chemin*`, permanent: true },
    ]);
  },
};

export default nextConfig;
