import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { foyers, membres, utilisateurs, invitations, demandesAdhesion } from '@/lib/db/schema';
import { ErreurValidation } from '@/lib/erreurs';
import { envoyerDemandeAdhesion, envoyerInvitation } from '@/lib/email/messages';

/**
 * MEMBRES & INVITATIONS (serveur) — plusieurs personnes partagent un même foyer.
 * Le propriétaire invite par e-mail → une invitation (jeton) matérialise un lien
 * à partager. L'invité, une fois connecté, accepte via /rejoindre : on l'ajoute
 * au foyer. L'e-mail de l'invité doit correspondre à celui de l'invitation.
 *
 * ⚠ Phase privée : l'invité doit aussi figurer dans EMAILS_AUTORISES pour pouvoir
 * se connecter (la liste blanche globale sera remplacée par un accès basé sur
 * l'abonnement/l'invitation quand on ouvrira le produit).
 */

const JOURS_INVITATION = 14;

export type MembreVue = {
  membreId: string;
  utilisateurId: string;
  email: string;
  nom: string | null;
  role: string;
};
export type InvitationVue = { id: string; email: string; jeton: string; expireLe: string };
export type FoyerMembres = {
  foyerNom: string;
  monRole: string;
  membres: MembreVue[];
  invitations: InvitationVue[];
};

const S = (v: unknown) => String(v ?? '').trim();

/** Rôle d'un utilisateur dans un foyer (ou null s'il n'en est pas membre). */
export async function roleDe(foyerId: string, utilisateurId: string): Promise<string | null> {
  const [m] = await db()
    .select({ role: membres.role })
    .from(membres)
    .where(and(eq(membres.foyerId, foyerId), eq(membres.utilisateurId, utilisateurId)))
    .limit(1);
  return m?.role ?? null;
}

function exigerProprietaire(role: string | null): void {
  if (role !== 'proprietaire') {
    throw new ErreurValidation('Seul le propriétaire du foyer peut gérer les membres.');
  }
}

export async function chargerFoyerMembres(foyerId: string, utilisateurId: string): Promise<FoyerMembres> {
  const d = db();
  const [foyer] = await d.select().from(foyers).where(eq(foyers.id, foyerId)).limit(1);

  const rows = await d
    .select({
      membreId: membres.id,
      utilisateurId: membres.utilisateurId,
      role: membres.role,
      email: utilisateurs.email,
      nom: utilisateurs.nom,
    })
    .from(membres)
    .innerJoin(utilisateurs, eq(utilisateurs.id, membres.utilisateurId))
    .where(eq(membres.foyerId, foyerId));

  const invs = await d.select().from(invitations).where(eq(invitations.foyerId, foyerId));

  return {
    foyerNom: foyer?.nom ?? 'Foyer',
    monRole: rows.find((r) => r.utilisateurId === utilisateurId)?.role ?? 'membre',
    membres: rows.sort((a, b) => (a.role === 'proprietaire' ? -1 : 1) - (b.role === 'proprietaire' ? -1 : 1)),
    invitations: invs.map((i) => ({
      id: i.id,
      email: i.email,
      jeton: i.jeton,
      expireLe: i.expireLe.toISOString(),
    })),
  };
}

/** Invite un e-mail à rejoindre le foyer (remplace une invitation existante). */
export async function inviterMembre(foyerId: string, appelantId: string, email: string): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  const e = email.trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e)) throw new ErreurValidation('Adresse e-mail invalide.');

  const [u] = await db().select({ id: utilisateurs.id }).from(utilisateurs).where(eq(utilisateurs.email, e)).limit(1);
  if (u && (await roleDe(foyerId, u.id))) {
    throw new ErreurValidation('Cette personne est déjà membre du foyer.');
  }

  const d = db();
  const jeton = randomBytes(24).toString('hex');
  await d.delete(invitations).where(and(eq(invitations.foyerId, foyerId), eq(invitations.email, e)));
  await d.insert(invitations).values({
    foyerId,
    email: e,
    jeton,
    role: 'membre',
    expireLe: new Date(Date.now() + JOURS_INVITATION * 86400000),
  });

  // Envoi du lien par courriel. ⚠ APRÈS l'écriture, et sans conséquence en cas
  // d'échec (`envoyerEmail` n'excepte jamais) : si le service d'e-mail est en
  // panne, l'invitation existe quand même et son lien reste copiable depuis
  // « Mon foyer ». Une panne d'e-mail ne doit pas empêcher d'inviter quelqu'un.
  const [foyer] = await d.select({ nom: foyers.nom }).from(foyers).where(eq(foyers.id, foyerId)).limit(1);
  const [invitant] = await d
    .select({ nom: utilisateurs.nom })
    .from(utilisateurs)
    .where(eq(utilisateurs.id, appelantId))
    .limit(1);
  await envoyerInvitation(e, foyer?.nom ?? 'un foyer', jeton, invitant?.nom ?? null);
}

export async function revoquerInvitation(foyerId: string, appelantId: string, invitationId: string): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  await db().delete(invitations).where(and(eq(invitations.id, invitationId), eq(invitations.foyerId, foyerId)));
}

/** Retire un membre du foyer (pas soi-même, pas un propriétaire). */
export async function retirerMembre(foyerId: string, appelantId: string, membreId: string): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  const [cible] = await db()
    .select()
    .from(membres)
    .where(and(eq(membres.id, membreId), eq(membres.foyerId, foyerId)))
    .limit(1);
  if (!cible) throw new ErreurValidation('Membre introuvable.');
  if (cible.utilisateurId === appelantId) throw new ErreurValidation('Tu ne peux pas te retirer toi-même.');
  if (cible.role === 'proprietaire') throw new ErreurValidation('Un propriétaire ne peut pas être retiré.');
  await db().delete(membres).where(eq(membres.id, membreId));
}

/** Renomme le foyer (propriétaire uniquement). */
export async function renommerFoyer(foyerId: string, appelantId: string, nom: string): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  const n = S(nom);
  if (!n) throw new ErreurValidation('Le nom du foyer est requis.');
  await db().update(foyers).set({ nom: n }).where(eq(foyers.id, foyerId));
}

/** Détails d'une invitation par jeton (pour la page /rejoindre). */
export async function invitationParJeton(
  jeton: string,
): Promise<{ foyerNom: string; email: string; expiree: boolean } | null> {
  const [inv] = await db().select().from(invitations).where(eq(invitations.jeton, jeton)).limit(1);
  if (!inv) return null;
  const [foyer] = await db().select({ nom: foyers.nom }).from(foyers).where(eq(foyers.id, inv.foyerId)).limit(1);
  return { foyerNom: foyer?.nom ?? 'Foyer', email: inv.email, expiree: inv.expireLe.getTime() < Date.now() };
}

/**
 * Accepte une invitation : rattache l'utilisateur au foyer invité, le fait
 * QUITTER ses autres foyers (typiquement le foyer perso auto-créé à sa 1re
 * connexion), et supprime ceux devenus sans membre. Sans ce déménagement,
 * l'utilisateur resterait membre de 2 foyers et `foyerCourant()` pourrait
 * résoudre le mauvais (bug rencontré : l'invité voyait son foyer perso vide).
 * L'e-mail de l'utilisateur doit correspondre à celui de l'invitation.
 */
export async function accepterInvitation(
  jeton: string,
  utilisateur: { id: string; email: string },
): Promise<string> {
  const d = db();
  const [inv] = await d.select().from(invitations).where(eq(invitations.jeton, jeton)).limit(1);
  if (!inv) throw new ErreurValidation('Invitation introuvable ou déjà utilisée.');
  if (inv.expireLe.getTime() < Date.now()) throw new ErreurValidation('Cette invitation a expiré.');
  if (inv.email.toLowerCase() !== utilisateur.email.toLowerCase()) {
    throw new ErreurValidation(`Cette invitation est destinée à ${inv.email}.`);
  }

  await d.transaction(async (tx) => {
    // Foyers actuels de l'utilisateur AVANT rattachement.
    const anciens = await tx
      .select({ foyerId: membres.foyerId })
      .from(membres)
      .where(eq(membres.utilisateurId, utilisateur.id));

    // Rattache au foyer invité (idempotent).
    await tx
      .insert(membres)
      .values({ foyerId: inv.foyerId, utilisateurId: utilisateur.id, role: inv.role })
      .onConflictDoNothing({ target: [membres.foyerId, membres.utilisateurId] });

    // Quitte ses autres foyers ; supprime ceux qui n'ont plus aucun membre
    // (cascade nettoie leurs données — cas du foyer perso vide auto-créé).
    for (const a of anciens) {
      if (a.foyerId === inv.foyerId) continue;
      await tx
        .delete(membres)
        .where(and(eq(membres.utilisateurId, utilisateur.id), eq(membres.foyerId, a.foyerId)));
      const reste = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(eq(membres.foyerId, a.foyerId))
        .limit(1);
      if (reste.length === 0) await tx.delete(foyers).where(eq(foyers.id, a.foyerId));
    }

    await tx.delete(invitations).where(eq(invitations.id, inv.id));
  });
  return inv.foyerId;
}

/** Clôture la prise en main : le foyer est configuré, on n'y revient plus. */
/**
 * Clôture la prise en main. `origineDeclaree` est la réponse (facultative) à
 * « Comment avez-vous connu Nestync ? » — `undefined` si la question a été
 * passée, auquel cas la colonne reste inchangée plutôt qu'écrasée à `null`.
 */
export async function terminerOnboarding(
  foyerId: string,
  appelantId: string,
  origineDeclaree?: string,
): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  const valeurs: { onboardingFait: true; origineDeclaree?: string } = { onboardingFait: true };
  if (origineDeclaree) valeurs.origineDeclaree = origineDeclaree;
  await db().update(foyers).set(valeurs).where(eq(foyers.id, foyerId));
}

/* ==================== DEMANDES D'ADHÉSION (sens inverse) ==================== */
/**
 * Ici, c'est la personne qui frappe à la porte : elle donne l'e-mail du
 * responsable du foyer, et celui-ci accepte ou refuse depuis « Mon foyer ».
 * Complète les invitations, sans les remplacer.
 */

export type DemandeVue = {
  id: string;
  email: string;
  nom: string | null;
  message: string;
  creeLe: string;
};

/** Demande en cours de l'utilisateur (pour lui montrer où il en est). */
export type MaDemandeVue = { foyerNom: string; statut: string; creeLe: string };

/** Foyer dont l'utilisateur d'e-mail donné est PROPRIÉTAIRE. */
async function foyerDuResponsable(email: string): Promise<{ id: string; nom: string } | null> {
  const [row] = await db()
    .select({ id: foyers.id, nom: foyers.nom })
    .from(utilisateurs)
    .innerJoin(membres, eq(membres.utilisateurId, utilisateurs.id))
    .innerJoin(foyers, eq(foyers.id, membres.foyerId))
    .where(and(eq(utilisateurs.email, email.toLowerCase()), eq(membres.role, 'proprietaire')))
    .limit(1);
  return row ?? null;
}

/**
 * Dépose (ou relance) une demande d'adhésion auprès du responsable d'un foyer.
 *
 * ⚠ CONFIDENTIALITÉ : on ne dit JAMAIS si l'adresse correspond à un foyer
 * existant. Sinon n'importe qui pourrait tester des adresses une à une pour
 * découvrir qui utilise Nestync (énumération d'adresses e-mail). Quand aucun
 * foyer ne correspond, on ne crée rien et on sort **silencieusement** : l'appelant
 * affiche le même message dans tous les cas.
 */
export async function demanderAdhesion(
  demandeur: { id: string; email: string; nom?: string | null },
  emailResponsable: string,
  message = '',
): Promise<void> {
  const email = S(emailResponsable).toLowerCase();
  if (!email || !email.includes('@')) {
    throw new ErreurValidation('Indique l’adresse e-mail du responsable du foyer.');
  }
  // Sa propre adresse : pas une fuite (il la connaît), et l'erreur est utile.
  if (email === demandeur.email.toLowerCase()) {
    throw new ErreurValidation('C’est ta propre adresse : indique celle du responsable du foyer.');
  }

  const foyer = await foyerDuResponsable(email);
  if (!foyer) return; // adresse inconnue → même réponse que pour un succès
  if (await roleDe(foyer.id, demandeur.id)) return; // déjà membre → rien à faire

  // Une seule demande vivante par (foyer, demandeur) : une relance la réactive.
  await db()
    .insert(demandesAdhesion)
    .values({
      foyerId: foyer.id,
      demandeurId: demandeur.id,
      demandeurEmail: demandeur.email,
      demandeurNom: demandeur.nom ?? null,
      message: S(message).slice(0, 500),
      statut: 'en_attente',
    })
    .onConflictDoUpdate({
      target: [demandesAdhesion.foyerId, demandesAdhesion.demandeurId],
      set: { statut: 'en_attente', message: S(message).slice(0, 500), creeLe: new Date() },
    });

  // ⚠ Sans cet avertissement, une demande pouvait rester invisible indéfiniment :
  // rien ne signalait au responsable qu'il avait quelque chose à accepter, et le
  // demandeur attendait une réponse qui ne venait jamais.
  await envoyerDemandeAdhesion(
    email,
    foyer.nom,
    { email: demandeur.email, nom: demandeur.nom },
    S(message).slice(0, 500),
  );
}

/** Demandes en attente reçues par un foyer (réservé au propriétaire). */
export async function demandesEnAttente(foyerId: string, appelantId: string): Promise<DemandeVue[]> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  const rows = await db()
    .select()
    .from(demandesAdhesion)
    .where(and(eq(demandesAdhesion.foyerId, foyerId), eq(demandesAdhesion.statut, 'en_attente')));
  return rows.map((r) => ({
    id: r.id,
    email: r.demandeurEmail,
    nom: r.demandeurNom,
    message: r.message,
    creeLe: r.creeLe.toISOString(),
  }));
}

/** Là où en est MA demande (affiché au demandeur tant qu'elle n'est pas traitée). */
export async function maDemande(utilisateurId: string): Promise<MaDemandeVue | null> {
  const [row] = await db()
    .select({ foyerNom: foyers.nom, statut: demandesAdhesion.statut, creeLe: demandesAdhesion.creeLe })
    .from(demandesAdhesion)
    .innerJoin(foyers, eq(foyers.id, demandesAdhesion.foyerId))
    .where(eq(demandesAdhesion.demandeurId, utilisateurId))
    .limit(1);
  return row ? { ...row, creeLe: row.creeLe.toISOString() } : null;
}

/** Le propriétaire accepte : le demandeur rejoint le foyer (et quitte les autres). */
export async function accepterDemande(
  foyerId: string,
  appelantId: string,
  demandeId: string,
): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  const d = db();
  const [dem] = await d
    .select()
    .from(demandesAdhesion)
    .where(and(eq(demandesAdhesion.id, demandeId), eq(demandesAdhesion.foyerId, foyerId)))
    .limit(1);
  if (!dem) throw new ErreurValidation('Demande introuvable.');

  await d.transaction(async (tx) => {
    const anciens = await tx
      .select({ foyerId: membres.foyerId })
      .from(membres)
      .where(eq(membres.utilisateurId, dem.demandeurId));

    await tx
      .insert(membres)
      .values({ foyerId, utilisateurId: dem.demandeurId, role: 'membre' })
      .onConflictDoNothing({ target: [membres.foyerId, membres.utilisateurId] });

    // Même règle que pour les invitations : un utilisateur n'appartient qu'à un
    // foyer ; on supprime au passage les foyers devenus vides.
    for (const a of anciens) {
      if (a.foyerId === foyerId) continue;
      await tx
        .delete(membres)
        .where(and(eq(membres.utilisateurId, dem.demandeurId), eq(membres.foyerId, a.foyerId)));
      const reste = await tx
        .select({ id: membres.id })
        .from(membres)
        .where(eq(membres.foyerId, a.foyerId))
        .limit(1);
      if (reste.length === 0) await tx.delete(foyers).where(eq(foyers.id, a.foyerId));
    }

    await tx
      .update(demandesAdhesion)
      .set({ statut: 'acceptee' })
      .where(eq(demandesAdhesion.id, demandeId));
  });
}

/** Le propriétaire refuse : la demande est marquée, sans rattachement. */
export async function refuserDemande(
  foyerId: string,
  appelantId: string,
  demandeId: string,
): Promise<void> {
  exigerProprietaire(await roleDe(foyerId, appelantId));
  await db()
    .update(demandesAdhesion)
    .set({ statut: 'refusee' })
    .where(and(eq(demandesAdhesion.id, demandeId), eq(demandesAdhesion.foyerId, foyerId)));
}
