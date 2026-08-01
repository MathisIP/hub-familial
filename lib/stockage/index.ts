import 'server-only';
import { put, del, get } from '@vercel/blob';

/**
 * COUCHE DE STOCKAGE DE FICHIERS (serveur uniquement).
 * ===================================================
 * Abstraction volontaire au-dessus du fournisseur : le reste de l'app ne connaît
 * que `televerser` / `supprimerFichier` / `lireFichier`. Pour changer de
 * fournisseur (Cloudflare R2, S3…), **seul ce fichier** est à réécrire.
 *
 * Fournisseur actuel : **Vercel Blob**, en accès **`private`** — les fichiers ne
 * sont PAS accessibles par URL publique. Toute lecture passe par notre API, qui
 * vérifie d'abord que le document appartient bien au foyer connecté
 * (cf. `app/api/documents/[id]/route.ts`). C'est ce qui rend un bail ou un
 * carnet de santé réellement privé.
 */

/** Fournisseur configuré ? (le jeton est injecté automatiquement sur Vercel.) */
export function stockageDisponible(): boolean {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

export class StockageNonConfigure extends Error {
  constructor() {
    super("Stockage de fichiers non configuré (BLOB_READ_WRITE_TOKEN absent).");
    this.name = 'StockageNonConfigure';
  }
}

export type FichierStocke = { cle: string; taille: number };

/**
 * Téléverse un fichier et renvoie sa **clé** (chemin interne) — c'est elle qu'on
 * mémorise en base. Le chemin est préfixé par le foyer pour cloisonner le stockage.
 */
export async function televerser(
  foyerId: string,
  nomFichier: string,
  donnees: Buffer,
  type: string,
): Promise<FichierStocke> {
  if (!stockageDisponible()) throw new StockageNonConfigure();
  const chemin = `foyers/${foyerId}/${nomFichier}`;
  const res = await put(chemin, donnees, {
    access: 'private',
    contentType: type || 'application/octet-stream',
    addRandomSuffix: true, // évite d'écraser un fichier de même nom
  });
  return { cle: res.pathname, taille: donnees.byteLength };
}

/** Supprime un fichier du stockage. Silencieux s'il a déjà disparu. */
export async function supprimerFichier(cle: string): Promise<void> {
  if (!stockageDisponible()) return;
  try {
    await del(cle);
  } catch {
    // fichier déjà absent : rien à faire
  }
}

/** Contenu d'un fichier, pour le servir via notre API (contrôle d'accès en amont). */
export async function lireFichier(
  cle: string,
): Promise<{ flux: ReadableStream; type: string } | null> {
  if (!stockageDisponible()) throw new StockageNonConfigure();
  const res = await get(cle, { access: 'private' });
  if (!res || res.statusCode !== 200) return null;
  return { flux: res.stream, type: res.blob.contentType || 'application/octet-stream' };
}
