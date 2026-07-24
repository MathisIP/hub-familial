import 'server-only';
import { and, desc, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { cadeaux as tCadeaux, occasions as tOccasions } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  STATUTS_DEFAUT,
  construireCadeau,
  construireOccasion,
  type ChampsCadeau,
  type DonneesCadeaux,
} from '@/lib/cadeaux/schema';

/**
 * SERVICE CADEAUX (serveur uniquement) — Postgres, scopé au FOYER courant.
 * =======================================================================
 * Chaque lecture/écriture filtre sur `foyer_id` (via idFoyerCourant()) : un
 * foyer ne voit jamais les données d'un autre. Remplace la version Google Sheets.
 */

export type { ChampsCadeau };

export async function chargerCadeaux(): Promise<DonneesCadeaux> {
  const foyerId = await idFoyerCourant();
  const d = db();

  const [lignesCad, lignesOcc] = await Promise.all([
    d.select().from(tCadeaux).where(eq(tCadeaux.foyerId, foyerId)).orderBy(desc(tCadeaux.creeLe)),
    d.select().from(tOccasions).where(eq(tOccasions.foyerId, foyerId)),
  ]);

  const cadeaux = lignesCad.map(construireCadeau);
  const occasions = lignesOcc
    .map((o) => construireOccasion({ nom: o.nom, date: o.date, budget: o.budget, note: o.note }))
    .sort((a, b) => (a.dateISO ?? '9999').localeCompare(b.dateISO ?? '9999'));

  // Liste « offert par » dérivée des cadeaux existants (alimente le datalist).
  const offertPar = [...new Set(lignesCad.map((r) => r.offertPar.trim()).filter(Boolean))].sort(
    (a, b) => a.localeCompare(b),
  );

  return { cadeaux, occasions, statuts: STATUTS_DEFAUT, offertPar };
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

/** Valeurs d'une ligne cadeau à partir des champs éditables (défauts inclus). */
function valeurs(c: ChampsCadeau) {
  return {
    pourQui: c.pourQui ?? '',
    occasion: (c.occasion ?? '').trim(),
    idee: c.idee.trim(),
    statut: c.statut ?? 'Idée',
    budgetPrevu: c.budgetPrevu ?? '',
    prixPaye: c.prixPaye ?? '',
    offertPar: c.offertPar ?? '',
    ou: c.ou ?? '',
    note: c.note ?? '',
  };
}

export async function ajouterCadeau(c: ChampsCadeau): Promise<string> {
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  const foyerId = await idFoyerCourant();
  await assurerOccasion(foyerId, c.occasion ?? '');
  const [row] = await db()
    .insert(tCadeaux)
    .values({ foyerId, ...valeurs(c) })
    .returning({ id: tCadeaux.id });
  return row.id;
}

export async function modifierCadeau(id: string, c: ChampsCadeau): Promise<void> {
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  const foyerId = await idFoyerCourant();
  await assurerOccasion(foyerId, c.occasion ?? '');
  const res = await db()
    .update(tCadeaux)
    .set(valeurs(c))
    .where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)))
    .returning({ id: tCadeaux.id });
  if (res.length === 0) throw new ErreurValidation('Cadeau introuvable.');
}

/** Change uniquement le statut. */
export async function changerStatutCadeau(id: string, statut: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const res = await db()
    .update(tCadeaux)
    .set({ statut })
    .where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)))
    .returning({ id: tCadeaux.id });
  if (res.length === 0) throw new ErreurValidation('Cadeau introuvable.');
}

export async function supprimerCadeau(id: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  await db().delete(tCadeaux).where(and(eq(tCadeaux.id, id), eq(tCadeaux.foyerId, foyerId)));
}
