'use client';

import { useEffect, useState } from 'react';
import {
  THEMES,
  THEME_DEFAUT,
  FAMILLES,
  familleDeTheme,
  themeDeFamille,
  estSombre,
  type IdTheme,
  type IdFamille,
} from '@/lib/themes';
import { IcSoleil, IcLune } from '@/components/IconesNav';
import { useT } from '@/components/I18nProvider';
import { CLE_FAMILLE } from '@/lib/i18n';

/**
 * Réglages d'apparence du pied de page : une pastille par COULEUR (famille) +
 * une bascule ☀/🌙 pour le mode clair/sombre. Les deux partagent le même état
 * (le thème appliqué = couleur × mode), mémorisé dans localStorage et relu par
 * le script inline du layout au chargement suivant.
 */
export default function ReglagesApparence({ modeVisible = true }: { modeVisible?: boolean }) {
  const tr = useT();
  const [theme, setTheme] = useState<IdTheme>(THEME_DEFAUT);

  // Le serveur ignore le thème mémorisé : on se resynchronise après montage.
  useEffect(() => {
    const memorise = document.documentElement.getAttribute('data-theme');
    if (memorise && memorise in THEMES) setTheme(memorise as IdTheme);
  }, []);

  const famille = familleDeTheme(theme);
  const sombre = estSombre(theme);

  function appliquer(id: IdTheme) {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    try {
      localStorage.setItem('hub-theme', id);
    } catch {
      // Navigation privée / stockage bloqué : le thème reste actif pour la session.
    }
  }

  const choisirCouleur = (id: IdFamille) => appliquer(themeDeFamille(id, sombre));
  const basculerMode = () => appliquer(themeDeFamille(famille.id, !sombre));

  return (
    <div className="apparence">
      <div className="apparence-couleurs" role="radiogroup" aria-label={tr('A_COULEUR')}>
        {FAMILLES.map((f) => {
          const actif = f.id === famille.id;
          const nom = CLE_FAMILLE[f.id] ? tr(CLE_FAMILLE[f.id]) : f.nom;
          return (
            <button
              key={f.id}
              type="button"
              className={`swatch${actif ? ' actif' : ''}`}
              role="radio"
              aria-checked={actif}
              aria-label={nom}
              title={nom}
              onClick={() => choisirCouleur(f.id)}
              style={{ background: THEMES[f.clair].ACC }}
            />
          );
        })}
      </div>

      {modeVisible && (
        <button
          type="button"
          className="pied-ic"
          onClick={basculerMode}
          aria-pressed={sombre}
          aria-label={sombre ? tr('A_MODE_CLAIR') : tr('A_MODE_SOMBRE')}
          title={sombre ? tr('A_MODE_CLAIR') : tr('A_MODE_SOMBRE')}
        >
          {sombre ? <IcSoleil width={16} height={16} /> : <IcLune width={16} height={16} />}
        </button>
      )}
    </div>
  );
}
