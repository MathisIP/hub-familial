import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  evenements as tEvenements,
  evInvites as tInvites,
  evChecklist as tChecklist,
  evMenu as tMenu,
} from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { parseEuro, versISO } from '@/lib/argent';
import {
  ajouterEvenement as creerEventAgenda,
  supprimerEvenement as supprimerEventAgenda,
  listerAgendas,
} from '@/lib/agenda/service';
import type { Agenda } from '@/lib/agenda/schema';
import {
  STATUTS_DEFAUT,
  agregerSousListes,
  construireEvenement,
  parseAgendaLien,
  type DonneesEvenements,
  type Evenement,
  type SousListes,
  RSVP_VALEURS,
} from '@/lib/evenements/schema';

/**
 * SERVICE ÉVÉNEMENTS (serveur uniquement) — Postgres, scopé au FOYER courant.
 * Le maître est en base ; la synchro Google Agenda (lier/délier) est conservée
 * telle quelle (elle passe par lib/agenda/service), seul le stockage du lien
 * (« calendarId|eventId ») migre de la colonne K vers `agenda_lien`.
 */

export async function chargerEvenements(): Promise<DonneesEvenements> {
  const foyerId = await idFoyerCourant();
  // Les quatre tables en parallèle : elles ne dépendent pas les unes des autres,
  // les enchaîner multiplierait l'attente pour rien.
  const d = db();
  const [lignes, invites, checklist, menu] = await Promise.all([
    d.select().from(tEvenements).where(eq(tEvenements.foyerId, foyerId)),
    d.select().from(tInvites).where(eq(tInvites.foyerId, foyerId)),
    d.select().from(tChecklist).where(eq(tChecklist.foyerId, foyerId)),
    d.select().from(tMenu).where(eq(tMenu.foyerId, foyerId)),
  ]);

  // Regroupement en mémoire plutôt qu'une requête par événement : le foyer en a
  // quelques dizaines au plus, et cela évite N+1 allers-retours vers la base.
  const parEvenement = new Map<string, SousListes>();
  const pour = (id: string) => {
    if (!parEvenement.has(id)) parEvenement.set(id, { invites: [], checklist: [], menu: [] });
    return parEvenement.get(id)!;
  };
  for (const i of invites) {
    pour(i.evenementId).invites.push({
      id: i.id, nom: i.nom, contact: i.contact, rsvp: i.rsvp,
      nbPersonnes: i.nbPersonnes, note: i.note,
    });
  }
  for (const t of checklist) {
    pour(t.evenementId).checklist.push({
      id: t.id, tache: t.tache, responsable: t.responsable, echeance: t.echeance, fait: t.fait,
    });
  }
  for (const p of menu) {
    pour(p.evenementId).menu.push({
      id: p.id, libelle: p.libelle, quantite: p.quantite, cout: p.cout,
      coutNum: parseEuro(p.cout), achete: p.achete,
    });
  }

  const evenements: Evenement[] = lignes
    .map((l) => {
      const ev = construireEvenement(l);
      const s = parEvenement.get(l.id) ?? { invites: [], checklist: [], menu: [] };
      return { ...ev, ...agregerSousListes(s), sousListes: s };
    })
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

/* -------------------- SOUS-LISTES (invités / checklist / menu) --------------------
 *
 * ⚠ Toutes ces fonctions reçoivent un identifiant VENANT DU CLIENT. Chacune
 * commence donc par vérifier que l'événement visé appartient bien au foyer
 * courant : sans ce contrôle, deviner un UUID suffirait à lire ou modifier la
 * liste d'invités d'un autre foyer. Le `where foyer_id` des requêtes qui suivent
 * est un second verrou, pas le premier.
 * -------------------------------------------------------------------------- */

/** Vérifie que l'événement est bien celui du foyer courant. */
async function evenementDuFoyer(evenementId: string): Promise<string> {
  const foyerId = await idFoyerCourant();
  const [ev] = await db()
    .select({ id: tEvenements.id })
    .from(tEvenements)
    .where(and(eq(tEvenements.foyerId, foyerId), eq(tEvenements.id, evenementId)))
    .limit(1);
  // Même message qu'un événement inexistant : ne pas révéler qu'il existe ailleurs.
  if (!ev) throw new ErreurValidation('Événement introuvable.');
  return foyerId;
}

const txt = (v: unknown) => String(v ?? '').trim();

/* --- Invités --- */

export async function ajouterInvite(
  evenementId: string,
  c: { nom: string; contact?: string; rsvp?: string; nbPersonnes?: number; note?: string },
): Promise<string> {
  const foyerId = await evenementDuFoyer(evenementId);
  const nom = txt(c.nom);
  if (!nom) throw new ErreurValidation('Indique le nom de l’invité.');
  const [l] = await db()
    .insert(tInvites)
    .values({
      foyerId,
      evenementId,
      nom,
      contact: txt(c.contact),
      rsvp: RSVP_VALEURS.includes(c.rsvp as never) ? (c.rsvp as string) : 'Sans réponse',
      // Une réponse couvre au moins une personne : 0 n'aurait pas de sens.
      nbPersonnes: Number.isFinite(c.nbPersonnes) && Number(c.nbPersonnes) > 0 ? Math.floor(Number(c.nbPersonnes)) : 1,
      note: txt(c.note),
    })
    .returning({ id: tInvites.id });
  return l.id;
}

export async function modifierInvite(
  evenementId: string,
  id: string,
  c: { nom?: string; contact?: string; rsvp?: string; nbPersonnes?: number; note?: string },
): Promise<void> {
  const foyerId = await evenementDuFoyer(evenementId);
  const maj: Record<string, unknown> = {};
  if (c.nom !== undefined) {
    const nom = txt(c.nom);
    if (!nom) throw new ErreurValidation('Le nom de l’invité ne peut pas être vide.');
    maj.nom = nom;
  }
  if (c.contact !== undefined) maj.contact = txt(c.contact);
  if (c.rsvp !== undefined && RSVP_VALEURS.includes(c.rsvp as never)) maj.rsvp = c.rsvp;
  if (c.nbPersonnes !== undefined) {
    maj.nbPersonnes = Number.isFinite(c.nbPersonnes) && Number(c.nbPersonnes) > 0 ? Math.floor(Number(c.nbPersonnes)) : 1;
  }
  if (c.note !== undefined) maj.note = txt(c.note);
  if (Object.keys(maj).length === 0) return;
  await db().update(tInvites).set(maj).where(and(eq(tInvites.foyerId, foyerId), eq(tInvites.id, id)));
}

export async function supprimerInvite(evenementId: string, id: string): Promise<void> {
  const foyerId = await evenementDuFoyer(evenementId);
  await db().delete(tInvites).where(and(eq(tInvites.foyerId, foyerId), eq(tInvites.id, id)));
}

/* --- Checklist --- */

export async function ajouterTacheEvenement(
  evenementId: string,
  c: { tache: string; responsable?: string; echeance?: string },
): Promise<string> {
  const foyerId = await evenementDuFoyer(evenementId);
  const tache = txt(c.tache);
  if (!tache) throw new ErreurValidation('Indique la tâche à faire.');
  const [l] = await db()
    .insert(tChecklist)
    .values({ foyerId, evenementId, tache, responsable: txt(c.responsable), echeance: txt(c.echeance) })
    .returning({ id: tChecklist.id });
  return l.id;
}

export async function modifierTacheEvenement(
  evenementId: string,
  id: string,
  c: { tache?: string; responsable?: string; echeance?: string; fait?: boolean },
): Promise<void> {
  const foyerId = await evenementDuFoyer(evenementId);
  const maj: Record<string, unknown> = {};
  if (c.tache !== undefined) {
    const tache = txt(c.tache);
    if (!tache) throw new ErreurValidation('La tâche ne peut pas être vide.');
    maj.tache = tache;
  }
  if (c.responsable !== undefined) maj.responsable = txt(c.responsable);
  if (c.echeance !== undefined) maj.echeance = txt(c.echeance);
  if (c.fait !== undefined) maj.fait = !!c.fait;
  if (Object.keys(maj).length === 0) return;
  await db().update(tChecklist).set(maj).where(and(eq(tChecklist.foyerId, foyerId), eq(tChecklist.id, id)));
}

export async function supprimerTacheEvenement(evenementId: string, id: string): Promise<void> {
  const foyerId = await evenementDuFoyer(evenementId);
  await db().delete(tChecklist).where(and(eq(tChecklist.foyerId, foyerId), eq(tChecklist.id, id)));
}

/* --- Menu & courses --- */

export async function ajouterPlat(
  evenementId: string,
  c: { libelle: string; quantite?: string; cout?: string },
): Promise<string> {
  const foyerId = await evenementDuFoyer(evenementId);
  const libelle = txt(c.libelle);
  if (!libelle) throw new ErreurValidation('Indique le plat ou l’article.');
  const [l] = await db()
    .insert(tMenu)
    .values({ foyerId, evenementId, libelle, quantite: txt(c.quantite), cout: txt(c.cout) })
    .returning({ id: tMenu.id });
  return l.id;
}

export async function modifierPlat(
  evenementId: string,
  id: string,
  c: { libelle?: string; quantite?: string; cout?: string; achete?: boolean },
): Promise<void> {
  const foyerId = await evenementDuFoyer(evenementId);
  const maj: Record<string, unknown> = {};
  if (c.libelle !== undefined) {
    const libelle = txt(c.libelle);
    if (!libelle) throw new ErreurValidation('Le libellé ne peut pas être vide.');
    maj.libelle = libelle;
  }
  if (c.quantite !== undefined) maj.quantite = txt(c.quantite);
  if (c.cout !== undefined) maj.cout = txt(c.cout);
  if (c.achete !== undefined) maj.achete = !!c.achete;
  if (Object.keys(maj).length === 0) return;
  await db().update(tMenu).set(maj).where(and(eq(tMenu.foyerId, foyerId), eq(tMenu.id, id)));
}

export async function supprimerPlat(evenementId: string, id: string): Promise<void> {
  const foyerId = await evenementDuFoyer(evenementId);
  await db().delete(tMenu).where(and(eq(tMenu.foyerId, foyerId), eq(tMenu.id, id)));
}
