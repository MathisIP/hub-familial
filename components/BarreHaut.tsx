'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { estPublique } from '@/components/PiedDePage';
import { t } from '@/lib/i18n';

/**
 * Barre supérieure globale : marque cliquable (retour à l'accueil). La navigation
 * (rail desktop / bandeau bas mobile) est rendue à part au niveau racine du layout
 * (SideBar), pour que ses éléments `position: fixed` se calent sur le viewport.
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
      </div>
    </header>
  );
}
