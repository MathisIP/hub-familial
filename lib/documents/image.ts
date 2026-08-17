/**
 * RÉDUCTION D'IMAGE AVANT ENVOI (navigateur uniquement).
 * =====================================================
 * Une photo prise au téléphone pèse couramment 3 à 8 Mo — au-delà du plafond de
 * corps de requête de la plateforme (`TAILLE_REQUETE_MAX`). Sans cette étape,
 * « ajouter la photo d'une ordonnance depuis mon téléphone » échoue purement et
 * simplement, alors que c'est l'usage le plus naturel du module sur mobile.
 *
 * ⚠ POURQUOI RÉDUIRE PLUTÔT QUE REFUSER. L'alternative — contourner la limite
 * par un envoi direct vers le stockage objet — ferait arriver le fichier chez
 * l'hébergeur **en clair**, le chiffrement se faisant côté serveur. On préfère
 * une photo un peu moins définie qu'un carnet de santé lisible par OVH.
 *
 * ⚠ C'EST UNE TRANSFORMATION AVEC PERTE, donc jamais silencieuse : l'appelant
 * annonce la réduction, et elle n'intervient QUE si le fichier dépasse le
 * plafond. En dessous, l'original part intact — on ne dégrade pas une image qui
 * serait passée telle quelle.
 *
 * Les fichiers non-images (PDF, texte) ne sont jamais touchés : recompresser un
 * PDF n'a pas de sens, et il n'y a pas de version « moins définie » d'un contrat.
 */

/** Côté le plus long après réduction. 2000 px reste lisible pour un document photographié. */
const COTE_MAX = 2000;
/** Qualités JPEG tentées successivement, de la meilleure à la plus économe. */
const QUALITES = [0.85, 0.7, 0.55];

/**
 * Décode le fichier. `createImageBitmap` est le chemin rapide ; le repli par
 * `<img>` couvre les navigateurs plus anciens.
 *
 * `imageOrientation: 'from-image'` n'est pas cosmétique : une photo d'iPhone
 * porte son orientation en EXIF, et l'ignorer produirait un document couché sur
 * le côté — le genre de détail qui fait conclure que la fonctionnalité est ratée.
 */
async function decoder(f: File): Promise<{ source: CanvasImageSource; l: number; h: number }> {
  try {
    const bmp = await createImageBitmap(f, { imageOrientation: 'from-image' });
    return { source: bmp, l: bmp.width, h: bmp.height };
  } catch {
    const url = URL.createObjectURL(f);
    try {
      const img = await new Promise<HTMLImageElement>((ok, ko) => {
        const el = new Image();
        el.onload = () => ok(el);
        el.onerror = () => ko(new Error('image illisible'));
        el.src = url;
      });
      return { source: img, l: img.naturalWidth, h: img.naturalHeight };
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

/** Remplace l'extension par `.jpg` : le contenu est réencodé en JPEG. */
function nomJpeg(nom: string): string {
  const point = nom.lastIndexOf('.');
  return (point > 0 ? nom.slice(0, point) : nom) + '.jpg';
}

/**
 * Réduit une image jusqu'à passer sous `plafond`. Renvoie le fichier d'origine
 * si ce n'est pas une image, s'il est déjà assez léger, ou si quoi que ce soit
 * échoue.
 *
 * ⚠ Le repli sur l'original en cas d'échec est délibéré : un défaut de la
 * réduction ne doit pas empêcher un envoi qui aurait pu aboutir. L'erreur de
 * taille, elle, sera signalée proprement par l'appelant.
 */
export async function reduireImage(f: File, plafond: number): Promise<File> {
  if (!f.type.startsWith('image/') || f.size <= plafond) return f;

  try {
    const { source, l, h } = await decoder(f);
    let cote = COTE_MAX;

    // Trois passes au plus : on réduit la définition, puis la qualité.
    for (let passe = 0; passe < 3; passe++) {
      const echelle = Math.min(1, cote / Math.max(l, h));
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(l * echelle));
      canvas.height = Math.max(1, Math.round(h * echelle));
      const ctx = canvas.getContext('2d');
      if (!ctx) return f;
      // Fond blanc : un PNG transparent réencodé en JPEG deviendrait noir.
      ctx.fillStyle = '#fff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(source, 0, 0, canvas.width, canvas.height);

      for (const q of QUALITES) {
        const blob = await new Promise<Blob | null>((ok) =>
          canvas.toBlob(ok, 'image/jpeg', q),
        );
        if (blob && blob.size <= plafond) {
          return new File([blob], nomJpeg(f.name), {
            type: 'image/jpeg',
            lastModified: f.lastModified,
          });
        }
      }
      cote = Math.round(cote * 0.6); // encore trop lourd : on réduit la taille
    }
    return f; // trois passes sans succès : l'appelant signalera la taille
  } catch {
    return f;
  }
}
