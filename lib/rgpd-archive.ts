import 'server-only';
import { createRequire } from 'node:module';
import { Readable } from 'node:stream';
import { exporterDonneesFoyer } from '@/lib/rgpd';
import { fluxDocument } from '@/lib/documents/service';
import { DOSSIER_DEFAUT } from '@/lib/documents/schema';

/**
 * ARCHIVE D'EXPORT (RGPD, portabilité — article 20).
 * ==================================================
 * Le JSON seul était conforme mais peu utile : « lisible par machine » ne veut
 * pas dire lisible par une personne, et personne n'ouvre un JSON pour relire son
 * budget. Surtout, il ne contenait que des LIENS vers les documents — donc
 * quelqu'un qui exportait puis supprimait son compte se retrouvait avec des
 * liens morts à la place de son bail et du carnet de santé de ses enfants.
 *
 * L'archive contient trois choses, pour trois usages différents :
 *  · `donnees.json` — le format machine, celui que la loi demande ;
 *  · des `.csv` par module — ce qu'on ouvre réellement, dans un tableur ;
 *  · `documents/` — les VRAIS fichiers, rangés comme la personne les a rangés.
 *
 * ⚠ ÉCRITURE EN FLUX, jamais en mémoire. Un foyer peut avoir des centaines de
 * mégaoctets de documents (25 Mo par fichier) : les assembler en mémoire ferait
 * tomber la fonction pour les foyers les plus fournis, c'est-à-dire les plus
 * anciens clients. `archiver` écrit au fil de l'eau dans la réponse.
 */

/* ---------------------------------- CSV ---------------------------------- */

/**
 * ⚠ SÉPARATEUR `;` ET BOM UTF-8 — les deux sont indispensables, et les deux
 * relèvent du même piège : Excel en français.
 *
 *  · sans le point-virgule, Excel met toute la ligne dans la première cellule
 *    (la locale française attend `;`, la virgule étant le séparateur décimal) ;
 *  · sans le BOM, « Épargne » s'affiche « Ã‰pargne ».
 *
 * Un export « conforme » que le client n'arrive pas à ouvrir ne sert à rien.
 * LibreOffice et Numbers acceptent les deux.
 */
const BOM = '﻿';

function cellule(v: unknown): string {
  if (v === null || v === undefined) return '';
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'boolean') return v ? 'oui' : 'non';
  const s = String(v);
  // Guillemets, point-virgule ou saut de ligne → on protège la cellule.
  return /[";\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

/**
 * Tableau d'objets → CSV. Les colonnes sont déduites des clés, dans l'ordre où
 * elles apparaissent : le fichier suit donc la structure de la donnée, sans
 * qu'on ait à maintenir une liste de colonnes par module.
 */
function versCsv(lignes: Record<string, unknown>[], colonnes?: string[]): string {
  if (lignes.length === 0) return BOM;
  const cles = colonnes ?? [...new Set(lignes.flatMap((l) => Object.keys(l)))];
  const entete = cles.map(cellule).join(';');
  const corps = lignes.map((l) => cles.map((c) => cellule(l[c])).join(';'));
  return BOM + [entete, ...corps].join('\r\n') + '\r\n';
}

/* ------------------------------- Noms sûrs ------------------------------- */

/**
 * Rend un nom utilisable comme entrée d'archive sur les trois systèmes.
 *
 * ⚠ Ce n'est pas de la cosmétique : `..` ou `/` dans un nom de dossier venu de
 * la base permettrait d'écrire hors du dossier prévu au moment de la
 * décompression (« zip slip »). Les noms de dossiers sont du texte libre saisi
 * par l'utilisateur — on ne leur fait pas confiance.
 */
function nomSur(nom: string, defaut = 'sans-nom'): string {
  const propre = nom
    .replace(/[/\\:*?"<>|]/g, '-') // interdits sous Windows
    .replace(/\.\.+/g, '.')
    .replace(/^\.+/, '')
    .trim();
  return propre || defaut;
}

/* -------------------------------- Archive -------------------------------- */

export type Archive = { flux: ReadableStream; nomFichier: string };

/** Le peu qu'on utilise d'`archiver`, typé à la main (module CommonJS). */
type Archiveur = Readable & {
  append(source: string | NodeJS.ReadableStream, opts: { name: string; store?: boolean }): void;
  finalize(): Promise<void>;
  on(evt: 'warning' | 'error', cb: (e: Error) => void): void;
};

export async function construireArchive(
  foyerId: string,
  utilisateurId: string,
): Promise<Archive> {
  const donnees = await exporterDonneesFoyer(foyerId, utilisateurId);
  const jour = new Date().toISOString().slice(0, 10);
  const racine = `nestync-export-${jour}`;

  /*
   * ⚠ `archiver` v8 A CHANGÉ D'API. Les versions précédentes s'appelaient
   * `archiver('zip', …)` ; celle-ci n'expose que des classes, et il faut la
   * SOUS-CLASSE de format (`ZipArchive`) — `Archiver` est abstraite, son
   * constructeur ne pose jamais `_module`.
   *
   * Les deux erreurs intermédiaires compilent, passent le build, et n'échouent
   * qu'à l'exécution : « archiver is not a function », puis
   * « this._module.append is not a function ». Seul un essai réel les révèle —
   * ni les types (`@types/archiver`, en retard sur la v8) ni le build ne les
   * voient. C'est la raison pour laquelle cet export est testé en produisant
   * une vraie archive, pas seulement en compilant.
   *
   * `createRequire` va chercher exactement ce que le module CommonJS expose,
   * sans interopérabilité devinée par le bundler.
   *
   * `zlib.level` s'applique au texte ; les documents passent en `store`
   * (déjà compressés : PDF, JPEG).
   */
  const requerir = createRequire(import.meta.url);
  const { ZipArchive } = requerir('archiver') as {
    ZipArchive: new (options?: object) => Archiveur;
  };
  const zip = new ZipArchive({ zlib: { level: 6 } });

  // ⚠ Une erreur d'archivage ne doit pas rester muette : sans ça, le client
  // reçoit une archive tronquée qu'il croit complète.
  zip.on('warning', (e: Error) => console.error('[export] avertissement archive', e.message));
  zip.on('error', (e: Error) => console.error('[export] erreur archive', e.message));

  /* --- 1. Le JSON, format exigé par l'article 20 --- */
  zip.append(JSON.stringify(donnees, null, 2), { name: `${racine}/donnees.json` });

  /* --- 2. Un CSV par module, pour le tableur --- */
  const csvs: [string, Record<string, unknown>[]][] = [
    ['budget-comptes', donnees.budget.comptes],
    ['budget-transactions', donnees.budget.transactions],
    ['budget-categories', donnees.budget.categories],
    ['budget-echeances', donnees.budget.echeances],
    ['taches', donnees.taches],
    ['courses', donnees.courses],
    ['recettes', donnees.recettes],
    ['repas-semaine', donnees.semaine],
    ['cadeaux', donnees.cadeaux],
    ['occasions', donnees.occasions],
    ['evenements', donnees.evenements],
    ['documents', donnees.documents],
    ['membres-du-foyer', donnees.membres],
    ['appareils-notifications', donnees.notifications],
  ];
  for (const [nom, lignes] of csvs) {
    if (lignes.length === 0) continue; // pas de fichier vide : ça n'apprend rien
    zip.append(versCsv(lignes as Record<string, unknown>[]), {
      name: `${racine}/tableurs/${nom}.csv`,
    });
  }

  /* --- 3. Les documents, rangés comme dans l'application --- */
  const utilises = new Set<string>();
  for (const doc of donnees.documents) {
    const flux = await fluxDocument(doc.id);
    // `null` = document devenu inaccessible entre-temps. On saute plutôt que de
    // faire échouer toute l'archive pour un fichier.
    if (!flux) continue;

    const dossier = nomSur(doc.dossier || DOSSIER_DEFAUT, DOSSIER_DEFAUT);
    let nom = nomSur(doc.nom, 'document');
    // Deux fichiers homonymes dans le même dossier : le second écraserait le
    // premier à la décompression. On suffixe.
    let cle = `${dossier}/${nom}`;
    let i = 2;
    while (utilises.has(cle)) {
      const point = nom.lastIndexOf('.');
      const base = point > 0 ? nom.slice(0, point) : nom;
      const ext = point > 0 ? nom.slice(point) : '';
      cle = `${dossier}/${base} (${i})${ext}`;
      i++;
    }
    utilises.add(cle);
    nom = cle.slice(dossier.length + 1);

    zip.append(Readable.fromWeb(flux.flux as Parameters<typeof Readable.fromWeb>[0]), {
      name: `${racine}/documents/${dossier}/${nom}`,
      store: true, // déjà compressé : recompresser coûterait du temps pour rien
    });
  }

  /* --- 4. Un mode d'emploi : sans lui, l'archive est un tas de fichiers --- */
  zip.append(lisezMoi(donnees, racine), { name: `${racine}/LISEZ-MOI.txt` });

  void zip.finalize();

  return {
    flux: Readable.toWeb(zip) as ReadableStream,
    nomFichier: `${racine}.zip`,
  };
}

function lisezMoi(
  d: Awaited<ReturnType<typeof exporterDonneesFoyer>>,
  racine: string,
): string {
  return [
    'VOS DONNÉES NESTYNC',
    '='.repeat(60),
    '',
    `Export réalisé le ${new Date().toLocaleString('fr-FR')}.`,
    `Foyer : ${d.foyer?.nom ?? '—'}`,
    '',
    'CE QUE CONTIENT CETTE ARCHIVE',
    '-'.repeat(60),
    '',
    `${racine}/donnees.json`,
    "  L'intégralité de vos données dans un format lisible par un programme.",
    "  C'est le format prévu par le règlement européen pour la portabilité.",
    '',
    `${racine}/tableurs/*.csv`,
    '  Les mêmes données, un fichier par module, à ouvrir dans un tableur',
    '  (Excel, LibreOffice, Numbers, Google Sheets).',
    '',
    `${racine}/documents/`,
    '  Vos fichiers, rangés dans les mêmes dossiers que dans l’application.',
    '  Ce sont les fichiers d’origine : ils s’ouvrent normalement.',
    '',
    'BON À SAVOIR',
    '-'.repeat(60),
    '',
    d.budgetPartiel
      ? "· Certains comptes du foyer ne vous étant pas partagés, cet export ne\n  contient que ce que vous pouviez consulter dans l’application."
      : '· Cet export contient tout ce que vous pouviez consulter dans l’application.',
    '',
    "· Les données partagées du foyer (recettes, tâches, liste de courses…)",
    '  sont incluses : vous y aviez accès.',
    '',
    "· Vous pouvez demander cet export à tout moment, y compris après la fin",
    "  d’un abonnement, tant que votre compte existe.",
    '',
    '· Une question ? https://nestync.app/aide',
    '',
  ].join('\n');
}
