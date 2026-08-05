'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';
import { OFFRES, formatPrix } from '@/lib/offres';
import type { EtatAbonnement } from '@/lib/abonnement';

/**
 * Boutons d'abonnement : lance le paiement (Checkout Stripe) ou ouvre le portail
 * de facturation. Redirige vers l'URL Stripe renvoyée par l'API.
 */
export default function BoutonsAbonnement({ etat }: { etat: EtatAbonnement }) {
  const tr = useT();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function aller(url: string, corps?: unknown) {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch(url, {
        method: 'POST',
        headers: corps ? { 'Content-Type': 'application/json' } : undefined,
        body: corps ? JSON.stringify(corps) : undefined,
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? tr('G_ERR_ACTION'));
      // Checkout et portail renvoient une URL Stripe ; la réactivation, non :
      // on recharge alors la page pour afficher le nouvel état.
      if (data.url) window.location.href = data.url;
      else window.location.reload();
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
      {/* Résiliation programmée : on RÉACTIVE l'abonnement en cours plutôt que
          d'en vendre un nouveau — rien à repayer, échéance conservée. */}
      {etat.annulationProgrammee && (
        <button
          className="bouton bouton-primaire"
          onClick={() => aller('/api/abonnement/reactiver')}
          disabled={occupe}
        >
          {occupe ? tr('ABO_REDIRECTION') : tr('ABO_REABONNER')}
        </button>
      )}

      {/* Une formule = un prix Stripe distinct. On propose les deux, comme la vitrine. */}
      {etat.statut !== 'actif' &&
        OFFRES.map((o) => (
          <button
            key={o.id}
            className={`bouton ${o.id === 'annuel' ? 'bouton-primaire' : ''}`}
            onClick={() => aller('/api/abonnement/checkout', { formule: o.id })}
            disabled={occupe}
          >
            {occupe
              ? tr('ABO_REDIRECTION')
              : `${tr('ABO_SABONNER')} — ${o.nom} ${formatPrix(o.prix)}${o.economie ? ` (${o.economie})` : ''}`}
          </button>
        ))}
      {etat.aDejaPaye && (
        <button className="bouton" onClick={() => aller('/api/abonnement/portail')} disabled={occupe}>
          {tr('ABO_GERER')}
        </button>
      )}
      {erreur && <p className="message erreur">{erreur}</p>}
    </div>
  );
}
