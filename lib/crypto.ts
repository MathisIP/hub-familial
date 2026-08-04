import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * CHIFFREMENT DES SECRETS STOCKÉS EN BASE (serveur, runtime Node).
 * ================================================================
 * Sert aux jetons OAuth Google Agenda : ce sont des identifiants **durables**
 * donnant accès au calendrier d'une personne. Les stocker en clair signifierait
 * qu'une fuite de la base livre directement ces accès.
 *
 * AES-256-GCM (chiffrement + authentification : toute altération est détectée).
 * La clé dérive d'`AUTH_SECRET` — déjà présent et déjà critique — via scrypt,
 * ce qui évite d'introduire un secret de plus à gérer.
 *
 * Format stocké : `iv.tag.donnees`, en base64url.
 */

const SEL = 'nestync-jetons-v1'; // fixe : la clé doit être reproductible

let cleCache: Buffer | null = null;
function cle(): Buffer {
  if (cleCache) return cleCache;
  const secret = process.env.AUTH_SECRET;
  if (!secret) throw new Error('AUTH_SECRET manquant : impossible de chiffrer les jetons.');
  cleCache = scryptSync(secret, SEL, 32);
  return cleCache;
}

export function chiffrer(texte: string): string {
  const iv = randomBytes(12); // 96 bits, taille recommandée pour GCM
  const c = createCipheriv('aes-256-gcm', cle(), iv);
  const donnees = Buffer.concat([c.update(texte, 'utf8'), c.final()]);
  return [iv, c.getAuthTag(), donnees].map((b) => b.toString('base64url')).join('.');
}

/** Déchiffre ; renvoie `null` si la valeur est illisible (clé changée, données altérées). */
export function dechiffrer(blob: string | null | undefined): string | null {
  if (!blob) return null;
  try {
    const [iv, tag, donnees] = blob.split('.').map((p) => Buffer.from(p, 'base64url'));
    if (!iv || !tag || !donnees) return null;
    const d = createDecipheriv('aes-256-gcm', cle(), iv);
    d.setAuthTag(tag);
    return Buffer.concat([d.update(donnees), d.final()]).toString('utf8');
  } catch {
    return null;
  }
}
