import { erreurDeReponse } from '@/lib/api-client';
import { reduireImage } from '@/lib/documents/image';
import { TAILLE_REQUETE_MAX, formatTaille } from '@/lib/documents/schema';

/**
 * ENVOI DE FICHIERS DEPUIS LE NAVIGATEUR.
 * =======================================
 * Partagé par les deux points d'entrée (l'onglet Documents et la section
 * d'accueil), qui faisaient la même chose de deux façons légèrement différentes.
 *
 * ⚠ UN FICHIER = UNE REQUÊTE. L'ancien code empilait tous les fichiers dans un
 * seul `FormData`, ce qui **additionnait leurs tailles** face au plafond de la
 * plateforme : trois photos de 2 Mo, chacune parfaitement acceptable, formaient
 * une requête de 6 Mo rejetée en bloc. Séparées, elles passent — et si l'une
 * échoue, les autres arrivent quand même. Un envoi partiellement réussi vaut
 * mieux qu'un rejet global, surtout sur une connexion mobile.
 */

export type ResultatEnvoi = {
  /** Nombre de fichiers effectivement enregistrés. */
  ajoutes: number;
  /** Images réduites avant l'envoi — à annoncer, la perte est réelle. */
  reduites: { nom: string; avant: number; apres: number }[];
  /** Un message par fichier en échec, nommant le fichier concerné. */
  erreurs: string[];
};

export async function envoyerFichiers(
  fichiers: File[],
  dossier?: string,
): Promise<ResultatEnvoi> {
  const res: ResultatEnvoi = { ajoutes: 0, reduites: [], erreurs: [] };

  for (const brut of fichiers) {
    // Les photos de téléphone dépassent le plafond ; on les réduit plutôt que
    // de renvoyer la personne à sa galerie pour qu'elle s'en charge.
    const f = await reduireImage(brut, TAILLE_REQUETE_MAX);
    if (f !== brut) {
      res.reduites.push({ nom: brut.name, avant: brut.size, apres: f.size });
    }

    // ⚠ Contrôle AVANT l'envoi : sans lui, on téléverse plusieurs mégaoctets sur
    // le réseau mobile pour se faire refuser à l'arrivée, sans explication.
    if (f.size > TAILLE_REQUETE_MAX) {
      res.erreurs.push(
        `« ${brut.name} » (${formatTaille(f.size)}) dépasse la limite d’envoi de ${formatTaille(TAILLE_REQUETE_MAX)}.`,
      );
      continue;
    }

    try {
      const form = new FormData();
      form.append('fichiers', f);
      if (dossier) form.append('dossier', dossier);
      const r = await fetch('/api/documents', { method: 'POST', body: form });
      if (!r.ok) {
        res.erreurs.push(`« ${brut.name} » : ${await erreurDeReponse(r, 'Envoi refusé.')}`);
        continue;
      }
      res.ajoutes++;
    } catch (e) {
      // Coupure réseau, onglet fermé pendant l'envoi…
      res.erreurs.push(`« ${brut.name} » : ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  return res;
}

/** Phrase résumant une réduction, à afficher telle quelle. */
export function resumeReductions(reduites: ResultatEnvoi['reduites']): string | null {
  if (reduites.length === 0) return null;
  if (reduites.length === 1) {
    const r = reduites[0];
    return `Image réduite pour l’envoi : ${formatTaille(r.avant)} → ${formatTaille(r.apres)}.`;
  }
  return `${reduites.length} images réduites pour l’envoi.`;
}
