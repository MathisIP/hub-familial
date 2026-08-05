import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { comptesGoogle } from '@/lib/db/schema';
import { chiffrer, dechiffrer } from '@/lib/crypto';

/**
 * AUTORISATION GOOGLE AGENDA PAR UTILISATEUR (OAuth « incrémental »).
 * ==================================================================
 * Flux volontairement SÉPARÉ de la connexion Auth.js. Raisons :
 *  · la connexion reste au périmètre minimal (`openid email profile`) — personne
 *    n'est obligé d'accorder son agenda pour utiliser Nestync ;
 *  · on obtient un `refresh_token` propre, stocké côté serveur, utilisable même
 *    quand la personne n'est pas devant l'écran (un autre membre du foyer
 *    consulte l'agenda commun).
 *
 * Le client OAuth est le même que celui de la connexion (AUTH_GOOGLE_ID/SECRET) :
 * ⚠ son URI de redirection `<origine>/api/agenda/callback` doit être déclarée
 * dans la console Google Cloud.
 */

/**
 * Périmètre demandé — volontairement le plus ÉTROIT qui couvre nos usages :
 *  · `calendar.calendarlist.readonly` : lire la LISTE des calendriers (noms), pour
 *    l'écran de sélection. Ne donne accès à aucun contenu d'événement.
 *  · `calendar.events` : lire ET écrire les événements des calendriers choisis.
 *
 * ⚠ On demandait auparavant `calendar.readonly`, qui donne accès en lecture à
 * **tous** les agendas alors qu'on n'a besoin que d'en lister les noms. Un
 * périmètre plus large est plus difficile à justifier lors de la vérification
 * Google — et inutilement intrusif pour l'utilisateur. Ne pas l'élargir sans
 * raison précise.
 */
export const SCOPES_AGENDA = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events',
].join(' ');

const TOKEN_URL = 'https://oauth2.googleapis.com/token';

export function oauthDisponible(): boolean {
  return !!process.env.AUTH_GOOGLE_ID && !!process.env.AUTH_GOOGLE_SECRET;
}

export function uriRedirection(origine: string): string {
  return `${origine.replace(/\/$/, '')}/api/agenda/callback`;
}

/**
 * URL de la page de consentement Google.
 *
 * `hl` fixe la LANGUE de l'écran de consentement. Sans lui, Google suit la langue
 * du compte Google, qui n'est pas forcément celle de l'app — un utilisateur qui
 * lit Nestync en anglais recevrait un écran en français. Utile aussi pour la
 * vérification Google, qui exige un écran de consentement en anglais dans la
 * vidéo de démonstration : il suffit de passer l'app en anglais.
 */
export function urlAutorisation(origine: string, etat: string, langue = 'fr'): string {
  const p = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID ?? '',
    redirect_uri: uriRedirection(origine),
    response_type: 'code',
    scope: SCOPES_AGENDA,
    access_type: 'offline', // délivre un refresh_token
    prompt: 'consent', // force sa délivrance même si déjà autorisé
    include_granted_scopes: 'true',
    state: etat,
    hl: langue,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${p}`;
}

type JetonsGoogle = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  scope?: string;
  error?: string;
  error_description?: string;
};

async function appelerToken(corps: Record<string, string>): Promise<JetonsGoogle> {
  const rep = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams(corps),
  });
  return (await rep.json()) as JetonsGoogle;
}

/** Échange le code d'autorisation contre des jetons, puis les enregistre. */
export async function enregistrerAutorisation(
  utilisateurId: string,
  code: string,
  origine: string,
): Promise<void> {
  const j = await appelerToken({
    client_id: process.env.AUTH_GOOGLE_ID ?? '',
    client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: uriRedirection(origine),
  });
  if (!j.access_token) {
    throw new Error(j.error_description || j.error || 'Autorisation Google refusée.');
  }

  const expireLe = j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null;
  const valeurs = {
    utilisateurId,
    accessTokenChiffre: chiffrer(j.access_token),
    // Google ne renvoie le refresh_token qu'à la 1re autorisation : ne jamais
    // écraser celui qu'on a déjà par une valeur vide.
    refreshTokenChiffre: j.refresh_token ? chiffrer(j.refresh_token) : undefined,
    expireLe,
    scope: j.scope ?? SCOPES_AGENDA,
  };

  await db()
    .insert(comptesGoogle)
    .values({ ...valeurs, refreshTokenChiffre: valeurs.refreshTokenChiffre ?? null })
    .onConflictDoUpdate({
      target: comptesGoogle.utilisateurId,
      set: Object.fromEntries(
        Object.entries(valeurs).filter(([, v]) => v !== undefined),
      ) as typeof valeurs,
    });
}

/**
 * Jeton d'accès valide pour cet utilisateur (renouvelé si expiré), ou `null`
 * s'il n'a pas autorisé son agenda / si l'autorisation a été révoquée.
 */
export async function jetonAgenda(utilisateurId: string): Promise<string | null> {
  const [c] = await db()
    .select()
    .from(comptesGoogle)
    .where(eq(comptesGoogle.utilisateurId, utilisateurId))
    .limit(1);
  if (!c) return null;

  // Marge d'une minute : évite d'utiliser un jeton qui expire pendant l'appel.
  const encoreValide = c.expireLe && c.expireLe.getTime() > Date.now() + 60_000;
  if (encoreValide) return dechiffrer(c.accessTokenChiffre);

  const refresh = dechiffrer(c.refreshTokenChiffre);
  if (!refresh) return null;

  const j = await appelerToken({
    client_id: process.env.AUTH_GOOGLE_ID ?? '',
    client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
    grant_type: 'refresh_token',
    refresh_token: refresh,
  });
  if (!j.access_token) {
    // Autorisation révoquée côté Google : on nettoie pour proposer de reconnecter.
    await db().delete(comptesGoogle).where(eq(comptesGoogle.utilisateurId, utilisateurId));
    return null;
  }

  await db()
    .update(comptesGoogle)
    .set({
      accessTokenChiffre: chiffrer(j.access_token),
      expireLe: j.expires_in ? new Date(Date.now() + j.expires_in * 1000) : null,
    })
    .where(eq(comptesGoogle.utilisateurId, utilisateurId));

  return j.access_token;
}

/** Cet utilisateur a-t-il connecté son agenda ? */
export async function agendaConnecte(utilisateurId: string): Promise<boolean> {
  const [c] = await db()
    .select({ id: comptesGoogle.id })
    .from(comptesGoogle)
    .where(eq(comptesGoogle.utilisateurId, utilisateurId))
    .limit(1);
  return !!c;
}

/** Retire l'autorisation stockée (la personne peut reconnecter quand elle veut). */
export async function deconnecterAgenda(utilisateurId: string): Promise<void> {
  await db().delete(comptesGoogle).where(eq(comptesGoogle.utilisateurId, utilisateurId));
}
