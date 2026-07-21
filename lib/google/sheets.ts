import 'server-only';
import { google, type sheets_v4 } from 'googleapis';
import { googleAuth } from '@/lib/google/auth';
import { idClasseur, type ClasseurId } from '@/lib/config';
import { nomOnglet, plage, type ClesOnglet, type IdLangue } from '@/lib/i18n';

/**
 * ACCÈS GOOGLE SHEETS — SERVEUR UNIQUEMENT.
 * =========================================
 * `import 'server-only'` fait échouer la COMPILATION si un composant client
 * importe ce fichier. C'est la garantie que `credentials.json` ne peut pas
 * partir dans le bundle envoyé au navigateur — la raison même du choix d'un
 * back-end plutôt que d'appels API côté client.
 *
 * Authentification : compte de service (phase privée). Pour le multi-foyer,
 * c'est `clientSheets()` qui changera — en construisant un client à partir du
 * jeton OAuth de l'utilisateur connecté. Le reste du fichier restera valable.
 */

let cache: sheets_v4.Sheets | null = null;

export function clientSheets(): sheets_v4.Sheets {
  if (cache) return cache;
  const auth = googleAuth(['https://www.googleapis.com/auth/spreadsheets']);
  cache = google.sheets({ version: 'v4', auth });
  return cache;
}

/** Une ligne brute telle que renvoyée par l'API. */
export type LigneBrute = unknown[];

/**
 * Lit une plage en désignant l'onglet par sa CLÉ CANONIQUE, jamais par son nom.
 * Le nom réel est résolu via le registre i18n, donc un changement de langue
 * dans les Sheets ne casse rien ici.
 *
 * Renvoie toujours un tableau : l'API OMET `values` quand la plage est vide
 * (elle ne renvoie pas un tableau vide), piège classique côté appelant.
 */
export async function lirePlage<M extends ClasseurId>(
  classeur: M,
  onglet: ClesOnglet<M>,
  a1: string,
  langue?: IdLangue,
): Promise<LigneBrute[]> {
  const sheets = clientSheets();
  const nom = nomOnglet(classeur, onglet, langue);
  const reponse = await sheets.spreadsheets.values.get({
    spreadsheetId: idClasseur(classeur),
    range: plage(nom, a1),
  });
  return reponse.data.values ?? [];
}

/**
 * Lit plusieurs plages d'un même classeur en UN seul aller-retour (batchGet).
 * Évite d'enchaîner des `await` en série — le défaut de vitesse pointé dans
 * les règles d'architecture. Les plages sont des A1 complètes (onglet inclus),
 * construites par l'appelant via `plage()` : la résolution i18n reste dans le
 * module métier, qui seul connaît ses onglets.
 * Renvoie un tableau par plage demandée, toujours `[]` si la plage est vide.
 */
export async function lireBatch(
  classeur: ClasseurId,
  plagesA1: string[],
): Promise<LigneBrute[][]> {
  const sheets = clientSheets();
  const reponse = await sheets.spreadsheets.values.batchGet({
    spreadsheetId: idClasseur(classeur),
    ranges: plagesA1,
  });
  return (reponse.data.valueRanges ?? []).map((v) => v.values ?? []);
}

/**
 * Lit une plage en valeurs BRUTES (non formatées) : les nombres reviennent en
 * `number`, pas en chaîne. Nécessaire pour les cellules moteur au format masqué
 * (`;;;`), qu'une lecture formatée renverrait vides (ex. Budget B3/B4).
 */
export async function lireBrut(classeur: ClasseurId, plageA1: string): Promise<LigneBrute[]> {
  const sheets = clientSheets();
  const reponse = await sheets.spreadsheets.values.get({
    spreadsheetId: idClasseur(classeur),
    range: plageA1,
    valueRenderOption: 'UNFORMATTED_VALUE',
  });
  return reponse.data.values ?? [];
}

/** Écrit des valeurs dans une plage précise (update ciblé). */
export async function ecrirePlage(
  classeur: ClasseurId,
  plageA1: string,
  valeurs: unknown[][],
): Promise<void> {
  const sheets = clientSheets();
  await sheets.spreadsheets.values.update({
    spreadsheetId: idClasseur(classeur),
    range: plageA1,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valeurs },
  });
}

/** Ajoute des lignes à la fin des données d'un onglet (append). */
export async function ajouterLignes(
  classeur: ClasseurId,
  plageA1: string,
  valeurs: unknown[][],
): Promise<void> {
  const sheets = clientSheets();
  await sheets.spreadsheets.values.append({
    spreadsheetId: idClasseur(classeur),
    range: plageA1,
    valueInputOption: 'USER_ENTERED',
    insertDataOption: 'INSERT_ROWS',
    requestBody: { values: valeurs },
  });
}

/** Efface le contenu d'une plage (garde la mise en forme, ex. cases à cocher). */
export async function viderPlage(classeur: ClasseurId, plageA1: string): Promise<void> {
  const sheets = clientSheets();
  await sheets.spreadsheets.values.clear({
    spreadsheetId: idClasseur(classeur),
    range: plageA1,
  });
}

/** Titre du classeur + noms d'onglets réellement présents. Sert au diagnostic. */
export async function inspecterClasseur(classeur: ClasseurId): Promise<{
  titre: string;
  onglets: string[];
}> {
  const sheets = clientSheets();
  const reponse = await sheets.spreadsheets.get({
    spreadsheetId: idClasseur(classeur),
    fields: 'properties.title,sheets.properties.title',
  });
  return {
    titre: reponse.data.properties?.title ?? '(sans titre)',
    onglets: (reponse.data.sheets ?? []).map((f) => f.properties?.title ?? '?'),
  };
}
