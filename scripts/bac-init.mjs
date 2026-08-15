/**
 * Prépare une base de DÉVELOPPEMENT : pose le marqueur de bac à sable.
 *
 *   npm run bac:init
 *
 * À lancer UNE FOIS, sur ta base de développement, après `npm run db:migrate`.
 * Le marqueur est ce qui autorise ensuite `npm run bac:garnir` à y déverser des
 * données fictives — et ce qui l'en empêche partout ailleurs.
 *
 * ⚠ Ne JAMAIS lancer ce script sur la base de production : il y poserait le
 * marqueur, et retirerait du même coup la protection des données clients. Le
 * script s'en défend en refusant toute base contenant déjà des foyers autres
 * que le foyer de démonstration.
 */
import { connexion, chargerEnv } from './_env.mjs';

chargerEnv();
const { sql, hote } = connexion({ max: 1 });
const DEMO = (process.env.DEMO_EMAIL || 'mip@nestync.app').toLowerCase();

try {
  const [{ existe }] = await sql`
    select count(*)::int as existe from information_schema.tables
    where table_name = 'bac_a_sable'`;
  if (!existe) {
    console.error(`
  La table « bac_a_sable » n'existe pas sur ${hote}.
  Applique d'abord les migrations : npm run db:migrate
`);
    process.exit(1);
  }

  /*
   * Garde-fou : une base qui contient de VRAIS foyers n'est pas un bac à sable.
   * On tolère uniquement le foyer de démonstration (celui de DEMO_EMAIL) et une
   * base vide. Sans ce contrôle, une faute de frappe dans .env.local suffirait à
   * désarmer la protection sur la production.
   */
  const [{ n: foyersReels }] = await sql`
    select count(*)::int as n from foyers f
    where not exists (
      select 1 from membres m
      join utilisateurs u on u.id = m.utilisateur_id
      where m.foyer_id = f.id and lower(u.email) = ${DEMO}
    )`;

  if (foyersReels > 0) {
    console.error(`
  ╔══════════════════════════════════════════════════════════════════╗
  ║  REFUS — cette base contient ${String(foyersReels).padEnd(4)} foyer(s) qui ne sont pas   ║
  ║  le foyer de démonstration. Ce n'est pas un bac à sable.         ║
  ╚══════════════════════════════════════════════════════════════════╝

  Base visée : ${hote}

  Si tu voulais viser ta base de développement, corrige DATABASE_URL
  dans .env.local. Ce script ne posera pas le marqueur ici.
`);
    process.exit(1);
  }

  const [{ n: deja }] = await sql`select count(*)::int as n from bac_a_sable`;
  if (deja > 0) {
    console.log(`  déjà marquée comme bac à sable : ${hote}`);
  } else {
    await sql`insert into bac_a_sable (note) values (${`posé le ${new Date().toISOString().slice(0, 10)}`})`;
    console.log(`  ✅ bac à sable armé : ${hote}`);
  }
  console.log('  tu peux maintenant lancer « npm run bac:garnir ».');
} finally {
  await sql.end();
}
