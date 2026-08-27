/**
 * CONTRÔLES DU MODÈLE ÉCONOMIQUE.
 *   npm run verif:eco
 *
 * ⚠ Ne touche à aucune base : fonctions pures.
 *
 * Ce script existe parce que le modèle précédent était FAUX et que rien ne le
 * disait. Il ignorait la TVA, l'URSSAF, les frais Stripe et le coût
 * d'infrastructure par abonné : il annonçait 4,99 € de marge là où il y en a
 * 2,58. Tous les points morts affichés étaient deux fois trop optimistes, et
 * c'est précisément le genre d'erreur qu'un build vert ne voit jamais.
 *
 * On contrôle donc en priorité les façons de se tromper **dans le sens
 * agréable** : oublier un prélèvement, compter l'annuel à son prix entier,
 * additionner des frais qui s'excluent, ou diviser un taux annuel par douze.
 */
import {
  calculerEconomie,
  bilanPour,
  partsCanaux,
  abonnesPourCaHt,
  enCentimes,
  SEUIL_TVA_CENTIMES,
  type ParametresEco,
} from '../lib/admin/modele.ts';
import { PARAMS_DEFAUT, normaliserParams } from '../lib/admin/parametres.ts';
import { analyserLeviers, type EtatReel } from '../lib/admin/leviers.ts';

let echecs = 0;
function verifier(intitule: string, attendu: unknown, obtenu: unknown) {
  const ok = JSON.stringify(attendu) === JSON.stringify(obtenu);
  if (!ok) echecs++;
  console.log(
    `${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `  (attendu ${JSON.stringify(attendu)}, obtenu ${JSON.stringify(obtenu)})`}`,
  );
}
function proche(intitule: string, attendu: number, obtenu: number, tolerance = 1) {
  const ok = Math.abs(attendu - obtenu) <= tolerance;
  if (!ok) echecs++;
  console.log(`${ok ? '  ok  ' : '  NON '} ${intitule}${ok ? '' : `  (attendu ~${attendu}, obtenu ${obtenu})`}`);
}

const P = (modif: Partial<ParametresEco> = {}): ParametresEco => ({ ...PARAMS_DEFAUT, ...modif });

console.log('\n  PRIX — la source fait autorité, pas une copie');
// ⚠ Le calculateur d'origine portait 47,90 € en dur. Le tarif est à 49,90 €
// depuis le 13/08/2026 : une valeur recopiée finit toujours par diverger.
verifier('prix mensuel repris de lib/offres', 499, PARAMS_DEFAUT.prixMensuelCentimes);
verifier('prix annuel à jour (49,90 €, pas 47,90 €)', 4990, PARAMS_DEFAUT.prixAnnuelCentimes);

console.log('\n  MARGE — tous les prélèvements sont là');
{
  // Franchise de TVA, micro, sans magasin : le cas réel d'aujourd'hui.
  const eco = calculerEconomie(P());
  const m = eco.mensuel;
  verifier('pas de TVA en franchise', 0, m.tvaCentimes);
  verifier('HT = TTC', 499, m.htCentimes);
  proche('URSSAF 24,6 % du HT', 123, m.urssafCentimes);
  proche('Stripe 1,5 % + 0,25 €', 32, m.stripeCentimes);
  proche('infra 0,20 € + 2 Go × 0,015 €', 23, m.infraCentimes);
  verifier('aucune commission sans magasin', 0, m.commissionCentimes);
  // ⚠ LE CHIFFRE CENTRAL : 3,21 € et non 4,99 €. L'ancien simulateur affichait
  // le prix entier comme s'il tombait dans la poche.
  proche('marge réelle ≈ 3,21 €', 321, m.margeMensuelleCentimes);
  verifier('l’ancien modèle surestimait', true, m.margeMensuelleCentimes < 400);
}

console.log('\n  TVA — le décrochage le plus brutal');
{
  const eco = calculerEconomie(P({ assujettiTva: true }));
  const m = eco.mensuel;
  proche('HT = 4,99 / 1,20', 416, m.htCentimes);
  proche('TVA prélevée', 83, m.tvaCentimes);
  // ⚠ L'URSSAF s'assied sur le HT, donc elle baisse aussi : la TVA ne coûte pas
  // 16,7 % de la marge mais moins. Un modèle qui l'appliquerait au TTC serait
  // trop pessimiste — l'erreur inverse, tout aussi fausse.
  proche('URSSAF recalculée sur le HT', 102, m.urssafCentimes);
  proche('marge ≈ 2,58 €', 258, m.margeMensuelleCentimes);
}

console.log('\n  SOCIÉTÉ — la TVA n’est plus un choix');
{
  // ⚠ `assujettiTva: false` est ignoré en société : le réglage décrirait un
  // scénario qui n'existe pas légalement.
  const eco = calculerEconomie(P({ regime: 'societe', assujettiTva: false }));
  proche('TVA appliquée malgré le réglage', 83, eco.mensuel.tvaCentimes);
  verifier('aucune URSSAF en société', 0, eco.mensuel.urssafCentimes);
  verifier('aucun versement libératoire', 0, eco.mensuel.irCentimes);
}

console.log('\n  ACRE');
{
  const sans = calculerEconomie(P());
  const avec = calculerEconomie(P({ acre: true }));
  proche('cotisations de moitié', Math.round(sans.mensuel.urssafCentimes / 2), avec.mensuel.urssafCentimes);
  verifier('donc une meilleure marge', true, avec.mensuel.margeMensuelleCentimes > sans.mensuel.margeMensuelleCentimes);
}

console.log('\n  ANNUEL — douze mois d’un coup, pas douze fois le prix');
{
  const eco = calculerEconomie(P());
  const a = eco.annuel;
  verifier('prix ramené au mois', 416, a.prixMensuelEquivalentCentimes);
  // ⚠ L'infra se paie douze mois : un annuel consomme du serveur toute l'année.
  proche('infra sur douze mois', 276, a.infraCentimes);
  // ⚠ UNE SEULE ponction fixe Stripe au lieu de douze — l'argument concret de
  // l'annuel, invisible si l'on raisonne en prix mensuel.
  proche('une seule part fixe Stripe', 100, a.stripeCentimes);
  verifier('l’annuel économise onze ponctions fixes', true, a.stripeCentimes < eco.mensuel.stripeCentimes * 12);
  // 25 %/an ⇒ 4 renouvellements ⇒ 48 mois de vie.
  verifier('durée de vie de 48 mois', 48, a.dureeVieMois);
  verifier('un mensuel à 5 %/mois vit 20 mois', 20, eco.mensuel.dureeVieMois);
  // ⚠ LE LEVIER SOUS-ESTIMÉ : malgré deux mois offerts, l'annuel vaut bien plus.
  verifier('la valeur vie d’un annuel dépasse celle d’un mensuel', true, a.valeurVieCentimes > eco.mensuel.valeurVieCentimes);
}

console.log('\n  RÉSILIATION — un taux annuel ne se divise pas par douze');
{
  const eco = calculerEconomie(P({ partAnnuellePct: 100, churnAnnuelPct: 25 }));
  // ⚠ 25 %/an ne fait PAS 2,08 %/mois : la survie se compose.
  // 1 − (1 − 0,25)^(1/12) = 2,37 %.
  proche('conversion composée (2,37 %)', 237, Math.round(eco.churnMensuelMoyen * 10000));
  verifier('et non une division par douze (2,08 %)', true, eco.churnMensuelMoyen > 0.0208);
}

console.log('\n  MAGASINS — les frais s’excluent, ils ne s’additionnent pas');
{
  const site = calculerEconomie(P());
  // 100 % App Store : plus aucun frais Stripe, mais 15 % de commission.
  const apple = calculerEconomie(P({ partAppStorePct: 100 }));
  verifier('aucun frais Stripe si tout passe par Apple', 0, apple.mensuel.stripeCentimes);
  proche('commission Apple 15 %', 75, apple.mensuel.commissionCentimes);
  // ⚠ Le contrôle qui compte : additionner les deux surestimerait les frais.
  verifier(
    'la commission ne s’ajoute pas aux frais Stripe',
    true,
    apple.mensuel.commissionCentimes + apple.mensuel.stripeCentimes < 75 + site.mensuel.stripeCentimes,
  );

  // Google Play : 15 % sur les abonnements depuis 2022, sans condition.
  const google = calculerEconomie(P({ partPlayStorePct: 100, commissionPlayStorePct: 15 }));
  proche('commission Google 15 %', 75, google.mensuel.commissionCentimes);

  // Apple hors Small Business Program : 30 %.
  const cher = calculerEconomie(P({ partAppStorePct: 100, commissionAppStorePct: 30 }));
  proche('Apple à 30 %', 150, cher.mensuel.commissionCentimes);
  verifier('deux fois plus cher que Google', true, cher.mensuel.commissionCentimes === 2 * google.mensuel.commissionCentimes);

  // Mélange des trois canaux.
  const mixte = calculerEconomie(P({ partAppStorePct: 30, partPlayStorePct: 20 }));
  proche('commission pondérée sur 50 % de la base', 37, mixte.mensuel.commissionCentimes);
  proche('Stripe sur la moitié restante', 16, mixte.mensuel.stripeCentimes);
}

console.log('\n  CANAUX — la part du site est le reste, jamais un réglage');
{
  verifier('rien dans les magasins : tout au site', { site: 1, apple: 0, google: 0 }, partsCanaux(P()));
  {
    // ⚠ Comparaison approchée : ces parts sont des fractions flottantes, pas des
    // centimes. Exiger l'égalité stricte ferait échouer le contrôle sur un
    // milliardième sans qu'aucun euro ne bouge.
    const trois = partsCanaux(P({ partAppStorePct: 30, partPlayStorePct: 20 }));
    proche('moitié pour le site', 0.5, trois.site, 1e-9);
    proche('30 % Apple', 0.3, trois.apple, 1e-9);
    proche('20 % Google', 0.2, trois.google, 1e-9);
  }
  // ⚠ Trois curseurs libres autoriseraient 130 % et feraient facturer des
  // commissions sur des abonnements qui n'existent pas. On ramène au prorata.
  const trop = partsCanaux(P({ partAppStorePct: 80, partPlayStorePct: 60 }));
  proche('total ramené à 100 %', 1, trop.apple + trop.google + trop.site, 0.001);
  verifier('la part du site ne devient jamais négative', true, trop.site >= 0);
}

console.log('\n  BILAN — l’impôt ne se compte qu’une fois');
{
  const p = P({ chargesFixesCentimes: enCentimes(40) });
  const eco = calculerEconomie(p);
  const b = bilanPour(100, p, eco);
  // ⚠ En micro, URSSAF et versement libératoire sont DÉJÀ dans la marge
  // unitaire : les reprendre au bilan les compterait deux fois.
  verifier('aucun impôt supplémentaire en micro', 0, b.impotMensuelCentimes);
  verifier('résultat = marge − charges', b.margeBruteMensuelleCentimes - 4000, b.resultatMensuelCentimes);

  const soc = P({ regime: 'societe', chargesFixesCentimes: enCentimes(40) });
  const ecoS = calculerEconomie(soc);
  const bs = bilanPour(100, soc, ecoS);
  verifier('IS de 25 % du bénéfice', Math.round(bs.resultatAvantImpotMensuelCentimes * 0.25), bs.impotMensuelCentimes);

  // ⚠ Un impôt sur une perte n'existe pas.
  const perte = bilanPour(1, soc, ecoS);
  verifier('résultat négatif : aucun impôt', 0, perte.impotMensuelCentimes);
  verifier('et le résultat reste négatif', true, perte.resultatMensuelCentimes < 0);
}

console.log('\n  SEUILS LÉGAUX');
{
  const eco = calculerEconomie(P());
  const n = abonnesPourCaHt(SEUIL_TVA_CENTIMES, eco);
  verifier('un nombre d’abonnés est calculable', true, typeof n === 'number' && n > 0);
  // Vérification croisée : à ce nombre, le CA doit dépasser le seuil ; un de
  // moins doit rester en dessous.
  verifier('le seuil est franchi à ce palier', true, bilanPour(n!, P(), eco).caHtAnnuelCentimes >= SEUIL_TVA_CENTIMES);
  verifier('mais pas au palier précédent', true, bilanPour(n! - 1, P(), eco).caHtAnnuelCentimes < SEUIL_TVA_CENTIMES);
}

console.log('\n  CROISSANCE');
{
  const p = P({ budgetPubMensuelCentimes: enCentimes(300), coutAcquisitionCentimes: enCentimes(12.5) });
  const eco = calculerEconomie(p);
  verifier('300 € à 12,50 € l’abonné : 24 par mois', 24, eco.nouveauxParMois);
  // ⚠ Le plafond que personne ne calcule : le budget apporte un nombre FIXE de
  // nouveaux, les départs croissent avec la base. À l'intersection, ça s'arrête.
  verifier('un plafond existe', true, (eco.plafondAbonnes ?? 0) > 0);
  const auPlafond = bilanPour(eco.plafondAbonnes!, p, eco);
  verifier('au plafond, la croissance est nulle ou négative', true, auPlafond.croissanceNetteParMois <= 0);
  const enDessous = bilanPour(Math.floor(eco.plafondAbonnes! / 2), p, eco);
  verifier('en dessous, elle est positive', true, enDessous.croissanceNetteParMois > 0);
  // ⚠ On n'achète pas 3,7 abonnés.
  verifier('budget insuffisant : zéro nouveau', 0, calculerEconomie(P({ budgetPubMensuelCentimes: 500, coutAcquisitionCentimes: 1250 })).nouveauxParMois);
}

console.log('\n  DURABILITÉ DES SCÉNARIOS');
{
  // ⚠ CE CONTRÔLE PROTÈGE LES HYPOTHÈSES DE MATHIS. Un scénario enregistré avant
  // l'ajout d'un paramètre doit se relire sans NaN : sinon la page afficherait
  // des tirets et l'hypothèse paraîtrait perdue alors qu'il ne manque qu'un champ.
  const ancien = { prixMensuelCentimes: 499, partAnnuellePct: 45 };
  const rempli = normaliserParams(ancien);
  verifier('la valeur enregistrée est conservée', 45, rempli.partAnnuellePct);
  verifier('les champs absents prennent le défaut', PARAMS_DEFAUT.urssafPct, rempli.urssafPct);
  verifier('aucun NaN ne sort du modèle', true, Number.isFinite(calculerEconomie(rempli).margeMoyenneCentimes));
  verifier('une saisie absurde est ignorée', PARAMS_DEFAUT.tvaTauxPct, normaliserParams({ tvaTauxPct: 'vingt' }).tvaTauxPct);
  verifier('un objet vide donne les défauts', PARAMS_DEFAUT.regime, normaliserParams({}).regime);
  verifier('null ne casse rien', true, Number.isFinite(calculerEconomie(normaliserParams(null)).margeMoyenneCentimes));
}

console.log('\n  LEVIERS — chiffrés sur les vrais nombres, et classés');
{
  const etat: EtatReel = {
    abonnes: 10, foyers: 14, foyersEnEssai: 6, essaisQuiExpirent: 2,
    comptesSansFoyer: 5, foyersJamaisVenus: 1, foyersActifs30j: 11,
    impayes: 1, messagesNonTraites: 1,
  };
  const p = P({ budgetPubMensuelCentimes: enCentimes(300), coutAcquisitionCentimes: enCentimes(12.5) });
  const l = analyserLeviers(p, calculerEconomie(p), etat);
  verifier('des leviers sont proposés', true, l.length > 0);
  // ⚠ L'ordre EST le message : un blocage passe devant toute opportunité.
  const rang = { blocage: 0, action: 1, veille: 2 } as const;
  verifier('les blocages viennent en premier', true, l.every((x, i) => i === 0 || rang[l[i - 1].urgence] <= rang[x.urgence]));
  verifier('les impayés sont détectés', true, l.some((x) => x.id === 'impayes'));
  verifier('les essais qui expirent aussi', true, l.some((x) => x.id === 'essais'));

  // Un modèle sain ne doit pas déclencher le blocage publicitaire.
  const sain = P({ coutAcquisitionCentimes: 500 });
  verifier('ratio confortable : aucun blocage de publicité', false, analyserLeviers(sain, calculerEconomie(sain), etat).some((x) => x.id === 'ratio-sous-1'));

  // ⚠ Un coût d'acquisition absurde doit bloquer, pas être avalé en silence.
  const ruineux = P({ coutAcquisitionCentimes: enCentimes(500) });
  const bloque = analyserLeviers(ruineux, calculerEconomie(ruineux), etat);
  verifier('acquisition ruineuse : signalée comme blocage', true, bloque.some((x) => x.id === 'ratio-sous-1' && x.urgence === 'blocage'));
  /*
   * ⚠ Sans budget publicitaire engagé, « ne dépense pas » est un avertissement ;
   * un impayé est de l'argent qui manque déjà. Le tri par gain chiffré place donc
   * l'impayé devant, et c'est le bon ordre — l'attente initiale de ce contrôle
   * était fausse, pas le classement.
   */
  const ruineuxAvecPub = P({ coutAcquisitionCentimes: enCentimes(500), budgetPubMensuelCentimes: enCentimes(300) });
  const bloquePub = analyserLeviers(ruineuxAvecPub, calculerEconomie(ruineuxAvecPub), etat);
  verifier('budget engagé à perte : ce blocage passe en tête', 'ratio-sous-1', bloquePub[0].id);

  // Tout va bien : rien d'alarmant ne doit être inventé.
  const calme: EtatReel = { ...etat, impayes: 0, messagesNonTraites: 0, essaisQuiExpirent: 0, comptesSansFoyer: 0, foyersJamaisVenus: 0 };
  verifier('rien à traiter : aucun blocage', 0, analyserLeviers(sain, calculerEconomie(sain), calme).filter((x) => x.urgence === 'blocage').length);
}

console.log('\n  CENTIMES — aucun flottant ne fuit');
{
  const eco = calculerEconomie(P({ assujettiTva: true, partAppStorePct: 33, partPlayStorePct: 17 }));
  const champs = [
    eco.mensuel.htCentimes, eco.mensuel.tvaCentimes, eco.mensuel.commissionCentimes,
    eco.mensuel.stripeCentimes, eco.mensuel.margeMensuelleCentimes,
    eco.margeMoyenneCentimes, eco.valeurVieMoyenneCentimes,
  ];
  verifier('tous les montants sont entiers', true, champs.every(Number.isInteger));
  const b = bilanPour(137, P(), calculerEconomie(P()));
  verifier('le bilan aussi', true, [b.mrrCentimes, b.resultatMensuelCentimes, b.impotMensuelCentimes].every(Number.isInteger));
}

console.log('');
console.log(echecs === 0 ? '  ✅ tous les contrôles passent' : `  ✖ ${echecs} contrôle(s) en échec`);
console.log('');
process.exitCode = echecs === 0 ? 0 : 1;
