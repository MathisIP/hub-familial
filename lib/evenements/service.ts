import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { evenements as tEvenements } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { versISO } from '@/lib/argent';
import {
  ajouterEvenement as creerEventAgenda,
  supprimerEvenement as supprimerEventAgenda,
  listerAgendas,
} from '@/lib/agenda/service';
import type { Agenda } from '@/lib/agenda/schema';
import {
  STATUTS_DEFAUT,
  construireEvenement,
  parseAgendaLien,
  type DonneesEvenements,
  type Evenement,
} from '@/lib/evenements/schema';

/**
 * SERVICE ÉVÉNEMENTS (serveur uniquement) — Postgres, scopé au FOYER courant.
 * Le maître est en base ; la synchro Google Agenda (lier/délier) est conservée
 * telle quelle (elle passe par lib/agenda/service), seul le stockage du lien
 * (« calendarId|eventId ») migre de la colonne K vers `agenda_lien`.
 */

export async function chargerEvenements(): Promise<DonneesEvenements> {
  const foyerId = await idFoyerCourant();
  const lignes = await db().select().from(tEvenements).where(eq(tEvenements.foyerId, foyerId));

  const evenements: Evenement[] = lignes
    .map(construireEvenement)
    .sort((a, b) => {
      const da = a.dateISO ?? '9999-99-99';
      const db_ = b.dateISO ?? '9999-99-99';
      return da !== db_ ? da.localeCompare(db_) : a.nom.localeCompare(b.nom);
    });

  // Types dérivés des événements existants (datalist) ; statuts = liste fixe.
  const types = [...new Set(lignes.map((l) => l.type.trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b),
  );

  // Agendas où pousser un événement (défensif : vide si Agenda indispo/non configuré).
  let agendas: Agenda[] = [];
  try {
    agendas = await listerAgendas();
  } catch {
    agendas = [];
  }

  return { evenements, types, statuts: STATUTS_DEFAUT, agendas };
}

/* ------------------------------ MUTATIONS ------------------------------ */

export type ChampsEvenement = {
  nom: string;
  type?: string;
  date?: string;
  heure?: string;
  lieu?: string;
  budgetPrevu?: string;
  depense?: string;
  statut?: string;
  note?: string;
};

/** Valeurs A→J (agendaLien NON touché ici, préservé). */
function valeurs(c: ChampsEvenement) {
  return {
    nom: c.nom.trim(),
    type: c.type ?? '',
    date: c.date ?? '',
    heure: c.heure ?? '',
    lieu: c.lieu ?? '',
    budgetPrevu: c.budgetPrevu ?? '',
    depense: c.depense ?? '',
    statut: c.statut ?? '',
    note: c.note ?? '',
  };
}

export async function ajouterEvenement(c: ChampsEvenement): Promise<string> {
  if (!c.nom?.trim()) throw new ErreurValidation("Le nom de l'événement est requis.");
  const foyerId = await idFoyerCourant();
  const [row] = await db()
    .insert(tEvenements)
    .values({ foyerId, ...valeurs(c) })
    .returning({ id: tEvenements.id });
  return row.id;
}

export async function modifierEvenement(id: string, c: ChampsEvenement): Promise<void> {
  if (!c.nom?.trim()) throw new ErreurValidation("Le nom de l'événement est requis.");
  const foyerId = await idFoyerCourant();
  const res = await db()
    .update(tEvenements)
    .set(valeurs(c))
    .where(and(eq(tEvenements.id, id), eq(tEvenements.foyerId, foyerId)))
    .returning({ id: tEvenements.id });
  if (res.length === 0) throw new ErreurValidation('Événement introuvable.');
}

/** Change uniquement le statut. */
export async function changerStatutEvenement(id: string, statut: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const res = await db()
    .update(tEvenements)
    .set({ statut })
    .where(and(eq(tEvenements.id, id), eq(tEvenements.foyerId, foyerId)))
    .returning({ id: tEvenements.id });
  if (res.length === 0) throw new ErreurValidation('Événement introuvable.');
}

/* --------------------------- LIEN AVEC L'AGENDA --------------------------- */

/** « 19:00 » / « 19h00 » / « 19h » / « 9:5 » → « HH:MM », sinon null (journée entière). */
function parseHeure(v: string): string | null {
  const s = v.trim().toLowerCase().replace('h', ':');
  const m = s.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = m[2] ? Number(m[2]) : 0;
  if (h > 23 || mn > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

/** Lit un événement du foyer (par id) ou lève une erreur claire. */
async function lireEvenement(foyerId: string, id: string) {
  const [ev] = await db()
    .select()
    .from(tEvenements)
    .where(and(eq(tEvenements.id, id), eq(tEvenements.foyerId, foyerId)))
    .limit(1);
  if (!ev) throw new ErreurValidation('Événement introuvable.');
  return ev;
}

/**
 * Crée l'événement dans l'agenda choisi (nom, date, heure, lieu, note) et mémorise
 * « calendarId|eventId » dans `agenda_lien` (dédoublonnage).
 */
export async function lierAgenda(id: string, calendarId: string): Promise<void> {
  if (!calendarId.trim()) throw new ErreurValidation('Agenda cible requis.');
  const foyerId = await idFoyerCourant();
  const ev = await lireEvenement(foyerId, id);
  if (ev.agendaLien.trim()) throw new ErreurValidation('Événement déjà dans l’agenda.');

  const dateISO = versISO(ev.date);
  if (!dateISO) throw new ErreurValidation("L'événement doit avoir une date pour aller dans l'agenda.");

  const heure = parseHeure(ev.heure);
  const eventId = await creerEventAgenda({
    calendarId,
    titre: ev.nom,
    date: dateISO,
    journeeEntiere: heure === null,
    heureDebut: heure ?? undefined,
    lieu: ev.lieu,
    description: [ev.type, ev.note].filter(Boolean).join(' — '),
  });

  await db()
    .update(tEvenements)
    .set({ agendaLien: `${calendarId}|${eventId}` })
    .where(and(eq(tEvenements.id, id), eq(tEvenements.foyerId, foyerId)));
}

/** Supprime l'événement d'agenda lié et vide `agenda_lien`. */
export async function delierAgenda(id: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const ev = await lireEvenement(foyerId, id);
  const lien = parseAgendaLien(ev.agendaLien);
  if (lien) {
    try {
      await supprimerEventAgenda(lien.calendarId, lien.eventId);
    } catch {
      // événement d'agenda déjà supprimé côté Google : on nettoie quand même le lien
    }
  }
  await db()
    .update(tEvenements)
    .set({ agendaLien: '' })
    .where(and(eq(tEvenements.id, id), eq(tEvenements.foyerId, foyerId)));
}
