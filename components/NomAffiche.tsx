'use client';

import { useEffect, useState } from 'react';

/**
 * Prénom affiché dans la salutation d'accueil. Par défaut = prénom du compte
 * Google (rendu côté serveur), mais l'utilisateur peut le remplacer dans les
 * Réglages (stocké dans localStorage « hub-nom »). Réglage local à l'appareil.
 */
export default function NomAffiche({ defaut }: { defaut: string }) {
  const [nom, setNom] = useState(defaut);

  useEffect(() => {
    try {
      const perso = localStorage.getItem('hub-nom');
      if (perso && perso.trim()) setNom(perso.trim());
    } catch {
      // stockage indisponible : on garde le prénom du compte.
    }
  }, []);

  return <em>{nom}</em>;
}
