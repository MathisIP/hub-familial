import 'server-only';
import { urlSite } from '@/lib/config';
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

/**
 * URI de redirection OAuth — **déterminée par la configuration, jamais par la
 * requête**.
 *
 * ⚠ Elle était auparavant déduite de `req.nextUrl.origin`. Sur Vercel, cette
 * origine peut être le domaine de DÉPLOIEMENT (`…vercel.app`) et non le domaine
 * du site : il fallait alors déclarer ce domaine technique dans la console
 * Google pour que la connexion fonctionne — une URI parasite dans un dossier de
 * vérification qui annonce `www.nestync.app` comme site officiel.
 *
 * Deux raisons de la figer :
 *  1. Google exige que le `redirect_uri` de la demande d'autorisation et celui
 *     de l'échange du code soient **identiques au caractère près**. Les déduire
 *     de deux requêtes différentes, c'est accepter qu'ils divergent un jour.
 *  2. Une seule URI à déclarer dans la console, et elle ne bouge plus.
 */
export function uriRedirection(): string {
  return `${urlSite()}/api/agenda/callback`;
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
export function urlAutorisation(etat: string, langue = 'fr'): string {
  const p = new URLSearchParams({
    client_id: process.env.AUTH_GOOGLE_ID ?? '',
    redirect_uri: uriRedirection(),
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
): Promise<void> {
  const j = await appelerToken({
    client_id: process.env.AUTH_GOOGLE_ID ?? '',
    client_secret: process.env.AUTH_GOOGLE_SECRET ?? '',
    grant_type: 'authorization_code',
    code,
    redirect_uri: uriRedirection(),
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
    /**
     * ⚠ On n'efface QUE si Google déclare l'autorisation morte.
     *
     * La version précédente supprimait dès qu'aucun jeton ne revenait — donc
     * aussi sur une panne passagère de Google, une limite de débit ou une
     * réponse malformée. **Une seule défaillance transitoire détruisait
     * définitivement la connexion**, sans que personne ne comprenne pourquoi :
     * l'agenda cessait simplement de se charger, et il fallait tout reconnecter.
     *
     * `invalid_grant` est le seul code qui signifie « ce refresh_token ne vaut
     * plus rien » (autorisation retirée par la personne, mot de passe changé,
     * jeton expiré pour inactivité). Dans tous les autres cas on garde la ligne
     * et on retentera au prochain passage.
     */
    if (j.error === 'invalid_grant') {
      await db().delete(comptesGoogle).where(eq(comptesGoogle.utilisateurId, utilisateurId));
    } else {
      console.warn('[agenda] renouvellement du jeton impossible (conservé) :', j.error ?? 'sans code');
    }
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

/**
 * Cet utilisateur a-t-il un agenda connecté **et réellement utilisable** ?
 *
 * ⚠ Ne pas se contenter de vérifier que la ligne existe. Les jetons sont chiffrés
 * avec une clé dérivée d'`AUTH_SECRET` ([lib/crypto.ts]) : si ce secret change —
 * une rotation après incident, par exemple — les jetons stockés deviennent
 * indéchiffrables. Or `dechiffrer()` renvoie `null` au lieu de lever, et un
 * calendrier inaccessible est simplement ignoré : l'app afficherait donc
 * « agenda connecté » avec des calendriers **silencieusement vides**, sans jamais
 * proposer de reconnecter. Une panne muette est pire qu'une erreur franche.
 *
 * On teste donc le déchiffrement. Le `refresh_token` prime : c'est lui qui rend
 * l'accès durable. À défaut (Google ne le renvoie qu'à la 1re autorisation), un
 * `access_token` lisible suffit à considérer la connexion vivante.
 */
export async function agendaConnecte(utilisateurId: string): Promise<boolean> {
  const [c] = await db()
    .select({
      accessTokenChiffre: comptesGoogle.accessTokenChiffre,
      refreshTokenChiffre: comptesGoogle.refreshTokenChiffre,
    })
    .from(comptesGoogle)
    .where(eq(comptesGoogle.utilisateurId, utilisateurId))
    .limit(1);
  if (!c) return false;
  return !!(dechiffrer(c.refreshTokenChiffre) ?? dechiffrer(c.accessTokenChiffre));
}

/**
 * Révoque une autorisation CHEZ GOOGLE (et pas seulement dans notre base).
 *
 * ⚠ Supprimer notre copie ne suffit pas : sans cet appel, l'autorisation reste
 * active côté Google et continue d'apparaître dans les applications connectées
 * de la personne. Les bonnes pratiques OAuth de Google demandent explicitement
 * de « révoquer les jetons dès qu'ils ne sont plus nécessaires ».
 * Révoquer le `refresh_token` invalide toute la chaîne de jetons associés.
 */
async function revoquerChezGoogle(jeton: string): Promise<void> {
  try {
    await fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({ token: jeton }),
    });
  } catch {
    // Jeton déjà révoqué, ou Google injoignable : on efface quand même notre
    // copie — ne jamais bloquer une demande de déconnexion sur un appel réseau.
  }
}

/**
 * Retire l'autorisation : révocation chez Google PUIS effacement de nos jetons.
 * La personne peut reconnecter son agenda quand elle le souhaite.
 */
export async function deconnecterAgenda(utilisateurId: string): Promise<void> {
  const [c] = await db()
    .select()
    .from(comptesGoogle)
    .where(eq(comptesGoogle.utilisateurId, utilisateurId))
    .limit(1);

  if (c) {
    // Le refresh_token de préférence : sa révocation invalide aussi les jetons d'accès.
    const aRevoquer = dechiffrer(c.refreshTokenChiffre) ?? dechiffrer(c.accessTokenChiffre);
    if (aRevoquer) await revoquerChezGoogle(aRevoquer);
  }

  await db().delete(comptesGoogle).where(eq(comptesGoogle.utilisateurId, utilisateurId));
}

/** Périmètre réellement ACCORDÉ par la personne (peut être partiel : Google
 *  autorise à décocher une case sur l'écran de consentement). */
export async function scopesAccordes(utilisateurId: string): Promise<string[]> {
  const [c] = await db()
    .select({ scope: comptesGoogle.scope })
    .from(comptesGoogle)
    .where(eq(comptesGoogle.utilisateurId, utilisateurId))
    .limit(1);
  return (c?.scope ?? '').split(/\s+/).filter(Boolean);
}

/** La personne a-t-elle accordé le droit de CRÉER/SUPPRIMER des événements ? */
export async function peutEcrireEvenements(utilisateurId: string): Promise<boolean> {
  return (await scopesAccordes(utilisateurId)).includes(
    'https://www.googleapis.com/auth/calendar.events',
  );
}
