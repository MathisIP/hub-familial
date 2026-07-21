import 'server-only';
import { google } from 'googleapis';
import path from 'node:path';

/**
 * Authentification Google par compte de service, portable local ↔ hébergement.
 *
 * - **Hébergé (Vercel…)** : `GOOGLE_CREDENTIALS_JSON` contient le JSON de la clé
 *   (le contenu de credentials.json, collé en variable d'environnement). Pas de
 *   fichier sur le serveur.
 * - **Local** : à défaut, le fichier `credentials.json` (ou `GOOGLE_CREDENTIALS_PATH`).
 *
 * C'est le SEUL endroit qui construit l'auth Google : les services (Sheets,
 * Calendar) passent par `googleAuth(scopes)`.
 */
export function googleAuth(scopes: string[]): InstanceType<typeof google.auth.GoogleAuth> {
  const json = process.env.GOOGLE_CREDENTIALS_JSON;
  if (json && json.trim() !== '') {
    let credentials: Record<string, unknown>;
    try {
      credentials = JSON.parse(json);
    } catch {
      throw new Error('GOOGLE_CREDENTIALS_JSON illisible (JSON invalide).');
    }
    return new google.auth.GoogleAuth({ credentials, scopes });
  }
  const keyFile = process.env.GOOGLE_CREDENTIALS_PATH ?? path.join(process.cwd(), 'credentials.json');
  return new google.auth.GoogleAuth({ keyFile, scopes });
}
