/**
 * PLACEMENT D'UNE INFO-BULLE D'AIDE — fonction pure, testable.
 * ===========================================================
 * Le composant [components/Astuce.tsx] s'en sert pour poser sa bulle sans jamais
 * sortir de l'écran.
 *
 * ⚠ POURQUOI CE N'EST PLUS DU CSS SEUL. La bulle était centrée sur son « ? »
 * (`left: 50%; transform: translateX(-50%)`), avec une largeur maximale de
 * 17 rem — 272 px, soit les trois quarts d'un écran de téléphone. Un « ? » situé
 * dans la moitié droite d'une ligne débordait donc systématiquement. Le
 * composant offrait bien une échappatoire (`coin="droite"`), mais elle n'était
 * posée que sur **deux des quatorze appels** — et c'est exactement le problème :
 * un correctif manuel qu'il fallait penser à appliquer à chaque endroit, en
 * devinant où le bouton tomberait selon la largeur de l'écran et la longueur du
 * texte une fois traduit. Une prédiction qu'on ne peut pas tenir, et que les
 * douze autres appels ne tenaient pas.
 *
 * Le calcul, lui, vaut pour les douze appels et pour tous ceux à venir.
 */

export type Rect = { top: number; bottom: number; left: number; width: number; height: number };
export type Vue = { largeur: number; hauteur: number };

/** Distance minimale au bord de l'écran, en pixels. */
export const MARGE = 8;
/** Écart entre le « ? » et sa bulle. */
const ECART = 6;

/**
 * Où poser la bulle, en coordonnées d'écran (`position: fixed`).
 *
 * @param bouton  rectangle du « ? »
 * @param bulle   dimensions mesurées de la bulle
 * @param vue     dimensions de la zone visible
 */
export function positionBulle(
  bouton: Rect,
  bulle: { width: number; height: number },
  vue: Vue,
): { top: number; left: number } {
  /*
   * Horizontal : centré sur le bouton, puis ramené dans l'écran.
   *
   * ⚠ Le maximum est calculé AVANT le minimum, et l'ordre compte. Sur un écran
   * plus étroit que la bulle — un vieux téléphone, ou un texte long dans une
   * langue verbeuse — `vue.largeur - bulle.width - MARGE` devient négatif ; en
   * appliquant le minimum en dernier, on garde le bord gauche visible plutôt
   * que de coller la bulle hors cadre à gauche. Mieux vaut tronquer à droite
   * qu'à l'endroit où commence la lecture.
   */
  const centre = bouton.left + bouton.width / 2 - bulle.width / 2;
  const left = Math.max(MARGE, Math.min(centre, vue.largeur - bulle.width - MARGE));

  /*
   * Vertical : au-dessus du bouton si la place existe, sinon en dessous.
   *
   * ⚠ Et si aucun des deux ne tient — bulle haute sur un écran court, clavier
   * ouvert — on retombe au-dessus en la plaquant à la marge : une bulle qui
   * dépasse par le bas se retrouve sous le clavier, donc illisible, alors qu'en
   * haut elle reste au moins partiellement lue.
   */
  const dessus = bouton.top - bulle.height - ECART;
  const dessous = bouton.bottom + ECART;
  let top: number;
  if (dessus >= MARGE) top = dessus;
  else if (dessous + bulle.height + MARGE <= vue.hauteur) top = dessous;
  else top = MARGE;

  return { top, left };
}
