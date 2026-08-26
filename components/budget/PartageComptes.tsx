'use client';

import PanneauPartage, { type MembrePartage } from '@/components/PanneauPartage';
import { useT } from '@/components/I18nProvider';
import { definirPartageAction } from '@/app/foyer/budget/actions';
import type { ComptePartage } from '@/lib/budget/service';

export type { MembrePartage };

/**
 * Réglage de la visibilité des comptes — réservé au propriétaire du foyer.
 *
 * Simple adaptateur sur [components/PanneauPartage.tsx] : le module Documents
 * utilise le même panneau. La règle importante est portée par le composant
 * générique — cet écran ne montre AUCUN montant, régler un partage n'est pas
 * le droit de lire.
 */
export default function PartageComptes({
  comptes,
  membres,
}: {
  comptes: ComptePartage[];
  membres: MembrePartage[];
}) {
  const tr = useT();
  return (
    <PanneauPartage
      titre={tr('PART_TITRE')}
      sous={tr('PART_SOUS')}
      aide={tr('PART_AIDE')}
      vide={tr('PART_AUCUN')}
      elements={comptes}
      membres={membres}
      action={definirPartageAction}
    />
  );
}
