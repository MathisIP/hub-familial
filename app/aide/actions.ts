'use server';

import { envoyerDemandeAide } from '@/lib/contact';
import { foyerCourant } from '@/lib/foyer';

export type ResultatAide = { ok?: true; erreur?: string };

/**
 * Envoi du formulaire d'aide. Page **publique** : cette action ne doit jamais
 * exiger de session — quelqu'un qui n'arrive pas à se connecter est précisément
 * celui qui a le plus besoin d'écrire.
 */
export async function envoyerAideAction(
  _precedent: ResultatAide | null,
  formData: FormData,
): Promise<ResultatAide | null> {
  // Piège à robots : un champ invisible qu'un humain ne remplit jamais. On
  // répond `ok` sans rien enregistrer — un robot informé de son échec s'adapte.
  if (String(formData.get('site') ?? '') !== '') return { ok: true };

  try {
    // Si la personne est connectée, on rattache le message à son foyer : ça
    // évite de lui demander qui elle est, et ça aide à retrouver le contexte.
    let foyerId: string | null = null;
    try {
      foyerId = (await foyerCourant()).id;
    } catch {
      foyerId = null; // visiteur non connecté, ou sans foyer : parfaitement normal
    }

    await envoyerDemandeAide({
      email: String(formData.get('email') ?? ''),
      nom: String(formData.get('nom') ?? ''),
      sujet: String(formData.get('sujet') ?? ''),
      message: String(formData.get('message') ?? ''),
      foyerId,
    });
    return { ok: true };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Envoi impossible.' };
  }
}
