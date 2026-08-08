import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents as tDocuments, dossiers as tDossiers } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { televerser, supprimerFichier, lireFichier } from '@/lib/stockage';
import {
  TAILLE_MAX,
  DOSSIER_DEFAUT,
  normaliserDossier,
  type ChampsDocument,
  type Document,
  type DonneesDocuments,
} from '@/lib/documents/schema';

/**
 * SERVICE DOCUMENTS (serveur uniquement) — Postgres + stockage objet.
 * ==================================================================
 * Remplace l'explorateur Google Drive : les fichiers appartiennent au foyer et
 * vivent dans NOTRE stockage (plus aucun scope Google sensible).
 *
 * ⚠ Isolation : CHAQUE requête filtre sur `foyer_id`. Un document d'un autre
 * foyer est introuvable — y compris au téléchargement (cf. `fluxDocument`).
 */

function versDocument(l: {
  id: string;
  nom: string;
  dossier: string;
  type: string;
  taille: number;
  creeLe: Date;
}): Document {
  return {
    id: l.id,
    nom: l.nom,
    // Les documents historiques sans dossier sont rattachés à la boîte d'arrivée.
    dossier: l.dossier || DOSSIER_DEFAUT,
    type: l.type,
    taille: l.taille,
    creeLe: l.creeLe.toISOString(),
  };
}

export async function chargerDocuments(): Promise<DonneesDocuments> {
  const foyerId = await idFoyerCourant();
  const [lignes, lignesDossiers] = await Promise.all([
    db().select().from(tDocuments).where(eq(tDocuments.foyerId, foyerId)).orderBy(desc(tDocuments.creeLe)),
    db().select().from(tDossiers).where(eq(tDossiers.foyerId, foyerId)),
  ]);

  const documents = lignes.map(versDocument);
  // Union : dossiers déclarés (dont les VIDES) + ceux portés par les documents.
  const dossiers = [
    ...new Set([
      ...lignesDossiers.map((d) => d.nom),
      ...documents.map((d) => d.dossier),
    ].filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'fr'));

  return { documents, dossiers };
}

/** Crée le dossier s'il n'existe pas déjà (idempotent). */
async function assurerDossier(foyerId: string, nom: string): Promise<void> {
  const n = normaliserDossier(nom);
  if (!n) return;
  await db()
    .insert(tDossiers)
    .values({ foyerId, nom: n })
    .onConflictDoNothing({ target: [tDossiers.foyerId, tDossiers.nom] });
}

export async function creerDossier(nom: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const n = normaliserDossier(nom);
  if (!n) throw new ErreurValidation('Le nom du dossier ne peut pas être vide.');
  await assurerDossier(foyerId, n);
}

/** Renomme un dossier : la ligne `dossiers` ET les documents qu'il contient. */
export async function renommerDossier(ancien: string, nouveau: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const a = normaliserDossier(ancien);
  const n = normaliserDossier(nouveau);
  if (!n) throw new ErreurValidation('Le nom du dossier ne peut pas être vide.');
  if (a === n) return;
  if (a === DOSSIER_DEFAUT) throw new ErreurValidation('Ce dossier ne peut pas être renommé.');

  // Le dossier cible peut déjà exister → on fusionne (pas de doublon en base).
  await assurerDossier(foyerId, n);
  await db().delete(tDossiers).where(and(eq(tDossiers.foyerId, foyerId), eq(tDossiers.nom, a)));
  await db()
    .update(tDocuments)
    .set({ dossier: n })
    .where(and(eq(tDocuments.foyerId, foyerId), eq(tDocuments.dossier, a)));
}

/**
 * Supprime un dossier. Les fichiers ne sont JAMAIS perdus : ils repartent dans
 * la boîte d'arrivée (« Fichiers non classés »).
 */
export async function supprimerDossier(nom: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const n = normaliserDossier(nom);
  if (!n || n === DOSSIER_DEFAUT) {
    throw new ErreurValidation('Ce dossier ne peut pas être supprimé.');
  }
  await db()
    .update(tDocuments)
    .set({ dossier: DOSSIER_DEFAUT })
    .where(and(eq(tDocuments.foyerId, foyerId), eq(tDocuments.dossier, n)));
  await db().delete(tDossiers).where(and(eq(tDossiers.foyerId, foyerId), eq(tDossiers.nom, n)));
}

/** Téléverse un fichier et enregistre ses métadonnées. */
export async function ajouterDocument(
  nom: string,
  type: string,
  donnees: Buffer,
  dossier = '',
): Promise<Document> {
  const foyerId = await idFoyerCourant();
  const nomPropre = nom.trim() || 'document';
  if (donnees.byteLength === 0) throw new ErreurValidation('Fichier vide.');
  if (donnees.byteLength > TAILLE_MAX) {
    throw new ErreurValidation('Fichier trop volumineux (25 Mo maximum).');
  }

  // Sans dossier précisé (ex. ajout depuis l'accueil) → boîte d'arrivée.
  const cible = normaliserDossier(dossier) || DOSSIER_DEFAUT;
  const { cle, taille } = await televerser(foyerId, donnees);
  await assurerDossier(foyerId, cible);

  const [ligne] = await db()
    .insert(tDocuments)
    .values({ foyerId, nom: nomPropre, dossier: cible, cle, type, taille })
    .returning();

  return versDocument(ligne);
}

/** Renomme un document et/ou le range dans un autre dossier. */
export async function modifierDocument(id: string, champs: ChampsDocument): Promise<void> {
  const foyerId = await idFoyerCourant();
  const maj: { nom?: string; dossier?: string } = {};

  if (champs.nom !== undefined) {
    const n = champs.nom.trim();
    if (!n) throw new ErreurValidation('Le nom ne peut pas être vide.');
    maj.nom = n;
  }
  if (champs.dossier !== undefined) {
    const cible = normaliserDossier(champs.dossier) || DOSSIER_DEFAUT;
    await assurerDossier(foyerId, cible); // déplacer vers un nouveau dossier le crée
    maj.dossier = cible;
  }
  if (Object.keys(maj).length === 0) return;

  await db()
    .update(tDocuments)
    .set(maj)
    .where(and(eq(tDocuments.id, id), eq(tDocuments.foyerId, foyerId)));
}

/** Supprime le document (base + fichier stocké). */
export async function supprimerDocument(id: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const [ligne] = await db()
    .delete(tDocuments)
    .where(and(eq(tDocuments.id, id), eq(tDocuments.foyerId, foyerId)))
    .returning();

  // Pas de ligne supprimée = document inexistant OU d'un autre foyer : on ne
  // touche à aucun fichier (garde-fou d'isolation).
  if (ligne) await supprimerFichier(ligne.cle);
}

/**
 * Contenu d'un document, pour le servir. Renvoie `null` si le document n'existe
 * pas **ou n'appartient pas au foyer courant** — c'est ici que se joue la
 * confidentialité, le stockage étant privé (aucune URL publique).
 */
export async function fluxDocument(
  id: string,
): Promise<{ flux: ReadableStream; type: string; nom: string } | null> {
  const foyerId = await idFoyerCourant();
  const [ligne] = await db()
    .select()
    .from(tDocuments)
    .where(and(eq(tDocuments.id, id), eq(tDocuments.foyerId, foyerId)))
    .limit(1);
  if (!ligne) return null;

  const fichier = await lireFichier(ligne.cle);
  if (!fichier) return null;
  return { flux: fichier.flux, type: ligne.type || fichier.type, nom: ligne.nom };
}
