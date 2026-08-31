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
  demanderAdhesion,
  accepterDemande,
  refuserDemande,
  terminerOnboarding,
} from '@/lib/membres';

/** Invite un e-mail à rejoindre le foyer courant. */
export async function inviterAction(formData: FormData): Promise<void> {
  const email = String(formData.get('email') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await inviterMembre(foyer.id, user.id, email);
  revalidatePath('/foyer/membres');
}

/** Révoque une invitation en attente. */
export async function revoquerAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await revoquerInvitation(foyer.id, user.id, id);
  revalidatePath('/foyer/membres');
}

/** Retire un membre du foyer. */
export async function retirerAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await retirerMembre(foyer.id, user.id, id);
  revalidatePath('/foyer/membres');
}

/** Renomme le foyer. */
export async function renommerAction(formData: FormData): Promise<void> {
  const nom = String(formData.get('nom') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await renommerFoyer(foyer.id, user.id, nom);
  revalidatePath('/foyer/membres');
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

/* -------------------- Prise en main (onboarding) -------------------- */

/** Étape 1 : nommer son foyer. Renvoie une erreur exploitable par le formulaire. */
export async function nommerFoyerAction(
  _precedent: { erreur?: string } | null,
  formData: FormData,
): Promise<{ erreur?: string; ok?: boolean }> {
  try {
    const nom = String(formData.get('nom') ?? '');
    const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
    await renommerFoyer(foyer.id, user.id, nom);
    revalidatePath('/foyer/demarrage');
    return { ok: true };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Nom refusé.' };
  }
}

/** Étape 2 : inviter un proche (facultatif, répétable). */
export async function inviterOnboardingAction(
  _precedent: { erreur?: string; invite?: string } | null,
  formData: FormData,
): Promise<{ erreur?: string; invite?: string }> {
  try {
    const email = String(formData.get('email') ?? '');
    const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
    await inviterMembre(foyer.id, user.id, email);
    revalidatePath('/foyer/demarrage');
    return { invite: email.trim() };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Invitation refusée.' };
  }
}

/** Étape 3 : clôturer la prise en main et entrer dans l'app. */
export async function terminerOnboardingAction(formData?: FormData): Promise<void> {
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  const origineDeclaree = formData?.get('origineDeclaree');
  await terminerOnboarding(foyer.id, user.id, typeof origineDeclaree === 'string' && origineDeclaree ? origineDeclaree : undefined);
  redirect('/');
}

/* -------------------- Demandes d'adhésion -------------------- */

/**
 * Dépose une demande auprès du responsable d'un foyer (page /rejoindre-foyer).
 * N'appelle PAS `foyerCourant` : le demandeur n'a pas encore de foyer, et on ne
 * veut surtout pas lui en provisionner un au passage.
 */
export async function demanderAdhesionAction(formData: FormData): Promise<{ ok?: string; erreur?: string }> {
  const email = String(formData.get('email') ?? '');
  const message = String(formData.get('message') ?? '');
  const user = await utilisateurCourant();
  try {
    await demanderAdhesion({ id: user.id, email: user.email, nom: user.nom }, email, message);
    revalidatePath('/rejoindre-foyer');
    // On renvoie l'ADRESSE SAISIE, pas le nom du foyer : la confirmation doit
    // être identique que l'adresse corresponde à un foyer ou non (cf. demanderAdhesion).
    return { ok: email.trim() };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Demande impossible.' };
  }
}

/** Le propriétaire accepte une demande reçue. */
export async function accepterDemandeAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await accepterDemande(foyer.id, user.id, id);
  revalidatePath('/foyer/membres');
}

/** Le propriétaire refuse une demande reçue. */
export async function refuserDemandeAction(formData: FormData): Promise<void> {
  const id = String(formData.get('id') ?? '');
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  await refuserDemande(foyer.id, user.id, id);
  revalidatePath('/foyer/membres');
}
