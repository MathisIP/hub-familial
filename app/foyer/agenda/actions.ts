'use server';

import { revalidatePath } from 'next/cache';
import {
  rattacherCalendrier,
  detacherCalendrier,
  definirPartageAgenda,
} from '@/lib/agenda/calendriers';
import { deconnecterAgenda } from '@/lib/agenda/oauth';
import { utilisateurCourant } from '@/lib/foyer';

/** Actions de configuration des agendas du foyer (page /agenda). */

export async function rattacherAction(calendarId: string, nom: string): Promise<{ erreur?: string }> {
  try {
    await rattacherCalendrier(calendarId, nom);
    revalidatePath('/foyer/agenda');
    return {};
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Ajout impossible.' };
  }
}

export async function detacherAction(calendarId: string): Promise<{ erreur?: string }> {
  try {
    await detacherCalendrier(calendarId);
    revalidatePath('/foyer/agenda');
    return {};
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Retrait impossible.' };
  }
}

/**
 * Retire l'autorisation Google. Les calendriers que cette personne avait
 * rattachés restent listés mais deviendront inaccessibles : le service les
 * ignore proprement, et elle peut reconnecter à tout moment.
 */
export async function deconnecterGoogleAction(): Promise<{ erreur?: string }> {
  try {
    const user = await utilisateurCourant();
    await deconnecterAgenda(user.id);
    revalidatePath('/foyer/agenda');
    return {};
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Déconnexion impossible.' };
  }
}

/**
 * Règle qui voit un agenda rattaché. Le service revérifie que la personne est
 * bien celle qui l'a rattaché — une action serveur reste une porte sur le réseau.
 *
 * ⚠ `revalidatePath('/')` en plus : la carte agenda de l'accueil affiche les
 * mêmes événements, elle doit refléter la restriction immédiatement.
 */
export async function definirPartageAgendaAction(
  agendaId: string,
  restreint: boolean,
  utilisateurIds: string[],
): Promise<{ erreur?: string }> {
  try {
    await definirPartageAgenda({ agendaId, restreint, utilisateurIds });
    revalidatePath('/foyer/agenda');
    revalidatePath('/');
    return {};
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Réglage impossible.' };
  }
}
