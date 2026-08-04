import 'server-only';
import { and, eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { foyerAgendas } from '@/lib/db/schema';
import { idFoyerCourant, utilisateurCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { jetonAgenda, agendaConnecte } from '@/lib/agenda/oauth';

/**
 * GESTION DES CALENDRIERS D'UN FOYER (serveur).
 * Liste les calendriers Google de la personne connectée et permet de les
 * rattacher (ou détacher) au foyer. Le rattachement mémorise QUI l'a ajouté :
 * c'est son jeton qui servira ensuite à lire/écrire ce calendrier.
 */

export type CalendrierDispo = {
  id: string;
  nom: string;
  principal: boolean;
  ecriture: boolean; // peut-on y créer des événements ?
  rattache: boolean; // déjà rattaché au foyer ?
};

function clientAvecJeton(jeton: string) {
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: jeton });
  return google.calendar({ version: 'v3', auth: oauth });
}

/** Calendriers Google de l'utilisateur connecté, avec leur état de rattachement. */
export async function calendriersDisponibles(): Promise<CalendrierDispo[]> {
  const user = await utilisateurCourant();
  const jeton = await jetonAgenda(user.id);
  if (!jeton) return [];

  const foyerId = await idFoyerCourant();
  const dejaRattaches = new Set(
    (
      await db()
        .select({ calendarId: foyerAgendas.calendarId })
        .from(foyerAgendas)
        .where(eq(foyerAgendas.foyerId, foyerId))
    ).map((l) => l.calendarId),
  );

  const rep = await clientAvecJeton(jeton).calendarList.list({ maxResults: 100 });
  return (rep.data.items ?? [])
    .filter((c) => !!c.id)
    .map((c) => ({
      id: c.id!,
      nom: c.summary ?? c.id!,
      principal: !!c.primary,
      // `owner` / `writer` : les seuls rôles permettant de créer un événement.
      ecriture: c.accessRole === 'owner' || c.accessRole === 'writer',
      rattache: dejaRattaches.has(c.id!),
    }))
    .sort((a, b) => (a.principal ? -1 : b.principal ? 1 : a.nom.localeCompare(b.nom, 'fr')));
}

/** Rattache un calendrier au foyer (au nom de l'utilisateur qui l'autorise). */
export async function rattacherCalendrier(calendarId: string, nom: string): Promise<void> {
  const id = calendarId.trim();
  if (!id) throw new ErreurValidation('Calendrier manquant.');

  const user = await utilisateurCourant();
  const jeton = await jetonAgenda(user.id);
  if (!jeton) throw new ErreurValidation('Connecte d’abord ton Google Agenda.');

  // Garde-fou : on ne rattache que des calendriers auxquels CETTE personne a
  // réellement accès — sinon on pourrait rattacher un identifiant deviné.
  const rep = await clientAvecJeton(jeton).calendarList.list({ maxResults: 100 });
  const sien = (rep.data.items ?? []).find((c) => c.id === id);
  if (!sien) throw new ErreurValidation('Ce calendrier n’est pas dans ton compte Google.');

  await db()
    .insert(foyerAgendas)
    .values({
      foyerId: await idFoyerCourant(),
      calendarId: id,
      nom: (nom || sien.summary || id).trim(),
      ajoutePar: user.id,
    })
    .onConflictDoNothing({ target: [foyerAgendas.foyerId, foyerAgendas.calendarId] });
}

/** Détache un calendrier du foyer (le calendrier Google n'est pas touché). */
export async function detacherCalendrier(calendarId: string): Promise<void> {
  const foyerId = await idFoyerCourant();
  await db()
    .delete(foyerAgendas)
    .where(and(eq(foyerAgendas.foyerId, foyerId), eq(foyerAgendas.calendarId, calendarId)));
}

/** Calendriers rattachés au foyer (pour l'écran de configuration). */
export async function calendriersDuFoyer(): Promise<{ id: string; nom: string; parMoi: boolean }[]> {
  const [foyerId, user] = [await idFoyerCourant(), await utilisateurCourant()];
  const lignes = await db()
    .select()
    .from(foyerAgendas)
    .where(eq(foyerAgendas.foyerId, foyerId));
  return lignes.map((l) => ({
    id: l.calendarId,
    nom: l.nom || l.calendarId,
    parMoi: l.ajoutePar === user.id,
  }));
}

/** L'utilisateur connecté a-t-il autorisé son agenda ? */
export async function monAgendaConnecte(): Promise<boolean> {
  const user = await utilisateurCourant();
  return agendaConnecte(user.id);
}
