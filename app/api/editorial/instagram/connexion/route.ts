import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { exigerAcces } from '@/lib/abonnement';
import { urlSite } from '@/lib/config';
import { oauthInstagramDisponible, urlAutorisationInstagram } from '@/lib/editorial/instagram';

/**
 * GET /api/editorial/instagram/connexion — démarre l'autorisation Instagram
 * (Facebook Login for Business). Même garde anti-CSRF par cookie `state` que
 * app/api/agenda/connexion/route.ts.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  await exigerAcces();

  // Ramène sur l'hôte canonique avant de poser le cookie — même piège que
  // pour l'agenda : un cookie posé sur un autre domaine que SITE_URL ne
  // reviendrait jamais au callback, qui atterrit toujours sur SITE_URL.
  const canonique = new URL(urlSite());
  const demande = req.headers.get('host');
  if (demande && demande !== canonique.host) {
    return NextResponse.redirect(new URL('/api/editorial/instagram/connexion', canonique));
  }

  if (!oauthInstagramDisponible()) {
    return NextResponse.json({ erreur: 'OAuth Instagram non configuré.' }, { status: 503 });
  }

  const etat = randomBytes(24).toString('base64url');
  const rep = NextResponse.redirect(urlAutorisationInstagram(etat));
  rep.cookies.set('instagram-oauth-etat', etat, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  });
  return rep;
}
