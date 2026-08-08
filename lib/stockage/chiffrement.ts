import 'server-only';
import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

/**
 * CHIFFREMENT DU CONTENU DES FICHIERS (serveur, runtime Node).
 * ============================================================
 * Les documents d'un foyer partent chiffrés vers le stockage. Conséquence
 * concrète : la console OVHcloud, un employé de l'hébergeur, une clé S3 qui
 * fuite ou une réquisition adressée à OVH ne donnent que des octets illisibles.
 *
 * ⚠ CE QUE CELA NE PROTÈGE PAS. Le serveur doit pouvoir déchiffrer pour servir
 * un document aux membres du foyer : la clé existe donc dans son environnement.
 * Ce n'est pas « personne ne peut lire », c'est « **seule l'application peut
 * lire, l'hébergeur non** ». Un vrai bout-en-bout est hors d'atteinte ici :
 * l'authentification passe par Google (aucun mot de passe dont dériver une clé)
 * et le partage entre membres du foyer imposerait un échange de clés.
 *
 * ⚠ CLÉ DÉDIÉE, JAMAIS `AUTH_SECRET`. C'est la leçon directe de l'incident des
 * jetons Google : quand une clé sert à deux usages, la faire tourner après un
 * incident détruit les données de l'autre. `DOCUMENTS_SECRET` se fait tourner
 * indépendamment — mais **jamais sans re-chiffrer les fichiers existants**, sous
 * peine de les rendre définitivement illisibles.
 *
 * Format : `NSY1` (4 o) · iv (12 o) · tag GCM (16 o) · données chiffrées.
 * L'en-tête magique rend le format **auto-descriptif** : un fichier déposé avant
 * l'activation du chiffrement (ou pendant que la clé était absente) se relit
 * sans erreur, puisqu'on peut le reconnaître au lieu de le deviner.
 */

const MAGIE = Buffer.from('NSY1', 'ascii');
const SEL = 'nestync-documents-v1'; // fixe : la clé doit être reproductible

let cleCache: Buffer | null = null;
function cle(): Buffer | null {
  if (cleCache) return cleCache;
  const secret = process.env.DOCUMENTS_SECRET;
  if (!secret) return null;
  cleCache = scryptSync(secret, SEL, 32);
  return cleCache;
}

/** Le chiffrement des documents est-il configuré ? */
export function chiffrementDisponible(): boolean {
  return !!process.env.DOCUMENTS_SECRET;
}

/**
 * Chiffre le contenu d'un fichier. Sans clé configurée, renvoie les données
 * telles quelles : le module continue de fonctionner, en clair, plutôt que de
 * refuser tout téléversement. L'en-tête magique permettra de distinguer les deux.
 */
export function chiffrerFichier(donnees: Buffer): Buffer {
  const k = cle();
  if (!k) return donnees;
  const iv = randomBytes(12); // 96 bits, taille recommandée pour GCM
  const c = createCipheriv('aes-256-gcm', k, iv);
  const corps = Buffer.concat([c.update(donnees), c.final()]);
  return Buffer.concat([MAGIE, iv, c.getAuthTag(), corps]);
}

/**
 * Déchiffre le contenu d'un fichier.
 *
 * Renvoie `null` si les données sont chiffrées mais illisibles (mauvaise clé,
 * fichier altéré) : mieux vaut un 404 qu'un octet corrompu servi comme un
 * document valide. Un fichier sans en-tête magique est rendu tel quel — c'est le
 * cas d'un dépôt antérieur au chiffrement.
 */
export function dechiffrerFichier(donnees: Buffer): Buffer | null {
  if (donnees.length < MAGIE.length || !donnees.subarray(0, 4).equals(MAGIE)) {
    return donnees; // déposé en clair : rien à déchiffrer
  }
  const k = cle();
  if (!k) return null; // chiffré, mais la clé a disparu de l'environnement
  try {
    const iv = donnees.subarray(4, 16);
    const tag = donnees.subarray(16, 32);
    const corps = donnees.subarray(32);
    const d = createDecipheriv('aes-256-gcm', k, iv);
    d.setAuthTag(tag); // GCM authentifie : toute altération est détectée
    return Buffer.concat([d.update(corps), d.final()]);
  } catch {
    return null;
  }
}
