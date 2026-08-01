import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { documents as tDocuments } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { televerser, supprimerFichier, lireFichier } from '@/lib/stockage';
import {
  TAILLE_MAX,
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
    dossier: l.dossier,
    type: l.type,
    taille: l.taille,
    creeLe: l.creeLe.toISOString(),
  };
}

export async function chargerDocuments(): Promise<DonneesDocuments> {
  const foyerId = await idFoyerCourant();
  const lignes = await db()
    .select()
    .from(tDocuments)
    .where(eq(tDocuments.foyerId, foyerId))
    .orderBy(desc(tDocuments.creeLe));

  const documents = lignes.map(versDocument);
  const dossiers = [...new Set(documents.map((d) => d.dossier).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, 'fr'),
  );
  return { documents, dossiers };
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

  const { cle, taille } = await televerser(foyerId, nomPropre, donnees, type);

  const [ligne] = await db()
    .insert(tDocuments)
    .values({ foyerId, nom: nomPropre, dossier: normaliserDossier(dossier), cle, type, taille })
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
  if (champs.dossier !== undefined) maj.dossier = normaliserDossier(champs.dossier);
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
