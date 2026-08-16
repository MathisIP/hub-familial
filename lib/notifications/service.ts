import 'server-only';
import webpush from 'web-push';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  abonnementsPush as tAbos,
  preferencesNotif as tPrefs,
  membres as tMembres,
  utilisateurs as tUtilisateurs,
} from '@/lib/db/schema';
import { contexteAcces } from '@/lib/visibilite';
import { ErreurValidation } from '@/lib/erreurs';

/**
 * NOTIFICATIONS PUSH (serveur uniquement).
 * =======================================
 * Remplace l'envoi de la liste de courses « par SMS » : cette solution
 * fonctionnait pour deux numéros connus, pas pour des clients.
 *
 * ⚠ CE QUI S'AFFICHE EST VISIBLE SUR UN ÉCRAN VERROUILLÉ, donc par quiconque
 * tient le téléphone. Pour un produit qui se vend sur la confidentialité, les
 * textes restent **délibérément pauvres** : « La liste de courses est prête »,
 * jamais son contenu ; « Une échéance arrive demain », jamais le montant. Le
 * détail est derrière le clic, dans l'app, après authentification.
 *
 * ⚠ ET ELLES RESPECTENT LES MÊMES RÈGLES DE VISIBILITÉ QUE L'AFFICHAGE. Une
 * notification est un canal de plus vers les données : prévenir Noé qu'un cadeau
 * l'attend ruinerait la surprise que le module protège par ailleurs, et annoncer
 * un prélèvement sur un compte restreint contournerait la restriction. Chaque
 * envoi part donc d'une liste de destinataires déjà filtrée par l'appelant.
 */

export type ChargeNotif = {
  titre: string;
  corps: string;
  /** Chemin ouvert au clic. Toujours interne à l'app. */
  url: string;
  /** Regroupe les notifications de même nature : la nouvelle remplace l'ancienne. */
  tag?: string;
};

export type CategorieNotif = 'courses' | 'evenements' | 'echeances';

/** Les clés VAPID sont-elles configurées ? Sans elles, aucun envoi n'est possible. */
export function pushDisponible(): boolean {
  return !!(process.env.VAPID_PUBLIC_KEY && process.env.VAPID_PRIVATE_KEY);
}

export function clePubliqueVapid(): string {
  return process.env.VAPID_PUBLIC_KEY ?? '';
}

let vapidPret = false;
function preparerVapid(): void {
  if (vapidPret) return;
  // `mailto:` est ce que le standard attend comme contact du service : c'est
  // l'adresse que le fournisseur de push utilise s'il doit signaler un problème.
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || 'mailto:contact@nestync.app',
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  vapidPret = true;
}

/* ------------------------------- Abonnements ------------------------------ */

export async function abonner(input: {
  endpoint: string;
  p256dh: string;
  auth: string;
  appareil?: string;
}): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const endpoint = (input.endpoint ?? '').trim();
  if (!endpoint || !input.p256dh || !input.auth) {
    throw new ErreurValidation('Abonnement incomplet.');
  }
  await db()
    .insert(tAbos)
    .values({
      foyerId,
      utilisateurId,
      endpoint,
      p256dh: input.p256dh,
      auth: input.auth,
      appareil: (input.appareil ?? '').slice(0, 80),
    })
    // Le navigateur peut renouveler un abonnement sans prévenir : on rattache
    // alors l'endpoint à la personne courante plutôt que d'échouer.
    .onConflictDoUpdate({
      target: tAbos.endpoint,
      set: { foyerId, utilisateurId, p256dh: input.p256dh, auth: input.auth },
    });
}

export async function desabonner(endpoint: string): Promise<void> {
  const { utilisateurId } = await contexteAcces();
  await db()
    .delete(tAbos)
    .where(and(eq(tAbos.utilisateurId, utilisateurId), eq(tAbos.endpoint, endpoint)));
}

/* ------------------------------- Préférences ------------------------------ */

export type Preferences = { courses: boolean; evenements: boolean; echeances: boolean };

const DEFAUTS: Preferences = { courses: true, evenements: true, echeances: false };

export async function chargerPreferences(): Promise<Preferences & { abonne: boolean }> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const d = db();
  const [[pref], abos] = await Promise.all([
    d
      .select()
      .from(tPrefs)
      .where(and(eq(tPrefs.foyerId, foyerId), eq(tPrefs.utilisateurId, utilisateurId)))
      .limit(1),
    d.select({ id: tAbos.id }).from(tAbos).where(eq(tAbos.utilisateurId, utilisateurId)),
  ]);
  return {
    courses: pref?.courses ?? DEFAUTS.courses,
    evenements: pref?.evenements ?? DEFAUTS.evenements,
    echeances: pref?.echeances ?? DEFAUTS.echeances,
    abonne: abos.length > 0,
  };
}

export async function definirPreferences(p: Partial<Preferences>): Promise<void> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const actuel = await chargerPreferences();
  const suite = {
    courses: p.courses ?? actuel.courses,
    evenements: p.evenements ?? actuel.evenements,
    echeances: p.echeances ?? actuel.echeances,
  };
  await db()
    .insert(tPrefs)
    .values({ foyerId, utilisateurId, ...suite })
    .onConflictDoUpdate({
      target: [tPrefs.foyerId, tPrefs.utilisateurId],
      set: suite,
    });
}

/* --------------------------------- Envoi --------------------------------- */

/**
 * Envoie à une liste de personnes déjà filtrée par l'appelant.
 *
 * ⚠ La catégorie n'est pas décorative : elle décide qui reçoit réellement, en
 * croisant les préférences. Un appelant qui l'oublierait enverrait une
 * notification financière à quelqu'un qui ne les a jamais activées.
 *
 * Renvoie le nombre d'appareils touchés. N'échoue jamais : une notification qui
 * ne part pas ne doit pas faire échouer l'action qui l'a déclenchée (valider une
 * liste de courses reste valide même si le téléphone d'un membre est injoignable).
 */
export async function envoyer(
  utilisateurIds: string[],
  categorie: CategorieNotif,
  charge: ChargeNotif,
): Promise<number> {
  if (!pushDisponible() || utilisateurIds.length === 0) return 0;
  const d = db();

  const prefs = await d
    .select()
    .from(tPrefs)
    .where(inArray(tPrefs.utilisateurId, utilisateurIds));
  const parUtilisateur = new Map(prefs.map((p) => [p.utilisateurId, p]));

  const retenus = utilisateurIds.filter((u) => {
    const p = parUtilisateur.get(u);
    // Sans ligne de préférences, on applique les défauts : `echeances` est donc
    // à false, et le silence vaut refus pour ce qui est sensible.
    return p ? p[categorie] : DEFAUTS[categorie];
  });
  if (retenus.length === 0) return 0;

  const abos = await d.select().from(tAbos).where(inArray(tAbos.utilisateurId, retenus));
  if (abos.length === 0) return 0;

  preparerVapid();
  const corps = JSON.stringify(charge);
  let envoyes = 0;
  const perimes: string[] = [];

  await Promise.all(
    abos.map(async (a) => {
      try {
        await webpush.sendNotification(
          { endpoint: a.endpoint, keys: { p256dh: a.p256dh, auth: a.auth } },
          corps,
        );
        envoyes++;
      } catch (e) {
        // 404/410 = l'abonnement n'existe plus côté navigateur (app désinstallée,
        // permission retirée). On le retire, sinon la table se remplit
        // indéfiniment d'appareils morts qu'on retente à chaque envoi.
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) perimes.push(a.endpoint);
        else console.error('[push] envoi échoué', code, (e as Error).message);
      }
    }),
  );

  if (perimes.length > 0) {
    await d.delete(tAbos).where(inArray(tAbos.endpoint, perimes));
  }
  return envoyes;
}

/** Membres du foyer, pour choisir les destinataires d'un envoi. */
export async function membresDuFoyer(): Promise<{ utilisateurId: string; nom: string }[]> {
  const { foyerId } = await contexteAcces();
  const lignes = await db()
    .select({
      utilisateurId: tMembres.utilisateurId,
      nom: tUtilisateurs.nom,
      email: tUtilisateurs.email,
    })
    .from(tMembres)
    .innerJoin(tUtilisateurs, eq(tUtilisateurs.id, tMembres.utilisateurId))
    .where(eq(tMembres.foyerId, foyerId));
  return lignes
    .map((m) => ({ utilisateurId: m.utilisateurId, nom: m.nom || m.email }))
    .sort((a, b) => a.nom.localeCompare(b.nom, 'fr'));
}
