import type { Metadata } from 'next';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/**
 * Page de repli affichée par le service worker quand une page non encore mise en
 * cache est demandée sans réseau. Publique (hors authentification), servable hors
 * ligne (mise en cache par le SW).
 */
export const metadata: Metadata = { title: 'Hors ligne — Nestync' };

export default async function HorsLigne() {
  const langue = await langueCourante();
  return (
    <div className="connexion">
      <div className="connexion-carte">
        <div className="connexion-logo">📴</div>
        <h1>{t('HL_TITRE', langue)}</h1>
        <p>{t('HL_TXT', langue)}</p>
        {/* Rechargement complet volontaire (retente le réseau), pas de nav client. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="bouton connexion-bouton" href="/">{t('HL_REESSAYER', langue)}</a>
      </div>
    </div>
  );
}
