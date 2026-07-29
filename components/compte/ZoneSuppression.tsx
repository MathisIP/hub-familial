'use client';

import { useState } from 'react';
import { supprimerCompte } from '@/app/actions';
import { useT } from '@/components/I18nProvider';

/**
 * Zone « supprimer mon compte » : le bouton d'effacement (action serveur) n'est
 * actif qu'après avoir coché la case de confirmation — garde-fou contre un clic
 * accidentel sur une action irréversible.
 */
export default function ZoneSuppression() {
  const tr = useT();
  const [confirme, setConfirme] = useState(false);

  return (
    <form action={supprimerCompte} className="suppr-form">
      <label className="suppr-check">
        <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
        <span>{tr('CPT_CHECK')}</span>
      </label>
      <button type="submit" className="bouton bouton-danger" disabled={!confirme}>
        {tr('CPT_SUPPR_BTN')}
      </button>
    </form>
  );
}
