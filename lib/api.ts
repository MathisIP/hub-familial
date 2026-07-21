import { NextResponse } from 'next/server';
import { ConfigManquante } from '@/lib/config';
import { ErreurValidation } from '@/lib/erreurs';

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
  if (e instanceof ConfigManquante) {
    return NextResponse.json({ erreur: e.message }, { status: 503 });
  }
  const err = e as { message?: string };
  return NextResponse.json(
    { erreur: err.message ?? 'Erreur serveur inconnue.' },
    { status: 500 },
  );
}
