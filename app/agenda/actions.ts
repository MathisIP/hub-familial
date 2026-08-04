'use server';

import { revalidatePath } from 'next/cache';
import { rattacherCalendrier, detacherCalendrier } from '@/lib/agenda/calendriers';
import { deconnecterAgenda } from '@/lib/agenda/oauth';
import { utilisateurCourant } from '@/lib/foyer';

/** Actions de configuration des agendas du foyer (page /agenda). */

export async function rattacherAction(calendarId: string, nom: string): Promise<{ erreur?: string }> {
  try {
    await rattacherCalendrier(calendarId, nom);
    revalidatePath('/agenda');
    return {};
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Ajout impossible.' };
  }
}

export async function detacherAction(calendarId: string): Promise<{ erreur?: string }> {
  try {
    await detacherCalendrier(calendarId);
    revalidatePath('/agenda');
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
    revalidatePath('/agenda');
    return {};
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Déconnexion impossible.' };
  }
}
