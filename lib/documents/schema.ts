/**
 * MODULE DOCUMENTS — types et helpers PURS (importables côté client).
 * ==================================================================
 * Aucun accès base ni stockage ici : uniquement la forme des données et les
 * petites fonctions d'affichage (icône, taille lisible, regroupement).
 */

export type Document = {
  id: string;
  nom: string;
  dossier: string;
  type: string;
  taille: number;
  creeLe: string; // ISO
};

export type DonneesDocuments = {
  documents: Document[];
  /**
   * Les dossiers du foyer **que cette personne peut voir**, y compris les
   * dossiers VIDES. Ceux qui lui sont masqués n'y figurent pas du tout.
   */
  dossiers: string[];
  /**
   * Parmi eux, ceux à visibilité restreinte : sert uniquement à afficher un
   * cadenas. Un dossier qu'on ne voit pas n'apparaît nulle part.
   */
  dossiersRestreints: string[];
};

export type ChampsDocument = {
  nom?: string;
  dossier?: string;
};

/**
 * Dossier d'arrivée par défaut : tout fichier ajouté sans préciser de dossier
 * (notamment depuis l'accueil) atterrit ici. Sert aussi de repli d'affichage
 * pour les documents historiques sans dossier.
 */
export const DOSSIER_DEFAUT = 'Fichiers non classés';

/** Taille de fichier lisible (« 1,2 Mo »). */
export function formatTaille(octets: number): string {
  if (!octets || octets < 0) return '';
  if (octets < 1024) return `${octets} o`;
  const ko = octets / 1024;
  if (ko < 1024) return `${ko.toFixed(ko < 10 ? 1 : 0).replace('.', ',')} Ko`;
  const mo = ko / 1024;
  if (mo < 1024) return `${mo.toFixed(mo < 10 ? 1 : 0).replace('.', ',')} Mo`;
  return `${(mo / 1024).toFixed(1).replace('.', ',')} Go`;
}

/** Emoji selon le type MIME / l'extension (cohérent avec le reste de l'app). */
export function iconeDocument(doc: { nom: string; type: string }): string {
  const t = (doc.type || '').toLowerCase();
  const ext = doc.nom.toLowerCase().split('.').pop() ?? '';
  if (t.startsWith('image/')) return '🖼️';
  if (t.startsWith('video/')) return '🎬';
  if (t.startsWith('audio/')) return '🎵';
  if (t === 'application/pdf' || ext === 'pdf') return '📕';
  if (t.includes('spreadsheet') || t.includes('excel') || ['xlsx', 'xls', 'csv'].includes(ext)) return '📊';
  if (t.includes('presentation') || t.includes('powerpoint') || ['pptx', 'ppt'].includes(ext)) return '📽️';
  if (t.includes('word') || t.includes('document') || ['docx', 'doc', 'odt'].includes(ext)) return '📄';
  if (t.includes('zip') || t.includes('compressed') || ['zip', 'rar', '7z', 'tar', 'gz'].includes(ext)) return '🗜️';
  if (['txt', 'md', 'rtf'].includes(ext)) return '📝';
  return '📎';
}

/** Nom de dossier normalisé (évite « Papiers » et « papiers  » en double). */
export function normaliserDossier(v: string | undefined | null): string {
  return (v ?? '').trim();
}

/**
 * Regroupe les documents par dossier. `tousLesDossiers` permet d'afficher aussi
 * les dossiers VIDES (ils n'apparaissent dans aucun document). Le dossier
 * d'arrivée par défaut est toujours listé en dernier — c'est la « boîte de
 * réception », pas un rangement.
 */
export function grouperParDossier(
  documents: Document[],
  tousLesDossiers: string[] = [],
): { dossier: string; documents: Document[] }[] {
  const map = new Map<string, Document[]>();
  for (const nom of tousLesDossiers) map.set(normaliserDossier(nom) || DOSSIER_DEFAUT, []);
  for (const d of documents) {
    const cle = normaliserDossier(d.dossier) || DOSSIER_DEFAUT;
    const liste = map.get(cle);
    if (liste) liste.push(d);
    else map.set(cle, [d]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === DOSSIER_DEFAUT) return 1;
      if (b === DOSSIER_DEFAUT) return -1;
      return a.localeCompare(b, 'fr');
    })
    .map(([dossier, docs]) => ({ dossier, documents: docs }));
}

/** Filtre par nom de fichier (insensible à la casse et aux accents). */
export function chercherDocuments(documents: Document[], requete: string): Document[] {
  const q = sansAccents(requete.trim());
  if (!q) return [];
  return documents.filter((d) => sansAccents(d.nom).includes(q));
}

function sansAccents(v: string): string {
  return v.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
}

/** Taille maximale acceptée par fichier (garde-fou coût + temps de téléversement). */
export const TAILLE_MAX = 25 * 1024 * 1024; // 25 Mo

/**
 * ⚠ PLAFOND RÉEL DE L'ENVOI — bien plus bas que `TAILLE_MAX`, et c'est la
 * plateforme qui l'impose, pas nous.
 *
 * Une fonction Vercel refuse tout corps de requête au-delà de **4,5 Mo** : la
 * requête est rejetée par l'infrastructure, **notre code ne s'exécute jamais**.
 * `TAILLE_MAX` est donc inatteignable par cette route — son message « 25 Mo
 * maximum » ne peut pas s'afficher, puisqu'un fichier de 10 Mo n'arrive pas
 * jusqu'à lui. On garde la constante : elle exprime la politique de stockage, et
 * redeviendrait la limite effective si les fichiers montaient un jour
 * directement vers le stockage objet.
 *
 * ⚠ Pourquoi on ne prend PAS ce chemin direct (URL présignée vers OVH) alors
 * qu'il lèverait la limite : le fichier arriverait chez l'hébergeur **sans
 * passer par `chiffrerFichier()`**, donc en clair. Chiffrer dans le navigateur
 * supposerait de lui confier la clé. Le plafond de 4 Mo est le prix du « seule
 * l'application peut lire, l'hébergeur non ».
 *
 * 4 Mo et non 4,5 : l'enveloppe multipart (frontières, en-têtes, nom du fichier)
 * s'ajoute au fichier lui-même, et un envoi refusé au ras de la limite serait
 * incompréhensible.
 */
export const TAILLE_REQUETE_MAX = 4 * 1024 * 1024; // 4 Mo
