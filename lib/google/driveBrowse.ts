import 'server-only';
import { google } from 'googleapis';

/**
 * NAVIGATION dans le Drive « Hub Familial » — lecture au nom de l'UTILISATEUR
 * (jeton OAuth Drive obtenu à la connexion), comme l'import. Le compte de service
 * ne peut pas lire un Drive personnel : on réutilise donc le jeton de la session.
 *
 * Pas d'écriture ici (l'import reste dans driveImport.ts). On liste un dossier et
 * on renvoie ses sous-dossiers + fichiers, avec un lien d'ouverture (webViewLink).
 */

/** ID du dossier racine « Hub Familial » (DRIVE_HUB_ID ou URL DRIVE_HUB_URL). */
export function idDossierHub(): string | null {
  const direct = process.env.DRIVE_HUB_ID?.trim();
  if (direct) return direct;
  const url = process.env.DRIVE_HUB_URL ?? '';
  const m = url.match(/\/folders\/([^/?#]+)/);
  return m ? m[1] : null;
}

const MIME_DOSSIER = 'application/vnd.google-apps.folder';

export type ElementDrive = {
  id: string;
  nom: string;
  estDossier: boolean;
  mimeType: string;
  /** Lien d'ouverture Google (éditeur/aperçu). Null si indisponible. */
  lien: string | null;
  modifie: string;
};

export type ContenuDossier = {
  dossier: { id: string; nom: string };
  elements: ElementDrive[];
};

/** Erreur « dossier Hub non configuré » — mappée en aide côté API. */
export class HubNonConfigure extends Error {
  constructor() {
    super('Dossier Drive « Hub Familial » non configuré (DRIVE_HUB_URL absent).');
    this.name = 'HubNonConfigure';
  }
}

/**
 * Liste le contenu d'un dossier (dossiers puis fichiers, triés par nom). Si
 * `dossierId` est absent, on part de la racine « Hub Familial ».
 */
export async function listerDossier(
  accessToken: string,
  dossierId?: string,
): Promise<ContenuDossier> {
  const id = dossierId?.trim() || idDossierHub();
  if (!id) throw new HubNonConfigure();

  const oauth = new google.auth.OAuth2();
  oauth.setCredentials({ access_token: accessToken });
  const drive = google.drive({ version: 'v3', auth: oauth });

  const commun = { supportsAllDrives: true, includeItemsFromAllDrives: true } as const;

  // Nom du dossier courant (pour le fil d'Ariane), + contenu.
  const [meta, rep] = await Promise.all([
    drive.files.get({ fileId: id, fields: 'id, name', ...commun }),
    drive.files.list({
      q: `'${id}' in parents and trashed = false`,
      fields: 'files(id, name, mimeType, webViewLink, modifiedTime)',
      orderBy: 'folder, name_natural',
      pageSize: 200,
      ...commun,
    }),
  ]);

  const elements: ElementDrive[] = (rep.data.files ?? []).map((f) => ({
    id: f.id ?? '',
    nom: f.name ?? '(sans nom)',
    estDossier: f.mimeType === MIME_DOSSIER,
    mimeType: f.mimeType ?? '',
    lien: f.webViewLink ?? null,
    modifie: f.modifiedTime ?? '',
  }));

  return {
    dossier: { id: meta.data.id ?? id, nom: meta.data.name ?? 'Hub Familial' },
    elements,
  };
}
