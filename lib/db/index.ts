import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Client Postgres (Drizzle) — créé PARESSEUSEMENT à la première requête.
 * Tant que `DATABASE_URL` est absent, on ne se connecte à rien : les modules
 * encore adossés à Google Sheets continuent de fonctionner normalement pendant
 * la migration progressive vers la base. `server-only` : jamais côté navigateur.
 */

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

/** True si une base est configurée (permet de dégrader proprement sans DB). */
export function baseDisponible(): boolean {
  return !!process.env.DATABASE_URL;
}

/** Client Drizzle partagé. Lève une erreur claire si la base n'est pas configurée. */
export function db(): DB {
  if (_db) return _db;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'DATABASE_URL manquant : la base multi-foyer n’est pas encore configurée (voir MIGRATION_SAAS.md).',
    );
  }
  // `prepare: false` : compatible avec les poolers en mode transaction (Neon/Supabase).
  const client = postgres(url, { prepare: false });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
