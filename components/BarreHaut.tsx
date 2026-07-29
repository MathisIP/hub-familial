'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import SideBar from '@/components/SideBar';
import { estPublique } from '@/components/PiedDePage';
import { t } from '@/lib/i18n';

/**
 * Barre supérieure globale (collante) présente sur toutes les pages
 * authentifiées : marque cliquable (retour à l'accueil) + menu principal.
 * Remplace les anciens en-têtes par page et le lien « ← retour ».
 */
export default function BarreHaut() {
  const path = usePathname();
  if (estPublique(path)) return null;

  return (
    <header className="barre-haut">
      <div className="barre-inner">
        <Link href="/" className="barre-marque" aria-label="Accueil">
          <img src="/icon-192.png" alt="" width={32} height={32} className="brand-logo" />
          <span className="brand-nom">{t('APP_TITRE').replace(/^🏡\s*/, '')}</span>
        </Link>
        <SideBar />
      </div>
    </header>
  );
}
