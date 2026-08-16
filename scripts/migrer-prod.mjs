/**
 * Applique les migrations à la base de PRODUCTION. Geste délibéré, jamais réflexe.
 *
 *   npm run db:migrate:prod
 *
 * ⚠ POURQUOI UNE COMMANDE À PART. `npm run db:migrate` vise le bac à sable :
 * drizzle.config.ts charge `.env.local` avec `override: true`, ce qui écrase
 * même un `DATABASE_URL` posé à la main dans le terminal. Croire qu'on migre la
 * production en surchargeant la variable ne marcherait donc PAS — on migrerait
 * le bac à sable en pensant le contraire. Ce script lit `.env` (production) et
 * ignore `.env.local`.
 *
 * Deux garde-fous : refus si la base porte le marqueur de bac à sable (on se
 * serait trompé de cible), et récapitulatif des migrations en attente avant
 * d'écrire quoi que ce soit.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { execSync } from 'node:child_process';
import postgres from 'postgres';

const env = {};
for (const l of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = l.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}
if (!env.DATABASE_URL) {
  console.error('DATABASE_URL absent de .env');
  process.exit(1);
}

const u = new URL(env.DATABASE_URL);
if (u.hostname.endsWith('.neon.tech') && !u.hostname.includes('-pooler')) {
  const [ep, ...r] = u.hostname.split('.');
  u.hostname = [`${ep}-pooler`, ...r].join('.');
}
const sql = postgres(u.toString(), { prepare: false, max: 1 });

console.log(`\n  Cible : ${u.hostname}\n`);

try {
  // Garde-fou : si le marqueur est là, ce n'est PAS la production.
  const [{ existe }] = await sql`
    select count(*)::int as existe from information_schema.tables where table_name = 'bac_a_sable'`;
  if (existe) {
    const [{ n }] = await sql`select count(*)::int as n from bac_a_sable`;
    if (n > 0) {
      console.error('  ARRÊT : cette base porte le marqueur de BAC À SABLE.\n' +
        '  Ce n\'est pas la production. Vérifie DATABASE_URL dans .env.\n');
      process.exit(1);
    }
  }

  const [{ n: foyers }] = await sql`select count(*)::int as n from foyers`;
  console.log(`  ${foyers} foyer(s) sur cette base — c'est bien la production.\n`);

  // Migrations déjà appliquées vs présentes dans le dépôt.
  let appliquees = new Set();
  try {
    const rows = await sql`select hash from drizzle.__drizzle_migrations`;
    appliquees = new Set(rows.map((r) => r.hash));
  } catch { /* première migration */ }
  const fichiers = readdirSync('lib/db/migrations').filter((f) => f.endsWith('.sql')).sort();
  console.log(`  ${fichiers.length} migrations au dépôt, ${appliquees.size} déjà appliquées ici.`);
  console.log(`  Dernière du dépôt : ${fichiers[fichiers.length - 1]}\n`);
} finally {
  await sql.end();
}

console.log('  Application…\n');
execSync('npx drizzle-kit migrate', {
  stdio: 'inherit',
  // On repart d'un environnement propre : `.env.local` ne doit pas s'inviter.
  env: { ...process.env, DATABASE_URL: u.toString(), DOTENV_CONFIG_PATH: '.env' },
});
console.log('\n  Migrations appliquées à la production.');
