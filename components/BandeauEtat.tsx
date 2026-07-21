'use client';

import { useEffect, useState } from 'react';
import { t } from '@/lib/i18n';

type Classeur = {
  cle: string;
  ok: boolean;
  titre?: string;
  onglets?: string[];
  erreur?: string;
};

type Etat =
  | { phase: 'charge' }
  | { phase: 'configKO'; message: string }
  | { phase: 'ok'; classeurs: Classeur[] }
  | { phase: 'erreur'; message: string };

/**
 * Bandeau « État de la connexion ». Interroge /api/etat au montage : c'est le
 * test bout-en-bout demandé (§7 étape 4) — il prouve que la chaîne
 * navigateur → route serveur → API Google fonctionne, sans exposer de secret.
 */
export default function BandeauEtat() {
  const [etat, setEtat] = useState<Etat>({ phase: 'charge' });

  useEffect(() => {
    let vivant = true;
    fetch('/api/etat')
      .then((r) => r.json())
      .then((d) => {
        if (!vivant) return;
        if (!d.configOk) setEtat({ phase: 'configKO', message: d.message });
        else setEtat({ phase: 'ok', classeurs: d.classeurs });
      })
      .catch((e) => vivant && setEtat({ phase: 'erreur', message: String(e) }));
    return () => {
      vivant = false;
    };
  }, []);

  return (
    <section className="etat" aria-live="polite">
      <h2>{t('ETAT_CONNEXION')}</h2>
      {etat.phase === 'charge' && (
        <ul>
          <li>
            <span className="pastille attente">{t('ETAT_VERIF')}</span>
          </li>
        </ul>
      )}
      {etat.phase === 'configKO' && (
        <ul>
          <li>
            <span className="pastille echec">{t('ETAT_ECHEC')}</span>
            <span className="onglets">{etat.message}</span>
          </li>
        </ul>
      )}
      {etat.phase === 'erreur' && (
        <ul>
          <li>
            <span className="pastille echec">{t('ETAT_ECHEC')}</span>
            <span className="onglets">{etat.message}</span>
          </li>
        </ul>
      )}
      {etat.phase === 'ok' && (
        <ul>
          {etat.classeurs.map((c) => (
            <li key={c.cle}>
              <span className="nom">{c.titre ?? c.cle}</span>
              <span className={`pastille ${c.ok ? 'ok' : 'echec'}`}>
                {c.ok ? t('ETAT_OK') : t('ETAT_ECHEC')}
              </span>
              <span className="onglets">
                {c.ok ? c.onglets?.join(' · ') : c.erreur}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
