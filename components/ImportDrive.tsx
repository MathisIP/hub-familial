'use client';

import { useState } from 'react';

/**
 * Bouton « Importer dans Drive » → ouvre le dossier « À classer » dans Google
 * Drive (nouvel onglet), où l'on dépose ses documents via l'interface Drive.
 *
 * Pourquoi ne pas téléverser directement depuis l'app ? Le compte de service
 * n'a pas de quota de stockage dans un Drive personnel : il ne peut pas y créer
 * de fichier. Un vrai téléversement in-app demanderait une connexion OAuth de
 * l'utilisateur (chantier séparé). En attendant, ce bouton mène au bon dossier.
 *
 * L'URL du dossier vient de `DRIVE_A_CLASSER_URL` (.env), passée par la page.
 */
export default function ImportDrive({ url }: { url?: string }) {
  const [afficheAide, setAfficheAide] = useState(false);

  if (!url) {
    return (
      <div className="import-drive">
        <button className="bouton bouton-action" onClick={() => setAfficheAide((v) => !v)}>
          📁 Importer dans Drive
        </button>
        {afficheAide && (
          <p className="import-aide">
            À configurer : ajoute l’URL du dossier « À classer » de ton Drive dans le fichier
            <code> .env </code> sous <code>DRIVE_A_CLASSER_URL=…</code>, puis relance l’app.
          </p>
        )}
      </div>
    );
  }

  return (
    <a className="bouton bouton-action" href={url} target="_blank" rel="noopener noreferrer">
      📁 Importer dans Drive
    </a>
  );
}
