import 'server-only';
import { and, desc, eq, inArray, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  cadeaux as tCadeaux,
  cadeauxMasques as tMasques,
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
 * Restreint une requête aux cadeaux que cette personne a le droit de voir :
 * ceux dont elle ne figure PAS dans la liste des personnes à qui on les cache.
 *
 * `not exists` plutôt qu'une jointure : un cadeau masqué à trois personnes ne
 * doit pas être renvoyé trois fois.
 */
function filtreMasquage(utilisateurId: string) {
  return sql`not exists (
    select 1 from ${tMasques}
    where ${tMasques.cadeauId} = ${tCadeaux.id}
      and ${tMasques.utilisateurId} = ${utilisateurId}
  )`;
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

  // Qui est masqué sur quoi — une seule requête pour toute la liste.
  const masques = lignesCad.length
    ? await d
        .select({ cadeauId: tMasques.cadeauId, utilisateurId: tMasques.utilisateurId })
        .from(tMasques)
        .where(
          and(
            eq(tMasques.foyerId, foyerId),
            inArray(tMasques.cadeauId, lignesCad.map((c) => c.id)),
          ),
        )
    : [];
  const parCadeau = new Map<string, string[]>();
  for (const m of masques) {
    parCadeau.set(m.cadeauId, [...(parCadeau.get(m.cadeauId) ?? []), m.utilisateurId]);
  }

  const cadeaux = lignesCad.map((r) => construireCadeau({ ...r, masqueA: parCadeau.get(r.id) ?? [] }));
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
 * Identifiants reçus du client : on ne retient que de VRAIS membres du foyer.
 * Sans ce contrôle, un identifiant arbitraire s'inscrirait en base — masquant le
 * cadeau à personne, ou à quelqu'un d'un autre foyer.
 */
async function masquesValides(foyerId: string, brut: string[] | undefined): Promise<string[]> {
  const demandes = [...new Set((brut ?? []).map((v) => v.trim()).filter(Boolean))];
  if (demandes.length === 0) return [];
  const membresRows = await db()
    .select({ u: tMembres.utilisateurId })
    .from(tMembres)
    .where(eq(tMembres.foyerId, foyerId));
  const duFoyer = new Set(membresRows.map((m) => m.u));
  const inconnu = demandes.find((d) => !duFoyer.has(d));
  if (inconnu) throw new ErreurValidation('Cette personne ne fait pas partie du foyer.');
  return demandes;
}

/** Réécrit la liste des personnes à qui ce cadeau est caché. */
async function ecrireMasques(foyerId: string, cadeauId: string, personnes: string[]): Promise<void> {
  const d = db();
  await d
    .delete(tMasques)
    .where(and(eq(tMasques.foyerId, foyerId), eq(tMasques.cadeauId, cadeauId)));
  if (personnes.length > 0) {
    await d
      .insert(tMasques)
      .values(personnes.map((utilisateurId) => ({ foyerId, cadeauId, utilisateurId })));
  }
}

/** Valeurs d'une ligne cadeau à partir des champs éditables (défauts inclus). */
function valeurs(c: ChampsCadeau) {
  return {
    pourQui: c.pourQui ?? '',
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
  const masques = await masquesValides(foyerId, c.masqueA);
  await assurerOccasion(foyerId, c.occasion ?? '');
  const [row] = await db()
    .insert(tCadeaux)
    .values({ foyerId, ...valeurs(c) })
    .returning({ id: tCadeaux.id });
  await ecrireMasques(foyerId, row.id, masques);
  return row.id;
}

export async function modifierCadeau(id: string, c: ChampsCadeau): Promise<void> {
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  const { foyerId, utilisateurId } = await contexteAcces();
  await cadeauVisible(foyerId, utilisateurId, id);
  const masques = await masquesValides(foyerId, c.masqueA);
  await assurerOccasion(foyerId, c.occasion ?? '');
  const res = await db()
    .update(tCadeaux)
    .set(valeurs(c))
    .where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)))
    .returning({ id: tCadeaux.id });
  if (res.length === 0) throw new ErreurValidation('Cadeau introuvable.');
  await ecrireMasques(foyerId, id, masques);
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
