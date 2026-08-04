import 'server-only';
import { google, type calendar_v3 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import { googleAuth } from '@/lib/google/auth';
import { db } from '@/lib/db';
import { foyerAgendas } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import {
  COULEURS_AGENDA,
  FUSEAU,
  type Agenda,
  type DonneesAgenda,
  type EvenementAgenda,
  type NouvelEvenement,
} from '@/lib/agenda/schema';

/**
 * SERVICE AGENDA (serveur uniquement) — Google Calendar.
 *
 * ⚠ ISOLATION : les calendriers sont rattachés AU FOYER (table `foyer_agendas`),
 * plus à la variable d'environnement globale `AGENDA_IDS`. Celle-ci faisait voir
 * les mêmes agendas à tous les foyers — une fuite de données dès le 2ᵉ foyer.
 * Chaque requête est donc scopée par `idFoyerCourant()`.
 *
 * L'accès passe encore par le compte de service : chaque calendrier doit lui être
 * partagé (« modifier les événements »), et l'API Calendar activée. Étape suivante
 * prévue : jeton OAuth de l'utilisateur (colonne `ajoute_par`), pour que chaque
 * foyer connecte ses propres agendas sans partage manuel.
 */

let cache: calendar_v3.Calendar | null = null;
function clientCalendar(): calendar_v3.Calendar {
  if (cache) return cache;
  const auth = googleAuth(['https://www.googleapis.com/auth/calendar']);
  cache = google.calendar({ version: 'v3', auth });
  return cache;
}

/** Calendriers rattachés AU FOYER courant (vide si aucun n'est configuré). */
async function agendasDuFoyer(): Promise<string[]> {
  const foyerId = await idFoyerCourant();
  const lignes = await db()
    .select({ calendarId: foyerAgendas.calendarId })
    .from(foyerAgendas)
    .where(eq(foyerAgendas.foyerId, foyerId));
  return lignes.map((l) => l.calendarId);
}

/** Idem, mais exige au moins un agenda (pour les opérations d'écriture). */
async function exigerAgendas(): Promise<string[]> {
  const ids = await agendasDuFoyer();
  if (ids.length === 0) {
    throw new ErreurValidation(
      "Aucun agenda n'est rattaché à ce foyer. Ajoute-en un depuis la page Agenda.",
    );
  }
  return ids;
}

/** Vérifie qu'un calendrier appartient bien au foyer courant (garde-fou d'écriture). */
async function exigerAgendaDuFoyer(calendarId: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  const [ligne] = await db()
    .select({ id: foyerAgendas.id })
    .from(foyerAgendas)
    .where(and(eq(foyerAgendas.foyerId, foyerId), eq(foyerAgendas.calendarId, calendarId)))
    .limit(1);
  if (!ligne) throw new ErreurValidation('Cet agenda n’appartient pas à ton foyer.');
}

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

function versEvenement(e: calendar_v3.Schema$Event, calendarId: string, couleur: string): EvenementAgenda {
  const journeeEntiere = !!e.start?.date;
  const debut = e.start?.dateTime ?? e.start?.date ?? '';
  const fin = e.end?.dateTime ?? e.end?.date ?? '';
  const heure = (dt?: string | null) => (dt && dt.length > 16 ? dt.slice(11, 16) : '');
  return {
    id: S(e.id),
    calendarId,
    couleur,
    titre: S(e.summary) || '(sans titre)',
    journeeEntiere,
    dateISO: debut.slice(0, 10),
    finISO: fin.slice(0, 10),
    heureDebut: journeeEntiere ? '' : heure(e.start?.dateTime),
    heureFin: journeeEntiere ? '' : heure(e.end?.dateTime),
    lieu: S(e.location),
    description: S(e.description),
  };
}

/** Nom d'un agenda (via calendars.get), repli sur l'id si indisponible. */
async function nomAgenda(cal: calendar_v3.Calendar, id: string): Promise<string> {
  try {
    const meta = await cal.calendars.get({ calendarId: id });
    return S(meta.data.summary) || id;
  } catch {
    return id;
  }
}

/** Liste des agendas configurés (id + nom + couleur), sans charger les événements. */
export async function listerAgendas(): Promise<Agenda[]> {
  const ids = await agendasDuFoyer();
  if (ids.length === 0) return [];
  const cal = clientCalendar();
  return Promise.all(
    ids.map(async (id, i): Promise<Agenda> => ({
      id,
      nom: await nomAgenda(cal, id),
      couleur: COULEURS_AGENDA[i % COULEURS_AGENDA.length],
    })),
  );
}

/** Événements de la semaine EN COURS (lundi → dimanche), tous agendas fusionnés. */
export async function chargerSemaineAgenda(): Promise<{ evenements: EvenementAgenda[]; agendas: Agenda[]; lundiISO: string }> {
  const ids = await agendasDuFoyer();
  const now = new Date();
  const decalLundi = (now.getDay() + 6) % 7; // 0 = lundi
  const lundi = new Date(now.getFullYear(), now.getMonth(), now.getDate() - decalLundi);
  const lundiSuivant = new Date(lundi.getFullYear(), lundi.getMonth(), lundi.getDate() + 7);
  const lundiISO = `${lundi.getFullYear()}-${String(lundi.getMonth() + 1).padStart(2, '0')}-${String(lundi.getDate()).padStart(2, '0')}`;
  if (ids.length === 0) return { evenements: [], agendas: [], lundiISO };

  const cal = clientCalendar();
  const parAgenda = await Promise.all(
    ids.map(async (id, i): Promise<{ agenda: Agenda; evenements: EvenementAgenda[] }> => {
      const couleur = COULEURS_AGENDA[i % COULEURS_AGENDA.length];
      const [nom, rep] = await Promise.all([
        nomAgenda(cal, id),
        cal.events.list({
          calendarId: id,
          timeMin: lundi.toISOString(),
          timeMax: lundiSuivant.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        }),
      ]);
      const evenements = (rep.data.items ?? [])
        .map((e) => versEvenement(e, id, couleur))
        .filter((e) => e.dateISO !== '');
      return { agenda: { id, nom, couleur }, evenements };
    }),
  );

  const agendas = parAgenda.map((p) => p.agenda);
  const evenements = parAgenda
    .flatMap((p) => p.evenements)
    .sort((a, b) => `${a.dateISO} ${a.heureDebut || '00:00'}`.localeCompare(`${b.dateISO} ${b.heureDebut || '00:00'}`));
  return { evenements, agendas, lundiISO };
}

/** Événements à venir sur `jours` jours, fusionnés depuis tous les agendas. */
export async function chargerAgenda(jours = 30): Promise<DonneesAgenda> {
  // Aucun agenda rattaché : état VIDE, pas une erreur. Un foyer qui n'a pas
  // encore connecté de calendrier n'a rien fait de mal.
  const ids = await agendasDuFoyer();
  if (ids.length === 0) return { evenements: [], agendas: [], jours };

  const cal = clientCalendar();
  const maintenant = new Date();
  const fin = new Date(maintenant.getTime() + jours * 86400000);

  const parAgenda = await Promise.all(
    ids.map(async (id, i): Promise<{ agenda: Agenda; evenements: EvenementAgenda[] }> => {
      const couleur = COULEURS_AGENDA[i % COULEURS_AGENDA.length];
      const [nom, rep] = await Promise.all([
        nomAgenda(cal, id),
        cal.events.list({
          calendarId: id,
          timeMin: maintenant.toISOString(),
          timeMax: fin.toISOString(),
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 100,
        }),
      ]);
      const evenements = (rep.data.items ?? [])
        .map((e) => versEvenement(e, id, couleur))
        .filter((e) => e.dateISO !== '');
      return { agenda: { id, nom, couleur }, evenements };
    }),
  );

  const agendas = parAgenda.map((p) => p.agenda);
  const evenements = parAgenda
    .flatMap((p) => p.evenements)
    .sort((a, b) => {
      const ka = `${a.dateISO} ${a.heureDebut || '00:00'}`;
      const kb = `${b.dateISO} ${b.heureDebut || '00:00'}`;
      return ka.localeCompare(kb);
    });

  return { evenements, agendas, jours };
}

/** Crée un événement dans l'agenda choisi. Renvoie son id. */
export async function ajouterEvenement(n: NouvelEvenement): Promise<string> {
  const cal = clientCalendar();
  const ids = await exigerAgendas();
  const calendarId = S(n.calendarId) || ids[0];
  if (!ids.includes(calendarId)) throw new ErreurValidation('Agenda inconnu.');

  const titre = S(n.titre);
  if (!titre) throw new ErreurValidation("Le titre de l'événement est requis.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) throw new ErreurValidation('Date invalide (attendu aaaa-mm-jj).');

  const body: calendar_v3.Schema$Event = {
    summary: titre,
    location: S(n.lieu) || undefined,
    description: S(n.description) || undefined,
  };

  if (n.journeeEntiere) {
    const [a, m, j] = n.date.split('-').map(Number);
    const lendemain = new Date(a, m - 1, j + 1);
    const finDate = `${lendemain.getFullYear()}-${String(lendemain.getMonth() + 1).padStart(2, '0')}-${String(lendemain.getDate()).padStart(2, '0')}`;
    body.start = { date: n.date };
    body.end = { date: finDate };
  } else {
    const hDebut = /^\d{2}:\d{2}$/.test(n.heureDebut ?? '') ? n.heureDebut! : '19:00';
    let hFin = /^\d{2}:\d{2}$/.test(n.heureFin ?? '') ? n.heureFin! : '';
    if (!hFin) {
      const [h, mn] = hDebut.split(':').map(Number);
      hFin = `${String((h + 1) % 24).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
    }
    body.start = { dateTime: `${n.date}T${hDebut}:00`, timeZone: FUSEAU };
    body.end = { dateTime: `${n.date}T${hFin}:00`, timeZone: FUSEAU };
  }

  const rep = await cal.events.insert({ calendarId, requestBody: body });
  return S(rep.data.id);
}

/**
 * Supprime un événement (dans son agenda d'origine).
 * ⚠ `calendarId` vient du client : sans vérification, on pourrait supprimer un
 * événement dans l'agenda d'un AUTRE foyer en devinant son identifiant.
 */
export async function supprimerEvenement(calendarId: string, id: string): Promise<void> {
  if (!S(calendarId) || !S(id)) throw new ErreurValidation('Agenda et identifiant requis.');
  await exigerAgendaDuFoyer(calendarId);
  await clientCalendar().events.delete({ calendarId, eventId: id });
}
