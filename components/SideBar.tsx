'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { deconnexion } from '@/app/actions';
import ReglagesApparence from '@/components/ReglagesApparence';
import { estPublique } from '@/components/PiedDePage';
import {
  Icones,
  IcMenu,
  IcReglages,
  IcDeconnexion,
  IcSoleil,
  IcLune,
  type NomIcone,
} from '@/components/IconesNav';
import {
  THEME_DEFAUT,
  familleDeTheme,
  themeDeFamille,
  estSombre,
  type IdTheme,
} from '@/lib/themes';
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

function estActif(path: string | null, href: string): boolean {
  if (!path) return false;
  return href === '/' ? path === '/' : path === href || path.startsWith(href + '/');
}

function libelle(item: Item): string {
  return item.cle ? t(item.cle) : item.label ?? '';
}

/**
 * Navigation principale :
 *  - grand écran : RAIL permanent à droite (icônes, se déplie au survol) ;
 *  - mobile : BANDEAU FIXE EN BAS (clair/sombre à gauche · bouton central =
 *    onglet courant, ouvre le menu des onglets · roue crantée à droite = réglages).
 * Les icônes minimalistes suivent la teinte du thème (actif = accent).
 */
export default function SideBar() {
  const path = usePathname();
  const [feuille, setFeuille] = useState<null | 'modules' | 'reglages'>(null);
  const [sombre, setSombre] = useState(false);

  // Mode courant (pour l'icône soleil/lune du bandeau).
  useEffect(() => {
    const id = (document.documentElement.getAttribute('data-theme') as IdTheme) || THEME_DEFAUT;
    setSombre(estSombre(id));
  }, []);

  // Ferme la feuille au changement de page.
  useEffect(() => {
    setFeuille(null);
  }, [path]);

  // Échap + verrou de défilement quand une feuille est ouverte.
  useEffect(() => {
    if (!feuille) return;
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setFeuille(null);
    document.addEventListener('keydown', surTouche);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = '';
    };
  }, [feuille]);

  function basculerMode() {
    const id = (document.documentElement.getAttribute('data-theme') as IdTheme) || THEME_DEFAUT;
    const suivant = themeDeFamille(familleDeTheme(id).id, !estSombre(id));
    document.documentElement.setAttribute('data-theme', suivant);
    try {
      localStorage.setItem('hub-theme', suivant);
    } catch {
      // stockage indisponible
    }
    setSombre(estSombre(suivant));
  }

  const lienRail = (item: Item) => {
    const Ic = Icones[item.icone];
    const actif = estActif(path, item.href);
    return (
      <Link
        key={item.href}
        href={item.href}
        className={`sb-rail-item${actif ? ' actif' : ''}`}
        aria-current={actif ? 'page' : undefined}
      >
        <span className="sb-ic"><Ic /></span>
        <span className="sb-lbl">{libelle(item)}</span>
      </Link>
    );
  };

  // Icône du bouton central : celle de l'onglet courant ; sur les pages de
  // réglages/compte, la roue crantée ; sinon l'icône « menu » par défaut.
  const itemActif = NAV.find((n) => estActif(path, n.href));
  const surReglages = ['/parametres', '/foyer', '/compte', '/abonnement', '/confidentialite'].some(
    (r) => estActif(path, r),
  );
  const IcCentral = itemActif ? Icones[itemActif.icone] : surReglages ? IcReglages : IcMenu;

  if (estPublique(path)) return null;

  return (
    <>
      {/* ---------- RAIL (grand écran) ---------- */}
      <aside className="sb-rail" aria-label="Navigation principale">
        <Link href="/" className="sb-rail-marque" aria-label="Accueil">
          <img src="/icon-192.png" alt="" width={24} height={24} />
          <b className="sb-lbl">{t('APP_TITRE').replace(/^🏡\s*/, '')}</b>
        </Link>
        <nav className="sb-rail-nav">{NAV.map(lienRail)}</nav>
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

      {/* ---------- BANDEAU FIXE (mobile) ---------- */}
      <nav className="barre-mobile" aria-label="Navigation">
        <button
          className="bm-ic"
          onClick={basculerMode}
          aria-label={sombre ? 'Passer en mode clair' : 'Passer en mode sombre'}
        >
          {sombre ? <IcSoleil width={22} height={22} /> : <IcLune width={22} height={22} />}
        </button>
        <button
          className="bm-central"
          onClick={() => setFeuille((f) => (f === 'modules' ? null : 'modules'))}
          aria-label="Choisir un onglet"
          aria-expanded={feuille === 'modules'}
        >
          <IcCentral width={26} height={26} />
        </button>
        <button
          className="bm-ic"
          onClick={() => setFeuille((f) => (f === 'reglages' ? null : 'reglages'))}
          aria-label="Réglages"
          aria-expanded={feuille === 'reglages'}
        >
          <IcReglages width={22} height={22} />
        </button>
      </nav>

      {/* ---------- FEUILLE (menu qui monte du bas) ---------- */}
      {feuille && (
        <div className="bm-overlay" onClick={() => setFeuille(null)}>
          <div className="bm-sheet" role="menu" onClick={(e) => e.stopPropagation()}>
            {feuille === 'modules' ? (
              <>
                <p className="bm-sheet-titre">Aller à…</p>
                <div className="bm-grille">
                  {NAV.map((item) => {
                    const Ic = Icones[item.icone];
                    const actif = estActif(path, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={`bm-tuile${actif ? ' actif' : ''}`}
                        aria-current={actif ? 'page' : undefined}
                        onClick={() => setFeuille(null)}
                      >
                        <span className="bm-tuile-ic"><Ic width={24} height={24} /></span>
                        <span>{libelle(item)}</span>
                      </Link>
                    );
                  })}
                </div>
              </>
            ) : (
              <>
                <p className="bm-sheet-titre">Apparence</p>
                <ReglagesApparence modeVisible={false} />
                <div className="menu-sep" />
                <Link href="/foyer" className="bm-lien" onClick={() => setFeuille(null)}>Mon foyer</Link>
                <Link href="/abonnement" className="bm-lien" onClick={() => setFeuille(null)}>Abonnement</Link>
                <Link href="/compte" className="bm-lien" onClick={() => setFeuille(null)}>Mon compte</Link>
                <Link href="/confidentialite" className="bm-lien" onClick={() => setFeuille(null)}>Confidentialité</Link>
                <div className="menu-sep" />
                <form action={deconnexion}>
                  <button type="submit" className="bm-lien bm-deco">Se déconnecter</button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
