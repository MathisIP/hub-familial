'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/I18nProvider';
import { LANGUES_DISPO } from '@/lib/i18n';

/**
 * Réglages personnels : « nom affiché » (localStorage, propre à l'appareil) et
 * LANGUE (cookie `hub-langue`, lisible côté serveur → toute l'app se rend dans la
 * bonne langue après `router.refresh()`). Le thème/mode se règlent ailleurs.
 */
export default function ReglagesForm({ nomCompte }: { nomCompte: string }) {
  const t = useT();
  const router = useRouter();
  const [nom, setNom] = useState('');
  const [langue, setLangue] = useState('fr');
  const [enregistre, setEnregistre] = useState(false);

  useEffect(() => {
    try {
      setNom(localStorage.getItem('hub-nom') ?? '');
    } catch {
      // stockage indisponible
    }
    const m = document.cookie.match(/(?:^|;\s*)hub-langue=([^;]+)/);
    if (m) setLangue(decodeURIComponent(m[1]));
  }, []);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    try {
      const v = nom.trim();
      if (v) localStorage.setItem('hub-nom', v);
      else localStorage.removeItem('hub-nom');
    } catch {
      // stockage indisponible
    }
    // Langue en cookie (1 an) → le serveur la relit et re-rend la bonne langue.
    document.cookie = `hub-langue=${langue}; path=/; max-age=31536000; samesite=lax`;
    setEnregistre(true);
    setTimeout(() => setEnregistre(false), 2200);
    router.refresh();
  }

  const prenomCompte = nomCompte.trim().split(/\s+/)[0] || '';

  return (
    <form className="reglage-form" onSubmit={soumettre}>
      <label className="reglage-champ">
        <span className="reglage-lbl">{t('REG_NOM_LBL')}</span>
        <input
          className="champ"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          placeholder={prenomCompte || 'Ton prénom'}
          aria-label={t('REG_NOM_LBL')}
        />
        <span className="reglage-aide">
          {t('REG_NOM_AIDE')}
          {prenomCompte ? ` (« ${prenomCompte} »).` : '.'}
        </span>
      </label>

      <label className="reglage-champ">
        <span className="reglage-lbl">{t('REG_LANGUE_LBL')}</span>
        <select
          className="champ"
          value={langue}
          onChange={(e) => setLangue(e.target.value)}
          aria-label={t('REG_LANGUE_LBL')}
        >
          {LANGUES_DISPO.map((l) => (
            <option key={l.code} value={l.code}>{l.nom}</option>
          ))}
        </select>
        <span className="reglage-aide">{t('REG_LANGUE_AIDE')}</span>
      </label>

      <div className="reglage-actions">
        <button className="bouton bouton-primaire" type="submit">{t('REG_ENREGISTRER')}</button>
        {enregistre && <span className="reglage-ok">{t('REG_ENREGISTRE')}</span>}
      </div>
    </form>
  );
}
