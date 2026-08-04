import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { utilisateurCourant } from '@/lib/foyer';
import { oauthDisponible, urlAutorisation } from '@/lib/agenda/oauth';

/**
 * GET /api/agenda/connexion — démarre l'autorisation Google Agenda.
 *
 * Un `state` aléatoire est posé en cookie et renvoyé par Google : le callback
 * refuse tout appel dont le `state` ne correspond pas. Sans cela, un tiers
 * pourrait faire rattacher SON compte Google à la session de la victime (CSRF
 * de connexion).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await utilisateurCourant(); // exige une session
  if (!oauthDisponible()) {
    return NextResponse.json({ erreur: 'OAuth Google non configuré.' }, { status: 503 });
  }

  const etat = randomBytes(24).toString('base64url');
  const rep = NextResponse.redirect(urlAutorisation(req.nextUrl.origin, etat));
  rep.cookies.set('agenda-oauth-etat', etat, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'lax' : le cookie doit survivre au retour depuis Google
    path: '/',
    maxAge: 600, // 10 min : le temps d'accorder l'autorisation
  });
  return rep;
}
