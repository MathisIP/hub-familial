import { Fraunces, Instrument_Sans, IBM_Plex_Mono } from 'next/font/google';

/**
 * LES TROIS FAMILLES DU SITE VITRINE, en un seul endroit.
 *
 * ⚠ POURQUOI UN MODULE PARTAGÉ. `next/font` ne s'appelle qu'au niveau module :
 * impossible de créer ces instances dans une fonction. Les déclarer ici permet
 * à toutes les pages publiques de partager **les mêmes** — sinon chaque page
 * qui les redéclare produit son propre jeu de fichiers, et le navigateur
 * retélécharge la même police à chaque navigation.
 *
 * ⚠ ELLES NE SONT PAS DANS LE LAYOUT RACINE, et c'est délibéré : l'application
 * a les siennes (Fraunces en graisses fixes + Quicksand). Trois familles de plus
 * injectées globalement pèseraient sur toutes les pages du produit, qui n'en
 * ont aucun usage.
 *
 * ⚠ AUTO-HÉBERGÉES. `next/font/google` télécharge les fichiers au build et les
 * sert depuis notre domaine : aucune requête vers Google à l'exécution, aucune
 * adresse IP de visiteur transmise à un tiers. Ce n'est pas un réglage de
 * performance — la page « Vie privée » du site affirme « polices et ressources
 * auto-hébergées », et la charger depuis un serveur tiers rendrait cette phrase
 * fausse sur la page même qui l'écrit.
 */

/**
 * Fraunces en VARIABLE, avec ses axes. La charte impose `SOFT 20 / WONK 1 /
 * opsz 96` et une graisse de 400 partout : les titres tirent leur présence de
 * leur taille, jamais de leur graisse. Sans les axes, `font-variation-settings`
 * n'aurait aucun effet et le caractère du display — le « wonk » — disparaîtrait.
 */
export const policeDisplay = Fraunces({
  subsets: ['latin'],
  axes: ['SOFT', 'WONK', 'opsz'],
  weight: 'variable',
  variable: '--font-display-site',
  display: 'swap',
});

export const policeCorps = Instrument_Sans({
  subsets: ['latin'],
  variable: '--font-corps-site',
  display: 'swap',
});

/** Chiffres, dates, montants et surtitres. Nestync est un produit de comptes. */
export const policeDonnees = IBM_Plex_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500'],
  variable: '--font-donnees-site',
  display: 'swap',
});

/** Les trois variables CSS à poser sur le conteneur du site. */
export const classesPolices = `${policeDisplay.variable} ${policeCorps.variable} ${policeDonnees.variable}`;
