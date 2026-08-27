import 'server-only';
import { and, asc, eq, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { adminScenarios } from '@/lib/db/schema';
import { estAdminComptes } from '@/lib/comptes/service';
import { normaliserParams, PARAMS_DEFAUT } from '@/lib/admin/parametres';
import type { ParametresEco } from '@/lib/admin/modele';

/**
 * SCÉNARIOS ÉCONOMIQUES — persistance des hypothèses de projection.
 *
 * ⚠ **MÊME GARDE QUE `/comptes` ET `/admin` : `EMAIL_ADMIN`.** Toutes les
 * fonctions d'écriture la revérifient, sans exception. Se contenter du contrôle
 * de la page laisserait les actions serveur ouvertes à quiconque en devine le
 * nom — une page protégée n'a jamais protégé ce qu'elle appelle.
 *
 * ⚠ Aucune n'appelle `exigerAcces()` : lier ses propres projections à
 * l'abonnement de son foyer fermerait la porte le jour de l'expiration.
 */

export type Scenario = {
  id: string;
  nom: string;
  params: ParametresEco;
  actif: boolean;
  note: string;
  majLe: Date;
};

const NOM_PAR_DEFAUT = 'Hypothèse de base';

function enScenario(l: typeof adminScenarios.$inferSelect): Scenario {
  return {
    id: l.id,
    nom: l.nom,
    // ⚠ Toujours passer par `normaliserParams` : un scénario enregistré avant
    // l'ajout d'un paramètre arriverait sinon avec un champ manquant, et tout
    // calcul qui en dépend donnerait NaN. L'hypothèse paraîtrait perdue.
    params: normaliserParams(l.params),
    actif: l.actif,
    note: l.note,
    majLe: l.majLe,
  };
}

export async function listerScenarios(): Promise<Scenario[]> {
  if (!(await estAdminComptes())) return [];
  const lignes = await db().select().from(adminScenarios).orderBy(asc(adminScenarios.creeLe));
  return lignes.map(enScenario);
}

/**
 * Le scénario ouvert par défaut.
 *
 * ⚠ **EN CRÉE UN À LA PREMIÈRE VENUE**, plutôt que de renvoyer `null` et laisser
 * la page composer avec l'absence. Sans cela, le premier réglage n'aurait nulle
 * part où se poser et serait perdu au rechargement — exactement ce que cette
 * table existe pour empêcher.
 */
export async function scenarioActif(): Promise<Scenario | null> {
  if (!(await estAdminComptes())) return null;
  const d = db();

  const [existant] = await d.select().from(adminScenarios).where(eq(adminScenarios.actif, true)).limit(1);
  if (existant) return enScenario(existant);

  // Aucun actif : on prend le plus ancien s'il y en a, sinon on en crée un.
  const [premier] = await d.select().from(adminScenarios).orderBy(asc(adminScenarios.creeLe)).limit(1);
  if (premier) {
    await d.update(adminScenarios).set({ actif: true }).where(eq(adminScenarios.id, premier.id));
    return enScenario({ ...premier, actif: true });
  }

  const [cree] = await d
    .insert(adminScenarios)
    .values({ nom: NOM_PAR_DEFAUT, params: PARAMS_DEFAUT, actif: true })
    .returning();
  return enScenario(cree);
}

export async function enregistrerParams(id: string, params: ParametresEco): Promise<void> {
  if (!(await estAdminComptes())) return;
  await db()
    .update(adminScenarios)
    // ⚠ Normalisé à l'écriture AUSSI, pas seulement à la lecture : un champ
    // aberrant venu du client ne doit pas s'installer durablement en base.
    .set({ params: normaliserParams(params), majLe: new Date() })
    .where(eq(adminScenarios.id, id));
}

export async function renommerScenario(id: string, nom: string, note: string): Promise<void> {
  if (!(await estAdminComptes())) return;
  const propre = nom.trim().slice(0, 80) || NOM_PAR_DEFAUT;
  await db()
    .update(adminScenarios)
    .set({ nom: propre, note: note.trim().slice(0, 500), majLe: new Date() })
    .where(eq(adminScenarios.id, id));
}

/** Duplique un scénario pour explorer une variante sans perdre l'original. */
export async function dupliquerScenario(id: string): Promise<string | null> {
  if (!(await estAdminComptes())) return null;
  const d = db();
  const [source] = await d.select().from(adminScenarios).where(eq(adminScenarios.id, id)).limit(1);
  if (!source) return null;
  const [copie] = await d
    .insert(adminScenarios)
    .values({ nom: `${source.nom} (copie)`, params: source.params, note: source.note, actif: false })
    .returning({ id: adminScenarios.id });
  return copie?.id ?? null;
}

export async function activerScenario(id: string): Promise<void> {
  if (!(await estAdminComptes())) return;
  const d = db();
  // ⚠ Désactiver les autres AVANT d'activer celui-ci : dans l'ordre inverse, une
  // interruption entre les deux écritures laisserait zéro scénario actif, et la
  // page en créerait un vide à la visite suivante.
  await d.update(adminScenarios).set({ actif: false }).where(ne(adminScenarios.id, id));
  await d.update(adminScenarios).set({ actif: true }).where(eq(adminScenarios.id, id));
}

/**
 * Supprime un scénario.
 *
 * ⚠ **REFUSE DE SUPPRIMER LE DERNIER.** Se retrouver sans aucun scénario ferait
 * repartir les hypothèses de zéro à la visite suivante — la perte silencieuse
 * que cette table existe pour empêcher.
 */
export async function supprimerScenario(id: string): Promise<boolean> {
  if (!(await estAdminComptes())) return false;
  const d = db();
  const restants = await d.select({ id: adminScenarios.id }).from(adminScenarios).where(ne(adminScenarios.id, id));
  if (restants.length === 0) return false;

  const [supprime] = await d.delete(adminScenarios).where(eq(adminScenarios.id, id)).returning({ actif: adminScenarios.actif });
  // Si c'était l'actif, on en réactive un autre : jamais d'état sans actif.
  if (supprime?.actif) {
    await d.update(adminScenarios).set({ actif: true }).where(eq(adminScenarios.id, restants[0].id));
  }
  return true;
}

/** Remet un scénario aux hypothèses de départ, sans le supprimer. */
export async function reinitialiserScenario(id: string): Promise<void> {
  if (!(await estAdminComptes())) return;
  await db()
    .update(adminScenarios)
    .set({ params: PARAMS_DEFAUT, majLe: new Date() })
    .where(and(eq(adminScenarios.id, id)));
}
