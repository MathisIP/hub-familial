import type { CSSProperties, ReactNode } from 'react';
import Link from 'next/link';
import { classesPolices } from '@/lib/polices-site';
import '@/app/vitrine-ds.css';

/**
 * CADRE DES PAGES PUBLIQUES — la charte du site vitrine, hors de la vitrine.
 *
 * Les pages qui entourent le site — connexion, mentions légales, CGV,
 * confidentialité, aide — s'adressent aux **mêmes visiteurs** que la page
 * d'accueil. Les laisser dans l'habillage de l'application produisait une
 * rupture visuelle au premier clic : on quitte un site sobre et anguleux pour
 * retomber dans une interface arrondie et colorée qui n'est pas encore la
 * sienne. Ce cadre leur donne le même sol.
 *
 * ⚠ IL NE TOUCHE PAS AU LAYOUT RACINE. `.nsy-site` borne les jetons et le socle
 * (voir `app/vitrine-ds.css`) : l'application, qui pose déjà `data-theme` sur
 * `<html>` avec un thème nommé `nuit`, n'est affectée en rien.
 *
 * ⚠ PAS DE BASCULE DE THÈME ICI. Sur la vitrine, elle a un sens : on montre le
 * produit sous ses deux jours. Sur une page de mentions légales, ce serait un
 * bouton de plus à côté d'un texte qu'on vient lire une fois. Ces pages restent
 * en chaux — le thème clair, celui qui s'imprime.
 */
export default function CadreSite({
  titre,
  surtitre,
  chapeau,
  large = false,
  children,
}: {
  /** Titre de la page, en Fraunces. */
  titre: string;
  /** Surtitre mono en capitales, façon eyebrow numéroté du site. */
  surtitre?: string;
  /** Phrase d'introduction sous le titre. */
  chapeau?: string;
  /** Élargit la colonne : pour les pages à formulaire plutôt qu'à texte. */
  large?: boolean;
  children: ReactNode;
}) {
  const surtitreStyle: CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-donnees)',
    fontSize: 'var(--eyebrow)',
    textTransform: 'uppercase',
    letterSpacing: 'var(--ls-eyebrow)',
    color: 'var(--texte-petit)',
  };

  return (
    <div
      className={`nsy-site nsy-cadre ${classesPolices}`}
      style={
        {
          // Le pont entre les variables de next/font et les noms que connaît le
          // système de design : --font-display / --font-corps / --font-donnees.
          '--font-display': 'var(--font-display-site), Georgia, serif',
          '--font-corps': 'var(--font-corps-site), system-ui, sans-serif',
          '--font-donnees': 'var(--font-donnees-site), ui-monospace, monospace',
          '--wonk': "'SOFT' 20, 'WONK' 1, 'opsz' 96",
        } as CSSProperties
      }
    >
      <header className="nsy-cadre-tete">
        <Link href="/" className="nsy-cadre-marque">
          Nestync
        </Link>
      </header>

      <main className={`nsy-cadre-corps${large ? ' large' : ''}`}>
        <div className="nsy-cadre-entete">
          {surtitre && <p style={surtitreStyle}>{surtitre}</p>}
          <h1 className="ns-display-l" style={{ margin: 0 }}>
            {titre}
          </h1>
          {chapeau && (
            <p className="ns-corps-l" style={{ margin: 0, color: 'var(--texte-doux)' }}>
              {chapeau}
            </p>
          )}
        </div>
        {children}
      </main>

      <footer className="nsy-cadre-pied">
        {/* Les mêmes liens que le pied de la vitrine : où qu'on soit, on
            retrouve les mêmes portes. */}
        <nav>
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/confidentialite">Politique de confidentialité</Link>
          <Link href="/conditions">Conditions générales</Link>
          <Link href="/aide">Contact</Link>
          <Link href="/mises-a-jour">Mises à jour</Link>
        </nav>
        <span>Éditeur français · Données hébergées en Europe</span>
      </footer>
    </div>
  );
}
