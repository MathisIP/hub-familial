/**
 * CONTRÔLES DE LA SAISIE DE DATE (pose automatique des « / »).
 *   npm run verif:date
 *
 * ⚠ Ne touche à aucune base : ce sont des fonctions pures.
 *
 * Pourquoi ce fichier existe : un champ qui reformate à chaque frappe se casse
 * toujours de la même façon — l'effacement devient impossible, ou le curseur
 * saute à la fin dès qu'on corrige un chiffre au milieu. Ces deux défauts ne se
 * voient qu'en tapant, jamais à la lecture du code ni au build. On simule donc
 * la frappe, touche par touche.
 */
import { saisirDate, formaterDate, chiffresDate } from '../lib/date-saisie.ts';

let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `\n        attendu ${JSON.stringify(attendu)}\n        obtenu  ${JSON.stringify(obtenu)}`}`,
  );
}

/** Simule une frappe caractère par caractère, curseur toujours en fin. */
function taper(touches: string): string {
  let texte = '';
  for (const t of touches) {
    const brut = texte + t;
    texte = saisirDate(brut, brut.length, texte).texte;
  }
  return texte;
}

/** Simule N appuis sur « retour arrière », curseur en fin. */
function effacer(depuis: string, fois: number): string {
  let texte = depuis;
  for (let i = 0; i < fois; i++) {
    const brut = texte.slice(0, -1);
    texte = saisirDate(brut, brut.length, texte).texte;
  }
  return texte;
}

console.log('\n  FRAPPE — huit chiffres, aucun séparateur tapé');
verifier('27 → 27', '27', taper('27'));
verifier('270 → 27/0', '27/0', taper('270'));
verifier('2708 → 27/08', '27/08', taper('2708'));
verifier('27082026 → 27/08/2026', '27/08/2026', taper('27082026'));
verifier('déborde à huit chiffres', '27/08/2026', taper('270820269'));

console.log('\n  FRAPPE — la personne tape elle-même un séparateur');
verifier('27/08/2026 tapé en entier', '27/08/2026', taper('27/08/2026'));
verifier('27.08.2026 (le point du pavé numérique)', '27/08/2026', taper('27.08.2026'));
verifier('27-08-2026', '27/08/2026', taper('27-08-2026'));
verifier('« 27/ » garde sa barre sous les doigts', '27/', taper('27/'));

console.log('\n  EFFACEMENT — le piège classique du champ impossible à vider');
verifier('27/08/2026 moins 1', '27/08/202', effacer('27/08/2026', 1));
verifier('27/08/2026 moins 5', '27/0', effacer('27/08/2026', 5));
verifier('27/08/2026 moins 6', '27', effacer('27/08/2026', 6));
verifier('on peut tout effacer', '', effacer('27/08/2026', 10));
verifier('« 27/ » s’efface au lieu de se remettre', '27', effacer('27/', 1));

console.log('\n  COLLAGE');
verifier('collage ISO 2026-08-27', '27/08/2026', saisirDate('2026-08-27', 10, '').texte);
verifier('collage ISO non complété 2026-8-7', '07/08/2026', saisirDate('2026-8-7', 8, '').texte);
verifier('collage déjà au bon format', '27/08/2026', saisirDate('27/08/2026', 10, '').texte);
verifier('collage avec espaces parasites', '27/08/2026', saisirDate(' 27 08 2026 ', 12, '').texte);

console.log('\n  CURSEUR — corriger un chiffre au milieu');
{
  // « 27/08/2026 », curseur juste après le « 8 » (position 5), on efface le 8.
  const r = saisirDate('27/0/2026', 4, '27/08/2026');
  verifier('effacer le mois laisse le curseur sur place', { texte: '27/02/026', caret: 4 }, r);
}
{
  // Retaper un chiffre au même endroit doit le replacer juste après.
  const r = saisirDate('27/09/2026', 5, '27/0/2026');
  verifier('retaper le chiffre replace le curseur après', 5, r.caret);
}

console.log('\n  FONCTIONS DE BASE');
verifier('chiffresDate ignore le texte', '2708', chiffresDate('27a08'));
verifier('formaterDate sur zéro chiffre', '', formaterDate(''));
verifier('formaterDate ne finit jamais par « / »', false, /\/$/.test(formaterDate('2708')));

console.log('');
console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
console.log('');
process.exitCode = echecs === 0 ? 0 : 1;
