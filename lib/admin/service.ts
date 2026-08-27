import 'server-only';
import { and, count, eq, gt, lt, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  foyers as tFoyers,
  membres as tMembres,
  utilisateurs as tUtilisateurs,
  messagesContact as tMessages,
  demandesAdhesion as tDemandes,
  transactions as tTx,
  taches as tTaches,
  courses as tCourses,
  documents as tDocuments,
  recettes as tRecettes,
  evenements as tEvenements,
  foyerAgendas as tAgendas,
} from '@/lib/db/schema';
import { chargerComptes, estAdminComptes } from '@/lib/comptes/service';
import { OFFRES } from '@/lib/offres';
import type { ChargeSimulee } from '@/lib/admin/simulation';

/**
 * CONSOLE D'ADMINISTRATION (serveur uniquement) — les chiffres du produit.
 * =======================================================================
 * ⚠ CETTE PAGE ENFREINT LA RÈGLE D'ISOLATION, VOLONTAIREMENT ET DANS UN SEUL
 * SENS. Tout le reste de l'application scope chaque requête au foyer courant ;
 * ici on interroge la base entière. C'est la seule exception du projet, et elle
 * n'est tenable qu'à une condition stricte :
 *
 *   **des AGRÉGATS et des signaux d'exploitation, jamais du contenu de foyer.**
 *
 * On compte des transactions, on n'en lit aucune. On compte des documents, on
 * n'en ouvre aucun. Un nom de foyer apparaît uniquement là où il faut AGIR
 * (relancer un essai, un impayé) — jamais l'adresse ni le nom d'un membre.
 *
 * ⚠ Franchir cette ligne ne serait pas une facilité : ce serait donner à
 * l'éditeur une vue sur le budget et les papiers de ses clients, alors que la
 * politique de confidentialité promet le contraire, et que le chiffrement des
 * documents existe précisément pour rendre cette lecture impossible.
 *
 * ⚠ La garde d'accès est celle des comptes du projet (`EMAIL_ADMIN`) : une seule
 * adresse, et **porte close si la variable manque**. On ne crée pas un second
 * mécanisme d'autorisation — deux portes, c'est deux serrures à vérifier.
 */

export type Repartition = { libelle: string; n: number };

export type FoyerAsuivre = {
  id: string;
  nom: string;
  /** Date d'échéance affichable, ou vide. */
  quand: string;
  /** Jours restants (négatif = dépassé), `null` si sans date. */
  jours: number | null;
};

export type TableauAdmin = {
  /* --- Foyers --- */
  foyers: number;
  parStatut: Repartition[];
  /** Foyers au statut `actif`, quelle que soit la périodicité connue. */
  abonnesPayants: number;
  abonnesMensuels: number;
  abonnesAnnuels: number;
  /**
   * Abonnés actifs dont la périodicité n'est pas enregistrée.
   *
   * ⚠ CE CAS EXISTE VRAIMENT. La colonne `offre` a été ajoutée après coup et
   * n'est remplie que par le webhook Stripe : un foyer activé avant, ou dont le
   * webhook n'est jamais arrivé, reste à `null`. Sans ce compteur, le total
   * « mensuels + annuels » serait inférieur au nombre d'actifs — deux chiffres
   * qui se contredisent sur le même écran, et un MRR sous-évalué.
   */
  actifsSansOffre: number;
  offerts: number;
  essaisEnCours: number;
  /* --- Personnes --- */
  utilisateurs: number;
  membresParFoyer: Repartition[];
  moyenneMembres: number;
  sansFoyer: number;
  /* --- Argent --- */
  mrrCentimes: number;
  arrCentimes: number;
  chargeMensuelleCentimes: number;
  soldeProjetCentimes: number;
  /** Abonnés mensuels qu'il faudrait pour couvrir la charge récurrente. */
  pointMort: number;
  /** Ce qu'il manque pour l'atteindre (0 si atteint). */
  resteAvantPointMort: number;
  /* --- Ce qu'il y a à faire --- */
  essaisQuiExpirent: FoyerAsuivre[];
  impayes: FoyerAsuivre[];
  messagesNonTraites: number;
  messagePlusAncienJours: number | null;
  demandesEnAttente: number;
  /* --- Usage réel --- */
  foyersActifs30j: number;
  foyersJamaisVenus: number;
  volumes: Repartition[];

  /**
   * Charges récurrentes réelles, prêtes à amorcer le simulateur.
   *
   * ⚠ Le simulateur DOIT partir de la réalité. Une page blanche ferait ressaisir
   * des chiffres déjà connus, donc les ferait ressaisir de mémoire — et une
   * projection bâtie sur des charges approximatives ne vaut pas mieux que
   * l'intuition qu'elle prétend remplacer. Elles restent modifiables : ce n'est
   * qu'un point de départ, jamais une écriture.
   */
  chargesReelles: ChargeSimulee[];
};

const JOUR = 86_400_000;
/** Fenêtre de relance d'un essai : au-delà, il n'y a rien à faire aujourd'hui. */
const ESSAI_BIENTOT_JOURS = 10;

function joursDepuis(d: Date | null): number | null {
  return d ? Math.round((d.getTime() - Date.now()) / JOUR) : null;
}

const dateCourte = (d: Date | null): string =>
  d ? d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : '';

/**
 * Tout le tableau de bord, ou `null` si la personne n'est pas l'administrateur.
 *
 * ⚠ `null` PLUTÔT QU'UNE EXCEPTION : la page appelle `notFound()` dessus, si
 * bien que pour quiconque d'autre — y compris un membre du même foyer — cette
 * adresse n'existe pas. Un « accès refusé » révélerait qu'il y a quelque chose
 * à trouver.
 */
export async function chargerAdmin(): Promise<TableauAdmin | null> {
  if (!(await estAdminComptes())) return null;

  const d = db();
  const bientot = new Date(Date.now() + ESSAI_BIENTOT_JOURS * JOUR);
  const ilYa30j = new Date(Date.now() - 30 * JOUR);

  const [
    statuts,
    offres,
    lignesMembres,
    nbUtilisateurs,
    nbSansFoyer,
    essais,
    impayes,
    msgNonTraites,
    msgAncien,
    demandes,
    actifs,
    jamaisVenus,
    vol,
    comptesProjet,
  ] = await Promise.all([
    d
      .select({ statut: tFoyers.statutAbonnement, n: count() })
      .from(tFoyers)
      .groupBy(tFoyers.statutAbonnement),

    // ⚠ Seulement les foyers RÉELLEMENT payants : un « offert » porte parfois
    // une périodicité héritée d'un ancien abonnement, et le compter gonflerait
    // un chiffre d'affaires qui n'existe pas.
    d
      .select({ offre: tFoyers.offre, n: count() })
      .from(tFoyers)
      .where(eq(tFoyers.statutAbonnement, 'actif'))
      .groupBy(tFoyers.offre),

    d
      .select({ foyerId: tMembres.foyerId, n: count() })
      .from(tMembres)
      .groupBy(tMembres.foyerId),

    d.select({ n: count() }).from(tUtilisateurs),

    // Comptes créés qui n'ont rejoint aucun foyer : ils se sont connectés une
    // fois et se sont arrêtés là. C'est la fuite du parcours d'arrivée.
    d
      .select({ n: count() })
      .from(tUtilisateurs)
      .where(
        sql`not exists (select 1 from ${tMembres} where ${tMembres.utilisateurId} = ${tUtilisateurs.id})`,
      ),

    d
      .select({ id: tFoyers.id, nom: tFoyers.nom, fin: tFoyers.abonnementFin })
      .from(tFoyers)
      .where(
        and(
          eq(tFoyers.statutAbonnement, 'essai'),
          // Sans date = essai « ouvert » (foyers antérieurs à la règle) : rien
          // n'expire, donc rien à relancer.
          sql`${tFoyers.abonnementFin} is not null`,
          lt(tFoyers.abonnementFin, bientot),
        ),
      )
      .orderBy(tFoyers.abonnementFin),

    d
      .select({ id: tFoyers.id, nom: tFoyers.nom, fin: tFoyers.abonnementFin })
      .from(tFoyers)
      .where(eq(tFoyers.statutAbonnement, 'impaye')),

    d.select({ n: count() }).from(tMessages).where(eq(tMessages.traite, false)),

    d
      .select({ quand: tMessages.creeLe })
      .from(tMessages)
      .where(eq(tMessages.traite, false))
      .orderBy(tMessages.creeLe)
      .limit(1),

    d.select({ n: count() }).from(tDemandes).where(eq(tDemandes.statut, 'en_attente')),

    // Foyers dont AU MOINS UN membre est venu depuis 30 jours. Un foyer où
    // personne ne vient n'est pas un client, quel que soit son abonnement.
    d
      .select({ n: sql<number>`count(distinct ${tMembres.foyerId})::int` })
      .from(tMembres)
      .innerJoin(tUtilisateurs, eq(tUtilisateurs.id, tMembres.utilisateurId))
      .where(gt(tUtilisateurs.derniereConnexion, ilYa30j)),

    d
      .select({ n: sql<number>`count(distinct ${tFoyers.id})::int` })
      .from(tFoyers)
      .where(
        sql`not exists (
          select 1 from ${tMembres}
          join ${tUtilisateurs} on ${tUtilisateurs.id} = ${tMembres.utilisateurId}
          where ${tMembres.foyerId} = ${tFoyers.id}
            and ${tUtilisateurs.derniereConnexion} is not null
        )`,
      ),

    /*
     * Volumes de contenu. ⚠ UNIQUEMENT DES `count(*)` : on mesure si le produit
     * SERT, on ne lit rien. Un module à zéro après des semaines dit quelque
     * chose qu'aucun autre chiffre ne dit.
     */
    Promise.all([
      d.select({ n: count() }).from(tTx),
      d.select({ n: count() }).from(tTaches),
      d.select({ n: count() }).from(tCourses),
      d.select({ n: count() }).from(tRecettes),
      d.select({ n: count() }).from(tDocuments),
      d.select({ n: count() }).from(tEvenements),
      d.select({ n: count() }).from(tAgendas),
    ]),

    // ⚠ Peut être `null` si `COMPTES_FICHIER` n'a jamais été synchronisé : la
    // console doit rester utile sans la comptabilité.
    chargerComptes().catch(() => null),
  ]);

  const parStatut = statuts
    .map((s) => ({ libelle: s.statut, n: s.n }))
    .sort((a, b) => b.n - a.n);
  const total = parStatut.reduce((s, x) => s + x.n, 0);

  const mensuels = offres.find((o) => o.offre === 'mensuel')?.n ?? 0;
  const annuels = offres.find((o) => o.offre === 'annuel')?.n ?? 0;
  const actifs2 = parStatut.find((s) => s.libelle === 'actif')?.n ?? 0;
  const sansOffre = Math.max(0, actifs2 - mensuels - annuels);
  const offerts = parStatut.find((s) => s.libelle === 'offert')?.n ?? 0;
  const essaisEnCours = parStatut.find((s) => s.libelle === 'essai')?.n ?? 0;

  /*
   * ⚠ MRR : l'annuel est RAMENÉ AU MOIS, pas compté pour son prix entier. Un
   * abonné annuel à 49,90 € rapporte 4,16 € par mois ; l'inscrire à 49,90
   * multiplierait le revenu récurrent par douze et rendrait le point mort faux.
   */
  const prixMensuel = Math.round((OFFRES.find((o) => o.id === 'mensuel')?.prix ?? 0) * 100);
  const prixAnnuel = Math.round((OFFRES.find((o) => o.id === 'annuel')?.prix ?? 0) * 100);
  const mrr = mensuels * prixMensuel + Math.round((annuels * prixAnnuel) / 12);

  /*
   * ⚠ On ne retient que les DÉPENSES RÉCURRENTES ENCORE ACTIVES. Une dépense
   * unique déjà payée ne pèse pas sur le mois prochain, et un abonnement arrêté
   * (`fin` dépassée, d'où le `actif` de la ligne) ne pèse plus du tout : les inclure
   * gonflerait le point mort de charges qu'on ne paie plus.
   */
  const chargesReelles: ChargeSimulee[] = (comptesProjet?.lignes ?? [])
    .filter((l) => l.sens === 'depense' && l.recurrence !== null && l.actif && l.montantCentimes !== null)
    .map((l) => ({
      id: l.id,
      libelle: l.libelle,
      montantCentimes: l.montantCentimes as number,
      periode: l.recurrence as 'mensuel' | 'annuel',
      active: true,
      reelle: true,
    }));

  const charge = comptesProjet?.chargeMensuelleCentimes ?? 0;
  const pointMort = prixMensuel > 0 ? Math.ceil(charge / prixMensuel) : 0;
  const abonnesEquivalents = prixMensuel > 0 ? Math.floor(mrr / prixMensuel) : 0;

  const tailles = lignesMembres.map((l) => l.n);
  const compteur = new Map<string, number>();
  for (const n of tailles) {
    const cle = n >= 4 ? '4 et plus' : `${n}`;
    compteur.set(cle, (compteur.get(cle) ?? 0) + 1);
  }

  const [nbTx, nbTaches, nbCourses, nbRecettes, nbDocs, nbEv, nbAgendas] = vol;

  return {
    foyers: total,
    parStatut,
    abonnesPayants: actifs2,
    abonnesMensuels: mensuels,
    abonnesAnnuels: annuels,
    actifsSansOffre: sansOffre,
    offerts,
    essaisEnCours,

    utilisateurs: nbUtilisateurs[0].n,
    membresParFoyer: [...compteur.entries()]
      .map(([libelle, n]) => ({ libelle, n }))
      .sort((a, b) => a.libelle.localeCompare(b.libelle)),
    moyenneMembres: tailles.length
      ? Math.round((tailles.reduce((s, n) => s + n, 0) / tailles.length) * 10) / 10
      : 0,
    sansFoyer: nbSansFoyer[0].n,

    mrrCentimes: mrr,
    arrCentimes: mrr * 12,
    chargeMensuelleCentimes: charge,
    soldeProjetCentimes: comptesProjet?.soldeCentimes ?? 0,
    pointMort,
    resteAvantPointMort: Math.max(0, pointMort - abonnesEquivalents),

    essaisQuiExpirent: essais.map((e) => ({
      id: e.id,
      nom: e.nom,
      quand: dateCourte(e.fin),
      jours: joursDepuis(e.fin),
    })),
    impayes: impayes.map((e) => ({
      id: e.id,
      nom: e.nom,
      quand: dateCourte(e.fin),
      jours: joursDepuis(e.fin),
    })),
    messagesNonTraites: msgNonTraites[0].n,
    messagePlusAncienJours: msgAncien[0]
      ? Math.round((Date.now() - msgAncien[0].quand.getTime()) / JOUR)
      : null,
    demandesEnAttente: demandes[0].n,

    foyersActifs30j: actifs[0].n,
    foyersJamaisVenus: jamaisVenus[0].n,
    chargesReelles,
    volumes: [
      { libelle: 'Opérations', n: nbTx[0].n },
      { libelle: 'Tâches', n: nbTaches[0].n },
      { libelle: 'Articles de courses', n: nbCourses[0].n },
      { libelle: 'Recettes', n: nbRecettes[0].n },
      { libelle: 'Documents', n: nbDocs[0].n },
      { libelle: 'Réceptions', n: nbEv[0].n },
      { libelle: 'Agendas rattachés', n: nbAgendas[0].n },
    ],
  };
}
