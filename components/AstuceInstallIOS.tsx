'use client';

import { useEffect, useState } from 'react';

/**
 * Rappel d'installation pour iPhone/iPad. iOS ne propose PAS d'invite automatique
 * (contrairement à Android) : on affiche donc un petit bandeau expliquant le geste
 * « Partager → Sur l'écran d'accueil ». Masqué si :
 *   · l'appareil n'est pas iOS ;
 *   · l'app est déjà lancée en mode installé (`navigator.standalone`) ;
 *   · l'utilisateur l'a déjà fermé (mémorisé en localStorage).
 */
export default function AstuceInstallIOS() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const ua = navigator.userAgent || '';
      const iOS = /iphone|ipad|ipod/i.test(ua);
      const installe = 'standalone' in navigator && (navigator as unknown as { standalone?: boolean }).standalone === true;
      const rejete = localStorage.getItem('hub-install-ios') === 'non';
      if (iOS && !installe && !rejete) setVisible(true);
    } catch {
      /* pas d'accès → on n'affiche rien */
    }
  }, []);

  if (!visible) return null;

  function fermer() {
    try {
      localStorage.setItem('hub-install-ios', 'non');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }

  return (
    <div className="install-ios" role="dialog" aria-label="Installer l'application">
      <img className="install-ios-logo" src="/icon-192.png" alt="" width={34} height={34} />
      <p className="install-ios-txt">
        Installe le Hub sur ton iPhone : appuie sur{' '}
        <span className="install-ios-ic" aria-hidden="true">
          <svg viewBox="0 0 24 24" width="15" height="15" focusable="false">
            <path d="M12 3l3.5 3.5-1.4 1.4L13 6.83V15h-2V6.83L9.9 7.9 8.5 6.5 12 3z" fill="currentColor" />
            <path d="M6 10h3v2H7v8h10v-8h-2v-2h3a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V11a1 1 0 0 1 1-1z" fill="currentColor" />
          </svg>
        </span>{' '}
        <b>Partager</b>, puis <b>« Sur l’écran d’accueil »</b>.
      </p>
      <button className="install-ios-x" onClick={fermer} aria-label="Fermer">✕</button>
    </div>
  );
}
