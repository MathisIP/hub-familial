/**
 * DÉTECTION DU MODE « APPLICATION INSTALLÉE » (client uniquement).
 *
 * ⚠ POURQUOI ÇA COMPTE. Installée sur l'écran d'accueil, l'application n'a **ni
 * barre d'adresse, ni onglets, ni bouton retour visible**. Tout ce qui, dans un
 * navigateur, se répare d'un clic — fermer un onglet, revenir en arrière — n'a
 * plus d'équivalent. Une navigation qui serait un simple détour au bureau
 * devient une impasse dont la seule sortie est de tuer l'application.
 *
 * C'est exactement ce qui piégeait l'ouverture d'un document avant la
 * visionneuse (17/08/2026), et ce que ce fichier sert à ne plus reproduire.
 */

/**
 * L'application tourne-t-elle en mode installé ?
 *
 * ⚠ DEUX TESTS, ET IL EN FAUT DEUX. `display-mode: standalone` est le test
 * standard, mais Safari sur iOS ne l'a longtemps pas renseigné : il expose à la
 * place `navigator.standalone`, non standard et propre à lui. Or iOS est
 * précisément la plateforme où l'absence d'onglets fait le plus de dégâts —
 * n'interroger que le standard reviendrait à rater le seul cas qui compte.
 */
export function estStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  const iosStandalone = (window.navigator as Navigator & { standalone?: boolean }).standalone;
  if (iosStandalone === true) return true;
  return window.matchMedia?.('(display-mode: standalone)').matches ?? false;
}

/**
 * Ce clic doit-il être intercepté par l'application ?
 *
 * ⚠ `button` PEUT ÊTRE ABSENT. Un clic issu d'une tape, d'une technologie
 * d'assistance ou d'un `dispatchEvent` n'a pas toujours ce champ renseigné ;
 * l'ancienne comparaison `e.button !== 0` renvoyait alors `true`, le clic était
 * jugé « spécial », l'interception ne se faisait pas — et le lien naviguait.
 * Sur un téléphone en mode installé, cette seule différence transforme un
 * aperçu en impasse. On ne traite comme spécial que ce qui l'est vraiment.
 */
export function clicPrincipal(e: {
  metaKey: boolean;
  ctrlKey: boolean;
  shiftKey: boolean;
  altKey: boolean;
  button?: number;
}): boolean {
  if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return false;
  return e.button == null || e.button === 0;
}
