'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import SelecteurTheme from '@/components/SelecteurTheme';
import { deconnexion } from '@/app/actions';
import { t } from '@/lib/i18n';

const MODULES = [
  { href: '/budget', cle: 'MOD_BUDGET' },
  { href: '/todo', cle: 'MOD_TODO' },
  { href: '/repas', cle: 'MOD_REPAS' },
  { href: '/evenements', cle: 'MOD_EVENEMENTS' },
  { href: '/cadeaux', cle: 'MOD_CADEAUX' },
  { href: '/agenda', cle: 'MOD_AGENDA' },
] as const;

/**
 * Menu principal (coin haut-droite) : accès aux modules, choix du thème et
 * déconnexion. Prévu pour accueillir le choix de langue plus tard.
 */
export default function MenuPrincipal() {
  const [ouvert, setOuvert] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Ferme au clic extérieur et à Échap.
  useEffect(() => {
    if (!ouvert) return;
    const surClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert]);

  return (
    <div className="menu" ref={ref}>
      <button
        className="menu-btn"
        onClick={() => setOuvert((v) => !v)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
      >
        <span className="menu-lignes" aria-hidden="true"><span /><span /><span /></span>
        Menu
      </button>

      {ouvert && (
        <div className="menu-panel" role="menu">
          <p className="menu-titre">Modules</p>
          <div className="menu-modules">
            {MODULES.map((m) => (
              <Link key={m.href} href={m.href} className="menu-item" role="menuitem" onClick={() => setOuvert(false)}>
                {t(m.cle)}
              </Link>
            ))}
          </div>

          <div className="menu-sep" />
          <div className="menu-reglage">
            <span className="menu-reglage-lbl">Thème</span>
            <SelecteurTheme compact />
          </div>

          <div className="menu-sep" />
          <form action={deconnexion}>
            <button type="submit" className="menu-item menu-deco">Se déconnecter</button>
          </form>
        </div>
      )}
    </div>
  );
}
