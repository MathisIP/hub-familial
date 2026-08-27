/**
 * CONTRÔLES DES QUANTITÉS DE RECETTE (fractions).
 *   npm run verif:quantites
 *
 * ⚠ Ne touche à aucune base : fonctions pures.
 *
 * Ce qu'on démontre ici n'est pas qu'une fraction se lit — c'est que le
 * VA-ET-VIENT est stable. Une quantité qui change d'écriture entre deux
 * ouvertures de l'éditeur finit par être « corrigée » à la main, et c'est ainsi
 * qu'une recette se déforme sans que personne n'ait rien cassé.
 */
import { parseQuantite, formatQuantite, mettreALechelle } from '../lib/repas/schema.ts';

let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `  (attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)})`}`,
  );
}

console.log('\n  LECTURE — le défaut corrigé');
// ⚠ Le cas d'origine : parseFloat('1/2') vaut 1, sans erreur.
verifier('« 1/2 » vaut bien 0,5 et non 1', 0.5, parseQuantite('1/2'));
verifier('« 3/4 »', 0.75, parseQuantite('3/4'));
verifier('« 1 1/2 » (entier + fraction)', 1.5, parseQuantite('1 1/2'));
verifier('« 2 1/4 »', 2.25, parseQuantite('2 1/4'));
verifier('espaces autour de la barre', 0.5, parseQuantite('1 / 2'));

console.log('\n  LECTURE — formes décimales, inchangées');
verifier('« 0,5 » (virgule française)', 0.5, parseQuantite('0,5'));
verifier('« 1.5 » (point)', 1.5, parseQuantite('1.5'));
verifier('« 400 »', 400, parseQuantite('400'));
verifier('vide → non chiffré', null, parseQuantite(''));

console.log('\n  LECTURE — ce qui doit être refusé');
// ⚠ Avant, « 2 citrons » donnait 2 : parseFloat s'arrête au premier caractère
// qu'il ne comprend pas. Une unité tapée dans le champ quantité passait donc
// pour un nombre valide.
verifier('« 2 citrons » n’est pas un nombre', null, parseQuantite('2 citrons'));
verifier('« selon goût »', null, parseQuantite('selon goût'));
verifier('⚠ « 1/0 » ne devient pas l’infini', null, parseQuantite('1/0'));

console.log('\n  ÉCRITURE — les fractions se relisent');
verifier('0,5 s’écrit « 1/2 »', '1/2', formatQuantite(0.5));
verifier('0,25 s’écrit « 1/4 »', '1/4', formatQuantite(0.25));
verifier('0,75 s’écrit « 3/4 »', '3/4', formatQuantite(0.75));
verifier('1,5 s’écrit « 1 1/2 » et non « 3/2 »', '1 1/2', formatQuantite(1.5));
verifier('un tiers', '1/3', formatQuantite(1 / 3));
verifier('400 reste « 400 »', '400', formatQuantite(400));
// ⚠ Attente corrigée après coup : 3,33 EST à un millième d'un tiers, et
// « 3 1/3 » se lit mieux dans une recette. Le va-et-vient reste stable, ce qui
// est le seul critère qui compte ici.
verifier('3,33 s’écrit « 3 1/3 »', '3 1/3', formatQuantite(3.33));
verifier('3,4 n’est proche d’aucune fraction', '3,4', formatQuantite(3.4));
verifier('non chiffré → vide', '', formatQuantite(null));

console.log('\n  VA-ET-VIENT — ce qu’on affiche doit se resaisir à l’identique');
for (const saisie of ['1/2', '3/4', '1 1/2', '2 1/4', '1/3', '400', '0,5', '2,5']) {
  const aller = parseQuantite(saisie);
  const retour = formatQuantite(aller);
  const stable = parseQuantite(retour) === aller;
  verifier(`« ${saisie} » → ${aller} → « ${retour} » → stable`, true, stable);
}

console.log('\n  MISE À L’ÉCHELLE — une fraction se multiplie comme un nombre');
{
  const ing = [{ article: 'Citron', quantite: 0.5, unite: '', rayon: 'Fruits & légumes' }];
  // ⚠ Signature : (ingrédients, personnesBASE, personnesJOUR) — dans cet ordre.
  // Les intervertir donne un résultat parfaitement plausible et faux : une
  // recette pour 2 servie à 4 rendrait des demi-portions au lieu du double.
  // Recette pour 2, servie à 4 : le demi-citron devient un citron entier.
  verifier('1/2 pour 2 → 1 pour 4', 1, mettreALechelle(ing, 2, 4)[0].quantite);
  verifier('1/2 pour 2 → 1/4 pour 1', 0.25, mettreALechelle(ing, 2, 1)[0].quantite);
  verifier('… et 1/4 s’écrit bien', '1/4', formatQuantite(mettreALechelle(ing, 2, 1)[0].quantite));
}

console.log('');
console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
console.log('');
process.exitCode = echecs === 0 ? 0 : 1;
