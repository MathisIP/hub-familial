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
  /** Dossiers existants, dérivés des documents (alimente le datalist). */
  dossiers: string[];
};

export type ChampsDocument = {
  nom?: string;
  dossier?: string;
};

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

/** Regroupe les documents par dossier ; les sans-dossier arrivent en dernier. */
export function grouperParDossier(
  documents: Document[],
): { dossier: string; documents: Document[] }[] {
  const map = new Map<string, Document[]>();
  for (const d of documents) {
    const cle = normaliserDossier(d.dossier);
    const liste = map.get(cle);
    if (liste) liste.push(d);
    else map.set(cle, [d]);
  }
  return [...map.entries()]
    .sort(([a], [b]) => {
      if (a === '') return 1; // « sans dossier » en dernier
      if (b === '') return -1;
      return a.localeCompare(b, 'fr');
    })
    .map(([dossier, docs]) => ({ dossier, documents: docs }));
}

/** Taille maximale acceptée par fichier (garde-fou coût + temps de téléversement). */
export const TAILLE_MAX = 25 * 1024 * 1024; // 25 Mo
