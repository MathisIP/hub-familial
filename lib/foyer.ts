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
 * Fraîcheur tolérée sur `derniere_connexion`. On ne réécrit la date que si celle
 * en base a plus d'un jour.
 *
 * ⚠ C'est tout l'enjeu : cette fonction est appelée à chaque page et à chaque
 * route d'API. Horodater sans condition ajouterait une ÉCRITURE partout, ce qui
 * défait l'optimisation qui a ramené la résolution du foyer à une seule requête.
 * Une précision d'un jour est amplement suffisante pour une politique qui se
 * compte en années.
 */
const SEUIL_CONNEXION = 86_400_000; // 1 jour, en ms

/**
 * Note le passage de la personne, si la date connue a vieilli.
 *
 * Volontairement **silencieuse** : c'est une donnée d'hygiène, jamais une raison
 * de faire échouer l'affichage d'une page. Si l'écriture échoue, on l'oublie.
 */
async function marquerPassage(u: { id: string; derniereConnexion: Date | null }): Promise<void> {
  const vue = u.derniereConnexion?.getTime() ?? 0;
  if (Date.now() - vue < SEUIL_CONNEXION) return;
  try {
    await db()
      .update(utilisateurs)
      .set({ derniereConnexion: new Date() })
      .where(eq(utilisateurs.id, u.id));
  } catch {
    /* sans conséquence : on retentera au prochain passage */
  }
}

/**
 * Foyer de l'utilisateur connecté (création à la volée si première venue).
 * Mémoïsé par requête (`cache`) : un seul aller-retour base par rendu.
 *
 * ⚡ PERFORMANCE — cette fonction est sur le chemin critique de **chaque** page
 * et **chaque** route d'API : son coût est payé partout. Elle tenait autrefois en
 * 4 requêtes SÉQUENTIELLES (insert utilisateur, select utilisateur, select
 * membre, select foyer), soit 4 allers-retours réseau avant que la page ne
 * commence seulement à charger ses propres données. Le cas courant — quelqu'un
 * qui a déjà un compte et un foyer, c'est-à-dire la quasi-totalité des chargements
 * — tient désormais en **une seule** requête jointe (tous les champs joints sont
 * indexés : `utilisateurs.email` unique, `membres_utilisateur_idx`, `foyers.id`).
 * Les écritures ne se produisent plus qu'à la toute première venue.
 */
export const foyerCourant = cache(async (): Promise<Foyer> => {
  if (!baseDisponible()) {
    throw new FoyerIndisponible("Base multi-foyer non configurée (DATABASE_URL absent).");
  }
  const session = await auth();
  const email = session?.user?.email?.toLowerCase();
  if (!email) throw new FoyerIndisponible('Aucun utilisateur connecté.');

  const d = db();

  // 1) Chemin courant : utilisateur + appartenance + foyer d'un seul coup.
  //    `orderBy` rend le choix déterministe si quelqu'un appartient à plusieurs
  //    foyers — sinon la page pourrait basculer de l'un à l'autre au hasard.
  const [ligne] = await d
    .select({ utilisateur: utilisateurs, foyer: foyers })
    .from(utilisateurs)
    .leftJoin(membres, eq(membres.utilisateurId, utilisateurs.id))
    .leftJoin(foyers, eq(foyers.id, membres.foyerId))
    .where(eq(utilisateurs.email, email))
    .orderBy(membres.creeLe)
    .limit(1);

  if (ligne?.foyer) {
    await marquerPassage(ligne.utilisateur);
    return ligne.foyer;
  }

  // 2) Rare : personne connue mais sans foyer, ou toute première connexion.
  //    On paie ici les écritures — une fois par personne, pas à chaque page.
  let u = ligne?.utilisateur ?? null;
  if (!u) {
    await d
      .insert(utilisateurs)
      .values({ email, nom: session?.user?.name ?? null, image: session?.user?.image ?? null })
      .onConflictDoNothing({ target: utilisateurs.email });
    [u] = await d.select().from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1);
  }
  if (!u) throw new FoyerIndisponible("Impossible de résoudre l'utilisateur.");

  // 3) Aucun foyer : en créer un n'est possible que si la politique l'autorise
  //    (lancement public, ou adresse de la liste `EMAILS_AUTORISES`). Sinon la
  //    personne doit REJOINDRE un foyer existant — on le signale à l'appelant,
  //    qui la redirige vers /bienvenue.
  if (!peutCreerFoyer(u.email)) throw new SansFoyer();

  //    Provisionnement : foyer + essai de 14 jours, l'utilisateur en est propriétaire.
  const finEssai = new Date(Date.now() + 14 * 86400000);
  const utilisateurId = u.id;
  const nomUtilisateur = u.nom;
  return d.transaction(async (tx) => {
    const [f] = await tx
      .insert(foyers)
      .values({
        nom: nomFoyerParDefaut(nomUtilisateur),
        statutAbonnement: 'essai',
        abonnementFin: finEssai,
        // Nouveau foyer → prise en main à faire (nom, invitations). Les foyers
        // déjà en service gardent `true` (défaut de la colonne).
        onboardingFait: false,
      })
      .returning();
    await tx.insert(membres).values({ foyerId: f.id, utilisateurId, role: 'proprietaire' });
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

  // On LIT d'abord : la ligne existe dans l'immense majorité des appels, et une
  // écriture inutile à chaque page coûtait un aller-retour de plus.
  const d = db();
  const [connu] = await d.select().from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1);
  if (connu) {
    // Une personne sans foyer (arrivée en cours de rattachement) passe par ici et
    // pas par `foyerCourant` : sans cet appel, elle n'aurait jamais de trace.
    await marquerPassage(connu);
    return connu;
  }

  await d
    .insert(utilisateurs)
    .values({ email, nom: session?.user?.name ?? null, image: session?.user?.image ?? null })
    .onConflictDoNothing({ target: utilisateurs.email });

  const [u] = await d.select().from(utilisateurs).where(eq(utilisateurs.email, email)).limit(1);
  if (!u) throw new FoyerIndisponible("Impossible de résoudre l'utilisateur.");
  return u;
});
