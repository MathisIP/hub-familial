'use client';

import PanneauPartage, { type MembrePartage } from '@/components/PanneauPartage';
import { useT } from '@/components/I18nProvider';
import { definirPartageDossierAction } from '@/app/documents/actions';
import type { DossierPartage } from '@/lib/documents/service';

/**
 * Réglage de la visibilité des dossiers — réservé au propriétaire du foyer.
 *
 * Même panneau que les comptes bancaires : deux écrans différents pour la même
 * notion obligeraient à réapprendre à chaque module. N'affiche aucun fichier,
 * seulement des noms de dossiers.
 *
 * La boîte d'arrivée n'y figure pas : elle reste commune par construction (le
 * service l'exclut), sinon un fichier déposé sans dossier disparaîtrait pour
 * celui qui vient de l'envoyer.
 */
export default function PartageDossiers({
  dossiers,
  membres,
}: {
  dossiers: DossierPartage[];
  membres: MembrePartage[];
}) {
  const tr = useT();
  return (
    <PanneauPartage
      titre={tr('DOSS_PART_TITRE')}
      sous={tr('DOSS_PART_SOUS')}
      aide={tr('DOSS_PART_AIDE')}
      vide={tr('DOSS_PART_AUCUN')}
      elements={dossiers}
      membres={membres}
      action={definirPartageDossierAction}
    />
  );
}
