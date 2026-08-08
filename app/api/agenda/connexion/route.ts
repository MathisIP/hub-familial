import { randomBytes } from 'node:crypto';
import { NextResponse, type NextRequest } from 'next/server';
import { utilisateurCourant } from '@/lib/foyer';
import { langueCourante } from '@/lib/langue';
import { urlSite } from '@/lib/config';
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

  /**
   * ⚠ RAMENER SUR L'HÔTE CANONIQUE AVANT DE POSER LE COOKIE.
   *
   * Un cookie appartient à l'hôte qui l'a déposé. Si la personne arrive par un
   * autre domaine que celui de `SITE_URL` — l'ancienne adresse `*.vercel.app`
   * gardée en favori, l'apex sans `www`, une PWA installée depuis l'une d'elles —
   * le cookie d'état est déposé LÀ, tandis que Google revient toujours sur
   * `SITE_URL`. Le cookie n'est alors pas envoyé et l'autorisation échoue avec
   * « lien invalide ou expiré », sans rien qui explique pourquoi.
   *
   * On lit l'en-tête `Host` (ce que le navigateur a réellement demandé) et non
   * `nextUrl`, qui peut porter l'hôte interne de déploiement — s'y fier ferait
   * boucler la redirection.
   */
  const canonique = new URL(urlSite());
  const demande = req.headers.get('host');
  if (demande && demande !== canonique.host) {
    return NextResponse.redirect(new URL('/api/agenda/connexion', canonique));
  }

  if (!oauthDisponible()) {
    return NextResponse.json({ erreur: 'OAuth Google non configuré.' }, { status: 503 });
  }

  const etat = randomBytes(24).toString('base64url');
  // L'écran de consentement s'affiche dans la langue de l'app, pas dans celle
  // du compte Google (cf. `urlAutorisation`).
  const langue = await langueCourante();
  const rep = NextResponse.redirect(urlAutorisation(etat, langue));
  rep.cookies.set('agenda-oauth-etat', etat, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax', // 'lax' : le cookie doit survivre au retour depuis Google
    path: '/',
    maxAge: 600, // 10 min : le temps d'accorder l'autorisation
  });
  return rep;
}
