import 'server-only';
import { google, type calendar_v3 } from 'googleapis';
import { googleAuth } from '@/lib/google/auth';
import { configFoyer } from '@/lib/config';
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
 * SERVICE AGENDA (serveur uniquement) — Google Calendar, compte de service,
 * PLUSIEURS agendas (AGENDA_IDS dans .env). Chaque agenda doit être partagé avec
 * le compte de service (« modifier les événements ») et l'API Calendar activée.
 *
 * Contrairement à Drive, un compte de service lit/écrit un agenda partagé sans
 * problème de quota.
 */

let cache: calendar_v3.Calendar | null = null;
function clientCalendar(): calendar_v3.Calendar {
  if (cache) return cache;
  const auth = googleAuth(['https://www.googleapis.com/auth/calendar']);
  cache = google.calendar({ version: 'v3', auth });
  return cache;
}

/** IDs des agendas configurés, ou erreur claire si aucun. */
function idsAgendas(): string[] {
  const ids = configFoyer().agendaIds;
  if (ids.length === 0) {
    throw new ErreurValidation(
      "Agenda non configuré : ajoute AGENDA_IDS (identifiants séparés par des virgules) dans .env.",
    );
  }
  return ids;
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

/** Événements à venir sur `jours` jours, fusionnés depuis tous les agendas. */
export async function chargerAgenda(jours = 30): Promise<DonneesAgenda> {
  const cal = clientCalendar();
  const ids = idsAgendas();
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
  const ids = idsAgendas();
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

/** Supprime un événement (dans son agenda d'origine). */
export async function supprimerEvenement(calendarId: string, id: string): Promise<void> {
  if (!S(calendarId) || !S(id)) throw new ErreurValidation('Agenda et identifiant requis.');
  await clientCalendar().events.delete({ calendarId, eventId: id });
}
