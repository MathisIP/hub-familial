import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Authentification d'ACCÈS à l'app (qui peut ouvrir Nestync) — distincte du compte
 * de service qui lit/écrit l'Agenda Google. Connexion Google, restreinte à une
 * liste blanche d'adresses (`EMAILS_AUTORISES`, séparées par des virgules).
 *
 * ⚠ Périmètre volontairement MINIMAL : `openid email profile` — l'identité, rien
 * d'autre. Aucun scope « restreint » (l'ancien accès Google Drive a été remplacé
 * par le module Documents, stockage propre), ce qui évite l'audit de sécurité
 * annuel exigé par Google pour ce type de périmètre. Ne pas réintroduire de
 * scope Drive/Gmail sans mesurer cette conséquence.
 *
 * ⚠ **La connexion est OUVERTE À TOUS** (plus de liste blanche ici). C'est
 * nécessaire : pour être invité dans un foyer ou demander à en rejoindre un, il
 * faut d'abord pouvoir se connecter — l'ancienne liste blanche créait un blocage
 * circulaire. Se connecter ne donne accès à RIEN par soi-même : le contrôle
 * porte désormais sur la **création d'un foyer** ([lib/acces.ts](lib/acces.ts))
 * et sur l'**abonnement** ([lib/abonnement.ts](lib/abonnement.ts)).
 *
 * ⚠ Ce fichier est chargé par le middleware (runtime **edge**) : il ne doit
 * JAMAIS importer la base de données ni `lib/acces.ts`.
 *
 * Variables d'environnement : AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET.
 */
export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      authorization: { params: { scope: 'openid email profile' } },
    }),
  ],
  pages: { signIn: '/connexion' },
  callbacks: {
    /**
     * Contrôle d'accès du middleware. Échappatoire DEV : tant que l'OAuth n'est pas
     * configuré ET qu'on n'est pas en production, on laisse passer (localhost).
     * En production, TOUJOURS protégé.
     */
    authorized({ auth }) {
      const devSansOAuth = process.env.NODE_ENV !== 'production' && !process.env.AUTH_GOOGLE_ID;
      if (devSansOAuth) return true;
      return !!auth?.user;
    },
  },
});
