import type { Metadata } from 'next';
import { classesPolices } from '@/lib/polices-site';
import '../vitrine-ds.css';

/**
 * APERÇU DU NOUVEAU SITE VITRINE — route de travail, pas une page publique.
 *
 * ⚠ ELLE EST DERRIÈRE L'AUTHENTIFICATION, ET C'EST VOULU. `middleware.ts`
 * protège tout ce qui n'est pas explicitement exclu ; en ne l'excluant pas, on
 * obtient gratuitement ce qu'on veut : seul un compte connecté peut la voir,
 * aucun client ne tombe dessus, et `robots.txt` l'interdit aux moteurs. Le site
 * en ligne reste intact tant que celui-ci n'est pas validé.
 *
 * ⚠ LES POLICES VIENNENT DU MODULE PARTAGÉ `lib/polices-site.ts`, et non d'une
 * déclaration locale. Deux déclarations produiraient deux jeux de fichiers pour
 * les mêmes familles : le navigateur retéléchargerait Fraunces en passant de
 * cette page à `/connexion`.
 */
export const metadata: Metadata = {
  title: 'Aperçu — nouveau site Nestync',
  // Ceinture et bretelles : la route est déjà protégée par le middleware et
  // interdite dans robots.txt.
  robots: { index: false, follow: false },
};

export default function LayoutApercu({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={classesPolices}
      style={
        {
          // Le pont entre les variables de next/font et les noms attendus par
          // le système de design. Il ne connaît que --font-display/corps/donnees.
          '--font-display': 'var(--font-display-site), Georgia, serif',
          '--font-corps': 'var(--font-corps-site), system-ui, sans-serif',
          '--font-donnees': 'var(--font-donnees-site), ui-monospace, monospace',
          '--wonk': "'SOFT' 20, 'WONK' 1, 'opsz' 96",
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
}
