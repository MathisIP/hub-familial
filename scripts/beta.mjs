/**
 * ACCÈS OFFERT — accorde ou retire l'accès gratuit à un foyer, par adresse.
 *
 *   npm run beta                                  → liste les accès offerts
 *   npm run beta -- alice@x.fr bob@y.fr           → SIMULATION (n'écrit rien)
 *   npm run beta -- --appliquer alice@x.fr        → accorde pour de bon
 *   npm run beta -- --retirer --appliquer alice@x.fr
 *
 * ⚠ CE SCRIPT VISE LA PRODUCTION, contrairement à `bac:garnir` et consorts. Il
 * n'appelle donc PAS `exigerBacASable()` — ce serait absurde, les testeurs ont
 * leurs comptes sur la vraie base. Il se défend en revanche de la faute
 * symétrique, qui est la plus probable ici : viser le bac à sable en croyant
 * toucher les vrais comptes, ne rien voir se passer, et recommencer. Le marqueur
 * est donc lu et ANNONCÉ à chaque passage, sans jamais bloquer.
 *
 * ⚠ SIMULATION PAR DÉFAUT. Rien n'est écrit sans `--appliquer`. Un script qui
 * modifie des comptes clients doit d'abord montrer ce qu'il ferait : la moitié
 * des adresses seront mal orthographiées ou inconnues au premier essai.
 *
 * L'accès offert est SANS DATE DE FIN : `abonnement_fin` reste `null`, et
 * `etatAbonnement()` n'applique aucun contrôle de date au statut `offert`.
 */
import { connexion, connexionProduction } from './_env.mjs';

const args = process.argv.slice(2);
const appliquer = args.includes('--appliquer');
const retirer = args.includes('--retirer');
const emails = args
  .filter((a) => !a.startsWith('--'))
  .map((a) => a.trim().toLowerCase())
  .filter(Boolean);

/*
 * ⚠ SANS `--prod`, ON VISE LE BAC À SABLE — et c'est le bon défaut : la
 * production ne doit jamais être la cible qu'on atteint par distraction.
 *
 * Le piège constaté le 27/08/2026 : chercher un testeur inscrit sur
 * l'application DÉPLOYÉE en interrogeant la base locale. Le compte n'existe
 * évidemment pas, et le script répond « jamais connecté » — un message exact
 * mais qu'on lit comme un défaut de l'application. Le bandeau annonçait
 * pourtant « BAC À SABLE » deux lignes plus haut.
 */
const prod = args.includes('--prod');
/*
 * ⚠ REPORTÉ DANS TOUTES LES COMMANDES QUE LE SCRIPT SUGGÈRE. Sans cela, la
 * ligne « relance avec --appliquer » proposait une commande SANS `--prod` :
 * copiée telle quelle après une simulation en production, elle écrivait dans le
 * bac à sable, et il ne se passait rien sur le compte visé. Un outil qui dicte
 * la commande suivante doit dicter la bonne — c'est la seule que l'on recopie
 * sans la relire.
 */
const drapeaux = prod ? '--prod ' : '';
const { sql, hote } = prod ? connexionProduction() : connexion({ max: 1 });

/** Vrai si la base porte le marqueur de bac à sable. */
async function estBacASable() {
  const [{ existe }] = await sql`
    select count(*)::int as existe from information_schema.tables
    where table_name = 'bac_a_sable'`;
  if (!existe) return false;
  const [{ n }] = await sql`select count(*)::int as n from bac_a_sable`;
  return n > 0;
}

/**
 * Résout une adresse en foyer, et dit pourquoi quand ce n'est pas possible.
 *
 * ⚠ Le cas le plus fréquent au démarrage d'un programme de test est `inconnu` :
 * l'invitation vient d'être envoyée et la personne ne s'est pas encore
 * connectée, donc aucune ligne `utilisateurs` n'existe. Ce n'est pas une erreur,
 * c'est un « repasse après sa première connexion » — et le message doit le dire,
 * sinon on cherche une faute de frappe qui n'existe pas.
 */
async function resoudre(email) {
  const [u] = await sql`
    select id, nom from utilisateurs where lower(email) = ${email} limit 1`;
  if (!u) {
    /*
     * ⚠ AVANT DE DIRE « JAMAIS CONNECTÉ », ON CHERCHE UNE ADRESSE VOISINE.
     *
     * Une faute de frappe et une personne réellement pas encore inscrite
     * produisaient exactement le même message. Constaté deux fois de suite le
     * 27/08/2026, dont une avec `ce/lameirao@` au lieu de `ce.lameirao@` — et
     * une barre oblique est un caractère PARFAITEMENT LÉGAL dans une adresse,
     * donc aucune validation de format ne l'aurait signalée.
     *
     * La comparaison se fait sur la forme réduite aux lettres et aux chiffres :
     * c'est ce qui rapproche « ce/lameirao » de « ce.lameirao », ou une adresse
     * saisie avec un point en trop de la vraie.
     */
    const voisins = await sql`
      select email from utilisateurs
       where regexp_replace(lower(email), '[^a-z0-9@]', '', 'g')
           = regexp_replace(${email}, '[^a-z0-9@]', '', 'g')
       limit 3`;
    return { etat: 'inconnu', voisins: voisins.map((v) => v.email) };
  }

  const lignes = await sql`
    select f.id, f.nom, f.statut_abonnement as statut, f.stripe_customer_id as client,
           m.role
      from membres m
      join foyers f on f.id = m.foyer_id
     where m.utilisateur_id = ${u.id}
     order by m.cree_le`;
  if (lignes.length === 0) return { etat: 'sans_foyer', u };

  const proprio = lignes.find((l) => l.role === 'proprietaire');
  /*
   * ⚠ ON N'OFFRE QU'À UN PROPRIÉTAIRE. L'abonnement est porté par le FOYER, pas
   * par la personne : accorder l'accès à quelqu'un qui n'est que membre
   * l'offrirait en réalité au foyer de quelqu'un d'autre — un foyer entier
   * cesserait de payer sans que personne l'ait demandé. Le membre d'un foyer,
   * lui, bénéficie déjà de l'abonnement de celui-ci ; il n'y a rien à lui donner.
   */
  if (!proprio) return { etat: 'membre_seulement', u, foyer: lignes[0] };
  return { etat: 'ok', u, foyer: proprio };
}

try {
  const bac = await estBacASable();
  console.log('');
  console.log(`  Base   : ${hote}`);
  console.log(`  Nature : ${bac ? '🟢 BAC À SABLE (ce ne sont PAS les vrais comptes)' : '🔴 PRODUCTION — comptes réels'}`);
  console.log(`  Mode   : ${appliquer ? '✍  ÉCRITURE' : '👁  simulation (rien ne sera écrit)'}`);
  console.log('');

  // --- Sans adresse : on liste ce qui existe -------------------------------
  if (emails.length === 0) {
    const offerts = await sql`
      select f.nom, f.id, u.email
        from foyers f
        left join membres m on m.foyer_id = f.id and m.role = 'proprietaire'
        left join utilisateurs u on u.id = m.utilisateur_id
       where f.statut_abonnement = 'offert'
       order by f.nom`;
    if (offerts.length === 0) {
      console.log('  Aucun accès offert pour le moment.');
      console.log('');
      console.log('  Pour en accorder un :');
      console.log(`    npm run beta -- ${drapeaux}alice@exemple.fr            (simulation)`);
      console.log(`    npm run beta -- ${drapeaux}--appliquer alice@exemple.fr`);
    } else {
      console.log(`  ${offerts.length} accès offert(s) :`);
      for (const o of offerts) console.log(`    · ${(o.email ?? '(sans propriétaire)').padEnd(32)} ${o.nom}`);
    }
    console.log('');
    process.exit(0);
  }

  // --- Résolution de chaque adresse ----------------------------------------
  const aFaire = [];
  for (const email of emails) {
    const r = await resoudre(email);

    if (r.etat === 'inconnu') {
      if (r.voisins?.length) {
        console.log(`  ✱  ${email.padEnd(32)} FAUTE DE FRAPPE ? une adresse très proche existe :`);
        for (const v of r.voisins) console.log(`     ${' '.repeat(32)} → ${v}`);
      } else {
        console.log(`  ⏳ ${email.padEnd(32)} jamais connecté — qu'il ouvre l'app une fois, puis relance`);
      }
      continue;
    }
    if (r.etat === 'sans_foyer') {
      console.log(`  ⏳ ${email.padEnd(32)} connecté, mais sans foyer — il doit d'abord en créer un`);
      continue;
    }
    if (r.etat === 'membre_seulement') {
      console.log(`  ⤫  ${email.padEnd(32)} membre de « ${r.foyer.nom} », pas propriétaire — il profite déjà de son abonnement`);
      continue;
    }

    const f = r.foyer;

    /*
     * ⚠ ON NE TOUCHE PAS À UN ABONNEMENT PAYANT. Écraser `actif` par `offert`
     * n'enlèverait aucun accès — mais effacerait la trace en base qu'il paie,
     * pendant que Stripe continuerait de le prélever. Le désaccord entre les
     * deux ne se verrait nulle part, jusqu'au jour où il réclamerait.
     */
    if (!retirer && f.statut === 'actif' && f.client) {
      console.log(`  ⤫  ${email.padEnd(32)} abonnement PAYANT en cours — à annuler côté Stripe d'abord`);
      continue;
    }
    if (retirer && f.statut !== 'offert') {
      console.log(`  ·  ${email.padEnd(32)} n'a pas d'accès offert (statut « ${f.statut} ») — rien à retirer`);
      continue;
    }
    if (!retirer && f.statut === 'offert') {
      console.log(`  ✓  ${email.padEnd(32)} accès déjà offert sur « ${f.nom} »`);
      continue;
    }

    const action = retirer ? 'RETIRER' : 'OFFRIR';
    console.log(`  →  ${email.padEnd(32)} ${action} sur « ${f.nom} » (statut actuel : ${f.statut})`);
    aFaire.push({ email, foyer: f });
  }

  console.log('');
  if (aFaire.length === 0) {
    console.log('  Rien à faire.');
    console.log('');
    process.exit(0);
  }

  if (!appliquer) {
    console.log(`  ${aFaire.length} foyer(s) seraient modifiés. Relance avec --appliquer :`);
    console.log(
      `    npm run beta -- ${drapeaux}${retirer ? '--retirer ' : ''}--appliquer ${emails.join(' ')}`,
    );
    console.log('');
    process.exit(0);
  }

  for (const { email, foyer } of aFaire) {
    if (retirer) {
      /*
       * ⚠ RETOUR EN `essai` ÉCHU, pas en `annule`. La personne n'a jamais eu
       * d'abonnement : lui afficher « Abonnement annulé » serait faux, et la
       * laisserait chercher une résiliation qu'elle n'a pas demandée. Un essai
       * arrivé à terme est exactement sa situation — et lui rouvre le parcours
       * d'abonnement normal si elle veut continuer.
       */
      await sql`
        update foyers
           set statut_abonnement = 'essai', abonnement_fin = now()
         where id = ${foyer.id}`;
      console.log(`  ✅ ${email} — accès retiré (« ${foyer.nom} »)`);
    } else {
      await sql`
        update foyers
           set statut_abonnement = 'offert',
               abonnement_fin = null,
               annulation_programmee = false
         where id = ${foyer.id}`;
      console.log(`  ✅ ${email} — accès offert, sans date de fin (« ${foyer.nom} »)`);
    }
  }
  console.log('');
} finally {
  await sql.end();
}
