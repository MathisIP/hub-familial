'use client';

import { useState } from 'react';
import { supprimerCompte } from '@/app/actions';
import { useT } from '@/components/I18nProvider';

/**
 * Zone « supprimer mon compte » : le bouton d'effacement (action serveur) n'est
 * actif qu'après avoir coché la case de confirmation — garde-fou contre un clic
 * accidentel sur une action irréversible.
 *
 * ⚠ La case n'annonce pas la même chose selon le rôle : le propriétaire efface
 * le foyer, un membre le quitte seulement. On ne fait pas cocher à quelqu'un
 * une conséquence qui ne se produira pas.
 */
export default function ZoneSuppression({
  proprietaire,
  partage = false,
}: {
  proprietaire: boolean;
  partage?: boolean;
}) {
  const tr = useT();
  const [confirme, setConfirme] = useState(false);

  return (
    <form action={supprimerCompte} className="suppr-form">
      <label className="suppr-check">
        <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
        <span>{tr(partage ? 'CPT_CHECK_PARTAGE' : proprietaire ? 'CPT_CHECK' : 'CPT_CHECK_MEMBRE')}</span>
      </label>
      <button type="submit" className="bouton bouton-danger" disabled={!confirme}>
        {tr('CPT_SUPPR_BTN')}
      </button>
    </form>
  );
}
