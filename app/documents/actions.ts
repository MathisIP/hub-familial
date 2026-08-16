'use server';

import { revalidatePath } from 'next/cache';
import { definirPartageDossier } from '@/lib/documents/service';

/** Résultat d'une action, même convention que le module Budget. */
export type ResultatAction = { ok?: true; erreur?: string };

/**
 * Règle qui voit un dossier — et donc les fichiers qu'il contient.
 *
 * Le service revérifie que la personne est propriétaire du foyer : une action
 * serveur reste une porte ouverte sur le réseau.
 *
 * ⚠ `revalidatePath('/')` en plus de `/documents` : la carte Documents de
 * l'accueil fait sa propre recherche à travers tous les dossiers, elle doit
 * refléter la restriction immédiatement.
 */
export async function definirPartageDossierAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await definirPartageDossier({
      dossierId: String(formData.get('id') ?? ''),
      restreint: formData.get('restreint') === 'oui',
      utilisateurIds: formData.getAll('utilisateurs').map(String).filter(Boolean),
    });
    revalidatePath('/documents');
    revalidatePath('/');
    return { ok: true };
  } catch (e) {
    return { erreur: e instanceof Error ? e.message : 'Réglage impossible.' };
  }
}
