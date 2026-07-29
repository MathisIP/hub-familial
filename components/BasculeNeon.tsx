'use client';

import { useEffect, useState } from 'react';
import { useT } from '@/components/I18nProvider';
import { IcNeonEtincelle } from '@/components/IconesNav';

/**
 * Réglage « effet néon » (halos/lueurs). Écrit `data-neon` sur <html> + mémorise
 * dans localStorage (relu par le script inline du layout au chargement suivant).
 * Deux présentations : `icone` (pied de page desktop) ou `ligne` (Réglages mobile).
 */
export default function BasculeNeon({ variante = 'icone' }: { variante?: 'icone' | 'ligne' }) {
  const tr = useT();
  const [actif, setActif] = useState(true);

  useEffect(() => {
    setActif(document.documentElement.getAttribute('data-neon') !== 'off');
  }, []);

  function basculer(next: boolean) {
    setActif(next);
    document.documentElement.setAttribute('data-neon', next ? 'on' : 'off');
    try {
      localStorage.setItem('hub-neon', next ? 'on' : 'off');
    } catch {
      // stockage indisponible
    }
  }

  const label = actif ? tr('A_NEON_OFF') : tr('A_NEON_ON');

  if (variante === 'ligne') {
    return (
      <label className="neon-ligne">
        <input type="checkbox" checked={actif} onChange={(e) => basculer(e.target.checked)} />
        <span className="neon-ic" aria-hidden="true"><IcNeonEtincelle width={18} height={18} /></span>
        <span>{tr('NEON_LABEL')}</span>
      </label>
    );
  }

  return (
    <button
      type="button"
      className={`pied-ic bascule-neon${actif ? ' actif' : ''}`}
      onClick={() => basculer(!actif)}
      aria-pressed={actif}
      aria-label={label}
      title={label}
    >
      <IcNeonEtincelle width={17} height={17} />
    </button>
  );
}
