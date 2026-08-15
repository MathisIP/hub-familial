/**
 * VÉRIFICATION D'ISOLATION — « qui voit quoi » dans un foyer.
 *
 *   npm run verif:isolation
 *
 * ⚠ À LANCER SUR LE BAC À SABLE, jamais sur la production. Le script refuse de
 * démarrer si la base ne porte pas le marqueur (cf. scripts/_env.mjs) : il crée
 * un foyer jetable à trois membres, rejoue les règles, puis efface tout — mais
 * on ne fait pas ça au milieu des données d'un client.
 *
 * Pourquoi ce script existe : les règles de visibilité sont des règles SQL. Un
 * test d'interface ne prouve rien — l'interface peut cacher ce que l'API sert
 * encore. On rejoue donc ici les conditions exactes que le code applique, sur
 * une vraie base, avec des données croisées (virements entre comptes masqués,
 * cadeaux masqués, dossiers restreints, agendas partagés).
 *
 * Lit .env.local en priorite, sinon .env (convention Next.js).
 */
import { connexion, exigerBacASable } from './_env.mjs';

const { sql, hote } = connexion({ max: 1 });

console.log(`  base : ${hote}\n`);

let echecs = 0;
const verifier = (ok, msg) => {
  if (!ok) echecs++;
  console.log(`${ok ? '  ok  ' : ' ÉCHEC'} ${msg}`);
};
const titre = (t) => console.log(`\n— ${t}`);

const suffixe = Date.now();
let foyerId = null;
const users = {};

try {
  // Ce script crée puis efface un foyer complet : jamais ailleurs qu'en bac à sable.
  await exigerBacASable(sql, hote);

  // Le schéma 0025 doit être en place, sinon les vérifications n'ont pas de sens.
  const [{ present }] = await sql`
    select count(*)::int as present from information_schema.columns
    where table_name = 'cadeaux' and column_name = 'masque_a'`;
  if (!present) {
    console.error('Migration 0025 non appliquée sur cette base. Lance `npm run db:migrate` dessus.');
    await sql.end();
    process.exit(1);
  }

  /* ---------------------------- Jeu d'essai ---------------------------- */
  [{ id: foyerId }] = await sql`
    insert into foyers (nom, statut_abonnement) values (${'ZZ_ISO_' + suffixe}, 'essai') returning id`;
  for (const [cle, nom] of [['parent1', 'Parent 1'], ['parent2', 'Parent 2'], ['enfant', 'Enfant']]) {
    const [row] = await sql`
      insert into utilisateurs (email, nom)
      values (${`zz_${cle}_${suffixe}@test.invalid`}, ${nom}) returning id`;
    users[cle] = row.id;
  }
  await sql`insert into membres (foyer_id, utilisateur_id, role) values
    (${foyerId}, ${users.parent1}, 'proprietaire'),
    (${foyerId}, ${users.parent2}, 'membre'),
    (${foyerId}, ${users.enfant}, 'membre')`;

  /* ------------------------------ COMPTES ------------------------------ */
  titre('Comptes (liste blanche)');
  await sql`insert into comptes (foyer_id, nom, solde_initial, partage)
    values (${foyerId}, 'Commun', 1000, 'foyer')`;
  const [{ id: cParents }] = await sql`insert into comptes (foyer_id, nom, solde_initial, partage)
    values (${foyerId}, 'Parents', 500, 'restreint') returning id`;
  const [{ id: cEnfant }] = await sql`insert into comptes (foyer_id, nom, solde_initial, partage)
    values (${foyerId}, 'Enfant', 50, 'restreint') returning id`;
  await sql`insert into comptes_acces (foyer_id, compte_id, utilisateur_id) values
    (${foyerId}, ${cParents}, ${users.parent1}), (${foyerId}, ${cParents}, ${users.parent2}),
    (${foyerId}, ${cEnfant}, ${users.parent1}), (${foyerId}, ${cEnfant}, ${users.parent2}),
    (${foyerId}, ${cEnfant}, ${users.enfant})`;
  await sql`insert into transactions (foyer_id, date, date_iso, type, compte, dest, categorie, libelle, montant) values
    (${foyerId}, '01/08/2026', '2026-08-01', 'Dépense', 'Parents', '', 'Loisirs', 'Secret', 300),
    (${foyerId}, '02/08/2026', '2026-08-02', 'Dépense', 'Enfant', '', 'Bonbons', 'Bonbons', 5),
    (${foyerId}, '03/08/2026', '2026-08-03', 'Dépense', 'Commun', '', 'Courses', 'Courses', 100),
    (${foyerId}, '04/08/2026', '2026-08-04', 'Virement interne', 'Parents', 'Enfant', '', 'Argent de poche', 20)`;

  const comptesVus = async (uid) => (await sql`
    select c.nom from comptes c
    where c.foyer_id = ${foyerId} and (c.partage <> 'restreint' or exists (
      select 1 from comptes_acces a where a.compte_id = c.id and a.utilisateur_id = ${uid}))
    order by c.nom`).map((r) => r.nom);

  const vP2 = await comptesVus(users.parent2);
  const vE = await comptesVus(users.enfant);
  verifier(vP2.join(',') === 'Commun,Enfant,Parents', `parent 2 voit les 3 comptes (${vP2})`);
  verifier(vE.join(',') === 'Commun,Enfant', `enfant voit Commun + Enfant (${vE})`);

  const [{ dep }] = await sql`
    select coalesce(sum(montant),0) as dep from transactions
    where foyer_id = ${foyerId} and type = 'Dépense'
      and (compte = any(${vE}) or dest = any(${vE}))`;
  verifier(Number(dep) === 105, `KPI dépenses de l'enfant = 105, pas 405 (${dep})`);

  const [{ solde }] = await sql`
    select 50 + coalesce(sum(case
      when type='Dépense' and compte='Enfant' then -montant
      when type='Virement interne' and dest='Enfant' then montant else 0 end),0) as solde
    from transactions where foyer_id = ${foyerId}`;
  verifier(Number(solde) === 65, `solde Enfant juste malgré la source masquée (${solde}, attendu 65)`);

  /* ----------------------------- ÉCHÉANCES ----------------------------- */
  titre('Échéances (héritent du compte)');
  await sql`insert into echeances (foyer_id, libelle, date, date_iso, compte_id) values
    (${foyerId}, 'Loyer', '05/09/2026', '2026-09-05', null),
    (${foyerId}, 'Prêt auto', '10/09/2026', '2026-09-10', ${cParents})`;
  const echVues = async (uid) => (await sql`
    select e.libelle from echeances e
    where e.foyer_id = ${foyerId} and (e.compte_id is null or exists (
      select 1 from comptes c where c.id = e.compte_id and (c.partage <> 'restreint' or exists (
        select 1 from comptes_acces a where a.compte_id = c.id and a.utilisateur_id = ${uid}))))
    order by e.libelle`).map((r) => r.libelle);
  const eE = await echVues(users.enfant);
  const eP2 = await echVues(users.parent2);
  verifier(eE.join(',') === 'Loyer', `enfant ne voit que l'échéance commune (${eE})`);
  verifier(eP2.join(',') === 'Loyer,Prêt auto', `parent 2 voit les deux (${eP2})`);

  /* ------------------------------ CADEAUX ------------------------------ */
  titre('Cadeaux (liste noire)');
  await sql`insert into cadeaux (foyer_id, idee, occasion, prix_paye, masque_a) values
    (${foyerId}, 'Vélo', 'Noël', '200', ${users.enfant}),
    (${foyerId}, 'Livre', 'Noël', '20', null)`;
  const cadVus = async (uid) => (await sql`
    select idee from cadeaux where foyer_id = ${foyerId}
      and (masque_a is null or masque_a <> ${uid}) order by idee`).map((r) => r.idee);
  const kE = await cadVus(users.enfant);
  const kP1 = await cadVus(users.parent1);
  verifier(kE.join(',') === 'Livre', `l'enfant ne voit pas son cadeau surprise (${kE})`);
  verifier(kP1.join(',') === 'Livre,Vélo', `les parents voient tout (${kP1})`);
  const [{ total }] = await sql`
    select coalesce(sum(prix_paye::numeric),0) as total from cadeaux
    where foyer_id = ${foyerId} and occasion = 'Noël' and (masque_a is null or masque_a <> ${users.enfant})`;
  verifier(Number(total) === 20, `total de l'occasion vu par l'enfant = 20, pas 220 (${total})`);

  /* ------------------------------ AGENDAS ------------------------------ */
  titre('Agendas (liste blanche, réglés par celui qui rattache)');
  const [{ id: agParents }] = await sql`insert into foyer_agendas (foyer_id, calendar_id, nom, ajoute_par, partage)
    values (${foyerId}, 'cal-parents@test', 'Travail', ${users.parent1}, 'restreint') returning id`;
  await sql`insert into foyer_agendas (foyer_id, calendar_id, nom, ajoute_par, partage)
    values (${foyerId}, 'cal-famille@test', 'Famille', ${users.parent1}, 'foyer')`;
  await sql`insert into agendas_acces (foyer_id, agenda_id, utilisateur_id)
    values (${foyerId}, ${agParents}, ${users.parent2})`;
  const agVus = async (uid) => (await sql`
    select nom from foyer_agendas
    where foyer_id = ${foyerId} and (partage <> 'restreint' or ajoute_par = ${uid} or exists (
      select 1 from agendas_acces a where a.agenda_id = foyer_agendas.id and a.utilisateur_id = ${uid}))
    order by nom`).map((r) => r.nom);
  verifier((await agVus(users.enfant)).join(',') === 'Famille', "l'enfant ne voit pas l'agenda de travail");
  verifier((await agVus(users.parent2)).join(',') === 'Famille,Travail', 'parent 2 voit les deux');
  verifier(
    (await agVus(users.parent1)).join(',') === 'Famille,Travail',
    "celui qui l'a rattaché le voit toujours (sinon réglage irrattrapable)",
  );

  /* ----------------------------- DOCUMENTS ----------------------------- */
  titre('Documents (liste blanche par dossier)');
  const [{ id: dPrive }] = await sql`insert into dossiers (foyer_id, nom, partage)
    values (${foyerId}, 'Santé', 'restreint') returning id`;
  await sql`insert into dossiers (foyer_id, nom, partage) values (${foyerId}, 'Photos', 'foyer')`;
  await sql`insert into dossiers_acces (foyer_id, dossier_id, utilisateur_id) values
    (${foyerId}, ${dPrive}, ${users.parent1}), (${foyerId}, ${dPrive}, ${users.parent2})`;
  await sql`insert into documents (foyer_id, nom, dossier, cle, type, taille) values
    (${foyerId}, 'carnet-sante.pdf', 'Santé', ${'zz-cle-1-' + suffixe}, 'application/pdf', 1000),
    (${foyerId}, 'vacances.jpg', 'Photos', ${'zz-cle-2-' + suffixe}, 'image/jpeg', 2000),
    (${foyerId}, 'facture.pdf', '', ${'zz-cle-3-' + suffixe}, 'application/pdf', 500)`;
  const docsVus = async (uid) => (await sql`
    select d.nom from documents d
    where d.foyer_id = ${foyerId} and (
      d.dossier = '' or not exists (select 1 from dossiers x where x.foyer_id = d.foyer_id and x.nom = d.dossier)
      or exists (select 1 from dossiers x where x.foyer_id = d.foyer_id and x.nom = d.dossier
        and (x.partage <> 'restreint' or exists (
          select 1 from dossiers_acces a where a.dossier_id = x.id and a.utilisateur_id = ${uid}))))
    order by d.nom`).map((r) => r.nom);
  const docE = await docsVus(users.enfant);
  const docP2 = await docsVus(users.parent2);
  verifier(docE.join(',') === 'facture.pdf,vacances.jpg', `enfant : dossier Santé masqué (${docE})`);
  verifier(docP2.length === 3, `parent 2 voit les 3 documents (${docP2.length})`);
  verifier(docE.includes('facture.pdf'), 'un fichier sans dossier reste commun');

  /* ------------------------------ CASCADES ----------------------------- */
  titre('Cascades et contraintes');
  let doublon = false;
  try {
    await sql`insert into dossiers_acces (foyer_id, dossier_id, utilisateur_id)
      values (${foyerId}, ${dPrive}, ${users.parent1})`;
  } catch { doublon = true; }
  verifier(doublon, 'unique(dossier_id, utilisateur_id) rejette le doublon');

  await sql`delete from dossiers where id = ${dPrive}`;
  const [{ n: nAcces }] = await sql`select count(*)::int as n from dossiers_acces where dossier_id = ${dPrive}`;
  verifier(nAcces === 0, 'supprimer un dossier efface ses autorisations');

  await sql`delete from comptes where id = ${cParents}`;
  const [{ n: nEch }] = await sql`
    select count(*)::int as n from echeances where foyer_id = ${foyerId} and libelle = 'Prêt auto' and compte_id is null`;
  verifier(nEch === 1, "fermer un compte NE SUPPRIME PAS l'échéance, elle redevient commune");

  await sql`delete from utilisateurs where id = ${users.enfant}`;
  const [{ n: nCad }] = await sql`
    select count(*)::int as n from cadeaux where foyer_id = ${foyerId} and idee = 'Vélo' and masque_a is null`;
  verifier(nCad === 1, 'un membre qui part : son cadeau surprise redevient visible de tous');
  const [{ n: nFoyer }] = await sql`select count(*)::int as n from foyers where id = ${foyerId}`;
  verifier(nFoyer === 1, 'le foyer survit au départ d’un membre non propriétaire');
} finally {
  if (foyerId) await sql`delete from foyers where id = ${foyerId}`;
  for (const id of Object.values(users)) {
    if (id) await sql`delete from utilisateurs where id = ${id}`;
  }
  await sql.end();
}

console.log(echecs === 0 ? '\n✅ Isolation vérifiée.' : `\n❌ ${echecs} échec(s).`);
process.exit(echecs === 0 ? 0 : 1);
