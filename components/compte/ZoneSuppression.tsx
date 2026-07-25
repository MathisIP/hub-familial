'use client';

import { useState } from 'react';
import { supprimerCompte } from '@/app/actions';

/**
 * Zone « supprimer mon compte » : le bouton d'effacement (action serveur) n'est
 * actif qu'après avoir coché la case de confirmation — garde-fou contre un clic
 * accidentel sur une action irréversible.
 */
export default function ZoneSuppression() {
  const [confirme, setConfirme] = useState(false);

  return (
    <form action={supprimerCompte} className="suppr-form">
      <label className="suppr-check">
        <input type="checkbox" checked={confirme} onChange={(e) => setConfirme(e.target.checked)} />
        <span>
          Je comprends que la suppression est <b>définitive</b> et efface toutes les données de mon
          foyer.
        </span>
      </label>
      <button type="submit" className="bouton bouton-danger" disabled={!confirme}>
        Supprimer définitivement mon compte
      </button>
    </form>
  );
}
