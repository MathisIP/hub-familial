import 'server-only';
import { and, desc, eq, isNull, ne, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  cadeaux as tCadeaux,
  occasions as tOccasions,
  membres as tMembres,
  utilisateurs as tUtilisateurs,
} from '@/lib/db/schema';
import { ErreurValidation } from '@/lib/erreurs';
import { contexteAcces } from '@/lib/visibilite';
import {
  STATUTS_DEFAUT,
  construireCadeau,
  construireOccasion,
  type ChampsCadeau,
  type DonneesCadeaux,
  type MembreFoyer,
} from '@/lib/cadeaux/schema';

/**
 * SERVICE CADEAUX (serveur uniquement) — Postgres, scopé au FOYER courant.
 * =======================================================================
 * Chaque lecture/écriture filtre sur `foyer_id` : un foyer ne voit jamais les
 * données d'un autre.
 *
 * ⚠ VISIBILITÉ EN LISTE NOIRE (`cadeaux.masque_a`). Contrairement aux comptes ou
 * aux dossiers, un cadeau n'est pas réservé à quelques-uns : il est visible du
 * foyer ENTIER **sauf** de la personne à qui il est destiné. C'est la seule
 * forme qui tienne la surprise quand quelqu'un rejoint le foyer après la saisie
 * — une liste blanche la lui masquerait, contresens exact de ce qu'on veut.
 *
 * ⚠ Le masquage porte sur la LECTURE **et** sur l'écriture : pouvoir modifier ou
 * supprimer un cadeau qu'on ne voit pas en révélerait l'existence par la réponse
 * du serveur. D'où `cadeauVisible()` sur chaque mutation.
 *
 * ⚠ Et il porte aussi sur les TOTAUX : `chargerCadeaux` ne renvoie que les
 * cadeaux visibles, donc le budget par occasion recalculé côté client tombe
 * juste pour chacun. Un total qui ne colle pas révèle qu'il s'y cache quelque
 * chose — la fuite la plus bête serait là.
 */

export type { ChampsCadeau };

/**
 * Restreint une requête aux cadeaux que cette personne a le droit de voir.
 * `masque_a IS NULL` (cas courant) ou visant quelqu'un d'autre.
 */
function filtreMasquage(utilisateurId: string) {
  return or(isNull(tCadeaux.masqueA), ne(tCadeaux.masqueA, utilisateurId));
}

export async function chargerCadeaux(): Promise<DonneesCadeaux> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const d = db();

  const [lignesCad, lignesOcc, lignesMembres] = await Promise.all([
    d
      .select()
      .from(tCadeaux)
      .where(and(eq(tCadeaux.foyerId, foyerId), filtreMasquage(utilisateurId)))
      .orderBy(desc(tCadeaux.creeLe)),
    d.select().from(tOccasions).where(eq(tOccasions.foyerId, foyerId)),
    // Membres du foyer : alimentent le sélecteur « ne pas montrer à ».
    d
      .select({ utilisateurId: tMembres.utilisateurId, nom: tUtilisateurs.nom, email: tUtilisateurs.email })
      .from(tMembres)
      .innerJoin(tUtilisateurs, eq(tUtilisateurs.id, tMembres.utilisateurId))
      .where(eq(tMembres.foyerId, foyerId)),
  ]);

  const cadeaux = lignesCad.map(construireCadeau);
  const occasions = lignesOcc
    .map((o) => construireOccasion({ nom: o.nom, date: o.date, budget: o.budget, note: o.note }))
    .sort((a, b) => (a.dateISO ?? '9999').localeCompare(b.dateISO ?? '9999'));

  // Liste « offert par » dérivée des cadeaux existants (alimente le datalist).
  const offertPar = [...new Set(lignesCad.map((r) => r.offertPar.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );

  // Le sélecteur « ne pas montrer à » ne propose que les AUTRES : se masquer un
  // cadeau à soi-même n'a aucun sens, et on ne le retrouverait plus pour défaire
  // le réglage.
  const membres: MembreFoyer[] = lignesMembres
    .filter((m) => m.utilisateurId !== utilisateurId)
    .map((m) => ({ utilisateurId: m.utilisateurId, nom: m.nom || m.email }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));

  return { cadeaux, occasions, statuts: STATUTS_DEFAUT, offertPar, membres };
}

/** Crée l'occasion (nom seul) si elle n'existe pas encore pour ce foyer. */
async function assurerOccasion(foyerId: string, nom: string): Promise<void> {
  const n = nom.trim();
  if (!n) return;
  await db()
    .insert(tOccasions)
    .values({ foyerId, nom: n })
    .onConflictDoNothing({ target: [tOccasions.foyerId, tOccasions.nom] });
}

/**
 * Vérifie que ce cadeau existe dans le foyer ET n'est pas masqué à cette
 * personne. Message identique à « inexistant » : distinguer « interdit » de
 * « inconnu », c'est déjà confirmer l'existence — et donc gâcher la surprise.
 */
async function cadeauVisible(foyerId: string, utilisateurId: string, id: string): Promise<void> {
  const [row] = await db()
    .select({ id: tCadeaux.id })
    .from(tCadeaux)
    .where(
      and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId), filtreMasquage(utilisateurId)),
    )
    .limit(1);
  if (!row) throw new ErreurValidation('Cadeau introuvable.');
}

/**
 * `masque_a` reçu du client : on n'accepte qu'un membre RÉEL du foyer. Sans ce
 * contrôle, un identifiant arbitraire s'inscrirait en base et masquerait le
 * cadeau à personne — ou à quelqu'un d'un autre foyer.
 */
async function masqueAValide(foyerId: string, brut: string | null | undefined): Promise<string | null> {
  const v = (brut ?? '').trim();
  if (!v) return null;
  const [m] = await db()
    .select({ u: tMembres.utilisateurId })
    .from(tMembres)
    .where(and(eq(tMembres.foyerId, foyerId), eq(tMembres.utilisateurId, v)))
    .limit(1);
  if (!m) throw new ErreurValidation('Cette personne ne fait pas partie du foyer.');
  return m.u;
}

/** Valeurs d'une ligne cadeau à partir des champs éditables (défauts inclus). */
function valeurs(c: ChampsCadeau, masqueA: string | null) {
  return {
    pourQui: c.pourQui ?? '',
    masqueA,
    occasion: (c.occasion ?? '').trim(),
    idee: c.idee.trim(),
    statut: c.statut ?? 'Idée',
    budgetPrevu: c.budgetPrevu ?? '',
    prixPaye: c.prixPaye ?? '',
    partage: !!c.partage,
    participation: c.participation ?? '',
    offertPar: c.offertPar ?? '',
    ou: c.ou ?? '',
    note: c.note ?? '',
  };
}

export async function ajouterCadeau(c: ChampsCadeau): Promise<string> {
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  const { foyerId } = await contexteAcces();
  const masqueA = await masqueAValide(foyerId, c.masqueA);
  await assurerOccasion(foyerId, c.occasion ?? '');
  const [row] = await db()
    .insert(tCadeaux)
    .values({ foyerId, ...valeurs(c, masqueA) })
    .returning({ id: tCadeaux.id });
  return row.id;
}

export async function modifierCadeau(id: string, c: ChampsCadeau): Promise<void> {
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  const { foyerId, utilisateurId } = await contexteAcces();
  await cadeauVisible(foyerId, utilisateurId, id);
  const masqueA = await masqueAValide(foyerId, c.masqueA);
  await assurerOccasion(foyerId, c.occasion ?? '');
  const res = await db()
    .update(tCadeaux)
    .set(valeurs(c, masqueA))
    .where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)))
    .returning({ id: tCadeaux.id });
  if (res.length === 0) throw new ErreurValidation('Cadeau introuvable.');
}

/** Change uniquement le statut. */
export async function changerStatutCadeau(id: string, statut: string): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  await cadeauVisible(foyerId, utilisateurId, id);
  const res = await db()
    .update(tCadeaux)
    .set({ statut })
    .where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)))
    .returning({ id: tCadeaux.id });
  if (res.length === 0) throw new ErreurValidation('Cadeau introuvable.');
}

export async function supprimerCadeau(id: string): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  await cadeauVisible(foyerId, utilisateurId, id);
  await db().delete(tCadeaux).where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)));
}
