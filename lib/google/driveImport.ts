import 'server-only';
import { google } from 'googleapis';
import { Readable } from 'node:stream';

/**
 * Téléversement dans le Drive de l'UTILISATEUR (via son jeton OAuth), et non par
 * le compte de service — qui ne peut rien déposer dans un Drive personnel.
 * Le jeton vient de la session Auth.js (scope `drive`). Les fichiers atterrissent
 * dans le dossier « À classer ».
 */

/** Extrait l'ID du dossier depuis DRIVE_A_CLASSER_ID ou l'URL DRIVE_A_CLASSER_URL. */
export function idDossierAClasser(): string | null {
  const direct = process.env.DRIVE_A_CLASSER_ID?.trim();
  if (direct) return direct;
  const url = process.env.DRIVE_A_CLASSER_URL ?? '';
  const m = url.match(/\/folders\/([^/?#]+)/);
  return m ? m[1] : null;
}

export type FichierAImporter = { nom: string; type: string; donnees: Buffer };
export type ResultatImport = { nom: string; ok: boolean; id?: string; erreur?: string };

/** Téléverse une liste de fichiers dans « À classer » avec le jeton fourni. */
export async function importerDansDrive(
  accessToken: string,
  fichiers: FichierAImporter[],
): Promise<ResultatImport[]> {
  const dossier = idDossierAClasser();
  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth });

  const resultats: ResultatImport[] = [];
  for (const f of fichiers) {
    try {
      const rep = await drive.files.create({
        requestBody: {
          name: f.nom,
          parents: dossier ? [dossier] : undefined,
        },
        media: {
          mimeType: f.type || 'application/octet-stream',
          body: Readable.from(f.donnees),
        },
        fields: 'id',
        supportsAllDrives: true,
      });
      resultats.push({ nom: f.nom, ok: true, id: rep.data.id ?? undefined });
    } catch (e) {
      const msg = (e as { message?: string }).message ?? 'échec';
      resultats.push({ nom: f.nom, ok: false, erreur: msg.split('\n')[0] });
    }
  }
  return resultats;
}
