/**
 * CONTRÔLES DE LA CONSERVATION DES MESSAGES DE CONTACT.
 * =====================================================
 *   npm run verif:reclamations
 *
 * ⚠ Refuse de tourner hors bac à sable : le script INSÈRE puis SUPPRIME des
 * messages.
 *
 * Ce que ça vérifie, et pourquoi ça ne peut pas se voir autrement : la purge est
 * une requête SQL à deux branches (`or` de deux `and`), et une requête de
 * suppression fausse **compile parfaitement**. Le projet a déjà connu ce cas
 * exact — une comparaison de date qui passait le build et cassait le ménage
 * quotidien en 500. Le seul contrôle qui prouve quelque chose est de poser des
 * lignes aux bons âges et de regarder lesquelles survivent.
 *
 * ⚠ Le risque n'est pas symétrique. Conserver un message trop longtemps est un
 * manquement RGPD ; en effacer un trop tôt détruit la preuve d'une réclamation
 * au moment où le médiateur la demande. Les deux sens sont donc testés.
 */
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const fichier = (n: string) =>
  pathToFileURL(new URL(n, import.meta.url).pathname.slice(1)).href;

registerHooks({
  resolve(spec, ctx, next) {
    if (spec === 'server-only') return { url: fichier('_vide.cjs'), shortCircuit: true };
    if (spec === '@/lib/email' || spec.endsWith('/lib/email'))
      return { url: fichier('_email-capture.cjs'), shortCircuit: true };
    return next(spec, ctx);
  },
});

const { chargerEnv, connexion, exigerBacASable } = await import('./_env.mjs');
chargerEnv();
process.env.SITE_URL ||= 'https://www.nestync.app';
process.env.EMAIL_EXPEDITEUR ||= 'contact@nestync.app';

const { sql, hote } = connexion();
await exigerBacASable(sql, hote);

const { purgerMessagesContact, RETENTION_MESSAGES, RETENTION_RECLAMATIONS } = await import(
  '../lib/maintenance.ts'
);

const JOUR = 86_400_000;
const MARQUE = 'verif-reclam-';
let echecs = 0;

function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `  (attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)})`}`,
  );
}

/** Pose un message d'un objet et d'un âge donnés. Renvoie sa référence. */
async function poser(ref: string, sujet: string, ageJours: number) {
  const quand = new Date(Date.now() - ageJours * JOUR);
  await sql`
    insert into messages_contact (email, nom, sujet, message, cree_le)
    values (${MARQUE + ref + '@exemple.invalid'}, ${'Test ' + ref}, ${sujet},
            ${'message de controle ' + ref}, ${quand.toISOString()}::timestamptz)`;
  return ref;
}

/** Les références encore présentes après la purge. */
async function survivants(): Promise<string[]> {
  const lignes = await sql<{ email: string }[]>`
    select email from messages_contact where email like ${MARQUE + '%'} order by email`;
  return lignes.map((l) => l.email.replace(MARQUE, '').replace('@exemple.invalid', ''));
}

try {
  console.log('');
  console.log(`  Base : ${hote}`);
  console.log(
    `  Durées : ordinaire ${RETENTION_MESSAGES / JOUR} j · litige ${RETENTION_RECLAMATIONS / JOUR} j`,
  );
  console.log('');

  await sql`delete from messages_contact where email like ${MARQUE + '%'}`;

  /*
   * Les âges sont choisis DE PART ET D'AUTRE de chaque seuil, pas au hasard :
   * une purge qui compare dans le mauvais sens, ou qui applique la mauvaise
   * durée au mauvais objet, laisse passer un jeu de données trop espacées.
   */
  await poser('a-question-recente', 'question', 10);
  await poser('b-question-11mois', 'question', 340);
  await poser('c-question-13mois', 'question', 400);
  await poser('d-reclam-13mois', 'reclamation', 400);
  await poser('e-reclam-17mois', 'reclamation', 520);
  await poser('f-reclam-19mois', 'reclamation', 570);
  await poser('g-factu-17mois', 'facturation', 520);
  await poser('h-probleme-17mois', 'probleme', 520);
  await poser('i-donnees-13mois', 'donnees', 400);
  await poser('j-autre-13mois', 'autre', 400);

  verifier('dix messages posés', 10, (await survivants()).length);

  const supprimes = await purgerMessagesContact();
  const restants = await survivants();

  console.log('');
  verifier('4 messages purgés', 4, supprimes);

  verifier(
    'ce qui reste',
    [
      'a-question-recente',
      'b-question-11mois',
      'd-reclam-13mois',
      'e-reclam-17mois',
      'g-factu-17mois',
      'h-probleme-17mois',
    ],
    restants,
  );

  // Les contrôles qui portent le sens, énoncés un par un.
  const est = (r: string) => restants.includes(r);
  verifier('une question de 13 mois est effacée', false, est('c-question-13mois'));
  verifier('une demande RGPD de 13 mois est effacée', false, est('i-donnees-13mois'));
  verifier('« autre » suit la durée ordinaire', false, est('j-autre-13mois'));
  verifier('⚠ une réclamation de 13 mois SURVIT (saisine encore recevable)', true, est('d-reclam-13mois'));
  verifier('⚠ une réclamation de 17 mois SURVIT (médiation en cours)', true, est('e-reclam-17mois'));
  verifier('une réclamation de 19 mois est effacée', false, est('f-reclam-19mois'));
  verifier('« facturation » est traitée comme un litige', true, est('g-factu-17mois'));
  verifier('« probleme » est traité comme un litige', true, est('h-probleme-17mois'));

  await sql`delete from messages_contact where email like ${MARQUE + '%'}`;
  const reste = (await survivants()).length;
  verifier('nettoyage complet', 0, reste);

  console.log('');
  console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
  console.log('');
  process.exitCode = echecs === 0 ? 0 : 1;
} finally {
  await sql.end();
}
