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
 * Variables d'environnement : AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
 * EMAILS_AUTORISES.
 */
const emailsAutorises = (process.env.EMAILS_AUTORISES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      authorization: { params: { scope: 'openid email profile' } },
    }),
  ],
  pages: { signIn: '/connexion' },
  callbacks: {
    /** N'autorise QUE les adresses de la liste blanche. Liste vide → tout refusé. */
    signIn({ profile }) {
      const email = String(profile?.email ?? '').toLowerCase();
      return emailsAutorises.length > 0 && emailsAutorises.includes(email);
    },

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
