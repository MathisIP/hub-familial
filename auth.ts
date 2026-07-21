import NextAuth from 'next-auth';
import Google from 'next-auth/providers/google';

/**
 * Authentification d'ACCÈS à l'app (qui peut ouvrir le hub) — distincte du compte
 * de service qui lit/écrit les données Google. Connexion Google, restreinte à une
 * liste blanche d'adresses (`EMAILS_AUTORISES`, séparées par des virgules).
 *
 * On demande AUSSI le périmètre Drive : le jeton d'accès obtenu à la connexion
 * sert à téléverser des documents « au nom de l'utilisateur » (module Import
 * Drive) — ce que le compte de service ne peut pas faire dans un Drive personnel.
 * `access_type: offline` + `prompt: consent` → un refresh_token est délivré, ce
 * qui permet de renouveler le jeton après expiration (≈ 1 h).
 *
 * Variables d'environnement : AUTH_SECRET, AUTH_GOOGLE_ID, AUTH_GOOGLE_SECRET,
 * EMAILS_AUTORISES.
 */
const emailsAutorises = (process.env.EMAILS_AUTORISES ?? '')
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

const SCOPE_DRIVE = 'https://www.googleapis.com/auth/drive';

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  providers: [
    Google({
      authorization: {
        params: {
          scope: `openid email profile ${SCOPE_DRIVE}`,
          access_type: 'offline',
          prompt: 'consent',
        },
      },
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

    /** Conserve le jeton Drive dans le JWT ; le renouvelle quand il expire. */
    async jwt({ token, account }) {
      if (account) {
        // Première connexion : on capte les jetons Google.
        token.access_token = account.access_token;
        token.refresh_token = account.refresh_token;
        token.expires_at = account.expires_at; // secondes epoch
        return token;
      }
      const expiresAt = typeof token.expires_at === 'number' ? token.expires_at : 0;
      if (Date.now() < expiresAt * 1000 - 60_000) {
        return token; // encore valide (marge d'1 min)
      }
      // Expiré → tentative de renouvellement via le refresh_token.
      if (!token.refresh_token) {
        token.error = 'NoRefreshToken';
        return token;
      }
      try {
        const rep = await fetch('https://oauth2.googleapis.com/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            client_id: process.env.AUTH_GOOGLE_ID ?? '',
            client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
            grant_type: 'refresh_token',
            refresh_token: String(token.refresh_token),
          }),
        });
        const data = await rep.json();
        if (!rep.ok) throw data;
        token.access_token = data.access_token;
        token.expires_at = Math.floor(Date.now() / 1000) + Number(data.expires_in ?? 3600);
        if (data.refresh_token) token.refresh_token = data.refresh_token;
        token.error = undefined;
      } catch {
        token.error = 'RefreshFailed';
      }
      return token;
    },

    /** Expose le jeton d'accès à `auth()` (lu SERVEUR uniquement, pour l'upload). */
    session({ session, token }) {
      session.accessToken = token.access_token as string | undefined;
      session.tokenError = token.error as string | undefined;
      return session;
    },
  },
});
