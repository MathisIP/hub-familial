'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';
import type { EtatAbonnement } from '@/lib/abonnement';

/**
 * Boutons d'abonnement : lance le paiement (Checkout Stripe) ou ouvre le portail
 * de facturation. Redirige vers l'URL Stripe renvoyée par l'API.
 */
export default function BoutonsAbonnement({ etat }: { etat: EtatAbonnement }) {
  const tr = useT();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function aller(url: string) {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch(url, { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? tr('G_ERR_ACTION'));
      window.location.href = data.url;
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setOccupe(false);
    }
  }

  if (!etat.gereParStripe) {
    return <p className="compte-note">{tr('ABO_NON_ACTIVE')}</p>;
  }

  return (
    <div className="abo-actions">
      {etat.statut !== 'actif' && (
        <button className="bouton bouton-primaire" onClick={() => aller('/api/abonnement/checkout')} disabled={occupe}>
          {occupe ? tr('ABO_REDIRECTION') : tr('ABO_SABONNER')}
        </button>
      )}
      {etat.aDejaPaye && (
        <button className="bouton" onClick={() => aller('/api/abonnement/portail')} disabled={occupe}>
          {tr('ABO_GERER')}
        </button>
      )}
      {erreur && <p className="message erreur">{erreur}</p>}
    </div>
  );
}
