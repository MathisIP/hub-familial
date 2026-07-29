'use client';

import { useEffect, useState } from 'react';

/**
 * Réglages personnels stockés localement (localStorage), propres à cet appareil :
 * le « nom affiché » dans la salutation d'accueil et la langue de l'interface.
 * Le thème et le mode clair/sombre se règlent dans le pied de page / la roue crantée.
 */
const LANGUES: [string, string][] = [
  ['fr', 'Français'],
  ['en', 'English'],
  ['es', 'Español'],
  ['de', 'Deutsch'],
  ['it', 'Italiano'],
];

export default function ReglagesForm({ nomCompte }: { nomCompte: string }) {
  const [nom, setNom] = useState('');
  const [langue, setLangue] = useState('fr');
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    try {
      setNom(localStorage.getItem('hub-nom') ?? '');
      setLangue(localStorage.getItem('hub-langue') || 'fr');
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
      localStorage.setItem('hub-langue', langue);
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

      <label className="reglage-champ">
        <span className="reglage-lbl">Langue de l’application</span>
        <select
          className="champ"
          value={langue}
          onChange={(e) => setLangue(e.target.value)}
          aria-label="Langue"
        >
          {LANGUES.map(([code, nom]) => (
            <option key={code} value={code}>{nom}</option>
          ))}
        </select>
        <span className="reglage-aide">
          Le français est complet ; les autres langues sont en cours de traduction et
          s’appliqueront progressivement.
        </span>
      </label>

      <div className="reglage-actions">
        <button className="bouton bouton-primaire" type="submit">Enregistrer</button>
        {enregistre && <span className="reglage-ok">Enregistré ✓</span>}
      </div>
    </form>
  );
}
