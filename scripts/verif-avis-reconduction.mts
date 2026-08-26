/**
 * CONTRÔLES DE L'AVIS DE RECONDUCTION (article L. 215-1).
 * =======================================================
 *   npm run verif:avis
 *
 * ⚠ Refuse de tourner hors bac à sable : le script CRÉE des foyers fictifs.
 *
 * ⚠ Aucun courriel ne part : `@/lib/email` est remplacé à la résolution par une
 * capture. C'est ce qui permet de vérifier QUI aurait été prévenu sans écrire à
 * personne — un test qui enverrait de vrais messages ne serait jouable qu'une fois.
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

const { envoyerAvisReconductions } = await import('../lib/maintenance.ts');
const captures = () => (globalThis as unknown as { __avis: { sujet: string }[] }).__avis;

const JOUR = 86_400_000;
let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(`${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `  (attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)})`}`);
}

/** Crée un foyer d'essai avec son propriétaire. Renvoie l'id du foyer. */
async function creerFoyer(suffixe: string, offre: string | null, jours: number, annule = false) {
  const email = `verif-avis-${suffixe}@exemple.invalid`;
  const [u] = await sql`
    insert into utilisateurs (email, nom) values (${email}, ${'Test ' + suffixe})
    on conflict (email) do update set nom = excluded.nom returning id`;
  const [f] = await sql`
    insert into foyers (nom, statut_abonnement, abonnement_fin, offre, annulation_programmee)
    values (${'Foyer ' + suffixe}, 'actif', ${new Date(Date.now() + jours * JOUR)}, ${offre}, ${annule})
    returning id`;
  await sql`insert into membres (foyer_id, utilisateur_id, role) values (${f.id}, ${u.id}, 'proprietaire')`;
  return { foyerId: f.id as string, utilisateurId: u.id as string };
}

const cas = {
  annuel45: await creerFoyer('annuel45', 'annuel', 40),
  annuel7: await creerFoyer('annuel7', 'annuel', 5),
  annuelLoin: await creerFoyer('annuelloin', 'annuel', 200),
  mensuel: await creerFoyer('mensuel', 'mensuel', 3),
  annule: await creerFoyer('annule', 'annuel', 40, true),
};
const ids = Object.values(cas).map((c) => c.foyerId);

const lignes = async () =>
  (await sql`select f.offre, a.type from avis_reconduction a
             join foyers f on f.id = a.foyer_id
             where a.foyer_id = any(${ids}) order by f.offre, a.type`).map(
    (r: { offre: string; type: string }) => `${r.offre}/${r.type}`,
  );

try {
  console.log(`\nBase : ${hote}\n`);

  console.log('1. Premier passage');
  captures().length = 0;
  const envoyes = await envoyerAvisReconductions();
  const traces = await lignes();
  verifier('un avis pour l’annuel à 40 j, deux pour celui à 5 j', 3, envoyes);
  verifier('le mensuel n’est jamais avisé', false, traces.some((l) => l.startsWith('mensuel')));
  verifier('la résiliation en cours n’est pas avisée', 3, traces.length);
  verifier('l’annuel à 5 j reçoit aussi l’avis légal', true, traces.filter((l) => l === 'annuel/legal').length === 2);

  console.log('\n2. Second passage — idempotence');
  captures().length = 0;
  verifier('aucun envoi en double', 0, await envoyerAvisReconductions());
  verifier('aucune trace supplémentaire', 3, (await lignes()).length);

  console.log();
  console.log('3. Panne du service d’e-mail');
  // ⚠ LE CONTRÔLE LE PLUS IMPORTANT. Le tampon est une PREUVE : s'il se posait
  // sans envoi réussi, il attesterait d'une information jamais reçue — et le
  // client serait fondé à résilier gratuitement en se faisant rembourser, pendant
  // que la base affirmerait le contraire.
  await sql`delete from avis_reconduction where foyer_id = ${cas.annuel45.foyerId}`;
  const panne = (v: boolean) => ((globalThis as unknown as { __avisEchoue: boolean }).__avisEchoue = v);
  panne(true);
  verifier('rien n’est compté comme envoyé', 0, await envoyerAvisReconductions());
  verifier(
    'aucun tampon posé sur un envoi manqué',
    0,
    (await sql`select count(*)::int as n from avis_reconduction where foyer_id = ${cas.annuel45.foyerId}`)[0].n,
  );
  panne(false);
  verifier('l’avis repart au passage suivant', 1, await envoyerAvisReconductions());

  console.log('\n4. Cascade');
  await sql`delete from foyers where id = ${cas.annuel7.foyerId}`;
  verifier(
    'la trace disparaît avec le foyer',
    0,
    (await sql`select count(*)::int as n from avis_reconduction where foyer_id = ${cas.annuel7.foyerId}`)[0].n,
  );
} finally {
  const utilisateurIds = Object.values(cas).map((c) => c.utilisateurId);
  await sql`delete from foyers where id = any(${ids})`;
  await sql`delete from utilisateurs where id = any(${utilisateurIds})`;
  await sql.end();
}

console.log(echecs === 0 ? '\nTous les contrôles passent.\n' : `\n${echecs} CONTRÔLE(S) EN ÉCHEC.\n`);
process.exit(echecs === 0 ? 0 : 1);
