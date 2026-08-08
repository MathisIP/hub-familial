import 'server-only';
import { google, type calendar_v3 } from 'googleapis';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { foyerAgendas } from '@/lib/db/schema';
import { idFoyerCourant } from '@/lib/foyer';
import { jetonAgenda, peutEcrireEvenements } from '@/lib/agenda/oauth';
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
 * ⚠ ACCÈS EXCLUSIVEMENT PAR JETON OAUTH DE L'UTILISATEUR (06/08/2026).
 * Le compte de service a été **entièrement retiré**. Il ouvrait l'accès avec le
 * scope `auth/calendar` — le plus large qui existe sur Calendar — alors que la
 * vérification Google repose sur le principe du moindre privilège : conserver
 * dans le code un périmètre aussi vaste, pour un usage devenu marginal, était
 * intenable à justifier. Le projet ne détient plus aucune clé de compte de
 * service.
 *
 * Conséquence assumée : un calendrier rattaché sans `ajoute_par` (mode
 * historique, partagé à la main avec le compte de service) n'est plus
 * accessible. Ces rattachements ont été supprimés par la migration 0021 ; on les
 * reconnecte depuis `/agenda`, en OAuth, en quelques secondes.
 */

type AgendaFoyer = { calendarId: string; nom: string; ajoutePar: string | null };

/** Calendriers rattachés AU FOYER courant (vide si aucun n'est configuré). */
async function agendasDuFoyer(): Promise<AgendaFoyer[]> {
  const foyerId = await idFoyerCourant();
  return db()
    .select({
      calendarId: foyerAgendas.calendarId,
      nom: foyerAgendas.nom,
      ajoutePar: foyerAgendas.ajoutePar,
    })
    .from(foyerAgendas)
    .where(eq(foyerAgendas.foyerId, foyerId));
}

/** Idem, mais exige au moins un agenda (pour les opérations d'écriture). */
async function exigerAgendas(): Promise<AgendaFoyer[]> {
  const ids = await agendasDuFoyer();
  if (ids.length === 0) {
    throw new ErreurValidation(
      "Aucun agenda n'est rattaché à ce foyer. Connecte ton Google Agenda depuis la page Agenda.",
    );
  }
  return ids;
}

/**
 * Client Google pour un calendrier donné — **jeton OAuth de `ajoutePar`, et rien
 * d'autre**. Renvoie `null` si l'autorisation a été révoquée ou n'existe pas :
 * le calendrier est alors simplement ignoré, plutôt que de faire échouer tout
 * l'agenda du foyer.
 */
async function clientPour(a: AgendaFoyer): Promise<calendar_v3.Calendar | null> {
  // Sans jeton utilisateur, plus aucun accès possible : le calendrier est ignoré
  // (l'agenda du foyer continue de s'afficher avec les autres) plutôt que de
  // faire échouer toute la page.
  if (!a.ajoutePar) return null;
  const jeton = await jetonAgenda(a.ajoutePar);
  if (!jeton) return null;
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: jeton });
  return google.calendar({ version: 'v3', auth: oauth });
}

/** Vérifie qu'un calendrier appartient au foyer courant, et le renvoie. */
async function exigerAgendaDuFoyer(calendarId: string): Promise<AgendaFoyer> {
  const foyerId = await idFoyerCourant();
  const [ligne] = await db()
    .select({
      calendarId: foyerAgendas.calendarId,
      nom: foyerAgendas.nom,
      ajoutePar: foyerAgendas.ajoutePar,
    })
    .from(foyerAgendas)
    .where(and(eq(foyerAgendas.foyerId, foyerId), eq(foyerAgendas.calendarId, calendarId)))
    .limit(1);
  if (!ligne) throw new ErreurValidation('Cet agenda n’appartient pas à ton foyer.');
  return ligne;
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

/**
 * Liste des agendas du foyer (id + nom + couleur), sans charger les événements.
 *
 * ⚠ Le nom vient de `foyer_agendas.nom`, mémorisé au rattachement (lu alors
 * depuis `calendarList`, seul point où il nous est accessible). On n'interroge
 * plus Google ici : `calendars.get` exigerait `calendar.readonly`, un périmètre
 * bien plus large que ce que nous demandons — et cette liste n'a de toute façon
 * pas besoin d'un aller-retour réseau par agenda.
 */
export async function listerAgendas(): Promise<Agenda[]> {
  const ids = await agendasDuFoyer();
  return ids.map((a, i) => ({
    id: a.calendarId,
    nom: a.nom || a.calendarId,
    couleur: COULEURS_AGENDA[i % COULEURS_AGENDA.length],
  }));
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

  const parAgenda = await Promise.all(
    ids.map(async (a, i): Promise<{ agenda: Agenda; evenements: EvenementAgenda[]; lisible: boolean }> => {
      const couleur = COULEURS_AGENDA[i % COULEURS_AGENDA.length];
      const id = a.calendarId;
      const cal = await clientPour(a);
      const agenda = { id, nom: a.nom || id, couleur };
      if (!cal) return { agenda, evenements: [], lisible: false }; // jeton absent ou révoqué

      const rep = await cal.events.list({
        calendarId: id,
        timeMin: lundi.toISOString(),
        timeMax: lundiSuivant.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });
      const evenements = (rep.data.items ?? [])
        .map((e) => versEvenement(e, id, couleur))
        .filter((e) => e.dateISO !== '');
      return { agenda: { ...agenda, nom: a.nom || id }, evenements, lisible: true };
    }),
  );

  // ⚠ On n'annonce que les agendas RÉELLEMENT lisibles. Afficher dans la
  // légende un calendrier dont on n'a plus le jeton laisse croire qu'il est
  // connecté alors qu'il ne se remplira jamais — c'est ce symptôme qui avait
  // fait soupçonner une fuite de cache, alors que la donnée venait de la base.
  const agendas = parAgenda.filter((p) => p.lisible).map((p) => p.agenda);
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

  const maintenant = new Date();
  const fin = new Date(maintenant.getTime() + jours * 86400000);

  const parAgenda = await Promise.all(
    ids.map(async (a, i): Promise<{ agenda: Agenda; evenements: EvenementAgenda[]; lisible: boolean }> => {
      const couleur = COULEURS_AGENDA[i % COULEURS_AGENDA.length];
      const id = a.calendarId;
      const cal = await clientPour(a);
      const agenda = { id, nom: a.nom || id, couleur };
      if (!cal) return { agenda, evenements: [], lisible: false }; // jeton absent ou révoqué

      const rep = await cal.events.list({
        calendarId: id,
        timeMin: maintenant.toISOString(),
        timeMax: fin.toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 100,
      });
      const evenements = (rep.data.items ?? [])
        .map((e) => versEvenement(e, id, couleur))
        .filter((e) => e.dateISO !== '');
      return { agenda: { ...agenda, nom: a.nom || id }, evenements, lisible: true };
    }),
  );

  // ⚠ On n'annonce que les agendas RÉELLEMENT lisibles. Afficher dans la
  // légende un calendrier dont on n'a plus le jeton laisse croire qu'il est
  // connecté alors qu'il ne se remplira jamais — c'est ce symptôme qui avait
  // fait soupçonner une fuite de cache, alors que la donnée venait de la base.
  const agendas = parAgenda.filter((p) => p.lisible).map((p) => p.agenda);
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
  const ids = await exigerAgendas();
  const calendarId = S(n.calendarId) || ids[0].calendarId;
  // L'agenda demandé doit appartenir au foyer : `calendarId` vient du client.
  const cible = ids.find((a) => a.calendarId === calendarId);
  if (!cible) throw new ErreurValidation('Agenda inconnu.');

  // Google autorise à n'accorder QU'UNE PARTIE des permissions demandées : la
  // personne a pu décocher l'écriture. On le dit clairement plutôt que de
  // laisser remonter une erreur 403 incompréhensible de l'API.
  if (cible.ajoutePar && !(await peutEcrireEvenements(cible.ajoutePar))) {
    throw new ErreurValidation(
      'La permission de modifier les événements n’a pas été accordée pour cet agenda. Reconnecte-le en acceptant toutes les autorisations.',
    );
  }
  const cal = await clientPour(cible);
  if (!cal) {
    throw new ErreurValidation(
      'L’accès à cet agenda a expiré. Reconnecte ton Google Agenda depuis la page Agenda.',
    );
  }

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
  const cible = await exigerAgendaDuFoyer(calendarId);
  const cal = await clientPour(cible);
  if (!cal) throw new ErreurValidation('L’accès à cet agenda a expiré.');
  await cal.events.delete({ calendarId, eventId: id });
}
