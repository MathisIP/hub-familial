import type { CSSProperties, ReactNode } from 'react';

/**
 * PRIMITIVES DU SITE VITRINE — portées du projet Claude Design (25/08/2026).
 *
 * ⚠ LA SOURCE N'ÉTAIT PAS DIRECTEMENT UTILISABLE. Le kit de démonstration
 * expose ses composants par des globales de navigateur
 * (`window.NestyncDesignSystem_…`, `Object.assign(window, …)`) : pratique pour
 * un aperçu autonome en un seul fichier, inexploitable dans Next.js. Ils sont
 * donc **portés** — vrais modules, vraies props typées — et non recopiés.
 *
 * Ce qui n'a PAS changé : les valeurs, les rôles, les règles. Chaque écart est
 * signalé sur place.
 *
 * Aucun de ces composants n'a d'état : ils restent des composants serveur.
 */

/** Les cinq fils du foyer. Le libellé texte est toujours obligatoire. */
export type Fil = 'commun' | 'corail' | 'ambre' | 'ciel' | 'sauge';

/* ------------------------------- Bouton --------------------------------- */

/**
 * ⚠ JAMAIS DE PILULE. Le rayon vaut 2 px comme partout sur le site : les
 * boutons arrondis sont la signature de l'**application**, et la rupture
 * visuelle entre les deux est voulue. Un seul bouton principal par écran.
 */
export function Bouton({
  variante = 'principal',
  taille = 'm',
  href,
  halo = false,
  disabled = false,
  children,
  style,
  onClick,
}: {
  variante?: 'principal' | 'secondaire' | 'discret';
  taille?: 's' | 'm' | 'l';
  href?: string;
  /** Halo néon — n'existe qu'en thème nuit, et sur un seul élément du hero. */
  halo?: boolean;
  disabled?: boolean;
  children: ReactNode;
  style?: CSSProperties;
  onClick?: (e: React.MouseEvent) => void;
}) {
  const base: CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 'var(--e-2)',
    fontFamily: 'var(--font-corps)',
    fontWeight: 500,
    letterSpacing: '.005em',
    borderRadius: 'var(--rayon)',
    border: '1px solid transparent',
    cursor: disabled ? 'not-allowed' : 'pointer',
    opacity: disabled ? 0.45 : 1,
    textDecoration: 'none',
    lineHeight: 1,
    transition:
      'background var(--duree-micro) var(--courbe), color var(--duree-micro) var(--courbe), opacity var(--duree-micro) var(--courbe)',
  };
  const tailles: Record<string, CSSProperties> = {
    s: { fontSize: 'var(--petit)', padding: '10px 16px' },
    m: { fontSize: 'var(--corps)', padding: '14px 24px' },
    l: { fontSize: 'var(--corps-l)', padding: '18px 32px' },
  };
  const variantes: Record<string, CSSProperties> = {
    principal: {
      background: 'var(--commun)',
      color: 'var(--sur-commun)',
      boxShadow: halo ? 'var(--halo)' : 'none',
    },
    secondaire: { background: 'transparent', color: 'var(--texte)', borderColor: 'var(--texte)' },
    discret: { background: 'transparent', color: 'var(--texte-petit)', padding: 0 },
  };
  const styleFinal = { ...base, ...tailles[taille], ...variantes[variante], ...style };

  if (href && !disabled) {
    return (
      <a href={href} style={styleFinal} onClick={onClick}>
        {children}
      </a>
    );
  }
  return (
    <button type="button" disabled={disabled} style={styleFinal} onClick={onClick}>
      {children}
    </button>
  );
}

/* ------------------------------- Section -------------------------------- */

/**
 * ⚠ CHAQUE SECTION PORTE SON PROPRE FOND ET SA PROPRE COULEUR DE TEXTE.
 * Ce n'est pas une préférence : dès qu'un conteneur parent impose un fond clair
 * — aperçu intégré, lecteur d'articles, impression, extension — un texte clair
 * posé sur le seul fond de `body` devient illisible. Bug rencontré et corrigé
 * le 21/08/2026 côté design system ; le composant existe pour que la règle ne
 * puisse plus être oubliée.
 */
export function Section({
  fond = 'base',
  rail = true,
  largeur = 'var(--contenu-max)',
  id,
  children,
  style,
}: {
  fond?: 'base' | 'alt' | 'surface';
  rail?: boolean;
  largeur?: string;
  id?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const fonds = { base: 'var(--fond)', alt: 'var(--fond-alt)', surface: 'var(--surface)' };
  return (
    <section
      id={id}
      style={{
        background: fonds[fond],
        color: 'var(--texte)',
        transition:
          'background var(--duree-theme) var(--courbe), color var(--duree-theme) var(--courbe)',
        padding: 'var(--section-desktop) var(--marge-desktop)',
        ...style,
      }}
    >
      <div style={{ maxWidth: largeur, margin: '0 auto', paddingLeft: rail ? 'var(--rail)' : 0 }}>
        {children}
      </div>
    </section>
  );
}

/* ------------------------------- Pastille ------------------------------- */

/**
 * L'unique « icône » du système — il n'y a pas de jeu de pictogrammes, et c'est
 * délibéré.
 *
 * ⚠ Le libellé texte est **obligatoire** : aucune information ne repose sur la
 * seule couleur, et un fil ne porte jamais de texte. C'est la règle
 * d'accessibilité qui rend le langage des couleurs utilisable par tous.
 */
export function Pastille({
  fil = 'commun',
  children,
  taille = 10,
  style,
}: {
  fil?: Fil;
  children: ReactNode;
  taille?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 'var(--e-2)',
        fontFamily: 'var(--font-corps)',
        fontSize: 'var(--petit)',
        color: 'var(--texte)',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: taille,
          height: taille,
          flex: '0 0 auto',
          borderRadius: 'var(--rayon-pastille)',
          background: `var(--${fil})`,
        }}
      />
      {children}
    </span>
  );
}

/* ------------------------------ BlocChiffre ----------------------------- */

/**
 * ⚠ `source` ET `annee` NE SONT PAS OPTIONNELLES, et le typage l'impose.
 * Les chiffres portent sur le **problème**, jamais sur le produit — pas de
 * « déjà 10 000 foyers » — et un journaliste vérifie. Rendre l'année
 * facultative reviendrait à autoriser un chiffre invérifiable.
 */
export function BlocChiffre({
  eyebrow,
  chiffre,
  unite,
  libelle,
  source,
  annee,
  style,
}: {
  eyebrow?: string;
  chiffre: string;
  unite?: string;
  libelle: string;
  source: string;
  annee: string;
  style?: CSSProperties;
}) {
  return (
    <figure style={{ margin: 0, display: 'grid', gap: 'var(--e-3)', maxWidth: '34ch', ...style }}>
      {eyebrow && (
        <span className="ns-eyebrow" style={{ color: 'var(--texte-petit)' }}>
          {eyebrow}
        </span>
      )}
      <span className="ns-chiffre" style={{ color: 'var(--texte)' }}>
        {chiffre}
        {unite && (
          <span style={{ fontSize: '.42em', marginLeft: '.15em', color: 'var(--texte-petit)' }}>
            {unite}
          </span>
        )}
      </span>
      <figcaption style={{ display: 'grid', gap: 'var(--e-1)' }}>
        <span className="ns-corps" style={{ color: 'var(--texte)' }}>
          {libelle}
        </span>
        <span
          style={{
            fontFamily: 'var(--font-donnees)',
            fontSize: 'var(--eyebrow)',
            color: 'var(--texte-petit)',
          }}
        >
          {source}
          {source && annee ? ' · ' : ''}
          {annee}
        </span>
      </figcaption>
    </figure>
  );
}

/* -------------------------------- Mockup -------------------------------- */

/**
 * Le produit est la seule illustration du site : pas d'isométrie 3D, pas de
 * personnages, pas de formes organiques.
 *
 * ⚠ Sans capture fournie, le cadre affiche un emplacement **explicite** plutôt
 * qu'une image de substitution — un vide assumé se remarque et se corrige, une
 * fausse capture se publie.
 *
 * ⚠ Les captures doivent venir du **foyer de démonstration** (Clara, Antoine,
 * Noé), jamais d'un compte réel.
 */
/* Proportions de l'appareil, exprimees en fraction de sa largeur. Mesurees sur
   la valeur de reference historique (largeur 300 : rayon 44, bordure 10). */
const RAYON_APPAREIL = 44 / 300;
const RAYON_ECRAN = 34 / 300;
const BORDURE = 10 / 300;

export function Mockup({
  src,
  alt,
  rotation = 3,
  largeur = 300,
  style,
}: {
  src?: string;
  /** Décrit le MODULE montré, jamais « capture d'écran ». */
  alt: string;
  rotation?: number;
  largeur?: number;
  style?: CSSProperties;
}) {
  const ratio = 19.5 / 9;
  return (
    <figure
      style={{
        margin: 0,
        width: largeur,
        transform: `rotate(${rotation}deg)`,
        // L'unique ombre de tout le systeme — elle suit la taille elle aussi,
        // sinon une petite maquette porte l'ombre d'une grande.
        filter: `drop-shadow(${largeur * 0.08}px ${largeur * 0.107}px ${largeur * 0.16}px rgba(20,28,38,.28))`,
        ...style,
      }}
    >
      <div
        style={{
          background: 'var(--encre)',
          // ⚠ GEOMETRIE PROPORTIONNELLE, PAS FIXE. Ces valeurs etaient des
          // constantes (rayon 44, bordure 10) calibrees pour une largeur de
          // 300. A 150 px la bordure devenait proportionnellement deux fois
          // trop epaisse et le rayon avalait l'ecran : le telephone avait
          // l'air d'un jouet. Un appareil reel a des proportions constantes,
          // pas des cotes constantes.
          borderRadius: largeur * RAYON_APPAREIL, // seule exception au rayon de 2 px
          padding: largeur * BORDURE,
          border: '1px solid rgba(255,255,255,.09)',
        }}
      >
        <div
          style={{
            position: 'relative',
            borderRadius: largeur * RAYON_ECRAN,
            overflow: 'hidden',
            height: largeur * ratio - largeur * BORDURE * 2,
            background: 'var(--chaux-clair)',
          }}
        >
          {src ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={src}
              alt={alt}
              style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
            />
          ) : (
            <EmplacementCapture alt={alt} />
          )}
          <span
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: 10,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 76,
              height: 22,
              borderRadius: 'var(--rayon-pastille)',
              background: 'var(--encre)',
            }}
          />
        </div>
      </div>
    </figure>
  );
}

function EmplacementCapture({ alt }: { alt: string }) {
  return (
    <div
      style={{
        height: '100%',
        display: 'grid',
        placeContent: 'center',
        gap: 'var(--e-2)',
        padding: 'var(--e-5)',
        textAlign: 'center',
        background: 'var(--chaux-profond)',
        border: '1px dashed rgba(20,28,38,.22)',
        color: '#454E5C',
      }}
    >
      <span
        style={{
          fontFamily: 'var(--font-donnees)',
          fontSize: 11,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
        }}
      >
        Capture à fournir
      </span>
      <span style={{ fontFamily: 'var(--font-corps)', fontSize: 13, lineHeight: 1.5 }}>{alt}</span>
    </div>
  );
}

/* ------------------------------- Citation ------------------------------- */

/**
 * Le manifeste. Colonne étroite (58 caractères), filet indigo de 2 px.
 * C'est le seul endroit du site où l'on dit « je ».
 */
export function Citation({
  auteur,
  role,
  children,
  style,
}: {
  auteur?: string;
  role?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <blockquote
      style={{
        margin: 0,
        paddingLeft: 'var(--e-6)',
        borderLeft: '2px solid var(--commun)',
        maxWidth: 'var(--mesure-manifeste)',
        display: 'grid',
        gap: 'var(--e-5)',
        ...style,
      }}
    >
      <div
        style={{
          fontFamily: 'var(--font-display)',
          fontVariationSettings: 'var(--wonk)',
          fontWeight: 400,
          fontSize: 'var(--corps-l)',
          lineHeight: 1.5,
          color: 'var(--texte)',
        }}
      >
        {children}
      </div>
      {(auteur || role) && (
        <footer
          style={{
            fontFamily: 'var(--font-donnees)',
            fontSize: 'var(--eyebrow)',
            textTransform: 'uppercase',
            letterSpacing: 'var(--ls-eyebrow)',
            color: 'var(--texte-petit)',
          }}
        >
          {auteur}
          {auteur && role ? ' — ' : ''}
          {role}
        </footer>
      )}
    </blockquote>
  );
}

/* ------------------------------- Eyebrow -------------------------------- */

/** Surtitre numéroté, dans l'ordre de lecture : `02 — LE PROBLÈME`. */
export function Eyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="ns-eyebrow" style={{ margin: 0, color: 'var(--texte-doux)' }}>
      {children}
    </p>
  );
}
