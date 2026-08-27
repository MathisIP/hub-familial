'use client';

import { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { useT } from '@/components/I18nProvider';
import { sansNavigation } from '@/components/PiedDePage';

/**
 * Rappel d'installation pour iPhone/iPad. iOS ne propose PAS d'invite automatique
 * (contrairement à Android) : on affiche donc un petit bandeau expliquant le geste
 * « Partager → Sur l'écran d'accueil ». Masqué si :
 *   · l'appareil n'est pas iOS ;
 *   · l'app est déjà lancée en mode installé (`navigator.standalone`) ;
 *   · l'utilisateur l'a déjà fermé (mémorisé en localStorage) ;
 *   · **on n'est pas encore dans l'application** — voir ci-dessous.
 *
 * ⚠ IL S'AFFICHAIT SUR L'ÉCRAN DE CONNEXION, et c'était un contresens. On y
 * propose d'installer une application à quelqu'un qui n'y est pas encore entré,
 * et qui n'a peut-être même pas de foyer : l'installer ne lui donnerait qu'un
 * raccourci vers un écran de connexion. Pire, l'invitation arrive au moment
 * précis où l'on demande son attention pour autre chose — et sur un téléphone,
 * elle recouvre le pied de page.
 *
 * ⚠ LA RÈGLE EST CELLE DE `sansNavigation`, PAS UNE SECONDE LISTE. Elle décrit
 * déjà les pages « hors application » : vitrine, connexion, pages légales, et
 * les parcours en tunnel (arrivée sans foyer, prise en main). C'est exactement
 * là qu'il ne faut pas proposer d'installer. Une liste parallèle aurait dérivé
 * à la première page ajoutée.
 */
export default function AstuceInstallIOS() {
  const tr = useT();
  const path = usePathname();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      // iPhone/iPod : détectés par l'UA. iPad (iPadOS 13+) : se fait passer pour un
      // Mac dans l'UA → on le repère par un UA « Mac » AVEC écran tactile (un vrai
      // Mac a maxTouchPoints = 0).
      const iPhone = /iphone|ipod/i.test(ua);
      const iPadClassique = /ipad/i.test(ua);
      const iPadMasque = /macintosh|mac os x/i.test(ua) && navigator.maxTouchPoints > 0;
      const iOS = iPhone || iPadClassique || iPadMasque;
      const installe = 'standalone' in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true;
      const rejete = localStorage.getItem('hub-install-ios') === 'non';
      if (iOS && !installe && !rejete) setVisible(true);
    } catch {
      /* pas d'accès → on n'affiche rien */
    }
  }, []);

  // ⚠ Le test de la page vient APRÈS l'effet, jamais dedans : sortir plus tôt
  // ferait varier le nombre de hooks entre deux rendus, ce que React refuse.
  if (!visible || sansNavigation(path)) return null;

  function fermer() {
    try {
      localStorage.setItem('hub-install-ios', 'non');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="install-ios" role="dialog" aria-label={tr('IOS_ARIA')}>
      <Image className="install-ios-logo" src="/icon-192.png" alt="" width={34} height={34} />
      <p className="install-ios-txt">
        {tr('IOS_AVANT')}{' '}
        <span className="install-ios-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" focusable="false">
            <path d="M12 3l3.5 3.5-1.4 1.4L13 6.83V15h-2V6.83L9.9 7.9 8.5 6.5 12 3z" fill="currentColor" />
            <path d="M6 10h3v2H7v8h10v-8h-2v-2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z" fill="currentColor" />
          </svg>
        </span>{' '}
        <b>{tr('IOS_PARTAGER')}</b>{tr('IOS_PUIS')} <b>{tr('IOS_ECRAN')}</b>.
      </p>
      <button className="install-ios-x" onClick={fermer} aria-label={tr('G_FERMER')}>✕</button>
    </div>
  );
}
