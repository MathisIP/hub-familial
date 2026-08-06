import 'server-only';
import { and, isNotNull, isNull, lt } from 'drizzle-orm';
import { db } from '@/lib/db';
import { invitations, utilisateurs } from '@/lib/db/schema';

/**
 * MÉNAGE PÉRIODIQUE (serveur, déclenché par la tâche planifiée Vercel).
 * ====================================================================
 * Le RGPD demande des durées de conservation **bornées** : garder une donnée
 * « au cas où », indéfiniment, est en soi un manquement. Ce module applique ces
 * durées.
 *
 * ⚠ Rien ici ne touche aux données d'un foyer vivant. Le ménage porte sur des
 * traces devenues sans objet.
 */

const JOUR = 86_400_000;

/** Une invitation expirée depuis plus de 3 mois n'a plus aucune utilité. */
export const RETENTION_INVITATIONS = 90 * JOUR;

/**
 * Inactivité au-delà de laquelle un compte est considéré abandonné.
 * Aligné sur la recommandation usuelle de la CNIL (3 ans sans contact).
 */
export const INACTIVITE_COMPTE = 3 * 365 * JOUR;

export type RapportMenage = {
  invitationsPurgees: number;
  comptesInactifs: number;
  comptesSansTrace: number;
};

/**
 * Supprime les invitations expirées de longue date.
 *
 * Elles contiennent l'**e-mail d'un tiers** qui n'a jamais donné suite : c'est
 * précisément le genre de donnée qu'on ne doit pas conserver sans raison. Une
 * invitation encore valide, ou expirée récemment (la personne peut demander une
 * relance), est conservée.
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
 * COMPTE (sans les supprimer) les comptes inactifs depuis plus de 3 ans.
 *
 * ⚠ POURQUOI ON NE SUPPRIME PAS ENCORE. La politique arrêtée est : inactivité →
 * **courriel de relance** → suppression un mois plus tard sans réaction.
 * L'application n'a **aucun moyen d'envoyer un courriel** aujourd'hui (aucun
 * fournisseur configuré). Supprimer sans prévenir serait à la fois brutal pour
 * la personne et risqué pour nous — un ancien abonné qui revient et ne retrouve
 * rien, sans avoir été averti, a de quoi se plaindre.
 *
 * On mesure donc dès maintenant, ce qui a deux vertus : la colonne
 * `derniere_connexion` commence à se remplir (sans elle, la politique resterait
 * inapplicable pour toujours), et le volume réel est connu avant d'écrire la
 * suite.
 *
 * `comptesSansTrace` : comptes antérieurs à l'ajout de la colonne, jamais revus
 * depuis. ⚠ Ce ne sont **pas** des comptes inactifs — seulement des comptes dont
 * on n'a pas encore la trace. Ne jamais les supprimer sur ce seul critère.
 */
export async function mesurerComptesInactifs(): Promise<{ inactifs: number; sansTrace: number }> {
  const limite = new Date(Date.now() - INACTIVITE_COMPTE);
  const d = db();
  const [inactifs, sansTrace] = await Promise.all([
    d
      .select({ id: utilisateurs.id })
      .from(utilisateurs)
      .where(and(isNotNull(utilisateurs.derniereConnexion), lt(utilisateurs.derniereConnexion, limite))),
    d.select({ id: utilisateurs.id }).from(utilisateurs).where(isNull(utilisateurs.derniereConnexion)),
  ]);
  return { inactifs: inactifs.length, sansTrace: sansTrace.length };
}

/** Le ménage complet, tel que la tâche planifiée l'exécute. */
export async function menagePeriodique(): Promise<RapportMenage> {
  const [invitationsPurgees, mesure] = await Promise.all([
    purgerInvitationsExpirees(),
    mesurerComptesInactifs(),
  ]);
  return {
    invitationsPurgees,
    comptesInactifs: mesure.inactifs,
    comptesSansTrace: mesure.sansTrace,
  };
}
