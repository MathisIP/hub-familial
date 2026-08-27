/**
 * SAISIE D'UNE DATE AU CLAVIER — helpers purs, importables côté client.
 * =====================================================================
 * Le format « jj/mm/aaaa » est imposé par le stockage (texte, hérité du
 * classeur d'origine — cf. lib/todo/schema.ts). Il obligeait jusqu'ici à taper
 * les « / » à la main.
 *
 * ⚠ CE N'EST PAS UN CONFORT, C'ÉTAIT UN BLOCAGE. Les champs portent
 * `inputMode="numeric"`, qui est le bon choix — il fait apparaître le pavé
 * numérique sur mobile. Mais ce pavé, sur une partie des claviers Android et
 * iOS, **n'a pas de « / »**. La personne devait basculer sur le clavier
 * alphabétique au milieu de sa date, ou renoncer. Remonté par un testeur le
 * 27/08/2026.
 *
 * Les séparateurs sont donc posés automatiquement à mesure qu'on tape les
 * chiffres, et plus personne n'a besoin d'en produire un.
 */

/** Une date déjà écrite en ISO, telle qu'un collage peut en apporter. */
const ISO = /^(\d{4})-(\d{1,2})-(\d{1,2})$/;

/**
 * Extrait les chiffres significatifs d'une saisie, dans l'ordre jour-mois-année.
 *
 * ⚠ LE CAS ISO EST TRAITÉ À PART, ET IL LE FAUT. Un simple retrait des
 * non-chiffres transformerait « 2026-08-27 » — ce que produit un copier-coller
 * depuis un tableur, un courriel ou un sélecteur de date — en « 20260827 »,
 * donc en « 20/26/0827 ». La date serait fausse **sans que rien ne le signale**,
 * et c'est exactement le genre d'erreur qu'on ne relit pas.
 */
export function chiffresDate(brut: string): string {
  const iso = ISO.exec(brut.trim());
  if (iso) {
    const [, a, m, j] = iso;
    return `${j.padStart(2, '0')}${m.padStart(2, '0')}${a}`;
  }
  return brut.replace(/\D/g, '');
}

/**
 * Chiffres → « jj/mm/aaaa ».
 *
 * ⚠ AUCUN SÉPARATEUR FINAL, JAMAIS. Renvoyer « 27/ » après deux chiffres
 * paraîtrait plus serviable et rendrait le champ **impossible à corriger** :
 * l'effacement retirerait la barre, le reformatage la remettrait aussitôt, et la
 * personne resterait bloquée sur « 27/ » à marteler la touche retour. En
 * n'écrivant une barre que lorsqu'un chiffre la suit, l'effacement redevient
 * naturel sans le moindre cas particulier.
 */
export function formaterDate(chiffres: string): string {
  const d = chiffres.slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}/${d.slice(2)}`;
  return `${d.slice(0, 2)}/${d.slice(2, 4)}/${d.slice(4)}`;
}

/**
 * Position du curseur après le n-ième chiffre du texte formaté.
 *
 * ⚠ Sans cela, corriger un chiffre au milieu renvoie le curseur à la fin à
 * chaque frappe : on tape « 2 » pour rectifier le mois et on se retrouve à
 * écrire dans l'année. Le repère qui survit au reformatage n'est pas la position
 * dans le texte — les barres se déplacent — mais **le nombre de chiffres qui
 * précèdent le curseur**.
 */
export function caretApres(texte: string, nChiffres: number): number {
  if (nChiffres <= 0) return 0;
  let vus = 0;
  for (let i = 0; i < texte.length; i++) {
    if (texte[i] >= '0' && texte[i] <= '9') {
      vus++;
      if (vus === nChiffres) return i + 1;
    }
  }
  return texte.length;
}

/**
 * Ce que doit afficher le champ après une frappe, et où placer le curseur.
 *
 * `precedent` sert uniquement à distinguer une frappe d'un effacement : sans
 * cette information, on ne peut pas savoir si une barre en fin de saisie vient
 * d'être tapée ou vient d'être supprimée.
 */
export function saisirDate(
  brut: string,
  caretBrut: number,
  precedent: string,
): { texte: string; caret: number } {
  const suppression = brut.length < precedent.length;
  const chiffres = chiffresDate(brut);
  let texte = formaterDate(chiffres);

  /*
   * ⚠ Un collage ISO réordonne les chiffres (aaaa-mm-jj devient jj/mm/aaaa) :
   * compter les chiffres avant le curseur n'y a plus aucun sens, puisqu'ils ne
   * sont plus dans le même ordre. On place le curseur à la fin, ce qui est de
   * toute façon ce qu'on attend après un collage.
   */
  if (ISO.test(brut.trim())) return { texte, caret: texte.length };

  /*
   * Quelqu'un qui tape lui-même un séparateur — au clavier d'ordinateur, ou le
   * « . » que proposent la plupart des pavés numériques — le voit sinon
   * disparaître sous ses doigts, puis revenir au chiffre suivant. On le conserve
   * tant qu'il est cohérent avec la position dans la date.
   *
   * ⚠ Jamais lors d'un effacement : ce serait remettre la barre que la personne
   * vient d'enlever, c'est-à-dire le blocage décrit plus haut.
   */
  if (!suppression && /[/.\-\s]$/.test(brut) && (chiffres.length === 2 || chiffres.length === 4)) {
    texte += '/';
    // Le curseur va APRÈS la barre qu'on vient de conserver : le laisser devant
    // le placerait entre le chiffre et le séparateur, position que personne ne
    // vise et d'où la frappe suivante paraît partir de travers.
    return { texte, caret: texte.length };
  }

  const chiffresAvantCaret = brut.slice(0, caretBrut).replace(/\D/g, '').length;
  return { texte, caret: caretApres(texte, chiffresAvantCaret) };
}
