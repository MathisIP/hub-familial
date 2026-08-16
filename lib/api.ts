import { NextResponse } from 'next/server';
import { ConfigManquante } from '@/lib/config';
import { ErreurValidation } from '@/lib/erreurs';
import { StockageNonConfigure } from '@/lib/stockage';
import { ChiffrementNonConfigure } from '@/lib/stockage/chiffrement';

/**
 * Traduit une exception en réponse JSON. Centralisé pour que toutes les routes
 * répondent pareil : `400` si la saisie est invalide, `503` si la config du
 * foyer manque (cas distinct d'une vraie panne), `500` sinon. Ne fuit jamais de
 * secret — juste le message.
 */
export function reponseErreur(e: unknown): NextResponse {
  if (e instanceof ErreurValidation) {
    return NextResponse.json({ erreur: e.message }, { status: 400 });
  }
  if (
    e instanceof ConfigManquante ||
    e instanceof StockageNonConfigure ||
    e instanceof ChiffrementNonConfigure
  ) {
    return NextResponse.json({ erreur: e.message }, { status: 503 });
  }
  /**
   * ⚠ UN 500 EST TOUJOURS JOURNALISÉ, avec sa pile.
   *
   * Un 400 ou un 503 sont des réponses *attendues* : la saisie est invalide, la
   * configuration manque. Un 500, par définition, ne l'est pas — et sans trace,
   * il ne reste que le code d'état. C'est ce qui a rendu l'échec du ménage
   * quotidien indiagnosticable : la tâche renvoyait 500 à un appelant
   * automatique, dont personne ne lit le corps de réponse.
   */
  console.error('[api] erreur inattendue', e instanceof Error ? e.stack : e);
  const err = e as { message?: string };
  return NextResponse.json(
    { erreur: err.message ?? 'Erreur serveur inconnue.' },
    { status: 500 },
  );
}
