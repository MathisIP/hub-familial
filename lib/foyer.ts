import 'server-only';
import { cache } from 'react';
import { redirect } from 'next/navigation';
import { eq } from 'drizzle-orm';
import { auth } from '@/auth';
import { db, baseDisponible } from '@/lib/db';
import { foyers, membres, utilisateurs, type Foyer } from '@/lib/db/schema';
import { peutCreerFoyer } from '@/lib/acces';

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

/**
 * L'utilisateur est bien connecté mais n'appartient à AUCUN foyer, et la
 * politique d'accès ne l'autorise pas à en créer un. Ce n'est pas une panne :
 * c'est le cas normal d'une personne qui doit **rejoindre** un foyer existant.
 * `exigerAcces()` l'attrape et redirige vers /bienvenue.
 */
export class SansFoyer extends Error {
  constructor() {
    super("Aucun foyer : rejoins un foyer existant ou attends l'ouverture des inscriptions.");
    this.name = 'SansFoyer';
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

  // 3) Aucun foyer : en créer un n'est possible que si la politique l'autorise
  //    (lancement public, ou adresse de la liste `EMAILS_AUTORISES`). Sinon la
  //    personne doit REJOINDRE un foyer existant — on le signale à l'appelant,
  //    qui la redirige vers /bienvenue.
  if (!peutCreerFoyer(u.email)) throw new SansFoyer();

  //    Provisionnement : foyer + essai de 14 jours, l'utilisateur en est propriétaire.
  const finEssai = new Date(Date.now() + 14 * 86400000);
  return d.transaction(async (tx) => {
    const [f] = await tx
      .insert(foyers)
      .values({
        nom: nomFoyerParDefaut(u.nom),
        statutAbonnement: 'essai',
        abonnementFin: finEssai,
        // Nouveau foyer → prise en main à faire (nom, invitations). Les foyers
        // déjà en service gardent `true` (défaut de la colonne).
        onboardingFait: false,
      })
      .returning();
    await tx.insert(membres).values({ foyerId: f.id, utilisateurId: u.id, role: 'proprietaire' });
    return f;
  });
});

/** Identifiant du foyer courant — raccourci pour scoper les requêtes des modules. */
export async function idFoyerCourant(): Promise<string> {
  return (await foyerCourant()).id;
}

/**
 * Comme `foyerCourant()`, mais renvoie proprement vers /bienvenue quand la
 * personne n'appartient à aucun foyer — au lieu de faire planter la page.
 * À utiliser dans les pages qui exigent un foyer sans passer par `exigerAcces`.
 */
export async function foyerCourantOuBienvenue(): Promise<Foyer> {
  let sansFoyer = false;
  try {
    return await foyerCourant();
  } catch (err) {
    if (!(err instanceof SansFoyer)) throw err;
    sansFoyer = true;
  } finally {
    // `redirect()` lève : on ne l'appelle jamais depuis le `try`.
  }
  if (sansFoyer) redirect('/bienvenue');
  throw new SansFoyer(); // inatteignable, pour le typage
}

/**
 * Utilisateur connecté (ligne `utilisateurs`). Nécessite une session + la base.
 *
 * ⚠ Crée la ligne si elle n'existe pas encore : l'IDENTITÉ doit pouvoir exister
 * SANS foyer. Sans cela, un nouvel arrivant qui va directement « rejoindre un
 * foyer » (sans passer par une page appelant `foyerCourant`) échouerait — et
 * l'appel à `foyerCourant` lui provisionnerait justement le foyer personnel
 * qu'on cherche à éviter.
 */
export const utilisateurCourant = cache(async () => {
  if (!baseDisponible()) {
    throw new FoyerIndisponible('Base multi-foyer non configurée (DATABASE_URL absent).');
  }
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new FoyerIndisponible('Aucun utilisateur connecté.');

  const d = db();
  await d
    .insert(utilisateurs)
    .values({ email, nom: session?.user?.name ?? null, image: session?.user?.image ?? null })
    .onConflictDoNothing({ target: utilisateurs.email });

  const [u] = await d.select().from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1);
  if (!u) throw new FoyerIndisponible("Impossible de résoudre l'utilisateur.");
  return u;
});
