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
/**
 * ⚠ `override: true` EST INDISPENSABLE, et son absence a déjà coûté cher.
 *
 * drizzle-kit charge `.env` LUI-MÊME avant d'évaluer ce fichier. `DATABASE_URL`
 * est donc déjà défini — sur la PRODUCTION — quand on arrive ici, et `dotenv`
 * ne réécrit pas une variable existante par défaut. Résultat observé le
 * 15/08/2026 : `npm run db:migrate` a migré la production alors que `.env.local`
 * pointait sur la base locale, sans le moindre avertissement.
 *
 * Le journal de dotenv le disait pourtant : « injected env (0) from .env »,
 * c'est-à-dire « rien de nouveau », donc `.env` avait déjà été lu.
 */
config({ path: '.env.local', override: true });

export default {
  schema: './lib/db/schema.ts',
  out: './lib/db/migrations',
  dialect: 'postgresql',
  dbCredentials: { url: process.env.DATABASE_URL ?? '' },
} satisfies Config;
