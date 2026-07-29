import type { Metadata, Viewport } from 'next';
import { Fraunces, Quicksand } from 'next/font/google';
import { cssDesThemes, THEME_DEFAUT, THEME_ORDRE, THEMES } from '@/lib/themes';
import EnregistrerSW from '@/components/EnregistrerSW';
import AstuceInstallIOS from '@/components/AstuceInstallIOS';
import PiedDePage from '@/components/PiedDePage';
import SideBar from '@/components/SideBar';
import { I18nProvider } from '@/components/I18nProvider';
import { langueCourante } from '@/lib/langue';
import './globals.css';

/** Titres = Fraunces (serif douce, italique dispo) ; corps = Quicksand. */
const policeTitre = Fraunces({
  subsets: ['latin'],
  weight: ['500', '600', '700'],
  style: ['normal', 'italic'],
  variable: '--police-titre',
  display: 'swap',
});
const policeCorps = Quicksand({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--police-corps',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Hub familial',
  description: "L'organisation du foyer, en un seul endroit.",
  // iOS n'a pas d'invite d'installation : ces balises font qu'une fois ajoutée à
  // l'écran d'accueil, l'app se lance en plein écran (sans la barre Safari), avec
  // son nom et son icône (apple-touch-icon = app/apple-icon.png, servi par Next).
  appleWebApp: {
    capable: true,
    title: 'Hub',
    statusBarStyle: 'default',
  },
};

export const viewport: Viewport = {
  // theme-color est posé DYNAMIQUEMENT par le script inline (couleur de la page du
  // thème actif) → la barre d'état du PWA suit le thème au lieu d'un blanc figé.
  width: 'device-width',
  initialScale: 1,
  // App à taille fixe (PWA) : pas de zoom pincé ni de double-tap zoom.
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
  // Le contenu s'étend sous les zones sûres (encoche / barre d'accueil iPhone) ;
  // le bandeau du bas gère lui-même son padding via env(safe-area-inset-bottom).
  viewportFit: 'cover',
};

/**
 * Applique le thème mémorisé AVANT le premier rendu.
 * Sans ce script bloquant, la page s'afficherait une fraction de seconde en
 * 🌸 Rose avant de basculer en 🌙 Nuit — désagréable, et pire encore sur mobile.
 */
const COULEURS_PAGE = JSON.stringify(
  Object.fromEntries(THEME_ORDRE.map((id) => [id, THEMES[id].PAGE])),
);

const SCRIPT_THEME = `
(function () {
  var C = ${COULEURS_PAGE};
  var t, n;
  try { t = localStorage.getItem('hub-theme'); n = localStorage.getItem('hub-neon'); } catch (e) {}
  if (!t || !C[t]) t = '${THEME_DEFAUT}';
  document.documentElement.setAttribute('data-theme', t);
  document.documentElement.setAttribute('data-neon', n === 'off' ? 'off' : 'on');
  var m = document.querySelector('meta[name="theme-color"]');
  if (!m) { m = document.createElement('meta'); m.setAttribute('name', 'theme-color'); document.head.appendChild(m); }
  m.setAttribute('content', C[t]);
})();
`;

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const langue = await langueCourante();
  return (
    <html
      lang={langue}
      data-theme={THEME_DEFAUT}
      className={`${policeTitre.variable} ${policeCorps.variable}`}
      suppressHydrationWarning
    >
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssDesThemes() }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body>
        <I18nProvider langue={langue}>
          <div className="enveloppe">{children}</div>
          <PiedDePage />
          {/* Navigation (rail desktop + bandeau bas mobile) au niveau racine : ses
              éléments `position: fixed` doivent se caler sur le viewport, pas sur un
              ancêtre avec backdrop-filter (ce qui collait le bandeau en haut). */}
          <SideBar />
        </I18nProvider>
        <EnregistrerSW />
        <AstuceInstallIOS />
      </body>
    </html>
  );
}
