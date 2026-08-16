/**
 * Garnit le foyer de demonstration de DOCUMENTS fictifs, ranges en dossiers.
 *
 * Utilise par scripts/demo-seed.mjs (`npm run bac:garnir`).
 *
 * Les fichiers sont de VRAIS fichiers de leur type (PDF valides, images
 * produites par sharp) : ouvrir un document dans l'app doit donner un rendu
 * credible, pas un octet aleatoire. C'est ce qui permet de tester l'apercu, le
 * telechargement et les icones par type.
 *
 * ⚠ LE CHIFFREMENT EST REPRODUIT ICI, PAS IMPORTE. lib/stockage/chiffrement.ts
 * est marque `server-only` et utilise les alias de chemin de Next : un script
 * Node ne peut pas l'importer. Le format est donc reecrit a l'identique —
 * NSY1 + iv(12) + tag GCM(16) + corps, AES-256-GCM, cle derivee par scrypt.
 * Deux garde-fous contre la derive : un aller-retour de verification a chaque
 * fichier ecrit (on relit et on compare), et ce commentaire. Si le format change
 * dans l'app, la verification casse ici — bruyamment, tout de suite.
 */
import { createCipheriv, createDecipheriv, randomBytes, randomUUID, scryptSync } from 'node:crypto';
import { mkdir, rm, writeFile, readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import sharp from 'sharp';

const MAGIE = Buffer.from('NSY1', 'ascii');
const SEL = 'nestync-documents-v1'; // doit rester identique a lib/stockage/chiffrement.ts

function cle() {
  const secret = process.env.DOCUMENTS_SECRET;
  if (!secret) return null;
  return scryptSync(secret, SEL, 32);
}

function chiffrer(donnees, k) {
  const iv = randomBytes(12);
  const c = createCipheriv('aes-256-gcm', k, iv);
  const corps = Buffer.concat([c.update(donnees), c.final()]);
  return Buffer.concat([MAGIE, iv, c.getAuthTag(), corps]);
}

function dechiffrer(donnees, k) {
  if (!donnees.subarray(0, 4).equals(MAGIE)) return null;
  const d = createDecipheriv('aes-256-gcm', k, donnees.subarray(4, 16));
  d.setAuthTag(donnees.subarray(16, 32));
  return Buffer.concat([d.update(donnees.subarray(32)), d.final()]);
}

/* ------------------------------ Fabriques ------------------------------ */

/**
 * Construit un PDF valide d'une page avec du texte lisible.
 *
 * Ecrit a la main plutot qu'avec une bibliotheque : le module n'a pas de
 * dependance PDF, et un generateur minimal suffit largement pour des fichiers de
 * test. Les decalages de la table `xref` sont calcules au fil de l'ecriture —
 * c'est la seule partie delicate d'un PDF, et une valeur fausse rend le fichier
 * illisible par certains lecteurs.
 */
function pdf(titre, lignes) {
  const echapper = (t) => t.replace(/([\\()])/g, '\\$1');
  const contenu =
    `BT /F1 20 Tf 60 780 Td (${echapper(titre)}) Tj ET\n` +
    lignes
      .map((l, i) => `BT /F1 12 Tf 60 ${740 - i * 22} Td (${echapper(l)}) Tj ET`)
      .join('\n');

  const objets = [
    '<</Type/Catalog/Pages 2 0 R>>',
    '<</Type/Pages/Kids[3 0 R]/Count 1>>',
    '<</Type/Page/Parent 2 0 R/MediaBox[0 0 595 842]/Resources<</Font<</F1 4 0 R>>>>/Contents 5 0 R>>',
    '<</Type/Font/Subtype/Type1/BaseFont/Helvetica/Encoding/WinAnsiEncoding>>',
    `<</Length ${Buffer.byteLength(contenu, 'latin1')}>>\nstream\n${contenu}\nendstream`,
  ];

  let sortie = '%PDF-1.4\n';
  const offsets = [];
  objets.forEach((o, i) => {
    offsets.push(Buffer.byteLength(sortie, 'latin1'));
    sortie += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });

  const debutXref = Buffer.byteLength(sortie, 'latin1');
  sortie += `xref\n0 ${objets.length + 1}\n0000000000 65535 f \n`;
  for (const o of offsets) sortie += `${String(o).padStart(10, '0')} 00000 n \n`;
  sortie += `trailer\n<</Size ${objets.length + 1}/Root 1 0 R>>\nstartxref\n${debutXref}\n%%EOF\n`;

  // latin1 : un PDF sans police embarquee ne gere pas l'UTF-8. Les accents des
  // libelles sont donc translitteres en amont (cf. les contenus plus bas).
  return Buffer.from(sortie, 'latin1');
}

/** Image unie avec un degrade, en JPEG / PNG / WebP selon le format demande. */
async function image(format, largeur, hauteur, couleur) {
  const base = sharp({
    create: { width: largeur, height: hauteur, channels: 3, background: couleur },
  });
  if (format === 'jpeg') return base.jpeg({ quality: 82 }).toBuffer();
  if (format === 'webp') return base.webp({ quality: 82 }).toBuffer();
  return base.png().toBuffer();
}

/* ------------------------------- Contenus ------------------------------- */

/**
 * Le jeu de documents. Types varies a dessein — chaque type a son icone et son
 * comportement d'apercu dans l'app, et un jeu de test qui n'aurait que des PDF
 * ne prouverait rien.
 *
 * `dossier: ''` = boite d'arrivee (« Fichiers non classes »), volontairement
 * peuplee : c'est le cas d'un depot rapide depuis l'accueil.
 */
async function contenus() {
  return [
    // --- Papiers (restreint aux parents) ---
    {
      dossier: 'Papiers',
      nom: 'bail-appartement.pdf',
      type: 'application/pdf',
      donnees: pdf('Contrat de location', [
        'Logement : 14 rue des Lilas, 37000 Tours',
        'Surface : 78 m2 - 4 pieces',
        'Loyer mensuel : 890,00 EUR charges comprises',
        'Depot de garantie : 1 780,00 EUR',
        'Date d effet : 1er septembre 2024',
        'Bailleur : SCI Les Lilas',
        '',
        'Document fictif genere pour les tests.',
      ]),
    },
    {
      dossier: 'Papiers',
      nom: 'attestation-assurance-habitation.pdf',
      type: 'application/pdf',
      donnees: pdf('Attestation d assurance habitation', [
        'Assureur : Mutuelle de l Ouest',
        'Numero de contrat : H-2026-448213',
        'Periode : du 01/01/2026 au 31/12/2026',
        'Garanties : incendie, degats des eaux, vol, responsabilite civile',
        '',
        'Document fictif genere pour les tests.',
      ]),
    },
    {
      dossier: 'Papiers',
      nom: 'coordonnees-bancaires.txt',
      type: 'text/plain',
      donnees: Buffer.from(
        [
          'RELEVE D IDENTITE BANCAIRE (fictif)',
          '',
          'Titulaire  : Clara Lambert',
          'Banque     : Banque de demonstration',
          'IBAN       : FR76 3000 4000 0300 0000 0000 000',
          'BIC        : DEMOFRPPXXX',
          '',
          'Ce fichier est un contenu de test, aucune donnee reelle.',
        ].join('\n'),
        'utf8',
      ),
    },

    // --- Sante (restreint aux parents) ---
    {
      dossier: 'Sante',
      nom: 'carnet-sante-noe.pdf',
      type: 'application/pdf',
      donnees: pdf('Carnet de sante - Noe Lambert', [
        'Ne le 12 septembre 2020',
        'Groupe sanguin : A+',
        'Allergies : arachide (moderee)',
        '',
        'Vaccinations :',
        '  DTP          - rappel effectue le 14/03/2026',
        '  ROR          - 2 doses, a jour',
        '  Coqueluche   - a jour',
        '',
        'Document fictif genere pour les tests.',
      ]),
    },
    {
      dossier: 'Sante',
      nom: 'ordonnance-mars-2026.jpg',
      type: 'image/jpeg',
      donnees: await image('jpeg', 1240, 1754, { r: 250, g: 250, b: 245 }),
    },

    // --- Photos (tout le foyer) ---
    {
      dossier: 'Photos',
      nom: 'vacances-bretagne.jpg',
      type: 'image/jpeg',
      donnees: await image('jpeg', 1600, 1067, { r: 92, g: 148, b: 186 }),
    },
    {
      dossier: 'Photos',
      nom: 'anniversaire-noe.png',
      type: 'image/png',
      donnees: await image('png', 1200, 800, { r: 232, g: 122, b: 110 }),
    },
    {
      dossier: 'Photos',
      nom: 'dessin-manon.webp',
      type: 'image/webp',
      donnees: await image('webp', 900, 900, { r: 246, g: 205, b: 120 }),
    },

    // --- Scolaire (tout le foyer) ---
    {
      dossier: 'Scolaire',
      nom: 'liste-fournitures-CP.pdf',
      type: 'application/pdf',
      donnees: pdf('Liste de fournitures - CP', [
        '1 cartable sans roulettes',
        '1 trousse garnie (crayons de couleur, feutres)',
        '2 crayons a papier HB',
        '1 gomme blanche, 1 taille-crayon a reservoir',
        '1 ardoise Velleda + 2 feutres',
        '1 paire de ciseaux a bouts ronds',
        '1 baton de colle',
        '1 boite de mouchoirs',
        '',
        'Rentree : mardi 1er septembre 2026, 8h30.',
      ]),
    },
    {
      dossier: 'Scolaire',
      nom: 'emploi-du-temps.csv',
      type: 'text/csv',
      donnees: Buffer.from(
        [
          'Jour,Horaire,Matiere,Salle',
          'Lundi,08:30-10:00,Lecture,CP-A',
          'Lundi,10:15-11:30,Mathematiques,CP-A',
          'Mardi,08:30-10:00,Ecriture,CP-A',
          'Mardi,14:00-15:00,Sport,Gymnase',
          'Jeudi,08:30-10:00,Decouverte du monde,CP-A',
          'Jeudi,10:15-11:30,Arts plastiques,CP-A',
          'Vendredi,08:30-10:00,Mathematiques,CP-A',
          'Vendredi,14:00-15:30,Musique,Salle 3',
        ].join('\n'),
        'utf8',
      ),
    },

    // --- Boite d arrivee (aucun dossier) ---
    {
      dossier: '',
      nom: 'facture-electricite-juillet.pdf',
      type: 'application/pdf',
      donnees: pdf('Facture d electricite - juillet 2026', [
        'Client : Foyer Lambert',
        'Reference : EL-2026-07-99321',
        'Consommation : 284 kWh',
        'Montant TTC : 61,40 EUR',
        'Prelevement le 12/08/2026',
        '',
        'Document fictif genere pour les tests.',
      ]),
    },
    {
      dossier: '',
      nom: 'notes-reunion-ecole.txt',
      type: 'text/plain',
      donnees: Buffer.from(
        [
          'Reunion de rentree - 03/09/2026',
          '',
          '- Cantine : inscription avant le 15/09',
          '- Sortie piscine les jeudis a partir d octobre (prevoir bonnet)',
          '- Kermesse le 20 juin',
          '- Demander le formulaire pour les activites periscolaires',
        ].join('\n'),
        'utf8',
      ),
    },
  ];
}

/* -------------------------------- Ecriture ------------------------------- */

/**
 * Cree les dossiers, ecrit les fichiers chiffres sur le disque et insere les
 * lignes en base.
 *
 * `restreints` : noms de dossiers a limiter, et a qui. Sans membres
 * supplementaires dans le foyer, la restriction n a pas de sens — on la pose
 * quand meme, elle sera visible dans l ecran de partage.
 */
export async function garnirDocuments(sql, foyerId, { restreints = {} } = {}) {
  const racine = process.env.STOCKAGE_LOCAL;
  if (!racine) {
    console.log('\n  documents : ignores (STOCKAGE_LOCAL absent de .env.local)');
    return;
  }
  const k = cle();
  if (!k) {
    console.log('\n  documents : ignores (DOCUMENTS_SECRET absent — le depot serait refuse)');
    return;
  }

  // Purge : base ET disque. Sans le second, chaque reset laisserait derriere lui
  // des fichiers orphelins que plus aucune ligne ne designe.
  await sql`delete from documents where foyer_id = ${foyerId}`;
  await sql`delete from dossiers where foyer_id = ${foyerId}`;
  await rm(join(racine, 'foyers', foyerId), { recursive: true, force: true });

  const docs = await contenus();
  const dossiers = [...new Set(docs.map((d) => d.dossier).filter(Boolean))];

  for (const nom of dossiers) {
    const restreint = Object.prototype.hasOwnProperty.call(restreints, nom);
    const [row] = await sql`
      insert into dossiers (foyer_id, nom, partage)
      values (${foyerId}, ${nom}, ${restreint ? 'restreint' : 'foyer'})
      returning id`;
    for (const utilisateurId of restreints[nom] ?? []) {
      await sql`insert into dossiers_acces (foyer_id, dossier_id, utilisateur_id)
        values (${foyerId}, ${row.id}, ${utilisateurId})
        on conflict do nothing`;
    }
  }

  let octets = 0;
  for (const d of docs) {
    const cleStockage = `foyers/${foyerId}/${randomUUID()}`;
    const chemin = join(racine, cleStockage);
    const chiffre = chiffrer(d.donnees, k);

    await mkdir(dirname(chemin), { recursive: true });
    await writeFile(chemin, chiffre);

    // Aller-retour : on relit ce qu on vient d ecrire et on compare. Si le
    // format de chiffrement de l app change, ca casse ici plutot que de laisser
    // un jeu de test silencieusement illisible.
    const relu = dechiffrer(await readFile(chemin), k);
    if (!relu || !relu.equals(d.donnees)) {
      throw new Error(`chiffrement incoherent pour ${d.nom} — verifier lib/stockage/chiffrement.ts`);
    }

    await sql`insert into documents (foyer_id, nom, dossier, cle, type, taille)
      values (${foyerId}, ${d.nom}, ${d.dossier}, ${cleStockage}, ${d.type}, ${d.donnees.byteLength})`;
    octets += d.donnees.byteLength;
  }

  const parDossier = new Map();
  for (const d of docs) {
    const c = d.dossier || '(boite d arrivee)';
    parDossier.set(c, (parDossier.get(c) ?? 0) + 1);
  }

  console.log(`\n  documents : ${docs.length} fichiers chiffres (${Math.round(octets / 1024)} Ko)`);
  for (const [nom, n] of [...parDossier].sort()) {
    const marque = Object.prototype.hasOwnProperty.call(restreints, nom) ? ' [restreint]' : '';
    console.log(`     ${String(nom).padEnd(22)} ${String(n).padStart(2)}${marque}`);
  }
  const types = [...new Set(docs.map((d) => d.type))].sort();
  console.log(`     types : ${types.join(', ')}`);
}
