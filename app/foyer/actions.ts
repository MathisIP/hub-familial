'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { foyerCourant, utilisateurCourant } from '@/lib/foyer';
import {
  inviterMembre,
  revoquerInvitation,
  retirerMembre,
  renommerFoyer,
  accepterInvitation,
} from '@/lib/membres';

/** Invite un e-mail à rejoindre le foyer courant. */
export async function inviterAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await inviterMembre(foyer.id, user.id, email);
  revalidatePath('/foyer');
}

/** Révoque une invitation en attente. */
export async function revoquerAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await revoquerInvitation(foyer.id, user.id, id);
  revalidatePath('/foyer');
}

/** Retire un membre du foyer. */
export async function retirerAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await retirerMembre(foyer.id, user.id, id);
  revalidatePath('/foyer');
}

/** Renomme le foyer. */
export async function renommerAction(formData: FormData): Promise<void> {
  const nom = String(formData.get('nom') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await renommerFoyer(foyer.id, user.id, nom);
  revalidatePath('/foyer');
}

/**
 * Accepte une invitation (page /rejoindre). N'appelle PAS foyerCourant (qui
 * provisionnerait un foyer perso) : on rattache l'utilisateur au foyer invité,
 * puis on redirige vers l'accueil.
 */
export async function accepterAction(formData: FormData): Promise<void> {
  const jeton = String(formData.get('jeton') ?? '');
  const user = await utilisateurCourant();
  await accepterInvitation(jeton, { id: user.id, email: user.email });
  redirect('/');
}
