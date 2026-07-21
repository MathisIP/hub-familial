import 'next-auth';
import 'next-auth/jwt';

/** Champs ajoutés pour porter le jeton Google (accès Drive) — voir auth.ts. */
declare module 'next-auth' {
  interface Session {
    accessToken?: string;
    tokenError?: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    access_token?: string;
    refresh_token?: string;
    expires_at?: number;
    error?: string;
  }
}
