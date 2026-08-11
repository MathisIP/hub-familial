import 'server-only';
import { and, eq, gt, isNull, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  invitations,
  membres,
  messagesContact,
  utilisateurs,
  utilisateurs as utilisateurs_,
  foyers as tFoyers,
  documents as tDocuments,
  comptesGoogle,
  foyerAgendas,
} from '@/lib/db/schema';
import { envoyerRelanceInactivite, envoyerBulletinSante } from '@/lib/email/messages';
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

/**
 * Conservation des messages reçus via la page d'aide.
 *
 * ⚠ Bornée à **un an** : ils contiennent un nom, une adresse et un texte libre
 * dont on ne maîtrise pas le contenu — quelqu'un peut très bien y détailler sa
 * situation médicale en demandant de l'aide. Un an couvre largement le suivi
 * d'une demande et une éventuelle contestation sur le délai de réponse ; au-delà,
 * les garder n'a plus de justification.
 */
export const RETENTION_MESSAGES = 365 * JOUR;

export type RapportMenage = {
  invitationsPurgees: number;
  messagesPurges: number;
  relancesEnvoyees: number;
  comptesSupprimes: number;
  suppressionsIgnorees: number;
  sante?: BulletinSante;
};

/**
 * « Dernier contact antérieur à `limite` » — la dernière venue, ou à défaut la
 * création du compte.
 *
 * ⚠ Le repli sur `cree_le` n'est pas un détail. Sans lui, quelqu'un qui se serait
 * inscrit puis n'aurait **jamais** reparu resterait `derniere_connexion = null`
 * pour toujours, donc éternellement conservé — précisément le cas que la durée
 * de conservation doit couvrir.
 *
 * ⚠ La date DOIT être passée en chaîne ISO, avec un transtypage explicite.
 *
 * Comparer une **colonne** Drizzle (`lt(utilisateurs.creeLe, date)`) fonctionne :
 * Drizzle connaît son type et convertit l'objet `Date` avant l'envoi. Dans une
 * expression `sql` brute, il n'a **aucune information de type** et transmet la
 * `Date` telle quelle — que le pilote ne sait pas sérialiser. La requête échoue
 * alors sur « The "string" argument must be of type string… Received an instance
 * of Date », message qui ne désigne ni la date, ni le `coalesce`, ni cette ligne.
 *
 * C'est exactement ce qui faisait échouer le ménage quotidien en 500.
 */
function avantLe(limite: Date) {
  return sql`coalesce(${utilisateurs.derniereConnexion}, ${utilisateurs.creeLe}) < ${limite.toISOString()}::timestamptz`;
}

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

/** Supprime les messages de contact au-delà de leur durée de conservation. */
export async function purgerMessagesContact(): Promise<number> {
  const limite = new Date(Date.now() - RETENTION_MESSAGES);
  const supprimes = await db()
    .delete(messagesContact)
    .where(lt(messagesContact.creeLe, limite))
    .returning({ id: messagesContact.id });
  return supprimes.length;
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
    .where(and(avantLe(limite), isNull(utilisateurs.relanceInactiviteLe)))
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
        avantLe(limiteInactivite), // toujours inactif : un retour aurait remis le compteur à zéro
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

/* ------------------------------ BULLETIN DE SANTÉ --------------------------
 *
 * ⚠ POURQUOI CE BULLETIN EXISTE. Le délai de 72 h pour notifier une violation à
 * la CNIL court depuis la **connaissance** des faits. Or rien, jusqu'ici, ne
 * nous aurait informés de quoi que ce soit : ni un afflux d'inscriptions
 * anormal, ni une base qui ralentit, ni une purge qui s'emballe. Un incident
 * pouvait passer inaperçu des semaines.
 *
 * Ce n'est pas de la supervision au sens industriel — pas de collecte de
 * requêtes, pas de métriques temps réel, rien qui exigerait de conserver des
 * adresses IP. C'est un relevé quotidien de quelques compteurs, envoyé par
 * courriel. Assez pour qu'une dérive saute aux yeux, assez sobre pour ne rien
 * ajouter au registre.
 * -------------------------------------------------------------------------- */

/** Seuils au-delà desquels une journée mérite qu'on la regarde. */
const SEUILS = {
  /** Beaucoup de foyers créés d'un coup : promotion réussie… ou création en boucle. */
  foyersParJour: 20,
  /** Beaucoup de messages : campagne de spam ayant contourné le champ piège. */
  messagesParJour: 20,
  /** Base qui répond lentement : dégradation de service. */
  latenceBaseMs: 500,
};

export type BulletinSante = {
  foyers: number;
  utilisateurs: number;
  nouveauxFoyers24h: number;
  nouveauxUtilisateurs24h: number;
  messages24h: number;
  documents: number;
  agendasConnectes: number;
  calendriersPartages: number;
  latenceBaseMs: number;
  alertes: string[];
};

/**
 * Relevé de l'état du service. **Lecture seule** : ce bulletin observe, il ne
 * corrige rien.
 */
export async function bulletinSante(): Promise<BulletinSante> {
  const d = db();
  const hier = new Date(Date.now() - JOUR);

  const debut = Date.now();
  const [
    foyers,
    utilisateurs,
    nouveauxFoyers,
    nouveauxUtilisateurs,
    messages,
    documents,
    agendas,
    calendriers,
  ] = await Promise.all([
    d.select({ n: sql<number>`count(*)::int` }).from(tFoyers),
    d.select({ n: sql<number>`count(*)::int` }).from(utilisateurs_),
    d.select({ n: sql<number>`count(*)::int` }).from(tFoyers).where(gt(tFoyers.creeLe, hier)),
    d.select({ n: sql<number>`count(*)::int` }).from(utilisateurs_).where(gt(utilisateurs_.creeLe, hier)),
    d.select({ n: sql<number>`count(*)::int` }).from(messagesContact).where(gt(messagesContact.creeLe, hier)),
    d.select({ n: sql<number>`count(*)::int` }).from(tDocuments),
    d.select({ n: sql<number>`count(*)::int` }).from(comptesGoogle),
    d.select({ n: sql<number>`count(*)::int` }).from(foyerAgendas),
  ]);
  const latenceBaseMs = Date.now() - debut;

  const b: BulletinSante = {
    foyers: foyers[0].n,
    utilisateurs: utilisateurs[0].n,
    nouveauxFoyers24h: nouveauxFoyers[0].n,
    nouveauxUtilisateurs24h: nouveauxUtilisateurs[0].n,
    messages24h: messages[0].n,
    documents: documents[0].n,
    agendasConnectes: agendas[0].n,
    calendriersPartages: calendriers[0].n,
    latenceBaseMs,
    alertes: [],
  };

  if (b.nouveauxFoyers24h > SEUILS.foyersParJour) {
    b.alertes.push(`${b.nouveauxFoyers24h} foyers créés en 24 h (seuil : ${SEUILS.foyersParJour})`);
  }
  if (b.messages24h > SEUILS.messagesParJour) {
    b.alertes.push(`${b.messages24h} messages reçus en 24 h (seuil : ${SEUILS.messagesParJour})`);
  }
  if (b.latenceBaseMs > SEUILS.latenceBaseMs) {
    b.alertes.push(`base lente : ${b.latenceBaseMs} ms pour 7 comptages (seuil : ${SEUILS.latenceBaseMs} ms)`);
  }
  return b;
}

/** Le ménage complet, tel que la tâche planifiée l'exécute. */
export async function menagePeriodique(): Promise<RapportMenage> {
  // Séquentiel à dessein : la suppression doit voir les tampons de relance déjà
  // posés, et l'ordre rend le journal lisible en cas d'incident.
  const invitationsPurgees = await purgerInvitationsExpirees();
  const messagesPurges = await purgerMessagesContact();
  const relancesEnvoyees = await relancerComptesInactifs();
  const { supprimes, ignores } = await supprimerComptesSansRetour();
  /**
   * ⚠ Le bulletin ne doit JAMAIS faire échouer le ménage.
   *
   * Les purges sont le vrai travail de cette tâche ; le bulletin n'est qu'un
   * compte rendu. Si l'envoi échoue, l'exécution était pourtant utile — la
   * signaler en échec ferait croire que rien n'a été nettoyé, et masquerait le
   * résultat des purges dans un code d'erreur.
   */
  let sante: BulletinSante | undefined;
  try {
    sante = await bulletinSante();
    await envoyerBulletinSante({
      ...sante,
      invitationsPurgees,
      messagesPurges,
      relancesEnvoyees,
      comptesSupprimes: supprimes,
      suppressionsIgnorees: ignores,
    });
  } catch (e) {
    console.error('[maintenance] bulletin impossible', e instanceof Error ? e.stack : e);
  }
  return {
    invitationsPurgees,
    messagesPurges,
    relancesEnvoyees,
    comptesSupprimes: supprimes,
    suppressionsIgnorees: ignores,
    sante,
  };
}
