/**
 * CONTRÔLES DU SIMULATEUR DE RENTABILITÉ.
 *   npm run verif:simulation
 *
 * ⚠ Ne touche à aucune base : fonctions pures.
 *
 * Ce qu'on démontre ici n'est pas qu'un total s'additionne — c'est que le
 * simulateur ne **flatte** pas. Un outil d'aide à la décision qui se trompe dans
 * le sens agréable est pire que pas d'outil du tout : il donne la confiance sans
 * la justesse, et la décision qu'il éclaire (publier sur les magasins) engage
 * 99 € par an, une commission permanente et plusieurs semaines de travail.
 *
 * Les trois façons de se tromper dans le bon sens sont donc contrôlées en
 * premier : oublier la commission, compter l'annuel à son prix entier, et
 * supposer que de nouveaux abonnés seraient tous mensuels.
 */
import {
  simuler,
  paliers,
  chargeMensuelle,
  enCentimes,
  ECHELONS,
  type ChargeSimulee,
  type ParamsSimulation,
} from '../lib/admin/simulation.ts';

let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `  (attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)})`}`,
  );
}

const charge = (libelle: string, euros: number, periode: 'mensuel' | 'annuel'): ChargeSimulee => ({
  id: libelle,
  libelle,
  montantCentimes: enCentimes(euros),
  periode,
  active: true,
  reelle: false,
});

const base: ParamsSimulation = {
  abonnesMensuels: 0,
  abonnesAnnuels: 0,
  charges: [],
  investissements: [],
  commissionPct: 0,
  partViaStorePct: 0,
  resiliationPct: 0,
};

console.log('\n  CHARGES — l’annuel se lit au mois');
verifier('une charge mensuelle passe telle quelle', 2000, chargeMensuelle([charge('Neon', 20, 'mensuel')]));
// ⚠ 99 €/an = 8,25 €/mois. L'inscrire à 99 € dans un total mensuel multiplie la
// charge par douze — l'erreur qui rend un point mort douze fois trop haut.
verifier('une charge annuelle est ramenée au douzième', 825, chargeMensuelle([charge('Apple', 99, 'annuel')]));
verifier('une charge décochée ne compte pas', 0, chargeMensuelle([{ ...charge('Neon', 20, 'mensuel'), active: false }]));
verifier('aucune charge', 0, chargeMensuelle([]));

console.log('\n  REVENU — l’annuel ne vaut pas douze mensuels');
// 49,90 € / 12 = 4,158… → 416 centimes. Un abonné annuel rapporte MOINS au mois
// qu'un mensuel (4,16 € contre 4,99 €) : ce sont les deux mois offerts.
verifier('un abonné mensuel', 499, simuler({ ...base, abonnesMensuels: 1 }).revenuBrutCentimes);
verifier('un abonné annuel, au mois', 416, simuler({ ...base, abonnesAnnuels: 1 }).revenuBrutCentimes);
verifier('l’annuel rapporte moins au mois que le mensuel', true, 416 < 499);

console.log('\n  COMMISSION — elle se retranche de chaque abonnement');
{
  const p = { ...base, abonnesMensuels: 100, commissionPct: 30, partViaStorePct: 100 };
  const r = simuler(p);
  verifier('brut de 100 mensuels', 49900, r.revenuBrutCentimes);
  verifier('30 % prélevés', 14970, r.commissionCentimes);
  verifier('net', 34930, r.revenuNetCentimes);
  // ⚠ LE CHIFFRE QUI DÉCIDE DU 2.0. À 30 % de commission, il faut 1/0,7 = 1,43
  // fois plus d'abonnés pour le même résultat. « Quelques-uns de plus » est
  // l'intuition fausse que ce simulateur existe pour corriger.
  // Charges calees EXACTEMENT sur ce que 100 mensuels rapportent hors commission
  // (100 x 4,99 = 499 EUR) : le point mort est alors 100 pile, et tout ecart
  // vient de la seule commission.
  const sans = simuler({ ...base, abonnesMensuels: 100, charges: [charge('X', 499, 'mensuel')] });
  const avec = simuler({ ...p, charges: [charge('X', 499, 'mensuel')] });
  verifier('sans commission, 100 abonnes couvrent pile', 0, sans.resultatCentimes);
  verifier('...et le point mort est bien 100', 100, sans.pointMort);
  verifier('avec 30 %, le même volume ne suffit plus', true, avec.resultatCentimes < 0);
  verifier('il faut 143 abonnés, pas 105', 143, avec.pointMort);
}

console.log('\n  COMMISSION — la part hors magasin est le vrai levier');
{
  // ⚠ Le taux ne dit rien seul. À 30 % mais avec seulement la moitié des
  // abonnements pris dans l'application, on ne perd que 15 %.
  const moitie = simuler({ ...base, abonnesMensuels: 100, commissionPct: 30, partViaStorePct: 50 });
  verifier('30 % sur la moitié = 15 % du revenu', 7485, moitie.commissionCentimes);
  const aucun = simuler({ ...base, abonnesMensuels: 100, commissionPct: 30, partViaStorePct: 0 });
  verifier('rien ne passe par le magasin : aucune commission', 0, aucun.commissionCentimes);
  const petit = simuler({ ...base, abonnesMensuels: 100, commissionPct: 15, partViaStorePct: 100 });
  verifier('taux petit éditeur (15 %)', 42415, petit.revenuNetCentimes);
}

console.log('\n  POINT MORT');
{
  const p = { ...base, charges: [charge('Serveur', 20, 'mensuel'), charge('Domaine', 12, 'annuel')] };
  // 20 € + 1 € = 21 € de charges ; 21 / 4,99 = 4,2 → 5 abonnés.
  verifier('charges mensuelles', 2100, simuler(p).chargeMensuelleCentimes);
  verifier('cinq abonnés suffisent', 5, simuler(p).pointMort);
  verifier('il en manque cinq', 5, simuler(p).resteAvantPointMort);
  verifier('avec trois, il en manque deux', 2, simuler({ ...p, abonnesMensuels: 3 }).resteAvantPointMort);
  // ⚠ Jamais de reste négatif : « il manque −3 abonnés » ne veut rien dire.
  verifier('au-delà, le reste est nul et non négatif', 0, simuler({ ...p, abonnesMensuels: 40 }).resteAvantPointMort);
  verifier('sans charge, le point mort est zéro', 0, simuler(base).pointMort);
  // ⚠ Cas où aucun volume ne sauve le modèle : on répond « impossible », pas un
  // grand nombre issu d'une division par zéro.
  verifier(
    'commission de 100 % : aucun nombre d’abonnés ne suffit',
    null,
    simuler({ ...p, commissionPct: 100, partViaStorePct: 100 }).pointMort,
  );
}

console.log('\n  INVESTISSEMENTS — ils se remboursent, ils ne pèsent pas');
{
  const inv = [{ id: 'a', libelle: 'Play Store', montantCentimes: 2500, actif: true }];
  const p = { ...base, abonnesMensuels: 10, investissements: inv };
  // ⚠ Un investissement NE DÉPLACE PAS le point mort : c'est ce qui le
  // distingue d'une charge. Les confondre ferait paraître un achat unique
  // éternellement pesant.
  verifier('le point mort ignore l’investissement', 0, simuler(p).pointMort);
  verifier('résultat mensuel inchangé', 4990, simuler(p).resultatCentimes);
  verifier('remboursé en un mois', 1, simuler(p).moisDeRemboursement);
  const gros = simuler({ ...p, investissements: [{ ...inv[0], montantCentimes: 100000 }] });
  verifier('1 000 € à 49,90 €/mois : 21 mois', 21, gros.moisDeRemboursement);
  // ⚠ On ne rembourse jamais un investissement en perdant de l'argent. `null`
  // et non « ∞ mois » : le simulateur doit dire « jamais », pas un nombre.
  const perte = simuler({ ...base, investissements: inv, charges: [charge('Serveur', 20, 'mensuel')] });
  verifier('à perte, aucun remboursement', null, perte.moisDeRemboursement);
  verifier('sans investissement, zéro mois', 0, simuler(base).moisDeRemboursement);
  verifier('un investissement décoché ne compte pas', 0, simuler({ ...base, investissements: [{ ...inv[0], actif: false }] }).investissementCentimes);
}

console.log('\n  PALIERS — le mix est conservé');
{
  // 20 mensuels + 5 annuels = 20 % d'annuels. À 100 abonnés, on doit retrouver
  // 20 annuels, pas 100 mensuels.
  const p = { ...base, abonnesMensuels: 20, abonnesAnnuels: 5 };
  const cent = paliers(p, [100])[0];
  const attendu = simuler({ ...p, abonnesMensuels: 80, abonnesAnnuels: 20 }).revenuNetCentimes;
  verifier('le palier respecte la proportion d’annuels', attendu, cent.revenuNetCentimes);
  // ⚠ Si le mix était ignoré, on lirait 100 × 4,99 € = 499 € au lieu de 448 €.
  verifier('et ne flatte donc pas le résultat', true, cent.revenuNetCentimes < 100 * 499);

  const avecCharges = paliers({ ...p, charges: [charge('Serveur', 50, 'mensuel')] }, ECHELONS);
  const franchis = avecCharges.filter((x) => x.franchit);
  verifier('un seul palier est marqué comme franchissant', 1, franchis.length);
  verifier('c’est le premier positif', true, franchis[0].resultatCentimes >= 0);
  const avant = avecCharges[avecCharges.indexOf(franchis[0]) - 1];
  verifier('celui d’avant est négatif', true, avant.resultatCentimes < 0);

  // ⚠ Aucun abonné aujourd'hui : le mix est indéfini. On ne doit pas diviser par
  // zéro ni supposer 100 % d'annuels — cas réel au lancement.
  const vierge = paliers(base, [10])[0];
  verifier('sans abonné, les paliers restent calculables', 10 * 499, vierge.revenuNetCentimes);
}

console.log('\n  BORNES — des saisies aberrantes ne cassent rien');
verifier('commission négative traitée comme nulle', 49900, simuler({ ...base, abonnesMensuels: 100, commissionPct: -50, partViaStorePct: 100 }).revenuBrutCentimes);
verifier('part au-delà de 100 % bornée', 34930, simuler({ ...base, abonnesMensuels: 100, commissionPct: 30, partViaStorePct: 300 }).revenuNetCentimes);
verifier('abonnés négatifs comptés zéro', 0, simuler({ ...base, abonnesMensuels: -5 }).revenuBrutCentimes);
verifier('abonnés décimaux tronqués', 499, simuler({ ...base, abonnesMensuels: 1.9 }).revenuBrutCentimes);

console.log('\n  CENTIMES — aucun flottant ne fuit');
{
  const r = simuler({ ...base, abonnesMensuels: 7, abonnesAnnuels: 3, commissionPct: 15, partViaStorePct: 40 });
  const entiers = [r.revenuBrutCentimes, r.commissionCentimes, r.revenuNetCentimes, r.resultatCentimes];
  verifier('tous les montants sont des entiers', true, entiers.every(Number.isInteger));
  verifier('net + commission = brut', r.revenuBrutCentimes, r.revenuNetCentimes + r.commissionCentimes);
}

console.log('\n  RÉSILIATION — elle ne touche PAS au résultat du mois');
{
  const p = { ...base, abonnesMensuels: 100, charges: [charge('Serveur', 200, 'mensuel')] };
  const sans = simuler(p);
  const avec = simuler({ ...p, resiliationPct: 5 });
  /*
   * ⚠ LE CONTRÔLE LE PLUS IMPORTANT DE CETTE SECTION. Le revenu encaissé ce
   * mois-ci est encaissé : retrancher les résiliations du résultat courant
   * serait un double comptage, et ferait mentir le simulateur dans le sens
   * pessimiste — l'erreur symétrique de l'oubli de commission. Si ce contrôle
   * tombe un jour, c'est que quelqu'un a « corrigé » le modèle dans le mauvais
   * sens.
   */
  verifier('le résultat du mois est identique', sans.resultatCentimes, avec.resultatCentimes);
  verifier('le revenu du mois est identique', sans.revenuNetCentimes, avec.revenuNetCentimes);
  verifier('le point mort est identique', sans.pointMort, avec.pointMort);
}

console.log('\n  RÉSILIATION — ce qu’elle change vraiment');
{
  const p = { ...base, abonnesMensuels: 100, resiliationPct: 5 };
  const r = simuler(p);
  verifier('5 %/mois : un abonné reste 20 mois', 20, r.dureeVieMois);
  verifier('valeur vie = 4,99 € × 20', 9980, r.valeurVieCentimes);
  verifier('il faut recruter 5 abonnés/mois pour tenir', 5, r.aRecruterParMois);

  const dur = simuler({ ...p, resiliationPct: 10 });
  verifier('10 %/mois : dix mois seulement', 10, dur.dureeVieMois);
  verifier('...et deux fois moins de valeur', 4990, dur.valeurVieCentimes);
  verifier('...et deux fois plus de recrutement', 10, dur.aRecruterParMois);

  // ⚠ « Infini » se dit, ne se chiffre pas. Un très grand nombre passerait pour
  // une donnée, alors que c'est l'absence de donnée.
  verifier('sans résiliation, la durée de vie est indéfinie', null, simuler({ ...p, resiliationPct: 0 }).dureeVieMois);
  verifier('...et la valeur vie aussi', null, simuler({ ...p, resiliationPct: 0 }).valeurVieCentimes);
  verifier('...et rien à recruter pour tenir', 0, simuler({ ...p, resiliationPct: 0 }).aRecruterParMois);

  // ⚠ Un demi-abonné ne se recrute pas : on arrondit vers le haut, sinon le
  // besoin réel est systématiquement sous-estimé.
  verifier('le recrutement s’arrondit vers le haut', 1, simuler({ ...base, abonnesMensuels: 3, resiliationPct: 5 }).aRecruterParMois);
  verifier('aucun abonné : rien à recruter', 0, simuler({ ...base, resiliationPct: 5 }).aRecruterParMois);
}

console.log('\n  RÉSILIATION — la commission ampute aussi la valeur vie');
{
  // ⚠ La valeur vie se calcule sur le revenu NET. La calculer sur le brut
  // surestimerait de 30 % ce qu'un abonné rapporte vraiment — et c'est ce
  // chiffre qui sert à décider combien on peut dépenser pour l'acquérir.
  const brut = simuler({ ...base, abonnesMensuels: 100, resiliationPct: 5 });
  const net = simuler({ ...base, abonnesMensuels: 100, resiliationPct: 5, commissionPct: 30, partViaStorePct: 100 });
  verifier('sans commission', 9980, brut.valeurVieCentimes);
  verifier('avec 30 %, la valeur vie fond d’autant', 6986, net.valeurVieCentimes);

  // Le mix compte : un annuel rapporte moins au mois, donc moins sur sa vie.
  const mixte = simuler({ ...base, abonnesMensuels: 50, abonnesAnnuels: 50, resiliationPct: 5 });
  verifier('mix moitié-moitié : entre les deux', true, mixte.valeurVieCentimes! < 9980 && mixte.valeurVieCentimes! > 8000);
  verifier('la base compte les deux types', 5, mixte.aRecruterParMois);
}

console.log('\n  PALIERS — le recrutement suit le volume');
{
  const g = paliers({ ...base, abonnesMensuels: 100, resiliationPct: 5 }, [100, 500]);
  verifier('100 abonnés : 5 à recruter', 5, g[0].aRecruterParMois);
  // ⚠ Le chiffre qui refroidit : un gros palier n'est pas un état stable.
  verifier('500 abonnés : 25 à recruter, chaque mois', 25, g[1].aRecruterParMois);
}

console.log('');
console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
console.log('');
process.exitCode = echecs === 0 ? 0 : 1;
