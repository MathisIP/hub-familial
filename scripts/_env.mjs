/**
 * Socle commun aux scripts : chargement de l'environnement et garde-fou de base.
 *
 * ⚠ PRIORITÉ `.env.local` PUIS `.env` — c'est la convention de Next.js, et il
 * faut que les scripts la suivent, sinon `npm run dev` travaillerait sur la base
 * de développement pendant que `npm run demo` écrirait en production. Deux
 * fichiers, deux comportements : le piège serait invisible et coûteux.
 */
import { readFileSync, existsSync } from 'node:fs';
import postgres from 'postgres';

/** Charge `.env.local` (prioritaire) puis `.env`, sans écraser l'existant. */
export function chargerEnv() {
  for (const fichier of ['.env.local', '.env']) {
    if (!existsSync(fichier)) continue;
    for (const ligne of readFileSync(fichier, 'utf8').split(/\r?\n/)) {
      const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
      if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

/** Client Postgres sur `DATABASE_URL`, en basculant sur l'endpoint poolé de Neon. */
export function connexion({ max = 3 } = {}) {
  chargerEnv();
  const brut = process.env.DATABASE_URL;
  if (!brut) {
    console.error('DATABASE_URL absent (.env.local puis .env).');
    process.exit(1);
  }
  const u = new URL(brut);
  if (u.hostname.endsWith('.neon.tech') && !u.hostname.includes('-pooler')) {
    const [ep, ...reste] = u.hostname.split('.');
    u.hostname = [`${ep}-pooler`, ...reste].join('.');
  }
  return { sql: postgres(u.toString(), { prepare: false, max }), hote: u.hostname };
}

/**
 * Client Postgres sur la base de PRODUCTION.
 *
 * ⚠ LIT `.env` ET SEULEMENT `.env`, en ignorant `.env.local`. C'est la
 * convention déjà posée par `scripts/migrer-prod.mjs` : `.env` porte la
 * production, `.env.local` le bac à sable et l'emporte partout ailleurs.
 *
 * ⚠ NE PAS croire qu'il suffit de poser `DATABASE_URL` dans le terminal. Selon
 * l'outil, `.env.local` est chargé avec `override: true` et écrase la variable —
 * on croirait viser la production tout en travaillant sur le bac à sable, ce qui
 * est exactement l'erreur que tout ce dispositif cherche à rendre impossible.
 *
 * Le nom du fichier est le seul endroit où la distinction est stable.
 */
export function connexionProduction({ max = 1 } = {}) {
  if (!existsSync('.env')) {
    console.error('.env introuvable : impossible de viser la production.');
    process.exit(1);
  }
  let url;
  for (const ligne of readFileSync(".env", "utf8").split(new RegExp("\r?\n"))) {
    const m = ligne.match(/^DATABASE_URL=(.*)$/);
    if (m) url = m[1].replace(/^["']|["']$/g, '');
  }
  if (!url) {
    console.error('DATABASE_URL absent de .env.');
    process.exit(1);
  }
  const u = new URL(url);
  if (u.hostname.endsWith('.neon.tech') && !u.hostname.includes('-pooler')) {
    const [ep, ...reste] = u.hostname.split('.');
    u.hostname = [`${ep}-pooler`, ...reste].join('.');
  }
  return { sql: postgres(u.toString(), { prepare: false, max }), hote: u.hostname };
}

/**
 * Refuse d'aller plus loin si la base n'est pas un bac à sable.
 *
 * ⚠ LE GARDE-FOU CENTRAL. Tout script qui écrit des données fictives passe par
 * ici. Le test ne porte pas sur l'URL — une chaîne de connexion se recopie de
 * travers, et c'est précisément l'erreur qu'on veut rendre impossible — mais sur
 * une LIGNE présente dans la base elle-même, posée par un geste explicite
 * (`npm run bac:init`). La production ne l'a pas.
 */
export async function exigerBacASable(sql, hote) {
  const [{ existe }] = await sql`
    select count(*)::int as existe from information_schema.tables
    where table_name = 'bac_a_sable'`;
  const marque = existe
    ? (await sql`select count(*)::int as n from bac_a_sable`)[0].n > 0
    : false;

  if (!marque) {
    console.error(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║  ARRÊT — cette base n'est PAS un bac à sable.                    ║
  ╚══════════════════════════════════════════════════════════════════╝

  Base visée : ${hote}

  Ce script écrit des données fictives. Il refuse de s'exécuter tant que
  la base ne porte pas le marqueur de bac à sable.

  · Si c'est bien ta base de développement : « npm run bac:init ».
  · Sinon, tu es sur la PRODUCTION. Corrige DATABASE_URL dans .env.local.
`);
    await sql.end();
    process.exit(1);
  }
}
