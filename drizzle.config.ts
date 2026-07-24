import 'dotenv/config';
import type { Config } from 'drizzle-kit';

/**
 * Config de drizzle-kit (CLI de migration). Lit `DATABASE_URL` depuis `.env`
 * (via dotenv). Utilisée seulement par `npm run db:generate|migrate|studio`,
 * jamais par l'app au runtime.
 */
export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
