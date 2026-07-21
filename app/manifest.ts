import type { MetadataRoute } from 'next';
import { THEMES, THEME_DEFAUT } from '@/lib/themes';

/**
 * Manifest PWA — rend l'app installable sur l'écran d'accueil du téléphone
 * (§6.2). Généré depuis Next : servi à /manifest.webmanifest sans fichier statique.
 * Les icônes restent à fournir (public/icon-192.png, public/icon-512.png) ;
 * déclarées ici pour que l'installation les récupère dès qu'elles existeront.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hub familial',
    short_name: 'Hub',
    description: "L'organisation du foyer, en un seul endroit.",
    start_url: '/',
    display: 'standalone',
    lang: 'fr',
    background_color: THEMES[THEME_DEFAUT].PAGE,
    theme_color: THEMES[THEME_DEFAUT].PAGE,
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
