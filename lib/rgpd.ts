import 'server-only';
import { eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import { deconnecterAgenda } from '@/lib/agenda/oauth';
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
 * Tout est scopé au foyer (les modules de l'app le sont déjà). L'export rassemble
 * l'intégralité des données du foyer ; la suppression efface le foyer (cascade sur
 * toutes les tables `foyer_id`) puis l'utilisateur.
 */

/** Rassemble toutes les données d'un foyer, prêtes à sérialiser en JSON. */
export async function exporterDonneesFoyer(foyerId: string) {
  const d = db();
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

  return {
    exporteLe: new Date().toISOString(),
    foyer: foyer ?? null,
    utilisateurs: utilisateursRows,
    membres: membresRows,
    budget: { comptes: comptesRows, categories: catsRows, transactions: txRows, echeances: echRows },
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
 * Effacement définitif : supprime le foyer (cascade → toutes ses données, membres
 * et invitations) puis l'utilisateur. Après appel, la session doit être fermée.
 */
export async function supprimerFoyerEtUtilisateur(foyerId: string, utilisateurId: string): Promise<void> {
  // Révoquer l'autorisation Google AVANT d'effacer : la cascade SQL supprimerait
  // nos jetons, mais l'autorisation resterait active côté Google et continuerait
  // d'apparaître dans les applications connectées de la personne. Un effacement
  // de compte doit vraiment tout retirer.
  await deconnecterAgenda(utilisateurId);

  const d = db();
  await d.delete(foyers).where(eq(foyers.id, foyerId)); // cascade sur toutes les tables foyer_id
  await d.delete(utilisateurs).where(eq(utilisateurs.id, utilisateurId));
}
