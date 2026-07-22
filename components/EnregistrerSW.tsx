'use client';

import { useEffect } from 'react';

/**
 * Enregistre le service worker (coquille hors ligne) — en PRODUCTION uniquement,
 * pour ne pas gêner le rechargement à chaud en développement. Ne rend rien.
 */
export default function EnregistrerSW() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') return;
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;

    const enregistrer = () => navigator.serviceWorker.register('/sw.js').catch(() => {});
    if (document.readyState === 'complete') enregistrer();
    else window.addEventListener('load', enregistrer, { once: true });
  }, []);

  return null;
}
