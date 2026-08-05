'use server';

import { revalidatePath } from 'next/cache';
import { creerComptes, type NouveauCompte } from '@/lib/budget/service';

/**
 * Création des comptes du foyer (initialisation du Budget, ou ajout ultérieur).
 * Les montants arrivent en texte : on accepte la virgule décimale et les espaces,
 * parce que c'est ainsi qu'on écrit un montant en français.
 */
export async function creerComptesAction(
  _precedent: { erreur?: string } | null,
  formData: FormData,
): Promise<{ erreur?: string } | null> {
  try {
    const brut = JSON.parse(String(formData.get('lignes') ?? '[]')) as {
      nom: string;
      solde: string;
    }[];

    const entrees: NouveauCompte[] = brut
      .filter((l) => (l.nom ?? '').trim() !== '')
      .map((l) => ({
        nom: l.nom,
        // « 1 240,50 » → 1240.50 ; un champ vide vaut 0.
        solde: Number(String(l.solde ?? '').replace(/\s/g, '').replace(',', '.') || '0'),
      }));

    await creerComptes(entrees);
    revalidatePath('/budget');
    revalidatePath('/');
    return null;
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Création impossible.' };
  }
}
