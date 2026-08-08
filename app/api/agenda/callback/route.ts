import { NextResponse, type NextRequest } from 'next/server';
import { utilisateurCourant } from '@/lib/foyer';
import { enregistrerAutorisation } from '@/lib/agenda/oauth';

/**
 * GET /api/agenda/callback — retour de la page de consentement Google.
 * Vérifie le `state` (anti-CSRF), échange le code contre des jetons, les
 * enregistre chiffrés, puis renvoie sur /agenda avec un message.
 */
export const dynamic = 'force-dynamic';

function versAgenda(req: NextRequest, params: Record<string, string>): NextResponse {
  const url = new URL('/agenda', req.nextUrl.origin);
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  const rep = NextResponse.redirect(url);
  rep.cookies.delete('agenda-oauth-etat'); // jeton à usage unique
  return rep;
}

export async function GET(req: NextRequest) {
  const user = await utilisateurCourant();
  const params = req.nextUrl.searchParams;

  // L'utilisateur a refusé, ou Google a renvoyé une erreur.
  const refus = params.get('error');
  if (refus) return versAgenda(req, { agenda: 'refus' });

  const code = params.get('code');
  const etat = params.get('state');
  const etatAttendu = req.cookies.get('agenda-oauth-etat')?.value;
  if (!code || !etat || !etatAttendu || etat !== etatAttendu) {
    /**
     * Ces quatre conditions donnaient le MÊME message à l'écran, ce qui ne
     * disait rien de la cause. La plus fréquente et la plus déroutante est le
     * cookie absent : il est déposé par l'hôte qui répond, et un retour de
     * Google sur un autre domaine ne l'emporte pas. On journalise donc laquelle
     * a joué, et sur quel hôte on a atterri.
     */
    const cause = !code
      ? 'code absent'
      : !etat
        ? 'state absent de la réponse Google'
        : !etatAttendu
          ? `cookie d'état absent (hôte : ${req.headers.get('host') ?? '?'})`
          : 'state différent du cookie';
    console.warn('[agenda] autorisation rejetée —', cause);
    return versAgenda(req, { agenda: 'etat' });
  }

  try {
    await enregistrerAutorisation(user.id, code);
    return versAgenda(req, { agenda: 'ok' });
  } catch {
    // Le détail (message Google) n'apporte rien à l'utilisateur et pourrait
    // exposer des éléments de configuration.
    return versAgenda(req, { agenda: 'echec' });
  }
}
