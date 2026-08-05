import 'server-only';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

/**
 * Client Postgres (Drizzle) — créé PARESSEUSEMENT à la première requête.
 * `DATABASE_URL` est REQUIS : c'est la source de vérité de tous les modules.
 * S'il est absent, on ne se connecte à rien et les pages dégradent proprement
 * (message de config) au lieu de planter. `server-only` : jamais côté navigateur.
 */

type DB = ReturnType<typeof drizzle<typeof schema>>;

let _db: DB | null = null;

/** True si une base est configurée (permet de dégrader proprement sans DB). */
export function baseDisponible(): boolean {
  return !!process.env.DATABASE_URL;
}

/**
 * Bascule vers l'endpoint **poolé** de Neon (PgBouncer) si l'URL pointe encore
 * sur l'endpoint direct.
 *
 * Pourquoi ça compte en serverless : chaque démarrage à froid d'une fonction
 * ouvre une nouvelle connexion, donc une poignée de main TCP + TLS complète
 * (~3 allers-retours) AVANT la première requête. Le pooler garde les connexions
 * ouvertes côté Neon et supprime ce coût. Il évite aussi d'épuiser la limite de
 * connexions quand Vercel démarre beaucoup d'instances en parallèle.
 *
 * Convention Neon : l'hôte poolé est l'hôte direct avec `-pooler` collé à
 * l'identifiant d'endpoint (`ep-xxx` → `ep-xxx-pooler`). On ne touche QUE les
 * hôtes `*.neon.tech` — une autre base passe telle quelle. `prepare: false`
 * ci-dessous est ce que le mode transaction de PgBouncer exige.
 */
function urlPoolee(brut: string): string {
  try {
    const u = new URL(brut);
    if (!u.hostname.endsWith('.neon.tech') || u.hostname.includes('-pooler')) return brut;
    const [endpoint, ...reste] = u.hostname.split('.');
    u.hostname = [`${endpoint}-pooler`, ...reste].join('.');
    return u.toString();
  } catch {
    return brut; // URL exotique : on ne bricole pas, on laisse passer.
  }
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
  const client = postgres(urlPoolee(url), {
    // Compatible avec les poolers en mode transaction (Neon/Supabase).
    prepare: false,
    // Réglages serverless : une instance Vercel sert peu de requêtes à la fois,
    // inutile d'y ouvrir 10 connexions. On libère vite pour ne pas immobiliser
    // des connexions Neon pendant qu'une instance dort avant d'être recyclée.
    max: 3,
    idle_timeout: 20,
    // Échouer vite et clairement plutôt que faire poireauter la page.
    connect_timeout: 10,
  });
  _db = drizzle(client, { schema });
  return _db;
}

export { schema };
