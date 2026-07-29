import 'server-only';
import { randomBytes } from 'node:crypto';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { foyers, membres, utilisateurs, invitations } from '@/lib/db/schema';
import { ErreurValidation } from '@/lib/erreurs';

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
  await d.delete(invitations).where(and(eq(invitations.foyerId, foyerId), eq(invitations.email, e)));
  await d.insert(invitations).values({
    foyerId,
    email: e,
    jeton: randomBytes(24).toString('hex'),
    role: 'membre',
    expireLe: new Date(Date.now() + JOURS_INVITATION * 86400000),
  });
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
