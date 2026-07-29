'use client';

import { useEffect, useState } from 'react';

/**
 * Réglages personnels stockés localement (localStorage), propres à cet appareil :
 * pour l'instant le « nom affiché » dans la salutation d'accueil. Le thème et le
 * mode clair/sombre se règlent dans le pied de page.
 */
export default function ReglagesForm({ nomCompte }: { nomCompte: string }) {
  const [nom, setNom] = useState('');
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    try {
      setNom(localStorage.getItem('hub-nom') ?? '');
    } catch {
      // stockage indisponible
    }
  }, []);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    try {
      const v = nom.trim();
      if (v) localStorage.setItem('hub-nom', v);
      else localStorage.removeItem('hub-nom');
      setEnregistre(true);
      setTimeout(() => setEnregistre(false), 2200);
    } catch {
      // stockage indisponible
    }
  }

  const prenomCompte = nomCompte.trim().split(/\s+/)[0] || '';

  return (
    <form className="reglage-form" onSubmit={soumettre}>
      <label className="reglage-champ">
        <span className="reglage-lbl">Nom affiché à l’accueil</span>
        <input
          className="champ"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder={prenomCompte || 'Ton prénom'}
          aria-label="Nom affiché"
        />
        <span className="reglage-aide">
          Laisse vide pour utiliser le prénom de ton compte
          {prenomCompte ? ` (« ${prenomCompte} »)` : ''}.
        </span>
      </label>
      <div className="reglage-actions">
        <button className="bouton bouton-primaire" type="submit">Enregistrer</button>
        {enregistre && <span className="reglage-ok">Enregistré ✓</span>}
      </div>
    </form>
  );
}
