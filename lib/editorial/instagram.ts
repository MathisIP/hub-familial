import 'server-only';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { comptesInstagram } from '@/lib/db/schema';
import { chiffrer, dechiffrer } from '@/lib/crypto';
import { urlSite } from '@/lib/config';

/**
 * AUTORISATION INSTAGRAM DU FOYER (calendrier éditorial).
 * ========================================================
 * Flux Meta « Facebook Login for Business » : le compte Instagram Business
 * (@nestync.app) est rattaché via la Page Facebook liée. Trois échanges
 * successifs, propres à Meta (différents de Google) :
 *   1. code d'autorisation → jeton COURT (~1 h) ;
 *   2. jeton court → jeton LONGUE DURÉE (~60 j, ré-extensible) ;
 *   3. jeton + Page → `ig_user_id` (identifiant Instagram Business nécessaire
 *      aux appels Graph API /insights).
 *
 * ⚠ PAS DE `refresh_token` COMME GOOGLE. Meta prolonge un jeton longue durée
 * encore valide en le ré-échangeant contre lui-même (même endpoint que
 * l'étape 2) — il faut donc renouveler AVANT expiration, jamais après.
 *
 * ⚠ UN SEUL COMPTE INSTAGRAM POUR TOUT LE FOYER (comptes_instagram.foyer_id,
 * unique) : c'est le compte professionnel Nestync, pas un compte personnel de
 * chaque membre — qui que ce soit dans le foyer ait autorisé l'app, le jeton
 * sert à tous.
 */

const GRAPH_VERSION = 'v21.0';
const GRAPH_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export function oauthInstagramDisponible(): boolean {
  return !!process.env.META_APP_ID && !!process.env.META_APP_SECRET;
}

/**
 * URI de redirection — FIGÉE PAR CONFIGURATION, jamais déduite de la requête.
 * Même raison que `lib/agenda/oauth.ts` `uriRedirection()` : Meta exige une
 * correspondance exacte entre l'URI déclarée dans l'app et celle de l'échange.
 */
export function uriRedirectionInstagram(): string {
  return `${urlSite()}/api/editorial/instagram/callback`;
}

/**
 * Permissions demandées — les deux ajoutées côté Meta Developer :
 *  · `instagram_business_basic` : lire profil + contenu du compte ;
 *  · `instagram_business_manage_insights` : lire les statistiques.
 * Aucune permission d'écriture (publication, messages, commentaires) : ce
 * calendrier ne fait QUE lire les résultats, jamais publier à la place de la
 * personne.
 */
const SCOPES_INSTAGRAM = ['instagram_business_basic', 'instagram_business_manage_insights'].join(',');

export function urlAutorisationInstagram(etat: string): string {
  const p = new URLSearchParams({
    client_id: process.env.META_APP_ID ?? '',
    redirect_uri: uriRedirectionInstagram(),
    response_type: 'code',
    scope: SCOPES_INSTAGRAM,
    state: etat,
  });
  return `https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth?${p}`;
}

type ReponseGraph = Record<string, unknown> & { error?: { message?: string; type?: string; code?: number } };

async function appelerGraph(chemin: string, params: Record<string, string>): Promise<ReponseGraph> {
  const url = `${GRAPH_URL}${chemin}?${new URLSearchParams(params)}`;
  const rep = await fetch(url);
  return (await rep.json()) as ReponseGraph;
}

/** Échange le code d'autorisation contre un jeton court (~1 h). */
async function echangerCode(code: string): Promise<string> {
  const j = await appelerGraph('/oauth/access_token', {
    client_id: process.env.META_APP_ID ?? '',
    client_secret: process.env.META_APP_SECRET ?? '',
    redirect_uri: uriRedirectionInstagram(),
    code,
  });
  const jetonCourt = j.access_token as string | undefined;
  if (!jetonCourt) throw new Error(j.error?.message ?? 'Autorisation Instagram refusée.');
  return jetonCourt;
}

/** Échange un jeton court (ou un jeton longue durée à prolonger) contre un jeton longue durée (~60 j). */
async function versLongueDuree(jeton: string): Promise<{ jeton: string; expiresIn: number }> {
  const j = await appelerGraph('/oauth/access_token', {
    grant_type: 'fb_exchange_token',
    client_id: process.env.META_APP_ID ?? '',
    client_secret: process.env.META_APP_SECRET ?? '',
    fb_exchange_token: jeton,
  });
  const jetonLong = j.access_token as string | undefined;
  if (!jetonLong) throw new Error(j.error?.message ?? 'Prolongation du jeton Instagram refusée.');
  return { jeton: jetonLong, expiresIn: (j.expires_in as number | undefined) ?? 60 * 24 * 3600 };
}

/**
 * Résout la Page Facebook et le compte Instagram Business qui lui est lié, à
 * partir du jeton. `/me/accounts` liste les Pages gérées par la personne qui
 * s'est authentifiée ; on prend la première qui porte un compte Instagram
 * Business rattaché — un foyer n'en gère qu'une.
 */
async function resoudreCompteInstagram(
  jeton: string,
): Promise<{ pageId: string; igUserId: string; nomCompte: string }> {
  const pages = await appelerGraph('/me/accounts', { access_token: jeton, fields: 'id,name,instagram_business_account' });
  const liste = (pages.data as { id: string; name: string; instagram_business_account?: { id: string } }[]) ?? [];
  const page = liste.find((p) => p.instagram_business_account);
  if (!page?.instagram_business_account) {
    throw new Error(
      'Aucune Page Facebook avec un compte Instagram professionnel rattaché n’a été trouvée sur ce compte.',
    );
  }
  const igUserId = page.instagram_business_account.id;
  const compte = await appelerGraph(`/${igUserId}`, { access_token: jeton, fields: 'username' });
  return { pageId: page.id, igUserId, nomCompte: (compte.username as string | undefined) ?? '' };
}

/** Échange le code, prolonge le jeton, résout le compte, puis enregistre le tout. */
export async function enregistrerAutorisationInstagram(foyerId: string, code: string): Promise<void> {
  const jetonCourt = await echangerCode(code);
  const { jeton, expiresIn } = await versLongueDuree(jetonCourt);
  const { pageId, igUserId, nomCompte } = await resoudreCompteInstagram(jeton);

  const valeurs = {
    accessTokenChiffre: chiffrer(jeton),
    expireLe: new Date(Date.now() + expiresIn * 1000),
    pageId,
    igUserId,
    nomCompte,
  };

  await db()
    .insert(comptesInstagram)
    .values({ foyerId, ...valeurs })
    .onConflictDoUpdate({ target: comptesInstagram.foyerId, set: valeurs });
}

type CompteInstagramActif = { accessToken: string; igUserId: string; nomCompte: string };

/**
 * Jeton d'accès valide pour ce foyer (prolongé s'il approche l'expiration), ou
 * `null` si le foyer n'a pas connecté Instagram / si l'autorisation a expiré.
 *
 * ⚠ PROLONGE À L'AVANCE (marge de 5 jours), PAS APRÈS EXPIRATION. Contrairement
 * à un refresh_token Google (valable indéfiniment jusqu'à révocation), un
 * jeton longue durée Meta expiré ne peut plus être prolongé du tout — il faut
 * reconnecter depuis zéro. Attendre l'expiration pour agir serait donc trop
 * tard ; on renouvelle par anticipation, bien avant l'échéance.
 */
export async function jetonInstagram(foyerId: string): Promise<CompteInstagramActif | null> {
  const [c] = await db().select().from(comptesInstagram).where(eq(comptesInstagram.foyerId, foyerId)).limit(1);
  if (!c) return null;

  const jetonActuel = dechiffrer(c.accessTokenChiffre);
  if (!jetonActuel) return null;

  const marge = 5 * 24 * 3600 * 1000; // 5 jours
  const approcheExpiration = !c.expireLe || c.expireLe.getTime() < Date.now() + marge;
  if (!approcheExpiration) return { accessToken: jetonActuel, igUserId: c.igUserId, nomCompte: c.nomCompte };

  try {
    const { jeton, expiresIn } = await versLongueDuree(jetonActuel);
    await db()
      .update(comptesInstagram)
      .set({ accessTokenChiffre: chiffrer(jeton), expireLe: new Date(Date.now() + expiresIn * 1000) })
      .where(eq(comptesInstagram.foyerId, foyerId));
    return { accessToken: jeton, igUserId: c.igUserId, nomCompte: c.nomCompte };
  } catch {
    // Jeton déjà expiré ou révoqué chez Meta : on garde la ligne (le nom du
    // compte reste affichable) mais on ne peut plus appeler l'API tant que la
    // personne n'a pas reconnecté — même prudence que `jetonAgenda` (Google).
    return c.expireLe && c.expireLe.getTime() > Date.now() ? { accessToken: jetonActuel, igUserId: c.igUserId, nomCompte: c.nomCompte } : null;
  }
}

/** Ce foyer a-t-il un compte Instagram connecté (même si le jeton doit être renouvelé) ? */
export async function instagramConnecte(foyerId: string): Promise<{ nomCompte: string } | null> {
  const [c] = await db()
    .select({ nomCompte: comptesInstagram.nomCompte, accessTokenChiffre: comptesInstagram.accessTokenChiffre })
    .from(comptesInstagram)
    .where(eq(comptesInstagram.foyerId, foyerId))
    .limit(1);
  if (!c || !dechiffrer(c.accessTokenChiffre)) return null;
  return { nomCompte: c.nomCompte };
}

/** Retire l'autorisation Instagram du foyer. Ne révoque pas côté Meta : l'API
 *  de révocation Meta exige des droits supplémentaires (`user_id` Facebook)
 *  hors du périmètre demandé ; supprimer notre copie suffit à couper l'usage
 *  par Nestync — la personne révoque depuis ses paramètres Facebook si besoin. */
export async function deconnecterInstagram(foyerId: string): Promise<void> {
  await db().delete(comptesInstagram).where(eq(comptesInstagram.foyerId, foyerId));
}
