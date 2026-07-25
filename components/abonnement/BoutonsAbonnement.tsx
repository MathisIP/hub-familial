'use client';

import { useState } from 'react';
import type { EtatAbonnement } from '@/lib/abonnement';

/**
 * Boutons d'abonnement : lance le paiement (Checkout Stripe) ou ouvre le portail
 * de facturation. Redirige vers l'URL Stripe renvoyée par l'API.
 */
export default function BoutonsAbonnement({ etat }: { etat: EtatAbonnement }) {
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function aller(url: string) {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch(url, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? 'Action refusée.');
      window.location.href = data.url;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setOccupe(false);
    }
  }

  if (!etat.gereParStripe) {
    return <p className="compte-note">La facturation n’est pas activée sur cette instance.</p>;
  }

  return (
    <div className="abo-actions">
      {etat.statut !== 'actif' && (
        <button className="bouton bouton-primaire" onClick={() => aller('/api/abonnement/checkout')} disabled={occupe}>
          {occupe ? 'Redirection…' : "S’abonner"}
        </button>
      )}
      {etat.aDejaPaye && (
        <button className="bouton" onClick={() => aller('/api/abonnement/portail')} disabled={occupe}>
          Gérer mon abonnement
        </button>
      )}
      {erreur && <p className="message erreur">{erreur}</p>}
    </div>
  );
}
