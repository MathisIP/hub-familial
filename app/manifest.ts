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
    name: 'Nestync',
    short_name: 'Nestync',
    description: "L'organisation du foyer, en un seul endroit.",
    /*
     * ⚠ /foyer ET NON / DEPUIS LE 25/08/2026. L'icône installée doit ouvrir
     * l'APPLICATION ; pointée sur `/`, elle afficherait la page de vente.
     * `app/page.tsx` redirige les membres connectés vers /foyer, ce qui
     * rattrape les installations faites avant ce changement — mais un
     * `start_url` juste évite l'aller-retour.
     */
    start_url: '/foyer',
    /*
     * ⚠ `scope` EST OBLIGATOIRE DÈS QUE `start_url` N'EST PLUS `/`.
     *
     * Omis, il vaut par défaut **le dossier de `start_url`** — donc `/foyer/`.
     * Tout le reste du site tombe alors HORS PÉRIMÈTRE, et une application
     * installée qui navigue hors de son périmètre s'ouvre dans le navigateur
     * système au lieu de rester dans sa fenêtre.
     *
     * Conséquence observée le 26/08/2026 : la PWA ouvrait `/foyer`, la session
     * manquait, le middleware renvoyait sur `/connexion` — hors périmètre —
     * donc dans Safari. Or **iOS donne à une PWA installée un magasin de
     * cookies SÉPARÉ de Safari** : se connecter là n'ouvrait aucune session
     * dans l'application, et l'utilisateur repartait en boucle.
     *
     * Avant le déplacement sur /foyer, `start_url: '/'` donnait un périmètre
     * `/` par défaut et le problème n'existait pas. C'est un effet de bord du
     * déménagement, pas un défaut du parcours de connexion.
     */
    scope: '/',
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
