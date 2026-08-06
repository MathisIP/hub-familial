import 'server-only';
import { and, eq, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invitations, membres, utilisateurs } from '@/lib/db/schema';
import { envoyerRelanceInactivite } from '@/lib/email/messages';
import { supprimerFoyerEtUtilisateur } from '@/lib/rgpd';

/**
 * MÉNAGE PÉRIODIQUE (serveur, déclenché par la tâche planifiée Vercel).
 * ====================================================================
 * Le RGPD demande des durées de conservation **bornées** : garder une donnée
 * « au cas où », indéfiniment, est en soi un manquement. Ce module applique ces
 * durées.
 *
 * ⚠ Rien ici ne touche aux données d'un foyer vivant.
 */

const JOUR = 86_400_000;

/** Une invitation expirée depuis plus de 3 mois n'a plus aucune utilité. */
export const RETENTION_INVITATIONS = 90 * JOUR;

/** Inactivité au-delà de laquelle un compte est considéré abandonné (repère CNIL). */
export const INACTIVITE_COMPTE = 3 * 365 * JOUR;

/** Préavis entre la relance et la suppression effective. */
export const PREAVIS_SUPPRESSION = 30 * JOUR;

/** Nombre maximal de relances par exécution — voir `relancerComptesInactifs`. */
const RELANCES_PAR_PASSAGE = 50;

export type RapportMenage = {
  invitationsPurgees: number;
  relancesEnvoyees: number;
  comptesSupprimes: number;
  suppressionsIgnorees: number;
};

/**
 * Dernier contact connu : la dernière venue, ou à défaut la création du compte.
 *
 * ⚠ Le repli sur `cree_le` n'est pas un détail. Sans lui, quelqu'un qui se serait
 * inscrit puis n'aurait **jamais** reparu resterait `derniere_connexion = null`
 * pour toujours, donc éternellement conservé — précisément le cas que la durée
 * de conservation doit couvrir.
 */
const dernierContact = sql`coalesce(${utilisateurs.derniereConnexion}, ${utilisateurs.creeLe})`;

/**
 * Supprime les invitations expirées de longue date.
 *
 * Elles contiennent l'**e-mail d'un tiers** qui n'a jamais donné suite : c'est
 * précisément le genre de donnée qu'on ne doit pas conserver sans raison. Une
 * invitation encore valide, ou expirée récemment (une relance reste possible),
 * est conservée.
 */
export async function purgerInvitationsExpirees(): Promise<number> {
  const limite = new Date(Date.now() - RETENTION_INVITATIONS);
  const supprimees = await db()
    .delete(invitations)
    .where(lt(invitations.expireLe, limite))
    .returning({ id: invitations.id });
  return supprimees.length;
}

/**
 * Prévient les comptes inactifs depuis plus de 3 ans qu'ils seront supprimés.
 *
 * ⚠ **La relance conditionne la suppression** : rien n'est jamais effacé sans
 * ce préavis. Le tampon n'est posé **qu'après** un envoi réussi — si le service
 * d'e-mail est en panne, on retentera au prochain passage plutôt que de démarrer
 * un compte à rebours dont la personne n'a jamais été informée.
 *
 * Le lot est plafonné : un pic d'envois ressemble à un envoi de masse et abîme
 * la réputation du domaine. Étaler sur plusieurs jours ne coûte rien ici.
 */
export async function relancerComptesInactifs(): Promise<number> {
  const limite = new Date(Date.now() - INACTIVITE_COMPTE);
  const d = db();

  const aRelancer = await d
    .select({ id: utilisateurs.id, email: utilisateurs.email, nom: utilisateurs.nom })
    .from(utilisateurs)
    .where(and(lt(dernierContact, limite), isNull(utilisateurs.relanceInactiviteLe)))
    .limit(RELANCES_PAR_PASSAGE);

  let envoyees = 0;
  for (const u of aRelancer) {
    const suppressionLe = new Date(Date.now() + PREAVIS_SUPPRESSION);
    if (!(await envoyerRelanceInactivite(u.email, u.nom, suppressionLe))) continue;
    await d
      .update(utilisateurs)
      .set({ relanceInactiviteLe: new Date() })
      .where(eq(utilisateurs.id, u.id));
    envoyees++;
  }
  return envoyees;
}

/**
 * Supprime les comptes relancés qui ne sont pas revenus dans le délai de préavis.
 *
 * ⚠ **PÉRIMÈTRE VOLONTAIREMENT ÉTROIT.** Seul est supprimé un compte dont la
 * disparition ne prive personne : quelqu'un **sans foyer**, ou **seul membre**
 * du sien. Un foyer partagé est laissé intact et l'opération est comptée dans
 * `suppressionsIgnorees`.
 *
 * Pourquoi : supprimer un membre d'un foyer actif détruirait des données que
 * d'AUTRES personnes utilisent encore, et retirer un propriétaire laisserait un
 * foyer sans personne pour le gérer. Ces cas demandent un arbitrage humain — une
 * tâche planifiée qui s'exécute à 4 h du matin n'est pas le bon endroit pour le
 * rendre. Ils apparaissent dans les journaux pour être traités à la main.
 */
export async function supprimerComptesSansRetour(): Promise<{ supprimes: number; ignores: number }> {
  const limiteInactivite = new Date(Date.now() - INACTIVITE_COMPTE);
  const limitePreavis = new Date(Date.now() - PREAVIS_SUPPRESSION);
  const d = db();

  const candidats = await d
    .select({ id: utilisateurs.id, email: utilisateurs.email })
    .from(utilisateurs)
    .where(
      and(
        lt(dernierContact, limiteInactivite), // toujours inactif : un retour aurait remis le compteur à zéro
        lt(utilisateurs.relanceInactiviteLe, limitePreavis),
      ),
    )
    .limit(RELANCES_PAR_PASSAGE);

  let supprimes = 0;
  let ignores = 0;

  for (const u of candidats) {
    const appartenances = await d
      .select({ foyerId: membres.foyerId })
      .from(membres)
      .where(eq(membres.utilisateurId, u.id));

    if (appartenances.length === 0) {
      // Aucun foyer : rien d'autre à effacer que l'identité elle-même.
      await d.delete(utilisateurs).where(eq(utilisateurs.id, u.id));
      supprimes++;
      continue;
    }

    const foyerId = appartenances[0].foyerId;
    const cohabitants = await d
      .select({ id: membres.id })
      .from(membres)
      .where(eq(membres.foyerId, foyerId));

    if (appartenances.length > 1 || cohabitants.length > 1) {
      console.warn(
        `[maintenance] compte inactif ${u.id} laissé en place : foyer partagé — décision manuelle requise`,
      );
      ignores++;
      continue;
    }

    // Seul membre de son foyer : on efface tout, exactement comme une demande
    // d'effacement RGPD (même fonction, pour ne pas laisser diverger deux
    // chemins de suppression — dont la révocation de l'autorisation Google).
    await supprimerFoyerEtUtilisateur(foyerId, u.id);
    supprimes++;
  }

  return { supprimes, ignores };
}

/** Le ménage complet, tel que la tâche planifiée l'exécute. */
export async function menagePeriodique(): Promise<RapportMenage> {
  // Séquentiel à dessein : la suppression doit voir les tampons de relance déjà
  // posés, et l'ordre rend le journal lisible en cas d'incident.
  const invitationsPurgees = await purgerInvitationsExpirees();
  const relancesEnvoyees = await relancerComptesInactifs();
  const { supprimes, ignores } = await supprimerComptesSansRetour();
  return {
    invitationsPurgees,
    relancesEnvoyees,
    comptesSupprimes: supprimes,
    suppressionsIgnorees: ignores,
  };
}
