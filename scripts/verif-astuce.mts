/**
 * CONTRÔLES DU PLACEMENT DES INFO-BULLES D'AIDE.
 *   npm run verif:astuce
 *
 * ⚠ Ne touche à aucune base : fonction pure.
 *
 * L'affirmation à démontrer est une INVARIANTE, pas un exemple : quelle que soit
 * la position du « ? » et la taille de l'écran, la bulle reste dans le cadre.
 * On la vérifie donc par balayage — toutes les positions, sur quatre tailles
 * d'écran — plutôt que sur trois cas choisis à la main, qui sont précisément
 * ceux auxquels on pense et jamais ceux qui cassent.
 */
import { positionBulle, MARGE, type Rect, type Vue } from '../lib/astuce-position.ts';

let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `\n        attendu ${JSON.stringify(attendu)}\n        obtenu  ${JSON.stringify(obtenu)}`}`,
  );
}

const bouton = (left: number, top: number): Rect => ({
  left,
  top,
  bottom: top + 18,
  width: 18,
  height: 18,
});

/* ------------------------- L'invariante, balayée ------------------------- */

const ECRANS: [string, Vue][] = [
  ['iPhone SE (320)', { largeur: 320, hauteur: 568 }],
  ['iPhone courant (390)', { largeur: 390, hauteur: 844 }],
  ['tablette (768)', { largeur: 768, hauteur: 1024 }],
  ['bureau (1440)', { largeur: 1440, hauteur: 900 }],
];

console.log('\n  BALAYAGE — la bulle ne sort jamais du cadre');
for (const [nom, vue] of ECRANS) {
  // Bulle de 272 px (17 rem, la largeur maximale) mais jamais plus large que
  // l'écran, comme le fait le `min()` du CSS.
  const largeurBulle = Math.min(272, vue.largeur - 2 * MARGE);
  let debordements = 0;
  let pire = '';

  for (let x = 0; x <= vue.largeur - 18; x += 1) {
    for (const y of [0, 4, 40, Math.round(vue.hauteur / 2), vue.hauteur - 60, vue.hauteur - 18]) {
      for (const h of [32, 64, 120]) {
        const p = positionBulle(bouton(x, y), { width: largeurBulle, height: h }, vue);
        const droite = p.left + largeurBulle;
        const bas = p.top + h;
        if (p.left < MARGE - 0.001 || droite > vue.largeur - MARGE + 0.001 || p.top < MARGE - 0.001) {
          debordements++;
          if (!pire) pire = `x=${x} y=${y} h=${h} → left=${p.left} top=${p.top} droite=${droite} bas=${bas}`;
        }
      }
    }
  }
  verifier(`${nom} — aucun débordement`, 0, debordements);
  if (pire) console.log(`        premier cas : ${pire}`);
}

/* ---------------------------- Cas caractéristiques ---------------------------- */

const tel: Vue = { largeur: 390, hauteur: 844 };

console.log('\n  CAS CARACTÉRISTIQUES (téléphone 390 × 844)');
{
  // Le défaut signalé : un « ? » collé au bord droit.
  const p = positionBulle(bouton(360, 400), { width: 272, height: 60 }, tel);
  verifier('« ? » au bord droit → bulle ramenée dans l’écran', 390 - 272 - MARGE, p.left);
}
{
  const p = positionBulle(bouton(2, 400), { width: 272, height: 60 }, tel);
  verifier('« ? » au bord gauche → bulle à la marge', MARGE, p.left);
}
{
  const p = positionBulle(bouton(180, 400), { width: 100, height: 60 }, tel);
  verifier('« ? » au centre → bulle centrée sur lui', 180 + 9 - 50, p.left);
}
{
  // Place au-dessus : la bulle s'y met (comportement d'origine, préservé).
  const p = positionBulle(bouton(180, 400), { width: 100, height: 60 }, tel);
  verifier('bulle placée AU-DESSUS quand la place existe', 400 - 60 - 6, p.top);
}
{
  // Pas de place au-dessus : elle bascule en dessous.
  const p = positionBulle(bouton(180, 10), { width: 100, height: 60 }, tel);
  verifier('bulle basculée EN DESSOUS près du haut', 10 + 18 + 6, p.top);
}
{
  // Ni au-dessus ni en dessous : on plaque en haut plutôt que sous le clavier.
  const court: Vue = { largeur: 390, hauteur: 200 };
  const p = positionBulle(bouton(180, 20), { width: 100, height: 180 }, court);
  verifier('écran trop court → plaquée en haut', MARGE, p.top);
}
{
  // ⚠ Bulle plus large que l'écran : le bord GAUCHE doit rester visible,
  // c'est là que commence la lecture.
  const etroit: Vue = { largeur: 240, hauteur: 600 };
  const p = positionBulle(bouton(200, 300), { width: 272, height: 60 }, etroit);
  verifier('bulle plus large que l’écran → bord gauche préservé', MARGE, p.left);
}

console.log('');
console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
console.log('');
process.exitCode = echecs === 0 ? 0 : 1;
