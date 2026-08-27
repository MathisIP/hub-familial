import 'server-only';
import { google, type calendar_v3 } from 'googleapis';
import { and, eq, exists, ne, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import { foyerAgendas, agendasAcces } from '@/lib/db/schema';
import { jetonAgenda, peutEcrireEvenements } from '@/lib/agenda/oauth';
import { ErreurValidation } from '@/lib/erreurs';
import { contexteAcces, PARTAGE_RESTREINT } from '@/lib/visibilite';
import {
  COULEURS_AGENDA,
  FUSEAU,
  type Agenda,
  type DonneesAgenda,
  type EvenementAgenda,
  type NouvelEvenement,
  type PorteeSuppression,
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
 * reconnecte depuis `/foyer/agenda`, en OAuth, en quelques secondes.
 */

type AgendaFoyer = { calendarId: string; nom: string; ajoutePar: string | null };

/**
 * Calendriers du foyer que la personne connectée a le droit de voir.
 *
 * ⚠ POINT DE PASSAGE CENTRAL. Tout ce que le module expose part d'ici :
 * `listerAgendas`, `chargerAgenda`, `chargerSemaineAgenda`, et — par ricochet,
 * via `exigerAgendas()` — `ajouterEvenement` et le `lierAgenda` du module
 * Événements. Filtrer ici ferme donc l'essentiel des portes d'un coup. Les deux
 * autres chemins de lecture (`exigerAgendaDuFoyer` ci-dessous et
 * `calendriersDuFoyer` dans [lib/agenda/calendriers.ts]) sont filtrés séparément.
 *
 * Un agenda `restreint` n'est visible que des personnes listées dans
 * `agendas_acces` ; le réglage appartient à CELUI QUI L'A RATTACHÉ (`ajoute_par`),
 * pas au propriétaire du foyer : c'est son compte Google et ses événements.
 */
async function agendasDuFoyer(): Promise<AgendaFoyer[]> {
  const { foyerId, utilisateurId } = await contexteAcces();
  return db()
    .select({
      calendarId: foyerAgendas.calendarId,
      nom: foyerAgendas.nom,
      ajoutePar: foyerAgendas.ajoutePar,
    })
    .from(foyerAgendas)
    .where(and(eq(foyerAgendas.foyerId, foyerId), visibleParMoi(utilisateurId)));
}

/**
 * Condition SQL « cet agenda m'est visible » : partagé au foyer, ou restreint
 * mais je figure dans `agendas_acces`.
 *
 * ⚠ Celui qui a rattaché l'agenda le voit toujours. Sans cette clause, il
 * pourrait se retirer lui-même de son propre agenda et ne plus jamais pouvoir en
 * modifier le partage — il n'apparaîtrait dans aucune de ses listes.
 */
function visibleParMoi(utilisateurId: string) {
  return or(
    ne(foyerAgendas.partage, PARTAGE_RESTREINT),
    eq(foyerAgendas.ajoutePar, utilisateurId),
    exists(
      db()
        .select({ n: sql`1` })
        .from(agendasAcces)
        .where(
          and(
            eq(agendasAcces.agendaId, foyerAgendas.id),
            eq(agendasAcces.utilisateurId, utilisateurId),
          ),
        ),
    ),
  );
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

/**
 * Vérifie qu'un calendrier appartient au foyer courant ET m'est visible.
 *
 * ⚠ Le `calendarId` transite par le client (il revient dans chaque suppression
 * d'événement) : c'est exactement le genre de valeur qu'on ne croit jamais sur
 * parole. Le message ne distingue pas « pas à toi » de « pas visible » — le
 * préciser confirmerait l'existence d'un agenda qu'on cache.
 */
async function exigerAgendaDuFoyer(calendarId: string): Promise<AgendaFoyer> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const [ligne] = await db()
    .select({
      calendarId: foyerAgendas.calendarId,
      nom: foyerAgendas.nom,
      ajoutePar: foyerAgendas.ajoutePar,
    })
    .from(foyerAgendas)
    .where(
      and(
        eq(foyerAgendas.foyerId, foyerId),
        eq(foyerAgendas.calendarId, calendarId),
        visibleParMoi(utilisateurId),
      ),
    )
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
    serieId: S(e.recurringEventId),
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
/**
 * Événements du foyer sur une fenêtre de temps.
 *
 * Sans argument : les `jours` à venir (comportement d'origine, celui de la vue
 * « à venir »). Avec `debut`/`fin` (aaaa-mm-jj) : exactement cette plage, bornes
 * comprises — ce dont les vues jour, semaine et mois ont besoin.
 *
 * ⚠ LA PLAGE EXPLICITE PEUT REGARDER DANS LE PASSÉ, et c'est le but. La fenêtre
 * par défaut part de l'instant présent ; un mois affiché en entier commence au
 * lundi précédant le 1er, souvent déjà écoulé. S'en tenir à `timeMin: maintenant`
 * aurait vidé le début de chaque grille sans que rien ne l'explique.
 */
export async function chargerAgenda(
  fenetre: number | { debut?: string; fin?: string } = 30,
): Promise<DonneesAgenda> {
  const jours = typeof fenetre === 'number' ? fenetre : 30;
  // Aucun agenda rattaché : état VIDE, pas une erreur. Un foyer qui n'a pas
  // encore connecté de calendrier n'a rien fait de mal.
  const ids = await agendasDuFoyer();
  if (ids.length === 0) return { evenements: [], agendas: [], jours };

  const plage = typeof fenetre === 'object' && fenetre.debut && fenetre.fin ? fenetre : null;
  // ⚠ Bornes locales, pas UTC : `new Date('2026-08-24')` serait minuit UTC,
  // donc le 23 à 22 h en France — la première ligne d'une grille de mois
  // perdrait ses événements du matin.
  const maintenant = plage ? new Date(`${plage.debut}T00:00:00`) : new Date();
  const fin = plage
    ? new Date(`${plage.fin}T23:59:59`)
    : new Date(Date.now() + jours * 86400000);

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
        // ⚠ Relevé de 100 à 250 avec les vues mois : un agenda professionnel
        // dépasse facilement 100 événements sur six semaines, et le dépassement
        // se serait vu comme une fin de mois vide — pas comme une limite.
        maxResults: 250,
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
/**
 * Client Google prêt à ÉCRIRE dans un agenda du foyer.
 *
 * ⚠ UN SEUL CHEMIN DE VALIDATION pour toutes les écritures — ajout, modification,
 * suppression. `ajouterEvenement` faisait autrefois sa propre vérification
 * (`ids.find(...)`) : deux logiques parallèles à tenir synchronisées, donc une
 * écriture qui serait restée ouverte le jour où seule la lecture aurait été
 * resserrée. Toute nouvelle écriture doit passer par ici.
 */
async function clientEcriture(calendarId: string): Promise<calendar_v3.Calendar> {
  const cible = await exigerAgendaDuFoyer(calendarId);

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
  return cal;
}

/** Champs communs à la création et à la modification (titre, lieu, description). */
function corpsTexte(n: NouvelEvenement): calendar_v3.Schema$Event {
  const titre = S(n.titre);
  if (!titre) throw new ErreurValidation("Le titre de l'événement est requis.");
  return {
    summary: titre,
    // ⚠ `null` et non `undefined` : sur une MODIFICATION, `undefined` est omis
    // du corps envoyé, donc Google conserve l'ancienne valeur. Vider un lieu
    // serait alors impossible — le champ reviendrait à chaque enregistrement,
    // et on croirait l'app cassée. `null` efface pour de bon.
    location: S(n.lieu) || null,
    description: S(n.description) || null,
  };
}

/** Bornes de début et de fin, selon qu'il s'agit d'une journée entière ou non. */
function corpsHoraire(n: NouvelEvenement): calendar_v3.Schema$Event {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(n.date)) {
    throw new ErreurValidation('Date invalide (attendu aaaa-mm-jj).');
  }
  if (n.journeeEntiere) {
    const [a, m, j] = n.date.split('-').map(Number);
    const lendemain = new Date(a, m - 1, j + 1);
    const finDate = `${lendemain.getFullYear()}-${String(lendemain.getMonth() + 1).padStart(2, '0')}-${String(lendemain.getDate()).padStart(2, '0')}`;
    // ⚠ `dateTime: null` en plus de `date` : sur une modification, passer un
    // événement horaire en journée entière laisserait sinon les deux formes
    // renseignées, que Google refuse.
    return { start: { date: n.date, dateTime: null }, end: { date: finDate, dateTime: null } };
  }
  const hDebut = /^\d{2}:\d{2}$/.test(n.heureDebut ?? '') ? n.heureDebut! : '19:00';
  let hFin = /^\d{2}:\d{2}$/.test(n.heureFin ?? '') ? n.heureFin! : '';
  if (!hFin) {
    const [h, mn] = hDebut.split(':').map(Number);
    hFin = `${String((h + 1) % 24).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
  }
  return {
    start: { dateTime: `${n.date}T${hDebut}:00`, timeZone: FUSEAU, date: null },
    end: { dateTime: `${n.date}T${hFin}:00`, timeZone: FUSEAU, date: null },
  };
}

export async function ajouterEvenement(n: NouvelEvenement): Promise<string> {
  const ids = await exigerAgendas();
  const calendarId = S(n.calendarId) || ids[0].calendarId;
  const cal = await clientEcriture(calendarId);

  const rep = await cal.events.insert({
    calendarId,
    requestBody: { ...corpsTexte(n), ...corpsHoraire(n) },
  });
  return S(rep.data.id);
}

/**
 * Modifie un événement existant, dans son agenda d'origine.
 *
 * ⚠ MÊME QUESTION QUE POUR LA SUPPRESSION : « cette date » ou « toute la série ».
 * On liste avec `singleEvents: true`, donc les identifiants manipulés sont ceux
 * des OCCURRENCES. Patcher une occurrence ne touche qu'elle — c'est le
 * comportement attendu par défaut, et Google en fait une exception dans la série.
 *
 * ⚠ SUR UNE SÉRIE, ON NE TOUCHE JAMAIS AUX DATES, et ce n'est pas une facilité.
 * L'occurrence affichée n'est presque jamais la première : quelqu'un qui regarde
 * le cours de piano du 12 septembre et demande à modifier « toute la série »
 * verrait, si on écrivait cette date sur l'événement parent, **la série entière
 * se déplacer au 12 septembre — effaçant toutes les occurrences antérieures**.
 * Une perte de données silencieuse dans l'agenda d'un foyer. On modifie donc le
 * titre, le lieu et la description de la série, et on refuse explicitement le
 * reste plutôt que de le tenter.
 */
export async function modifierEvenement(
  m: NouvelEvenement & { id: string; portee?: PorteeSuppression },
): Promise<void> {
  const calendarId = S(m.calendarId);
  const id = S(m.id);
  if (!calendarId || !id) throw new ErreurValidation('Agenda et identifiant requis.');

  const cal = await clientEcriture(calendarId);
  const portee = m.portee ?? 'occurrence';

  if (portee === 'occurrence') {
    await cal.events.patch({
      calendarId,
      eventId: id,
      requestBody: { ...corpsTexte(m), ...corpsHoraire(m) },
    });
    return;
  }

  /*
   * Toute la série : on vise l'événement PARENT, dont on demande l'identifiant à
   * Google plutôt que de le faire calculer par le navigateur — une donnée
   * d'affichage périmée ne doit pas décider ce qu'on modifie. Même précaution
   * que dans `supprimerEvenement`.
   */
  const { data } = await cal.events.get({ calendarId, eventId: id });
  const parentId = S(data.recurringEventId);
  if (!parentId) {
    // Pas une occurrence de série : la portée n'a pas de sens, on traite
    // l'événement tel quel plutôt que d'échouer sur un détail de vocabulaire.
    await cal.events.patch({
      calendarId,
      eventId: id,
      requestBody: { ...corpsTexte(m), ...corpsHoraire(m) },
    });
    return;
  }

  const memeDate = S(data.start?.dateTime).slice(0, 10) === m.date || S(data.start?.date) === m.date;
  const memeHeure =
    S(data.start?.dateTime).slice(11, 16) === S(m.heureDebut) &&
    S(data.end?.dateTime).slice(11, 16) === S(m.heureFin);
  const memeType = !!data.start?.date === !!m.journeeEntiere;

  if (!memeDate || !memeHeure || !memeType) {
    throw new ErreurValidation(
      'La date et l’heure d’une série ne se modifient pas ici. Choisis « cette date seulement », ou passe par Google Agenda pour décaler toute la série.',
    );
  }

  await cal.events.patch({ calendarId, eventId: parentId, requestBody: corpsTexte(m) });
}

/**
 * Supprime un événement (dans son agenda d'origine).
 * ⚠ `calendarId` vient du client : sans vérification, on pourrait supprimer un
 * événement dans l'agenda d'un AUTRE foyer en devinant son identifiant.
 */
export async function supprimerEvenement(
  calendarId: string,
  id: string,
  portee: PorteeSuppression = 'occurrence',
): Promise<void> {
  if (!S(calendarId) || !S(id)) throw new ErreurValidation('Agenda et identifiant requis.');
  const cible = await exigerAgendaDuFoyer(calendarId);
  const cal = await clientPour(cible);
  if (!cal) throw new ErreurValidation('L’accès à cet agenda a expiré.');

  /**
   * ⚠ « Toute la série » ne se supprime pas en supprimant une occurrence.
   *
   * Les ids que l'app manipule sont ceux des occurrences (`singleEvents: true`),
   * et `events.delete` sur une occurrence n'annule que cette date. Pour effacer
   * le rendez-vous récurrent entier, il faut viser l'événement PARENT — dont on
   * demande l'id à Google plutôt que de le faire calculer par le navigateur :
   * une donnée d'affichage périmée ne doit pas décider ce qu'on efface.
   */
  let eventId = id;
  if (portee === 'serie') {
    const { data } = await cal.events.get({ calendarId, eventId: id });
    eventId = S(data.recurringEventId) || id;
  }
  await cal.events.delete({ calendarId, eventId });
}
