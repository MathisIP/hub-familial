'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { deconnexion } from '@/app/actions';
import { Icones, IcMenu, IcFermer, IcReglages, IcDeconnexion, type NomIcone } from '@/components/IconesNav';
import { t } from '@/lib/i18n';

type CleUI = Parameters<typeof t>[0];
type Item = { href: string; icone: NomIcone; label?: string; cle?: CleUI };

const NAV: Item[] = [
  { href: '/', icone: 'home', label: 'Accueil' },
  { href: '/budget', icone: 'budget', cle: 'MOD_BUDGET' },
  { href: '/todo', icone: 'todo', cle: 'MOD_TODO' },
  { href: '/repas', icone: 'repas', cle: 'MOD_REPAS' },
  { href: '/evenements', icone: 'evenements', cle: 'MOD_EVENEMENTS' },
  { href: '/cadeaux', icone: 'cadeaux', cle: 'MOD_CADEAUX' },
  { href: '/agenda', icone: 'agenda', cle: 'MOD_AGENDA' },
];

/** Onglet actif : exact pour l'accueil, préfixe pour les modules. */
function estActif(path: string | null, href: string): boolean {
  if (!path) return false;
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

function libelle(item: Item): string {
  return item.cle ? t(item.cle) : item.label ?? '';
}

/**
 * Navigation principale :
 *  - grand écran : RAIL permanent à droite (icônes visibles) qui se DÉPLIE au
 *    survol pour montrer les libellés ;
 *  - mobile : bouton dans la barre du haut ouvrant un TIROIR qui glisse à droite.
 * Les icônes minimalistes suivent la teinte du thème (actif = accent).
 */
export default function SideBar() {
  const [ouvert, setOuvert] = useState(false);
  const path = usePathname();

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    document.addEventListener('keydown', surTouche);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = '';
    };
  }, [ouvert]);

  const lienNav = (item: Item, classe: string, onClick?: () => void) => {
    const Ic = Icones[item.icone];
    const actif = estActif(path, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`${classe}${actif ? ' actif' : ''}`}
        aria-current={actif ? 'page' : undefined}
        onClick={onClick}
      >
        <span className="sb-ic"><Ic /></span>
        <span className="sb-lbl">{libelle(item)}</span>
      </Link>
    );
  };

  return (
    <>
      {/* Bouton mobile (masqué sur grand écran) */}
      <button
        className="sb-toggle"
        onClick={() => setOuvert(true)}
        aria-label="Ouvrir le menu"
        aria-expanded={ouvert}
        aria-haspopup="menu"
      >
        <IcMenu width={20} height={20} />
      </button>

      {/* Rail permanent (grand écran) */}
      <aside className="sb-rail" aria-label="Navigation principale">
        <Link href="/" className="sb-rail-marque" aria-label="Accueil">
          <img src="/icon-192.png" alt="" width={30} height={30} />
          <b className="sb-lbl">{t('APP_TITRE').replace(/^🏡\s*/, '')}</b>
        </Link>
        <nav className="sb-rail-nav">
          {NAV.map((item) => lienNav(item, 'sb-rail-item'))}
        </nav>
        <div className="sb-rail-bas">
          <Link
            href="/parametres"
            className={`sb-rail-item${estActif(path, '/parametres') ? ' actif' : ''}`}
          >
            <span className="sb-ic"><IcReglages /></span>
            <span className="sb-lbl">Réglages</span>
          </Link>
          <form action={deconnexion}>
            <button type="submit" className="sb-rail-item sb-deco">
              <span className="sb-ic"><IcDeconnexion /></span>
              <span className="sb-lbl">Se déconnecter</span>
            </button>
          </form>
        </div>
      </aside>

      {/* Tiroir mobile */}
      {ouvert && (
        <div className="sb-overlay" onClick={() => setOuvert(false)}>
          <aside
            className="sb-panel"
            role="menu"
            aria-label="Menu principal"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sb-tete">
              <span className="sb-marque">
                <img src="/icon-192.png" alt="" width={28} height={28} />
                <b>{t('APP_TITRE').replace(/^🏡\s*/, '')}</b>
              </span>
              <button className="sb-fermer" onClick={() => setOuvert(false)} aria-label="Fermer">
                <IcFermer width={18} height={18} />
              </button>
            </div>

            <nav className="sb-nav">
              {NAV.map((item) => lienNav(item, 'sb-item', () => setOuvert(false)))}
            </nav>

            <div className="sb-bas">
              <Link
                href="/parametres"
                className={`sb-item${estActif(path, '/parametres') ? ' actif' : ''}`}
                role="menuitem"
                onClick={() => setOuvert(false)}
              >
                <span className="sb-ic"><IcReglages /></span>
                <span className="sb-lbl">Réglages</span>
              </Link>
              <form action={deconnexion}>
                <button type="submit" className="sb-item sb-deco">
                  <span className="sb-ic"><IcDeconnexion /></span>
                  <span className="sb-lbl">Se déconnecter</span>
                </button>
              </form>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
