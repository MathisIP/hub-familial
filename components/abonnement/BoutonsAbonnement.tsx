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
  // Demande d'exécution immédiate : jamais pré-cochée — un consentement
  // pré-coché n'en est pas un, et la loi l'exige « exprès ».
  // ⚠ Le nom `renonce` est historique : l'abonné ne renonce PAS à sa
  // rétractation, il garde quatorze jours avec remboursement intégral
  // (article 8 des CGV, réécrit le 26/08/2026).
  const [renonce, setRenonce] = useState(false);

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

  const peutAcheter = etat.statut !== 'actif';

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

      {peutAcheter && (
        <>
          {/* Informations dues AVANT la commande : reconduction, tarif, sortie.
              Les afficher après le paiement n'aurait aucune valeur. */}
          <div className="abo-avant">
            <h3 className="abo-avant-titre">{tr('ABO_AVANT_TITRE')}</h3>
            <ul className="abo-avant-liste">
              <li>{tr('ABO_AVANT_RENOUV')}</li>
              <li>{tr('ABO_AVANT_RESIL')}</li>
              <li>{tr('ABO_AVANT_TVA')}</li>
            </ul>
            <label className="abo-renonc">
              <input
                type="checkbox"
                checked={renonce}
                onChange={(e) => {
                  setRenonce(e.target.checked);
                  setErreur(null);
                }}
              />
              <span>{tr('ABO_RENONCIATION')}</span>
            </label>
            <p className="abo-cgv">
              {tr('ABO_CGV_A')}{' '}
              <a href="/conditions" target="_blank" rel="noreferrer">
                {tr('ABO_CGV_LIEN')}
              </a>
              .
            </p>
          </div>

          {/* Une formule = un prix Stripe distinct. On propose les deux, comme la vitrine. */}
          {OFFRES.map((o) => (
            <button
              key={o.id}
              className={`bouton ${o.id === 'annuel' ? 'bouton-primaire' : ''}`}
              onClick={() => {
                // Message explicite plutôt qu'un bouton grisé sans raison : on
                // dit CE QUI manque au lieu de laisser deviner.
                if (!renonce) return setErreur(tr('ABO_RENONCIATION_REQUISE'));
                aller('/api/abonnement/checkout', { formule: o.id, renonciation: true });
              }}
              disabled={occupe}
            >
              {occupe
                ? tr('ABO_REDIRECTION')
                : `${tr('ABO_SABONNER')} — ${o.nom} ${formatPrix(o.prix)}${o.economie ? ` (${o.economie})` : ''}`}
            </button>
          ))}
        </>
      )}

      {/* Résiliation en trois clics : « Abonnement » → ce bouton → confirmer.
          Distinct du portail de facturation, où il faudrait encore la chercher. */}
      {etat.statut === 'actif' && !etat.annulationProgrammee && (
        <button
          className="bouton"
          onClick={() => aller('/api/abonnement/resiliation')}
          disabled={occupe}
        >
          {tr('ABO_RESILIER')}
        </button>
      )}

      {etat.aDejaPaye && (
        <button className="bouton" onClick={() => aller('/api/abonnement/portail')} disabled={occupe}>
          {tr('ABO_GERER_FACT')}
        </button>
      )}
      {erreur && <p className="message erreur">{erreur}</p>}
    </div>
  );
}
