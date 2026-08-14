import 'server-only';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deconnecterAgenda } from '@/lib/agenda/oauth';
import { comptesAutorises, filtrerComptes } from '@/lib/budget/acces';
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
  ]);

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

  return {
    exporteLe: new Date().toISOString(),
    // Signale que l'export ne couvre pas tout le foyer : sans cette mention,
    // la personne croirait son budget incomplet plutôt que filtré.
    budgetPartiel: !complet,
    foyer: foyer ?? null,
    utilisateurs: utilisateursRows,
    membres: membresRows,
    budget: {
      comptes: comptesVisibles,
      categories: catsRows,
      transactions: txVisibles,
      echeances: echRows,
    },
    cadeaux: cadeauxRows,
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
