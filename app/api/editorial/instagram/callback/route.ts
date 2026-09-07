import { NextResponse, type NextRequest } from 'next/server';
import { idFoyerCourant } from '@/lib/foyer';
import { enregistrerAutorisationInstagram } from '@/lib/editorial/instagram';

/**
 * GET /api/editorial/instagram/callback — retour de la page de consentement
 * Meta. Vérifie le `state`, échange le code, enregistre le compte, puis
 * renvoie sur /foyer/editorial avec un message. Même structure que
 * app/api/agenda/callback/route.ts.
 */
export const dynamic = 'force-dynamic';

function versEditorial(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/foyer/editorial', req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const rep = NextResponse.redirect(url);
  rep.cookies.delete('instagram-oauth-etat');
  return rep;
}

export async function GET(req: NextRequest) {
  const foyerId = await idFoyerCourant();
  const params = req.nextUrl.searchParams;

  const refus = params.get('error');
  if (refus) return versEditorial(req, { instagram: 'refus' });

  const code = params.get('code');
  const etat = params.get('state');
  const etatAttendu = req.cookies.get('instagram-oauth-etat')?.value;
  if (!code || !etat || !etatAttendu || etat !== etatAttendu) {
    const cause = !code
      ? 'code absent'
      : !etat
        ? 'state absent de la réponse Meta'
        : !etatAttendu
          ? `cookie d'état absent (hôte : ${req.headers.get('host') ?? '?'})`
          : 'state différent du cookie';
    console.warn('[editorial/instagram] autorisation rejetée —', cause);
    return versEditorial(req, { instagram: 'etat' });
  }

  try {
    await enregistrerAutorisationInstagram(foyerId, code);
    return versEditorial(req, { instagram: 'ok' });
  } catch (e) {
    console.warn('[editorial/instagram] échec de l’autorisation —', (e as Error).message);
    return versEditorial(req, { instagram: 'echec' });
  }
}
