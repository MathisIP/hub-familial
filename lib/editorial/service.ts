import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { editorialPosts as tPosts } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { televerser, supprimerFichier, lireFichier } from '@/lib/stockage';
import { POSTS_EDITORIAL } from '@/lib/editorial/posts';
import { STATUTS_EDITORIAL, etatParDefaut, type Post, type StatutEditorial } from '@/lib/editorial/schema';

/** Taille maximale d'un visuel de post — même plafond que la limite de requête Vercel. */
const TAILLE_MAX_VISUEL = 4 * 1024 * 1024;

/**
 * SERVICE CALENDRIER ÉDITORIAL (serveur uniquement) — Postgres, scopé au foyer.
 * Contenu des posts = constante figée (posts.ts). Seul l'état de suivi (statut,
 * visuel, résultats) est en base, une ligne par post touché.
 */

export async function chargerPostsEditorial(): Promise<Post[]> {
  const foyerId = await idFoyerCourant();
  const lignes = await db().select().from(tPosts).where(eq(tPosts.foyerId, foyerId));
  const parNumero = new Map(lignes.map((l) => [l.numero, l]));

  return POSTS_EDITORIAL.map((contenu) => {
    const l = parNumero.get(contenu.numero);
    const etat = l
      ? {
          numero: l.numero,
          statut: (STATUTS_EDITORIAL as readonly string[]).includes(l.statut)
            ? (l.statut as StatutEditorial)
            : 'À faire',
          visuelUrl: l.visuel,
          vues: l.vues,
          interactions: l.interactions,
          enregistrements: l.enregistrements,
          partages: l.partages,
        }
      : etatParDefaut(contenu.numero);
    // Surcharges de texte : `null` (jamais modifié) retombe sur POSTS_EDITORIAL.
    const textes = {
      hook: l?.hook ?? contenu.hook,
      visuel: l?.visuelTexte ?? contenu.visuel,
      legende: l?.legende ?? contenu.legende,
      hashtags: l?.hashtags ?? contenu.hashtags,
      note: l?.note ?? contenu.note,
    };
    return { ...contenu, ...textes, ...etat };
  });
}

/** Change le statut d'un post (upsert : la ligne peut ne pas encore exister). */
export async function definirStatutPost(numero: number, statut: string): Promise<void> {
  if (!(STATUTS_EDITORIAL as readonly string[]).includes(statut)) {
    throw new ErreurValidation(`Statut invalide : ${statut}.`);
  }
  if (!POSTS_EDITORIAL.some((p) => p.numero === numero)) {
    throw new ErreurValidation('Publication introuvable.');
  }
  const foyerId = await idFoyerCourant();
  await db()
    .insert(tPosts)
    .values({ foyerId, numero, statut, majLe: new Date() })
    .onConflictDoUpdate({
      target: [tPosts.foyerId, tPosts.numero],
      set: { statut, majLe: new Date() },
    });
}

export type ChampsEtatPost = {
  visuelUrl?: string;
  vues?: number | null;
  interactions?: number | null;
  enregistrements?: number | null;
  partages?: number | null;
};

/**
 * Modifie le visuel et/ou les résultats d'un post (upsert).
 *
 * ⚠ CHAMPS PARTIELS, COMME `modifierTache` (lib/todo/service.ts) : la fiche
 * envoie parfois un seul champ modifié (ex. juste le visuel), jamais tout le
 * formulaire — écraser les autres champs à `null` effacerait des résultats
 * déjà saisis par l'autre membre du foyer.
 */
export async function modifierEtatPost(numero: number, champs: ChampsEtatPost): Promise<void> {
  if (!POSTS_EDITORIAL.some((p) => p.numero === numero)) {
    throw new ErreurValidation('Publication introuvable.');
  }
  const foyerId = await idFoyerCourant();
  const d = db();

  // Upsert en deux temps : `onConflictDoUpdate` avec un set partiel écraserait
  // les colonnes absentes du set à leur valeur d'insertion (defaut/insert),
  // pas à leur valeur existante — il faut donc fusionner explicitement.
  const [existante] = await d
    .select()
    .from(tPosts)
    .where(and(eq(tPosts.foyerId, foyerId), eq(tPosts.numero, numero)))
    .limit(1);

  const valeurs = {
    visuel: champs.visuelUrl !== undefined ? champs.visuelUrl : (existante?.visuel ?? ''),
    vues: champs.vues !== undefined ? champs.vues : (existante?.vues ?? null),
    interactions: champs.interactions !== undefined ? champs.interactions : (existante?.interactions ?? null),
    enregistrements:
      champs.enregistrements !== undefined ? champs.enregistrements : (existante?.enregistrements ?? null),
    partages: champs.partages !== undefined ? champs.partages : (existante?.partages ?? null),
    majLe: new Date(),
  };

  await d
    .insert(tPosts)
    .values({ foyerId, numero, statut: existante?.statut ?? 'À faire', ...valeurs })
    .onConflictDoUpdate({ target: [tPosts.foyerId, tPosts.numero], set: valeurs });
}

export type ChampsTextePost = {
  hook?: string;
  visuel?: string; // le déroulé/script, pas la clé de stockage image
  legende?: string;
  hashtags?: string;
  note?: string;
};

/**
 * Modifie le contenu texte d'un post (hook, déroulé, légende, hashtags, note).
 * Simple écrasement, sans historique (décision utilisateur 07/09/2026) : le
 * texte d'origine reste consultable dans lib/editorial/posts.ts via git, mais
 * l'app elle-même ne garde qu'une seule version, la plus récente.
 *
 * ⚠ MÊME LOGIQUE DE FUSION PARTIELLE QUE `modifierEtatPost` : un champ non
 * envoyé garde sa valeur existante, jamais écrasé à `null` par erreur.
 */
export async function modifierTextesPost(numero: number, champs: ChampsTextePost): Promise<void> {
  if (!POSTS_EDITORIAL.some((p) => p.numero === numero)) {
    throw new ErreurValidation('Publication introuvable.');
  }
  const foyerId = await idFoyerCourant();
  const d = db();

  const [existante] = await d
    .select()
    .from(tPosts)
    .where(and(eq(tPosts.foyerId, foyerId), eq(tPosts.numero, numero)))
    .limit(1);

  const valeurs = {
    hook: champs.hook !== undefined ? champs.hook : (existante?.hook ?? null),
    visuelTexte: champs.visuel !== undefined ? champs.visuel : (existante?.visuelTexte ?? null),
    legende: champs.legende !== undefined ? champs.legende : (existante?.legende ?? null),
    hashtags: champs.hashtags !== undefined ? champs.hashtags : (existante?.hashtags ?? null),
    note: champs.note !== undefined ? champs.note : (existante?.note ?? null),
    majLe: new Date(),
  };

  await d
    .insert(tPosts)
    .values({
      foyerId,
      numero,
      statut: existante?.statut ?? 'À faire',
      visuel: existante?.visuel ?? '',
      ...valeurs,
    })
    .onConflictDoUpdate({ target: [tPosts.foyerId, tPosts.numero], set: valeurs });
}

/**
 * Téléverse un visuel pour un post (stockage dédié, indépendant du module
 * Documents — voir lib/stockage/index.ts). Remplace l'éventuel visuel
 * précédent : un post n'illustre qu'une seule publication à la fois.
 *
 * ⚠ LA CLÉ DE STOCKAGE (`foyers/<id>/<uuid>`) EST CE QUI EST ÉCRIT DANS
 * `editorial_posts.visuel` — pas une URL publique. La lecture passe toujours
 * par `fluxVisuelPost`, qui vérifie l'appartenance au foyer avant de
 * déchiffrer, comme pour les documents.
 */
export async function televerserVisuelPost(numero: number, donnees: Buffer): Promise<void> {
  if (!POSTS_EDITORIAL.some((p) => p.numero === numero)) {
    throw new ErreurValidation('Publication introuvable.');
  }
  if (donnees.byteLength > TAILLE_MAX_VISUEL) {
    throw new ErreurValidation('Image trop lourde (4 Mo maximum).');
  }
  const foyerId = await idFoyerCourant();
  const d = db();

  const [existante] = await d
    .select({ visuel: tPosts.visuel })
    .from(tPosts)
    .where(and(eq(tPosts.foyerId, foyerId), eq(tPosts.numero, numero)))
    .limit(1);

  const { cle } = await televerser(foyerId, donnees);

  await d
    .insert(tPosts)
    .values({ foyerId, numero, visuel: cle, majLe: new Date() })
    .onConflictDoUpdate({ target: [tPosts.foyerId, tPosts.numero], set: { visuel: cle, majLe: new Date() } });

  // Après coup : un ancien visuel supprimé ne doit jamais bloquer l'écriture du nouveau.
  if (existante?.visuel) await supprimerFichier(existante.visuel);
}

/**
 * Flux du visuel d'un post, pour la route de service — vérifie d'abord que la
 * clé demandée appartient bien à un post de CE foyer (même garde que
 * `fluxDocument`, lib/documents/service.ts) : `null` sinon, jamais une
 * exception qui distinguerait « clé inconnue » de « clé d'un autre foyer ».
 */
export async function fluxVisuelPost(numero: number): Promise<{ flux: ReadableStream; type: string } | null> {
  const foyerId = await idFoyerCourant();
  const [ligne] = await db()
    .select({ visuel: tPosts.visuel })
    .from(tPosts)
    .where(and(eq(tPosts.foyerId, foyerId), eq(tPosts.numero, numero)))
    .limit(1);
  if (!ligne?.visuel) return null;
  return lireFichier(ligne.visuel);
}
