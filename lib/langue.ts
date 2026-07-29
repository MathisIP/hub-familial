import 'server-only';
import { cookies } from 'next/headers';
import { langueValide, type IdLangue } from '@/lib/i18n';

/**
 * Langue courante côté serveur, lue du cookie `hub-langue` (posé par le sélecteur
 * de Réglages). Repli sur le français. Utilisée par les composants serveur pour
 * rendre le bon libellé via `t(clé, langue)`.
 */
export async function langueCourante(): Promise<IdLangue> {
  const c = await cookies();
  return langueValide(c.get('hub-langue')?.value);
}
