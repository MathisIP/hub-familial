'use client';

import { useEffect } from 'react';

/**
 * Capture d'origine marketing — îlot CLIENT, posé une fois au niveau du layout
 * racine.
 * ================================================================
 * Lit `utm_source` (et `utm_medium`/`utm_campaign` en complément) dans l'URL de
 * la première visite, et les mémorise dans le cookie `nsy-origine` — lu plus
 * tard, côté serveur, par `foyerCourant()` au moment de la création du foyer
 * (`lib/foyer.ts`). Sert à savoir par quel canal (TikTok, Instagram, Pinterest…)
 * un foyer est arrivé, sans rien demander à l'utilisateur.
 *
 * ⚠ LA PREMIÈRE TOUCHE GAGNE, PAS LA DERNIÈRE. Si le cookie existe déjà, on ne
 * l'écrase pas : quelqu'un qui a cliqué un lien TikTok puis revient plus tard
 * via un favori sans paramètre ne doit pas voir sa source d'origine remplacée
 * par « inconnue ».
 *
 * ⚠ COOKIE DE PREMIÈRE PARTIE, NON PUBLICITAIRE — même famille que `hub-langue`
 * (voir `ReglagesForm.tsx`), documenté dans `/confidentialite` (`TEMOINS`). Ce
 * n'est pas un traceur inter-site : aucune donnée n'est envoyée à un tiers, la
 * valeur reste sur cet appareil et sert uniquement à Nestync lui-même.
 */
export default function CaptureOrigine() {
  useEffect(() => {
    if (document.cookie.match(/(?:^|;\s*)nsy-origine=/)) return;
    const params = new URLSearchParams(window.location.search);
    const source = params.get('utm_source');
    if (!source) return;
    const medium = params.get('utm_medium');
    const campagne = params.get('utm_campaign');
    const valeur = [source, medium, campagne].filter(Boolean).join('|');
    document.cookie = `nsy-origine=${encodeURIComponent(valeur)}; path=/; max-age=31536000; samesite=lax`;
  }, []);

  return null;
}
