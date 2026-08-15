import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deconnecterAgenda } from '@/lib/agenda/oauth';
import { comptesAutorises, filtrerComptes } from '@/lib/budget/acces';
import { filtrerRestreints } from '@/lib/visibilite';
import { idFoyerCourant, utilisateurCourant } from '@/lib/foyer';
import {
  foyers,
  utilisateurs,
  membres,
  comptes,
  budgetCategories,
  transactions,
  echeances,
  cadeaux,
  occasions,
  taches,
  courses,
  recettes,
  semaine,
  evenements,
  documents,
  dossiers,
  dossiersAcces,
} from '@/lib/db/schema';

/**
 * RGPD — portabilité (export) et droit à l'effacement (suppression).
 * ==================================================================
 * Tout est scopé au foyer (les modules de l'app le sont déjà).
 *
 * ⚠ MAIS LE FOYER N'EST PAS LA BONNE UNITÉ POUR L'EXPORT. Les droits RGPD
 * appartiennent à la **personne concernée**, pas au client qui paie : chaque
 * membre peut exercer les siens directement, sans l'accord du propriétaire.
 * Symétriquement, l'article 15(4) précise que le droit d'accès « ne doit pas
 * porter atteinte aux droits et libertés d'autrui » — livrer tout le budget du
 * foyer à un membre reviendrait à lui divulguer les données des autres.
 *
 * D'où la règle : **chacun exporte SA vue**, propriétaire compris. Les comptes
 * et opérations sont filtrés sur ce que la personne a le droit de voir
 * ([lib/budget/acces.ts]) ; le reste (catégories, échéances, repas, courses…)
 * est de niveau foyer et partagé par construction.
 */

/**
 * Rôle de la personne connectée dans son foyer (`proprietaire` | `membre`).
 * Sert à annoncer honnêtement ce qu'une suppression de compte va effacer.
 */
export async function monRoleDansLeFoyer(): Promise<string | null> {
  const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
  const [m] = await db()
    .select({ role: membres.role })
    .from(membres)
    .where(and(eq(membres.foyerId, foyerId), eq(membres.utilisateurId, user.id)))
    .limit(1);
  return m?.role ?? null;
}

/** Rassemble les données du foyer visibles par cette personne, prêtes à sérialiser. */
export async function exporterDonneesFoyer(foyerId: string, utilisateurId: string) {
  const d = db();
  const autorises = await comptesAutorises(foyerId, utilisateurId);
  const [foyer] = await d.select().from(foyers).where(eq(foyers.id, foyerId));

  const [
    membresRows,
    comptesRows,
    catsRows,
    txRows,
    echRows,
    cadeauxRows,
    occasionsRows,
    tachesRows,
    coursesRows,
    recettesRows,
    semaineRows,
    evRows,
    documentsRows,
    dossiersRows,
    dossiersAccesRows,
  ] = await Promise.all([
    d.select().from(membres).where(eq(membres.foyerId, foyerId)),
    d.select().from(comptes).where(eq(comptes.foyerId, foyerId)),
    d.select().from(budgetCategories).where(eq(budgetCategories.foyerId, foyerId)),
    d.select().from(transactions).where(eq(transactions.foyerId, foyerId)),
    d.select().from(echeances).where(eq(echeances.foyerId, foyerId)),
    d.select().from(cadeaux).where(eq(cadeaux.foyerId, foyerId)),
    d.select().from(occasions).where(eq(occasions.foyerId, foyerId)),
    d.select().from(taches).where(eq(taches.foyerId, foyerId)),
    d.select().from(courses).where(eq(courses.foyerId, foyerId)),
    d.select().from(recettes).where(eq(recettes.foyerId, foyerId)),
    d.select().from(semaine).where(eq(semaine.foyerId, foyerId)),
    d.select().from(evenements).where(eq(evenements.foyerId, foyerId)),
    d.select().from(documents).where(eq(documents.foyerId, foyerId)),
    d.select().from(dossiers).where(eq(dossiers.foyerId, foyerId)),
    d
      .select({ dossierId: dossiersAcces.dossierId })
      .from(dossiersAcces)
      .where(
        and(eq(dossiersAcces.foyerId, foyerId), eq(dossiersAcces.utilisateurId, utilisateurId)),
      ),
  ]);

  /*
   * DOCUMENTS — l'export les ignorait complètement, ce qui était une lacune de
   * portabilité : les fichiers du foyer sont des données personnelles comme les
   * autres, et souvent les plus sensibles (bail, carnet de santé).
   *
   * ⚠ On exporte les MÉTADONNÉES, pas les octets : un JSON contenant 25 Mo de
   * pièces jointes en base64 par fichier serait ingérable, et le contenu reste
   * téléchargeable un par un depuis l'app. Chaque entrée porte donc son lien.
   *
   * ⚠ Filtré comme le reste : seuls les documents des dossiers accessibles. Un
   * dossier restreint ne doit pas fuir par la porte de l'export.
   */
  const dossiersAutorises = new Set(dossiersAccesRows.map((a) => a.dossierId));
  const { visibles: dossiersVisibles, complet: dossiersComplet } = filtrerRestreints(
    dossiersRows,
    dossiersAutorises,
  );
  const nomsDossiersVisibles = new Set(dossiersVisibles.map((x) => x.nom));
  const nomsDossiersConnus = new Set(dossiersRows.map((x) => x.nom));
  const documentsVisibles = documentsRows
    .filter((doc) => {
      const nom = (doc.dossier ?? '').trim();
      // Sans dossier, ou dossier jamais déclaré : commun au foyer.
      if (!nom || !nomsDossiersConnus.has(nom)) return true;
      return dossiersComplet || nomsDossiersVisibles.has(nom);
    })
    .map((doc) => ({
      id: doc.id,
      nom: doc.nom,
      dossier: doc.dossier,
      type: doc.type,
      taille: doc.taille,
      creeLe: doc.creeLe,
      // Le contenu se télécharge ici (session requise). La `cle` de stockage
      // n'est jamais exposée : c'est un détail interne du fournisseur.
      telechargement: `/api/documents/${doc.id}?dl=1`,
    }));

  const utilisateursRows = membresRows.length
    ? await d
        .select()
        .from(utilisateurs)
        .where(inArray(utilisateurs.id, membresRows.map((m) => m.utilisateurId)))
    : [];

  // Filtrage budget : ce que CETTE personne a le droit de voir. Les opérations
  // désignent leur compte par nom (pas par clé étrangère), d'où le passage par
  // les noms visibles. Un virement dont un seul côté est visible est conservé —
  // il explique le solde d'un compte qu'elle voit.
  const { comptes: comptesVisibles, noms, complet } = filtrerComptes(comptesRows, autorises);
  const nomsVisibles = new Set(noms);
  const txVisibles = complet
    ? txRows
    : txRows.filter((t) => nomsVisibles.has(t.compte) || nomsVisibles.has(t.dest));

  // Échéances : une échéance rattachée à un compte hérite de SA visibilité.
  // Sans compte, elle est commune au foyer. Sans ce filtre, « prêt auto » et sa
  // date racontent un compte qu'on masque par ailleurs.
  const idsComptesVisibles = new Set(comptesVisibles.map((c) => c.id));
  const echVisibles = complet
    ? echRows
    : echRows.filter((e) => !e.compteId || idsComptesVisibles.has(e.compteId));

  // Cadeaux : LISTE NOIRE. On retire ceux qui sont masqués à cette personne —
  // l'export serait sinon le moyen le plus simple de gâcher sa propre surprise.
  const cadeauxVisibles = cadeauxRows.filter((c) => c.masqueA !== utilisateurId);

  return {
    exporteLe: new Date().toISOString(),
    // Signale que l'export ne couvre pas tout le foyer : sans cette mention,
    // la personne croirait ses données incomplètes plutôt que filtrées.
    budgetPartiel: !complet,
    foyer: foyer ?? null,
    utilisateurs: utilisateursRows,
    membres: membresRows,
    budget: {
      comptes: comptesVisibles,
      categories: catsRows,
      transactions: txVisibles,
      echeances: echVisibles,
    },
    documents: documentsVisibles,
    cadeaux: cadeauxVisibles,
    occasions: occasionsRows,
    taches: tachesRows,
    courses: coursesRows,
    recettes: recettesRows,
    semaine: semaineRows,
    evenements: evRows,
  };
}

/**
 * Effacement définitif du compte de la personne.
 *
 * ⚠ CE QUE L'ON EFFACE DÉPEND DU RÔLE — et c'est un correctif, pas un raffinement.
 * Cette fonction supprimait le FOYER dans tous les cas : un enfant ou un
 * colocataire qui cliquait « supprimer mon compte » détruisait le budget, les
 * documents et l'agenda de TOUT le foyer, sans retour possible. Il croyait
 * partir, il rasait la maison.
 *
 *  · **Membre** → il quitte le foyer (sa ligne `membres`) et son identité est
 *    effacée. Les données du foyer restent : elles ne lui appartiennent pas plus
 *    qu'aux autres, et le foyer continue d'exister sans lui.
 *  · **Propriétaire** → le foyer est supprimé (cascade sur toutes les tables
 *    `foyer_id`), comme avant. C'est lui qui a créé le foyer et souscrit
 *    l'abonnement ; son départ met fin au service.
 *
 * Après appel, la session doit être fermée.
 */
export async function supprimerFoyerEtUtilisateur(foyerId: string, utilisateurId: string): Promise<void> {
  // Révoquer l'autorisation Google AVANT d'effacer : la cascade SQL supprimerait
  // nos jetons, mais l'autorisation resterait active côté Google et continuerait
  // d'apparaître dans les applications connectées de la personne. Un effacement
  // de compte doit vraiment tout retirer.
  await deconnecterAgenda(utilisateurId);

  const d = db();
  const [moi] = await d
    .select({ role: membres.role })
    .from(membres)
    .where(and(eq(membres.foyerId, foyerId), eq(membres.utilisateurId, utilisateurId)))
    .limit(1);

  if (moi?.role === 'proprietaire') {
    await d.delete(foyers).where(eq(foyers.id, foyerId)); // cascade sur toutes les tables foyer_id
  } else {
    // La cascade sur `utilisateurs` emporterait déjà l'appartenance ; on la
    // retire explicitement pour que l'intention soit lisible dans le code.
    await d
      .delete(membres)
      .where(and(eq(membres.foyerId, foyerId), eq(membres.utilisateurId, utilisateurId)));
  }
  await d.delete(utilisateurs).where(eq(utilisateurs.id, utilisateurId));
}
