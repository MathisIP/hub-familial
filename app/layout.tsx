import type { Metadata, Viewport } from 'next';
import { cssDesThemes, THEME_DEFAUT, THEMES } from '@/lib/themes';
import './globals.css';

export const metadata: Metadata = {
  title: 'Hub familial',
  description: "L'organisation du foyer, en un seul endroit.",
};

export const viewport: Viewport = {
  themeColor: THEMES[THEME_DEFAUT].PAGE,
  width: 'device-width',
  initialScale: 1,
};

/**
 * Applique le thème mémorisé AVANT le premier rendu.
 * Sans ce script bloquant, la page s'afficherait une fraction de seconde en
 * 🌸 Rose avant de basculer en 🌙 Nuit — désagréable, et pire encore sur mobile.
 */
const SCRIPT_THEME = `
(function () {
  try {
    var t = localStorage.getItem('hub-theme');
    document.documentElement.setAttribute('data-theme', t || '${THEME_DEFAUT}');
  } catch (e) {
    document.documentElement.setAttribute('data-theme', '${THEME_DEFAUT}');
  }
})();
`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" data-theme={THEME_DEFAUT} suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: cssDesThemes() }} />
        <script dangerouslySetInnerHTML={{ __html: SCRIPT_THEME }} />
      </head>
      <body>
        <div className="enveloppe">{children}</div>
      </body>
    </html>
  );
}
