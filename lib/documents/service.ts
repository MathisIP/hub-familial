import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  documents as tDocuments,
  dossiers as tDossiers,
  dossiersAcces,
  membres as tMembres,
  utilisateurs as tUtilisateurs,
  type LigneDossier,
} from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { televerser, supprimerFichier, lireFichier } from '@/lib/stockage';
import {
  contexteAcces,
  filtrerRestreints,
  retenirMembres,
  PARTAGE_FOYER,
  PARTAGE_RESTREINT,
} from '@/lib/visibilite';
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


/* ---------------------------------------------------------------------------
 * VISIBILITÉ PAR DOSSIER
 *
 * ⚠ LE POINT DÉLICAT DU MODULE : `documents.dossier` porte le NOM du dossier,
 * pas une clé étrangère (cf. le commentaire de la table). La règle de partage,
 * elle, est attachée à `dossiers.id`, qui est stable. Le rapprochement se fait
 * donc par nom, et trois portes latérales doivent rester fermées :
 *
 *   1. **Déplacer un fichier HORS** d'un dossier restreint (`modifierDocument`)
 *      — exfiltration en une requête.
 *   2. **En faire entrer un DEDANS** en tapant le nom du dossier : le fichier
 *      disparaîtrait aux yeux de celui qui vient de le déposer.
 *   3. **Servir le contenu** par `GET /api/documents/<id>` : les identifiants
 *      circulent en clair dans le HTML de ceux qui voient le dossier, et un
 *      signet survit à une restriction posée après coup.
 *
 * Un fichier SANS dossier reste visible de tous : c'est le défaut, et ça évite
 * qu'un téléversement rapide atterrisse par accident dans une zone privée.
 * ------------------------------------------------------------------------- */

/** Noms de dossiers que cette personne peut voir, + le drapeau « rien n'est masqué ». */
async function dossiersAccessibles(
  foyerId: string,
  utilisateurId: string,
): Promise<{ noms: Set<string>; complet: boolean; tous: LigneDossier[] }> {
  const d = db();
  const [tous, acces] = await Promise.all([
    d.select().from(tDossiers).where(eq(tDossiers.foyerId, foyerId)),
    d
      .select({ dossierId: dossiersAcces.dossierId })
      .from(dossiersAcces)
      .where(and(eq(dossiersAcces.foyerId, foyerId), eq(dossiersAcces.utilisateurId, utilisateurId))),
  ]);
  const autorises = new Set(acces.map((a) => a.dossierId));
  const { visibles, complet } = filtrerRestreints(tous, autorises);
  return { noms: new Set(visibles.map((v) => v.nom)), complet, tous };
}

/**
 * Ce dossier m'est-il accessible ? Un nom vide (ou la boîte d'arrivée) l'est
 * toujours, et un nom qui ne correspond à aucun dossier déclaré aussi — il sera
 * créé à la volée, donc non restreint.
 */
function dossierPermis(nom: string, acces: { noms: Set<string>; tous: LigneDossier[] }): boolean {
  const n = normaliserDossier(nom);
  if (!n || n === DOSSIER_DEFAUT) return true;
  const connu = acces.tous.some((d) => d.nom === n);
  return !connu || acces.noms.has(n);
}

/** Refus neutre : nommer le dossier confirmerait son existence. */
function exigerDossierPermis(nom: string, acces: { noms: Set<string>; tous: LigneDossier[] }): void {
  if (!dossierPermis(nom, acces)) {
    throw new ErreurValidation("Ce dossier n'est pas disponible.");
  }
}

export async function chargerDocuments(): Promise<DonneesDocuments> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const [lignes, acces] = await Promise.all([
    db().select().from(tDocuments).where(eq(tDocuments.foyerId, foyerId)).orderBy(desc(tDocuments.creeLe)),
    dossiersAccessibles(foyerId, utilisateurId),
  ]);

  // ⚠ Filtrer la LISTE des dossiers ne suffit pas : `grouperParDossier` recrée un
  // groupe pour tout document dont le dossier ne figure pas dans la liste. Ce
  // sont donc les DOCUMENTS eux-mêmes qu'on filtre.
  const documents = lignes
    .filter((l) => acces.complet || dossierPermis(l.dossier, acces))
    .map(versDocument);

  // Union : dossiers déclarés (dont les VIDES) + ceux portés par les documents.
  const dossiers = [
    ...new Set([
      ...acces.tous.filter((d) => acces.complet || acces.noms.has(d.nom)).map((d) => d.nom),
      ...documents.map((d) => d.dossier),
    ].filter(Boolean)),
  ].sort((a, b) => a.localeCompare(b, 'fr'));

  return { documents, dossiers, dossiersRestreints: acces.tous.filter((d) => d.partage === PARTAGE_RESTREINT && acces.noms.has(d.nom)).map((d) => d.nom) };
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

/**
 * Renomme un dossier : la ligne `dossiers` ET les documents qu'il contient.
 *
 * ⚠ EN TRANSACTION. C'était trois écritures séparées : une panne entre la
 * suppression de l'ancienne ligne et la mise à jour des documents laissait des
 * fichiers pointant vers un dossier qui n'existe plus en base — donc un dossier
 * « fantôme », affiché grâce à l'union de `chargerDocuments` mais auquel plus
 * aucune règle de visibilité ne peut être rattachée.
 *
 * ⚠ Renommer vers un dossier restreint est refusé : ce serait y faire entrer
 * tous les fichiers de l'ancien d'un seul geste.
 */
export async function renommerDossier(ancien: string, nouveau: string): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const a = normaliserDossier(ancien);
  const n = normaliserDossier(nouveau);
  if (!n) throw new ErreurValidation('Le nom du dossier ne peut pas être vide.');
  if (a === n) return;
  if (a === DOSSIER_DEFAUT) throw new ErreurValidation('Ce dossier ne peut pas être renommé.');

  const acces = await dossiersAccessibles(foyerId, utilisateurId);
  exigerDossierPermis(a, acces);
  exigerDossierPermis(n, acces);

  await db().transaction(async (tx) => {
    // Le dossier cible peut déjà exister → on fusionne (pas de doublon en base).
    await tx
      .insert(tDossiers)
      .values({ foyerId, nom: n })
      .onConflictDoNothing({ target: [tDossiers.foyerId, tDossiers.nom] });
    await tx.delete(tDossiers).where(and(eq(tDossiers.foyerId, foyerId), eq(tDossiers.nom, a)));
    await tx
      .update(tDocuments)
      .set({ dossier: n })
      .where(and(eq(tDocuments.foyerId, foyerId), eq(tDocuments.dossier, a)));
  });
}

/**
 * Supprime un dossier. Les fichiers ne sont JAMAIS perdus : ils repartent dans
 * la boîte d'arrivée (« Fichiers non classés »).
 */
export async function supprimerDossier(nom: string): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const n = normaliserDossier(nom);
  if (!n || n === DOSSIER_DEFAUT) {
    throw new ErreurValidation('Ce dossier ne peut pas être supprimé.');
  }
  // ⚠ Supprimer un dossier restreint qu'on ne voit pas ferait remonter tous ses
  // fichiers dans la boîte d'arrivée commune — une exfiltration en un clic.
  exigerDossierPermis(n, await dossiersAccessibles(foyerId, utilisateurId));

  await db().transaction(async (tx) => {
    await tx
      .update(tDocuments)
      .set({ dossier: DOSSIER_DEFAUT })
      .where(and(eq(tDocuments.foyerId, foyerId), eq(tDocuments.dossier, n)));
    await tx.delete(tDossiers).where(and(eq(tDossiers.foyerId, foyerId), eq(tDossiers.nom, n)));
  });
}

/** Téléverse un fichier et enregistre ses métadonnées. */
export async function ajouterDocument(
  nom: string,
  type: string,
  donnees: Buffer,
  dossier = '',
): Promise<Document> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const nomPropre = nom.trim() || 'document';
  if (donnees.byteLength === 0) throw new ErreurValidation('Fichier vide.');
  if (donnees.byteLength > TAILLE_MAX) {
    throw new ErreurValidation('Fichier trop volumineux (25 Mo maximum).');
  }

  // Sans dossier précisé (ex. ajout depuis l'accueil) → boîte d'arrivée.
  const cible = normaliserDossier(dossier) || DOSSIER_DEFAUT;

  // ⚠ Contrôle AVANT le téléversement : refuser après aurait déjà écrit le
  // fichier dans le stockage, et il y resterait sans ligne en base.
  // Déposer dans un dossier restreint qu'on ne voit pas ferait disparaître le
  // fichier aux yeux de celui qui vient de l'envoyer.
  exigerDossierPermis(cible, await dossiersAccessibles(foyerId, utilisateurId));

  const { cle, taille } = await televerser(foyerId, donnees);
  await assurerDossier(foyerId, cible);

  const [ligne] = await db()
    .insert(tDocuments)
    .values({ foyerId, nom: nomPropre, dossier: cible, cle, type, taille })
    .returning();

  return versDocument(ligne);
}

/** Renomme un document et/ou le range dans un autre dossier. */
/**
 * Renomme et/ou range un document.
 *
 * ⚠ LA VOIE D'EXFILTRATION LA PLUS DIRECTE DU MODULE. `dossier` est du texte
 * libre venu du client : sans contrôle, un `PATCH { dossier: "Photos" }` sur un
 * fichier d'un dossier restreint le fait sortir dans une zone commune — et
 * l'inverse (`dossier: "Papiers privés"`) l'y fait entrer. On vérifie donc les
 * DEUX côtés : celui d'où le fichier part, et celui où il va.
 */
export async function modifierDocument(id: string, champs: ChampsDocument): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const acces = await dossiersAccessibles(foyerId, utilisateurId);

  const [actuel] = await db()
    .select({ dossier: tDocuments.dossier })
    .from(tDocuments)
    .where(and(eq(tDocuments.id, id), eq(tDocuments.foyerId, foyerId)))
    .limit(1);
  // Même message qu'un document inexistant : ne pas révéler ce qu'on masque.
  if (!actuel) throw new ErreurValidation('Document introuvable.');
  if (!dossierPermis(actuel.dossier, acces)) {
    throw new ErreurValidation('Document introuvable.');
  }

  const maj: { nom?: string; dossier?: string } = {};

  if (champs.nom !== undefined) {
    const n = champs.nom.trim();
    if (!n) throw new ErreurValidation('Le nom ne peut pas être vide.');
    maj.nom = n;
  }
  if (champs.dossier !== undefined) {
    const cible = normaliserDossier(champs.dossier) || DOSSIER_DEFAUT;
    exigerDossierPermis(cible, acces);
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
  const { foyerId, utilisateurId } = await contexteAcces();

  // ⚠ Vérifier AVANT de supprimer : effacer un document d'un dossier qu'on ne
  // voit pas détruirait un fichier dont on ignore jusqu'à l'existence.
  const acces = await dossiersAccessibles(foyerId, utilisateurId);
  const [vise] = await db()
    .select({ dossier: tDocuments.dossier })
    .from(tDocuments)
    .where(and(eq(tDocuments.id, id), eq(tDocuments.foyerId, foyerId)))
    .limit(1);
  if (!vise) return; // inexistant ou autre foyer : rien à faire, sans le dire
  if (!dossierPermis(vise.dossier, acces)) throw new ErreurValidation('Document introuvable.');

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
  const { foyerId, utilisateurId } = await contexteAcces();
  const [ligne] = await db()
    .select()
    .from(tDocuments)
    .where(and(eq(tDocuments.id, id), eq(tDocuments.foyerId, foyerId)))
    .limit(1);
  if (!ligne) return null;

  // ⚠ LE VERROU DU MODULE. Sans lui, restreindre un dossier ne protège rien :
  // les identifiants de documents circulent en clair dans le HTML de ceux qui
  // voient le dossier, et un signet pris avant la restriction continuerait de
  // servir le fichier. La route répond 404 sur `null`, sans révéler l'existence.
  const acces = await dossiersAccessibles(foyerId, utilisateurId);
  if (!dossierPermis(ligne.dossier, acces)) return null;

  const fichier = await lireFichier(ligne.cle);
  if (!fichier) return null;
  return { flux: fichier.flux, type: ligne.type || fichier.type, nom: ligne.nom };
}

/* ---------------------------------------------------------------------------
 * RÉGLAGE DU PARTAGE DES DOSSIERS
 *
 * Réservé au PROPRIÉTAIRE du foyer, comme les comptes bancaires : les dossiers
 * n'ont pas de créateur enregistré, il n'y a donc personne d'autre à qui confier
 * la décision. Et comme pour les comptes, régler n'est pas lire — l'écran ne
 * montre que des noms de dossiers, jamais leur contenu.
 * ------------------------------------------------------------------------- */

export type DossierPartage = {
  id: string;
  nom: string;
  restreint: boolean;
  utilisateurIds: string[];
};

async function exigerProprietaire(): Promise<{ foyerId: string }> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const [m] = await db()
    .select({ role: tMembres.role })
    .from(tMembres)
    .where(and(eq(tMembres.foyerId, foyerId), eq(tMembres.utilisateurId, utilisateurId)))
    .limit(1);
  if (m?.role !== 'proprietaire') {
    throw new ErreurValidation(
      'Seul le propriétaire du foyer peut régler la visibilité des dossiers.',
    );
  }
  return { foyerId };
}

/** Tous les dossiers du foyer avec leur partage. Noms seulement, aucun contenu. */
export async function chargerPartageDossiers(): Promise<DossierPartage[]> {
  const { foyerId } = await exigerProprietaire();
  const d = db();
  const [lignes, acces] = await Promise.all([
    d.select().from(tDossiers).where(eq(tDossiers.foyerId, foyerId)),
    d
      .select({ dossierId: dossiersAcces.dossierId, utilisateurId: dossiersAcces.utilisateurId })
      .from(dossiersAcces)
      .where(eq(dossiersAcces.foyerId, foyerId)),
  ]);

  const parDossier = new Map<string, string[]>();
  for (const a of acces) {
    parDossier.set(a.dossierId, [...(parDossier.get(a.dossierId) ?? []), a.utilisateurId]);
  }

  return lignes
    // La boîte d'arrivée reste commune par construction : la restreindre
    // masquerait tout fichier déposé sans dossier, y compris par les autres.
    .filter((l) => l.nom !== DOSSIER_DEFAUT)
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'))
    .map((l) => ({
      id: l.id,
      nom: l.nom,
      restreint: l.partage === PARTAGE_RESTREINT,
      utilisateurIds: parDossier.get(l.id) ?? [],
    }));
}

/** Définit qui voit un dossier (et donc les fichiers qu'il contient). */
export async function definirPartageDossier(input: {
  dossierId: string;
  restreint: boolean;
  utilisateurIds: string[];
}): Promise<void> {
  const { foyerId } = await exigerProprietaire();
  const d = db();

  const [dossier] = await d
    .select({ id: tDossiers.id, nom: tDossiers.nom })
    .from(tDossiers)
    .where(and(eq(tDossiers.foyerId, foyerId), eq(tDossiers.id, input.dossierId)))
    .limit(1);
  if (!dossier) throw new ErreurValidation('Dossier introuvable.');
  if (dossier.nom === DOSSIER_DEFAUT) {
    throw new ErreurValidation('La boîte d’arrivée reste visible de tout le foyer.');
  }

  const membresRows = await d
    .select({ utilisateurId: tMembres.utilisateurId })
    .from(tMembres)
    .where(eq(tMembres.foyerId, foyerId));
  const retenus = retenirMembres(
    input.utilisateurIds,
    new Set(membresRows.map((m) => m.utilisateurId)),
    input.restreint,
  );

  await d.transaction(async (tx) => {
    await tx
      .update(tDossiers)
      .set({ partage: input.restreint ? PARTAGE_RESTREINT : PARTAGE_FOYER })
      .where(and(eq(tDossiers.foyerId, foyerId), eq(tDossiers.id, dossier.id)));
    await tx
      .delete(dossiersAcces)
      .where(and(eq(dossiersAcces.foyerId, foyerId), eq(dossiersAcces.dossierId, dossier.id)));
    if (input.restreint && retenus.length > 0) {
      await tx
        .insert(dossiersAcces)
        .values(retenus.map((utilisateurId) => ({ foyerId, dossierId: dossier.id, utilisateurId })));
    }
  });
}

/** Membres du foyer (pour le panneau de partage des dossiers). */
export async function membresPourPartageDossiers(): Promise<{ utilisateurId: string; nom: string }[]> {
  const foyerId = await idFoyerCourant();
  const lignes = await db()
    .select({ utilisateurId: tMembres.utilisateurId, nom: tUtilisateurs.nom, email: tUtilisateurs.email })
    .from(tMembres)
    .innerJoin(tUtilisateurs, eq(tUtilisateurs.id, tMembres.utilisateurId))
    .where(eq(tMembres.foyerId, foyerId));
  return lignes
    .map((m) => ({ utilisateurId: m.utilisateurId, nom: m.nom || m.email }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
