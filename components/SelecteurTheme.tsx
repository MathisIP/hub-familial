'use client';

import { useEffect, useState } from 'react';
import { THEMES, THEME_ORDRE, THEME_DEFAUT, type IdTheme } from '@/lib/themes';
import { t } from '@/lib/i18n';

/**
 * Sélecteur des 9 coloris — équivalent app du menu « 🎨 Thème » des Sheets.
 * Le choix est mémorisé dans localStorage et relu par le script inline du
 * layout au chargement suivant.
 */
export default function SelecteurTheme() {
  const [theme, setTheme] = useState<IdTheme>(THEME_DEFAUT);

  // Le serveur ignore le thème mémorisé : on se resynchronise après montage.
  useEffect(() => {
    const memorise = document.documentElement.getAttribute('data-theme');
    if (memorise && memorise in THEMES) setTheme(memorise as IdTheme);
  }, []);

  function changer(id: IdTheme) {
    setTheme(id);
    document.documentElement.setAttribute('data-theme', id);
    try {
      localStorage.setItem('hub-theme', id);
    } catch {
      // Navigation privée / stockage bloqué : le thème reste actif pour la session.
    }
  }

  return (
    <div className="selecteur">
      <label htmlFor="theme">{t('THEME')}</label>
      <select
        id="theme"
        value={theme}
        onChange={(e) => changer(e.target.value as IdTheme)}
      >
        {THEME_ORDRE.map((id) => (
          <option key={id} value={id}>
            {THEMES[id].NOM}
          </option>
        ))}
      </select>
    </div>
  );
}
