import 'server-only';
import { google } from 'googleapis';
import path from 'node:path';

/**
 * Authentification Google par compte de service, portable local ↔ hébergement.
 *
 * Ordre de priorité :
 *   1. `GOOGLE_CREDENTIALS_B64`  — le JSON de la clé encodé en base64 (RECOMMANDÉ
 *      pour l'hébergement : aucun souci de guillemets ni de sauts de ligne).
 *   2. `GOOGLE_CREDENTIALS_JSON` — le JSON de la clé, collé tel quel.
 *   3. Fichier `credentials.json` (ou `GOOGLE_CREDENTIALS_PATH`) — usage LOCAL.
 *
 * C'est le SEUL endroit qui construit l'auth Google (Sheets, Calendar y passent).
 */
export function googleAuth(scopes: string[]): InstanceType<typeof google.auth.GoogleAuth> {
  const credentials = lireCredentials();
  if (credentials) {
    return new google.auth.GoogleAuth({ credentials, scopes });
  }
  const keyFile = process.env.GOOGLE_CREDENTIALS_PATH ?? path.join(process.cwd(), 'credentials.json');
  return new google.auth.GoogleAuth({ keyFile, scopes });
}

/** Lit les identifiants depuis les variables d'env (base64 ou JSON), ou null. */
function lireCredentials(): Record<string, unknown> | null {
  const b64 = process.env.GOOGLE_CREDENTIALS_B64?.trim();
  const json = process.env.GOOGLE_CREDENTIALS_JSON?.trim();

  let brut: string;
  if (b64) {
    try {
      brut = Buffer.from(b64, 'base64').toString('utf8');
    } catch {
      throw new Error('GOOGLE_CREDENTIALS_B64 illisible (base64 invalide).');
    }
  } else if (json) {
    brut = json;
  } else {
    return null;
  }

  let creds: Record<string, unknown>;
  try {
    creds = JSON.parse(brut);
  } catch {
    throw new Error('Identifiants Google illisibles (JSON invalide).');
  }

  // Défensif : rétablir les vrais sauts de ligne dans la clé privée si l'hébergeur
  // les a échappés (« \\n » au lieu de retours à la ligne).
  if (typeof creds.private_key === 'string') {
    creds.private_key = creds.private_key.replace(/\\n/g, '\n');
  }
  return creds;
}
