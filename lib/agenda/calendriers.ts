import 'server-only';
import { and, eq } from 'drizzle-orm';
import { google } from 'googleapis';
import { db } from '@/lib/db';
import { foyerAgendas, agendasAcces, membres as tMembres, utilisateurs as tUtilisateurs } from '@/lib/db/schema';
import { idFoyerCourant, utilisateurCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';
import { jetonAgenda, agendaConnecte, peutEcrireEvenements } from '@/lib/agenda/oauth';
import { PARTAGE_FOYER, PARTAGE_RESTREINT, retenirMembres } from '@/lib/visibilite';

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

/**
 * Détache un calendrier du foyer (le calendrier Google n'est pas touché).
 *
 * ⚠ RÉSERVÉ À CELUI QUI L'A RATTACHÉ. Cette fonction ne vérifiait que le foyer :
 * n'importe quel membre pouvait donc détacher l'agenda de n'importe qui, et
 * l'écran de configuration lui en offrait le bouton. C'est le pendant logique de
 * la règle de partage — si c'est lui qui décide qui voit son agenda, c'est lui
 * qui décide de le retirer.
 */
export async function detacherCalendrier(calendarId: string): Promise<void> {
  const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
  const res = await db()
    .delete(foyerAgendas)
    .where(
      and(
        eq(foyerAgendas.foyerId, foyerId),
        eq(foyerAgendas.calendarId, calendarId),
        eq(foyerAgendas.ajoutePar, user.id),
      ),
    )
    .returning({ id: foyerAgendas.id });
  if (res.length === 0) {
    throw new ErreurValidation(
      'Seule la personne qui a rattaché cet agenda peut le retirer du foyer.',
    );
  }
}

/**
 * Calendriers rattachés au foyer, **filtrés sur ce que la personne peut voir**
 * (pour l'écran de configuration).
 *
 * ⚠ TROISIÈME CHEMIN DE LECTURE. Celui-ci court-circuite `lib/agenda/service.ts` :
 * filtrer les deux points de passage du service ne suffisait pas, l'écran de
 * configuration aurait continué d'afficher le nom et l'identifiant de tous les
 * agendas du foyer.
 *
 * `agendaId` (l'uuid de la ligne, pas le calendarId Google) sert au réglage du
 * partage ; `restreint` et `personnes` alimentent le panneau.
 */
export async function calendriersDuFoyer(): Promise<
  { id: string; agendaId: string; nom: string; parMoi: boolean; restreint: boolean; personnes: string[] }[]
> {
  const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
  const [lignes, acces] = await Promise.all([
    db().select().from(foyerAgendas).where(eq(foyerAgendas.foyerId, foyerId)),
    db()
      .select({ agendaId: agendasAcces.agendaId, utilisateurId: agendasAcces.utilisateurId })
      .from(agendasAcces)
      .where(eq(agendasAcces.foyerId, foyerId)),
  ]);

  const parAgenda = new Map<string, string[]>();
  for (const a of acces) {
    parAgenda.set(a.agendaId, [...(parAgenda.get(a.agendaId) ?? []), a.utilisateurId]);
  }

  return lignes
    .filter(
      (l) =>
        l.partage !== PARTAGE_RESTREINT ||
        l.ajoutePar === user.id ||
        (parAgenda.get(l.id) ?? []).includes(user.id),
    )
    .map((l) => ({
      id: l.calendarId,
      agendaId: l.id,
      nom: l.nom || l.calendarId,
      parMoi: l.ajoutePar === user.id,
      restreint: l.partage === PARTAGE_RESTREINT,
      personnes: parAgenda.get(l.id) ?? [],
    }));
}

/** L'utilisateur connecté a-t-il autorisé son agenda ? */
export async function monAgendaConnecte(): Promise<boolean> {
  const user = await utilisateurCourant();
  return agendaConnecte(user.id);
}

/**
 * A-t-il accordé la permission d'ÉCRIRE (créer/supprimer des événements) ?
 * Google permet de n'accorder qu'une partie des permissions demandées.
 */
export async function monEcritureAccordee(): Promise<boolean> {
  const user = await utilisateurCourant();
  if (!(await agendaConnecte(user.id))) return true; // rien à signaler s'il n'a rien connecté
  return peutEcrireEvenements(user.id);
}

/**
 * Règle qui voit un agenda rattaché.
 *
 * ⚠ RÉSERVÉ À CELUI QUI L'A RATTACHÉ (`ajoute_par`), et non au propriétaire du
 * foyer : c'est son compte Google et ses événements. Laisser le propriétaire
 * ouvrir à tous l'agenda professionnel d'un colocataire serait plus intrusif que
 * tout ce que le module protège par ailleurs.
 *
 * Il reste toujours visible pour lui-même (cf. `visibleParMoi` dans le service) :
 * sans cela, se retirer de sa propre liste rendrait le réglage irrattrapable.
 */
export async function definirPartageAgenda(input: {
  agendaId: string;
  restreint: boolean;
  utilisateurIds: string[];
}): Promise<void> {
  const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
  const d = db();

  const [agenda] = await d
    .select({ id: foyerAgendas.id })
    .from(foyerAgendas)
    .where(
      and(
        eq(foyerAgendas.foyerId, foyerId),
        eq(foyerAgendas.id, input.agendaId),
        eq(foyerAgendas.ajoutePar, user.id),
      ),
    )
    .limit(1);
  if (!agenda) {
    throw new ErreurValidation(
      'Seule la personne qui a rattaché cet agenda peut en régler le partage.',
    );
  }

  // Les identifiants viennent du client : on n'accepte que de vrais membres.
  const membresRows = await d
    .select({ utilisateurId: tMembres.utilisateurId })
    .from(tMembres)
    .where(eq(tMembres.foyerId, foyerId));
  const retenus = retenirMembres(
    input.utilisateurIds,
    new Set(membresRows.map((m) => m.utilisateurId)),
    input.restreint,
  );

  await d.transaction(async (tx) => {
    await tx
      .update(foyerAgendas)
      .set({ partage: input.restreint ? PARTAGE_RESTREINT : PARTAGE_FOYER })
      .where(and(eq(foyerAgendas.foyerId, foyerId), eq(foyerAgendas.id, agenda.id)));
    await tx
      .delete(agendasAcces)
      .where(and(eq(agendasAcces.foyerId, foyerId), eq(agendasAcces.agendaId, agenda.id)));
    if (input.restreint && retenus.length > 0) {
      await tx
        .insert(agendasAcces)
        .values(retenus.map((utilisateurId) => ({ foyerId, agendaId: agenda.id, utilisateurId })));
    }
  });
}

/** Membres du foyer (pour le panneau de partage des agendas). */
export async function membresDuFoyerPourPartage(): Promise<{ utilisateurId: string; nom: string }[]> {
  const foyerId = await idFoyerCourant();
  const lignes = await db()
    .select({ utilisateurId: tMembres.utilisateurId, nom: tUtilisateurs.nom, email: tUtilisateurs.email })
    .from(tMembres)
    .innerJoin(tUtilisateurs, eq(tUtilisateurs.id, tMembres.utilisateurId))
    .where(eq(tMembres.foyerId, foyerId));
  return lignes
    .map((m) => ({ utilisateurId: m.utilisateurId, nom: m.nom || m.email }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
