import 'server-only';
import { randomUUID } from 'node:crypto';
import { put, del, get } from '@vercel/blob';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';

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

/** Un stockage est-il configuré ? (OVH en priorité, Vercel Blob en repli.) */
export function stockageDisponible(): boolean {
  return !!configOvh() || !!process.env.BLOB_READ_WRITE_TOKEN;
}

export class StockageNonConfigure extends Error {
  constructor() {
    super('Stockage de fichiers non configuré (ni OVH_S3_*, ni BLOB_READ_WRITE_TOKEN).');
    this.name = 'StockageNonConfigure';
  }
}

export type FichierStocke = { cle: string; taille: number };

/**
 * Téléverse un fichier et renvoie sa **clé** (chemin interne), mémorisée en base.
 *
 * Le chemin est préfixé par le foyer : le cloisonnement existe donc aussi dans
 * l'arborescence du stockage, pas seulement dans nos requêtes SQL. Un suffixe
 * aléatoire évite qu'un second fichier de même nom n'écrase le premier.
 */
export async function televerser(
  foyerId: string,
  nomFichier: string,
  donnees: Buffer,
  type: string,
): Promise<FichierStocke> {
  const ovh = configOvh();

  if (ovh) {
    const cle = `foyers/${foyerId}/${randomUUID()}-${nomFichier}`;
    await s3(ovh).send(
      new PutObjectCommand({
        Bucket: ovh.bucket,
        Key: cle,
        Body: donnees,
        ContentType: type || 'application/octet-stream',
      }),
    );
    return { cle, taille: donnees.byteLength };
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new StockageNonConfigure();
  const res = await put(`foyers/${foyerId}/${nomFichier}`, donnees, {
    access: 'private',
    contentType: type || 'application/octet-stream',
    addRandomSuffix: true,
  });
  return { cle: res.pathname, taille: donnees.byteLength };
}

/**
 * Supprime un fichier. Silencieux s'il a déjà disparu : une suppression est une
 * intention, pas une transaction — l'échec d'un fichier absent n'a rien à
 * signaler à l'utilisateur.
 */
export async function supprimerFichier(cle: string): Promise<void> {
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

  if (ovh) {
    try {
      const res = await s3(ovh).send(
        new GetObjectCommand({ Bucket: ovh.bucket, Key: cle }),
      );
      if (!res.Body) return null;
      return {
        flux: res.Body.transformToWebStream(),
        type: res.ContentType || 'application/octet-stream',
      };
    } catch {
      return null; // clé inconnue, ou droits insuffisants : indiscernable côté API
    }
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) throw new StockageNonConfigure();
  const res = await get(cle, { access: 'private' });
  if (!res || res.statusCode !== 200) return null;
  return { flux: res.stream, type: res.blob.contentType || 'application/octet-stream' };
}
