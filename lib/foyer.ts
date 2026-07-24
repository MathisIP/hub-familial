import 'server-only';
import { cache } from 'react';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, baseDisponible } from '@/lib/db';
import { foyers, membres, utilisateurs, type Foyer } from '@/lib/db/schema';

/**
 * RÉSOLUTION DU FOYER COURANT (serveur uniquement, runtime Node).
 * ===============================================================
 * Remplace, pour les modules migrés en base, la config `.env` mono-foyer : on
 * détermine le foyer du **user connecté** (via sa session Auth.js) puis on scope
 * toutes les requêtes à `foyer.id`.
 *
 * ⚠ NE PAS importer ce module depuis `middleware.ts` (Edge) : il touche la base
 * Postgres (driver Node). Réservé aux composants serveur / routes API.
 *
 * Dogfooding : à sa toute première connexion, l'utilisateur est provisionné —
 * on lui crée un compte, un foyer (dont il est `proprietaire`) et l'appartenance.
 * Plus tard, l'onboarding (nom du foyer / acceptation d'invitation) remplacera la
 * création automatique.
 */

export class FoyerIndisponible extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FoyerIndisponible';
  }
}

function nomFoyerParDefaut(nom?: string | null): string {
  const prenom = (nom ?? '').trim().split(/\s+/)[0];
  return prenom ? `Foyer de ${prenom}` : 'Mon foyer';
}

/**
 * Foyer de l'utilisateur connecté (création à la volée si première venue).
 * Mémoïsé par requête (`cache`) : un seul aller-retour base par rendu.
 */
export const foyerCourant = cache(async (): Promise<Foyer> => {
  if (!baseDisponible()) {
    throw new FoyerIndisponible("Base multi-foyer non configurée (DATABASE_URL absent).");
  }
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new FoyerIndisponible('Aucun utilisateur connecté.');

  const d = db();

  // 1) Utilisateur (upsert tolérant aux connexions concurrentes).
  await d
    .insert(utilisateurs)
    .values({ email, nom: session?.user?.name ?? null, image: session?.user?.image ?? null })
    .onConflictDoNothing({ target: utilisateurs.email });
  const [u] = await d.select().from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1);
  if (!u) throw new FoyerIndisponible("Impossible de résoudre l'utilisateur.");

  // 2) Appartenance existante → son foyer.
  const [m] = await d.select().from(membres).where(eq(membres.utilisateurId, u.id)).limit(1);
  if (m) {
    const [f] = await d.select().from(foyers).where(eq(foyers.id, m.foyerId)).limit(1);
    if (f) return f;
  }

  // 3) Sinon : provisionner un foyer et rattacher l'utilisateur en propriétaire.
  return d.transaction(async (tx) => {
    const [f] = await tx
      .insert(foyers)
      .values({ nom: nomFoyerParDefaut(u.nom) })
      .returning();
    await tx.insert(membres).values({ foyerId: f.id, utilisateurId: u.id, role: 'proprietaire' });
    return f;
  });
});

/** Identifiant du foyer courant — raccourci pour scoper les requêtes des modules. */
export async function idFoyerCourant(): Promise<string> {
  return (await foyerCourant()).id;
}
