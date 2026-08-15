import 'server-only';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { put, del, get } from '@vercel/blob';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { chiffrerFichier, dechiffrerFichier } from '@/lib/stockage/chiffrement';

/**
 * COUCHE DE STOCKAGE DE FICHIERS (serveur uniquement).
 * ===================================================
 * Abstraction volontaire au-dessus du fournisseur : le reste de l'app ne connaît
 * que `televerser` / `supprimerFichier` / `lireFichier`. Changer de fournisseur =
 * réécrire **ce seul fichier**.
 *
 * ⚠ DEUX FOURNISSEURS COHABITENT, ET C'EST VOULU (08/08/2026).
 *  · **OVHcloud Object Storage** (S3, région Paris) dès que `OVH_S3_*` est
 *    configuré — c'est la cible ;
 *  · **Vercel Blob** sinon — l'historique.
 *
 * Pourquoi cette bascule par CONFIGURATION et non par déploiement : le code part
 * en production avant que les identifiants OVH n'existent. Sans ce repli, le
 * module Documents tomberait en panne entre les deux. Ici, rien ne change tant
 * que les variables ne sont pas posées, puis tout bascule sans redéployer.
 *
 * Pourquoi OVH : les documents d'un foyer — papiers d'identité, carnet de santé —
 * sont la donnée la plus sensible du service. Vercel est une société américaine,
 * dont l'engagement de notification en cas de violation n'est pas chiffré. OVH
 * est français, certifié ISO 27001/27017/27018/27701 **et HDS**, ne facture pas
 * la sortie de données, et le conteneur est en **3-AZ** (la perte d'un
 * datacenter n'emporte rien).
 *
 * ⚠ DANS LES DEUX CAS, LE STOCKAGE EST PRIVÉ : aucun fichier n'est accessible par
 * URL. Toute lecture passe par notre API, qui vérifie d'abord que le document
 * appartient au foyer connecté (`app/api/documents/[id]/route.ts`). C'est ce qui
 * rend un bail réellement privé — ne jamais rendre le conteneur public.
 */

/* --------------------------------- OVH (S3) -------------------------------- */

function configOvh() {
  const bucket = process.env.OVH_S3_BUCKET;
  const endpoint = process.env.OVH_S3_ENDPOINT;
  const region = process.env.OVH_S3_REGION;
  const accessKeyId = process.env.OVH_S3_ACCESS_KEY;
  const secretAccessKey = process.env.OVH_S3_SECRET_KEY;
  if (!bucket || !endpoint || !region || !accessKeyId || !secretAccessKey) return null;
  return { bucket, endpoint, region, accessKeyId, secretAccessKey };
}

/* ------------------------------ DISQUE LOCAL ------------------------------
 * Bac à sable de développement : les fichiers atterrissent dans un dossier du
 * projet au lieu du conteneur OVH.
 *
 * ⚠ POURQUOI CE TROISIÈME FOURNISSEUR EXISTE. Sans lui, tester le module
 * Documents en local imposait de viser le VRAI conteneur — donc de risquer d'y
 * écrire, et surtout d'en SUPPRIMER un fichier appartenant à un foyer client.
 * C'est le seul module où une manipulation de développement pouvait détruire
 * une donnée réelle irrécupérable.
 *
 * ⚠ NE S'ACTIVE JAMAIS EN PRODUCTION : la double condition (variable posée ET
 * `NODE_ENV !== 'production'`) est délibérée. Une variable oubliée dans
 * l'environnement Vercel ne suffirait pas à faire basculer la production sur un
 * disque éphémère — les fichiers y disparaîtraient au redéploiement suivant.
 * ------------------------------------------------------------------------- */

function dossierLocal(): string | null {
  const chemin = process.env.STOCKAGE_LOCAL;
  if (!chemin || process.env.NODE_ENV === 'production') return null;
  return chemin;
}

let clientS3: S3Client | null = null;
function s3(c: NonNullable<ReturnType<typeof configOvh>>): S3Client {
  if (clientS3) return clientS3;
  clientS3 = new S3Client({
    region: c.region,
    endpoint: c.endpoint,
    credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey },
    // OVH attend le style « virtual-hosted » comme AWS : on laisse le défaut.
  });
  return clientS3;
}

/* -------------------------------- Interface -------------------------------- */

export class StockageNonConfigure extends Error {
  constructor() {
    super(
      'Stockage de fichiers non configuré (ni OVH_S3_*, ni BLOB_READ_WRITE_TOKEN, ni STOCKAGE_LOCAL en développement).',
    );
    this.name = 'StockageNonConfigure';
  }
}

export type FichierStocke = { cle: string; taille: number };

/**
 * Téléverse un fichier et renvoie sa **clé** (chemin interne), mémorisée en base.
 *
 * Le chemin est préfixé par le foyer : le cloisonnement existe donc aussi dans
 * l'arborescence du stockage, pas seulement dans nos requêtes SQL.
 *
 * ⚠ Cette couche ne reçoit QUE des octets — ni nom, ni type. Ce n'est pas un
 * oubli : ce sont précisément les métadonnées qu'on refuse d'exposer à
 * l'hébergeur (voir plus bas). Elles vivent en base, où elles sont utiles.
 */
export async function televerser(foyerId: string, donnees: Buffer): Promise<FichierStocke> {
  const ovh = configOvh();

  /**
   * ⚠ RIEN DE LISIBLE NE PART VERS LE STOCKAGE.
   *
   *  · le CONTENU est chiffré (cf. lib/stockage/chiffrement.ts) ;
   *  · la CLÉ est opaque — un UUID, **sans le nom du fichier**. Chiffrer le
   *    contenu en laissant « Ordonnance_Dr_Martin.pdf » dans le chemin annulerait
   *    une bonne part du bénéfice : le nom d'un document médical en dit déjà
   *    beaucoup. Le vrai nom vit en base (`documents.nom`), et c'est lui que la
   *    route de téléchargement renvoie ;
   *  · le type MIME déclaré est neutre, pour la même raison. Le vrai type vit
   *    aussi en base (`documents.type`).
   *
   * Vu depuis la console de l'hébergeur : des identifiants sans signification,
   * contenant des octets illisibles. `nomFichier` et `type` ne servent donc plus
   * qu'à la base — on les garde en paramètres pour ne pas casser les appelants
   * et pour le repli Vercel Blob.
   */
  const contenu = chiffrerFichier(donnees);
  const taille = donnees.byteLength; // taille RÉELLE, celle qu'on affiche

  const local = dossierLocal();
  if (local) {
    const cle = `foyers/${foyerId}/${randomUUID()}`;
    const chemin = join(local, cle);
    await mkdir(dirname(chemin), { recursive: true });
    await writeFile(chemin, contenu);
    return { cle, taille };
  }

  if (ovh) {
    const cle = `foyers/${foyerId}/${randomUUID()}`;
    await s3(ovh).send(
      new PutObjectCommand({
        Bucket: ovh.bucket,
        Key: cle,
        Body: contenu,
        ContentType: 'application/octet-stream',
      }),
    );
    return { cle, taille };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new StockageNonConfigure();
  const res = await put(`foyers/${foyerId}/${randomUUID()}`, contenu, {
    access: 'private',
    contentType: 'application/octet-stream',
  });
  return { cle: res.pathname, taille };
}

/**
 * Supprime un fichier. Silencieux s'il a déjà disparu : une suppression est une
 * intention, pas une transaction — l'échec d'un fichier absent n'a rien à
 * signaler à l'utilisateur.
 */
export async function supprimerFichier(cle: string): Promise<void> {
  const local = dossierLocal();
  if (local) {
    try {
      await rm(join(local, cle));
    } catch {
      /* déjà absent */
    }
    return;
  }

  const ovh = configOvh();
  if (ovh) {
    try {
      await s3(ovh).send(new DeleteObjectCommand({ Bucket: ovh.bucket, Key: cle }));
    } catch {
      /* déjà absent */
    }
    return;
  }
  if (!process.env.BLOB_READ_WRITE_TOKEN) return;
  try {
    await del(cle);
  } catch {
    /* déjà absent */
  }
}

/**
 * Contenu d'un fichier, pour le servir via notre API — le contrôle d'accès est
 * fait EN AMONT par l'appelant. Renvoie `null` si le fichier n'existe pas, ce que
 * l'API traduit en 404 sans révéler s'il existe ailleurs.
 */
export async function lireFichier(
  cle: string,
): Promise<{ flux: ReadableStream; type: string } | null> {
  const ovh = configOvh();

  /**
   * ⚠ On rapatrie le fichier ENTIER avant de le rendre, au lieu de le diffuser
   * au fil de l'eau. AES-GCM authentifie : le marqueur d'intégrité se trouve en
   * tête, mais il ne peut être vérifié qu'une fois tout le corps lu. Diffuser
   * avant vérification reviendrait à servir des octets qu'on n'a pas encore
   * validés — exactement ce que l'authentification est censée empêcher.
   * Acceptable ici : un document est plafonné à 25 Mo (`TAILLE_MAX`).
   */
  let brut: Buffer | null = null;
  let typeStocke = 'application/octet-stream';

  const local = dossierLocal();
  if (local) {
    try {
      brut = await readFile(join(local, cle));
    } catch {
      return null; // fichier absent : indiscernable côté API
    }
  } else if (ovh) {
    try {
      const res = await s3(ovh).send(new GetObjectCommand({ Bucket: ovh.bucket, Key: cle }));
      if (!res.Body) return null;
      brut = Buffer.from(await res.Body.transformToByteArray());
      typeStocke = res.ContentType || typeStocke;
    } catch {
      return null; // clé inconnue ou droits insuffisants : indiscernable côté API
    }
  } else {
    if (!process.env.BLOB_READ_WRITE_TOKEN) throw new StockageNonConfigure();
    const res = await get(cle, { access: 'private' });
    if (!res || res.statusCode !== 200) return null;
    brut = Buffer.from(await new Response(res.stream).arrayBuffer());
    typeStocke = res.blob.contentType || typeStocke;
  }

  const clair = dechiffrerFichier(brut);
  // `null` = chiffré mais illisible (clé changée, fichier altéré). On préfère un
  // 404 à un document corrompu servi comme s'il était valide.
  if (!clair) return null;

  return {
    flux: new Blob([new Uint8Array(clair)]).stream(),
    type: typeStocke,
  };
}
