import { config } from 'dotenv';
import type { Config } from 'drizzle-kit';

/**
 * Config de drizzle-kit (CLI de migration). Utilisée seulement par
 * `npm run db:generate|migrate|studio`, jamais par l'app au runtime.
 *
 * ⚠ `.env.local` est lu EN PRIORITÉ, comme le fait Next.js. Sans cela,
 * `npm run dev` travaillerait sur le bac à sable pendant que `npm run db:migrate`
 * modifierait le schéma de la PRODUCTION — le décalage le plus coûteux qu'on
 * puisse s'infliger, et le plus silencieux.
 */
config({ path: '.env.local' });
config({ path: '.env' }); // ne réécrit pas ce qui est déjà défini

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
