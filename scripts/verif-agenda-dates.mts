/**
 * CONTRÔLES DES CALCULS DE CALENDRIER (vues jour / semaine / mois).
 *   npm run verif:agenda
 *
 * ⚠ Ne touche à aucune base : fonctions pures.
 *
 * Pourquoi ce fichier existe : le composant d'exemple qui a inspiré ces vues
 * contenait exactement le défaut qu'on teste ici — un début de semaine calculé
 * à l'anglo-saxonne, qui décale tout l'affichage d'un jour. Ce genre d'erreur ne
 * se voit ni au build, ni à la relecture : il faut poser des dates connues et
 * regarder ce qui sort.
 */
import {
  debutSemaine,
  joursSemaine,
  grilleMois,
  decalerMois,
  decalerJours,
  debutMois,
  fenetreAgenda,
} from '../lib/agenda/schema.ts';

let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `\n        attendu ${JSON.stringify(attendu)}\n        obtenu  ${JSON.stringify(obtenu)}`}`,
  );
}

console.log('\n  SEMAINE — commence le LUNDI');
// Le 27/08/2026 est un jeudi.
verifier('un jeudi remonte au lundi', '2026-08-24', debutSemaine('2026-08-27'));
verifier('un lundi ne bouge pas', '2026-08-24', debutSemaine('2026-08-24'));
// ⚠ Le cas qui attrape la formule anglo-saxonne : un dimanche appartient à la
// semaine qui COMMENCE, pas à celle qui suit.
verifier('un dimanche appartient à la semaine écoulée', '2026-08-24', debutSemaine('2026-08-30'));
verifier('sept jours, lundi → dimanche', ['2026-08-24', '2026-08-30'], [
  joursSemaine('2026-08-27')[0],
  joursSemaine('2026-08-27')[6],
]);
verifier('une semaine fait bien 7 jours', 7, joursSemaine('2026-08-27').length);

console.log('\n  MOIS — navigation sans débordement');
verifier('août → septembre', '2026-09-01', decalerMois('2026-08-27', 1));
// ⚠ Le piège de `setMonth` : le 31 mars moins un mois donnerait le 3 mars,
// février n'ayant pas de 31.
verifier('31 mars moins un mois reste en février', '2026-02-01', decalerMois('2026-03-31', -1));
verifier('31 mai plus un mois reste en juin', '2026-06-01', decalerMois('2026-05-31', 1));
verifier('janvier moins un mois change d’année', '2025-12-01', decalerMois('2026-01-15', -1));
verifier('premier du mois', '2026-08-01', debutMois('2026-08-27'));

console.log('\n  GRILLE DU MOIS');
{
  // Août 2026 : le 1er est un samedi, le 31 un lundi.
  const g = grilleMois('2026-08-15');
  verifier('commence un lundi', '2026-07-27', g[0][0]);
  verifier('couvre le 1er du mois', true, g[0].includes('2026-08-01'));
  verifier('couvre le dernier jour du mois', true, g.flat().includes('2026-08-31'));
  verifier('chaque semaine fait 7 jours', true, g.every((s) => s.length === 7));
  verifier('se termine un dimanche', 0, new Date(g[g.length - 1][6] + 'T12:00').getDay());
}
{
  // Février 2027 : 28 jours commençant un lundi — le mois le plus court possible.
  const g = grilleMois('2027-02-10');
  verifier('février 2027 tient en 4 semaines', 4, g.length);
  verifier('sans jour d’un autre mois', true, g.flat().every((j) => j.startsWith('2027-02')));
}
{
  // ⚠ Un mois de 31 jours commençant un dimanche déborde sur 6 semaines.
  const g = grilleMois('2026-11-10'); // novembre 2026 commence un dimanche
  verifier('novembre 2026 demande 6 semaines', 6, g.length);
}

console.log('\n  FENÊTRE DE CHARGEMENT');
verifier('jour', { debut: '2026-08-27', fin: '2026-08-27' }, fenetreAgenda('jour', '2026-08-27'));
verifier('semaine', { debut: '2026-08-24', fin: '2026-08-30' }, fenetreAgenda('semaine', '2026-08-27'));
verifier(
  'mois — déborde sur les semaines complètes',
  { debut: '2026-07-27', fin: '2026-09-06' },
  fenetreAgenda('mois', '2026-08-15'),
);

console.log('\n  DÉCALAGES SIMPLES');
verifier('changement de mois', '2026-09-01', decalerJours('2026-08-31', 1));
verifier('changement d’année', '2026-01-01', decalerJours('2025-12-31', 1));
verifier('année bissextile', '2028-02-29', decalerJours('2028-02-28', 1));

console.log('');
console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
console.log('');
process.exitCode = echecs === 0 ? 0 : 1;
