import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Authentification d'ACCÈS à l'app (qui peut ouvrir le hub) — distincte du compte
 * de service qui lit/écrit les données Google. Connexion Google, restreinte à une
 * liste blanche d'adresses (`EMAILS_AUTORISES`, séparées par des virgules).
 *
 * Variables d'environnement attendues :
 *   AUTH_SECRET          — secret de signature des sessions (obligatoire)
 *   AUTH_GOOGLE_ID       — client OAuth Google (Web application)
 *   AUTH_GOOGLE_SECRET   — secret du client OAuth
 *   EMAILS_AUTORISES     — ex. « lou@gmail.com,mati@gmail.com »
 */
const emailsAutorises = (process.env.EMAILS_AUTORISES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true, // nécessaire derrière le proxy d'hébergement (Vercel)
  providers: [Google],
  pages: { signIn: '/connexion' },
  callbacks: {
    /** N'autorise QUE les adresses de la liste blanche. Liste vide → tout refusé. */
    signIn({ profile }) {
      const email = String(profile?.email ?? '').toLowerCase();
      return emailsAutorises.length > 0 && emailsAutorises.includes(email);
    },
    /**
     * Contrôle d'accès du middleware : connecté = autorisé.
     * Échappatoire de DÉVELOPPEMENT : tant que l'OAuth n'est pas configuré ET
     * qu'on n'est pas en production, on laisse passer (pour ne pas se bloquer sur
     * localhost avant d'avoir créé le client OAuth). En production, TOUJOURS protégé.
     */
    authorized({ auth }) {
      const devSansOAuth = process.env.NODE_ENV !== 'production' && !process.env.AUTH_GOOGLE_ID;
      if (devSansOAuth) return true;
      return !!auth?.user;
    },
  },
});
