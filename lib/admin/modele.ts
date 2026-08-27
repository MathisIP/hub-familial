/**
 * MODÈLE ÉCONOMIQUE DE NESTYNC — fonctions pures, aucune base, aucun React.
 * ========================================================================
 *
 * Fusion de deux modèles qui existaient séparément et se contredisaient :
 *
 * 1. `docs/CALCULATEUR_ECO.html` — page autonome, riche côté **fiscal** (régime
 *    micro/société, URSSAF, ACRE, TVA, IS), côté **frais réels** (Stripe, coût
 *    d'infrastructure par abonné) et côté **résiliations** (taux séparés mensuel
 *    et annuel, correctement convertis). Il ignorait en revanche la commission
 *    des magasins, et travaillait sur un prix annuel périmé.
 * 2. Le simulateur de `/admin` — il apportait la commission des magasins, les
 *    investissements et les paliers, mais **surestimait la marge de 93 %** en
 *    ignorant TVA, URSSAF, frais Stripe et coût par abonné.
 *
 * ⚠ **UN SEUL MODÈLE DÉSORMAIS.** Deux calculs qui répondent différemment à la
 * même question sont pires que l'absence de calcul : on finit par croire celui
 * qui arrange. Ce fichier est la seule source.
 *
 * ⚠ **LES FRAIS DE PAIEMENT S'EXCLUENT, ILS NE S'ADDITIONNENT PAS.** Un
 * abonnement souscrit dans l'App Store est encaissé par Apple : il paie la
 * commission du magasin mais **jamais** les frais Stripe. Un abonnement pris sur
 * le site paie Stripe et aucune commission. Les additionner sur la même
 * souscription — ce que fait toute reprise naïve des deux modèles — surestime
 * les frais de la part passant par les magasins.
 *
 * ⚠ Tous les montants sont en **centimes entiers**. Un flottant finit toujours
 * par afficher 20,999999 €.
 */

/** Régime d'imposition. Change quels prélèvements s'appliquent. */
export type Regime = 'micro' | 'societe';

/**
 * Une charge récurrente relevée dans `comptes.json`, pour l'affichage du détail.
 *
 * ⚠ Le modèle ne travaille que sur **un total** (`chargesFixesCentimes`) : le
 * détail sert à SAVOIR CE QU'ON PAIE, pas à calculer. Confondre les deux
 * ouvrirait la porte à un total qui ne serait plus la somme de ses lignes.
 */
export type ChargeSimulee = {
  id: string;
  libelle: string;
  montantCentimes: number;
  periode: 'mensuel' | 'annuel';
  active: boolean;
  /** Vraie dépense relevée, par opposition à une hypothèse. */
  reelle: boolean;
};

/**
 * Seuils légaux 2026, en centimes de chiffre d'affaires annuel HT.
 * ⚠ Ce sont des seuils **de loi**, pas des réglages : ils sont affichés mais
 * jamais modifiables, sinon la page cesse d'alerter quand il faut.
 */
export const SEUIL_TVA_CENTIMES = 3_750_000; // 37 500 €
export const SEUIL_MICRO_CENTIMES = 7_770_000; // 77 700 €

export type ParametresEco = {
  // ---- Offre ------------------------------------------------------------
  /** Prix mensuel TTC, en centimes. */
  prixMensuelCentimes: number;
  /** Prix annuel TTC, en centimes. */
  prixAnnuelCentimes: number;
  /** Part des abonnés ayant choisi l'annuel (0–100). */
  partAnnuellePct: number;

  // ---- Fidélité ---------------------------------------------------------
  /**
   * Résiliations mensuelles des abonnés **mensuels** (0–100).
   * ⚠ Séparé de l'annuel à dessein : un abonné annuel ne peut pas partir en
   * cours d'année, il n'a de fenêtre de sortie qu'au renouvellement. Un taux
   * unique appliqué aux deux surestime l'érosion des annuels.
   */
  churnMensuelPct: number;
  /** Résiliations **annuelles** des abonnés annuels (0–100). */
  churnAnnuelPct: number;

  // ---- Fiscalité --------------------------------------------------------
  regime: Regime;
  /** Assujetti à la TVA. ⚠ Forcé à vrai en société : ce n'est pas un choix. */
  assujettiTva: boolean;
  tvaTauxPct: number;
  /** Cotisations sociales sur le CA HT, en micro-entreprise. */
  urssafPct: number;
  /** ACRE : exonération de moitié des cotisations la première année. */
  acre: boolean;
  /** Versement libératoire de l'impôt sur le revenu, en micro. */
  irPct: number;
  /** Impôt sur les sociétés, appliqué au bénéfice. */
  isPct: number;

  // ---- Frais ------------------------------------------------------------
  stripePct: number;
  stripeFixeCentimes: number;
  /** Coût d'infrastructure imputable à **un** abonné, par mois. */
  infraParAbonneCentimes: number;
  /** Stockage Documents consommé par abonné, en Go. */
  stockageGoParAbonne: number;
  /** Prix du Go stocké, par mois, en centimes. */
  prixGoCentimes: number;
  /** Charges fixes mensuelles (indépendantes du nombre d'abonnés). */
  chargesFixesCentimes: number;

  // ---- Canaux de souscription (le 2.0) ----------------------------------
  /*
   * ⚠ TROIS CANAUX, PAS DEUX, ET DES TAUX DIFFÉRENTS. Apple et Google ne
   * prennent pas la même chose sur un abonnement :
   *   · **Google Play : 15 %** sur tout revenu d'abonnement, depuis 2022, quel
   *     que soit le chiffre d'affaires.
   *   · **Apple : 30 %** la première année d'un abonné, **15 %** ensuite — ou
   *     15 % dès le départ via le Small Business Program (moins d'un million de
   *     dollars par an), le cas de Nestync au lancement.
   * Les fondre en un taux unique effacerait un écart qui peut atteindre le
   * double, et fausserait la décision de publier sur l'un plutôt que l'autre.
   *
   * ⚠ La part « site » n'est PAS un réglage : c'est le reste. Trois curseurs
   * libres permettraient un total différent de 100 %, donc un modèle faux sans
   * que rien ne le signale.
   */
  partAppStorePct: number;
  partPlayStorePct: number;
  commissionAppStorePct: number;
  commissionPlayStorePct: number;

  // ---- Croissance -------------------------------------------------------
  budgetPubMensuelCentimes: number;
  /** Coût d'acquisition d'un abonné (CAC). */
  coutAcquisitionCentimes: number;
};

/**
 * Décomposition de ce que devient **un** abonnement, du prix affiché à la marge.
 * ⚠ Chaque poste est exposé séparément parce que c'est ce qui permet de savoir
 * sur lequel agir. Un total net ne dit pas quoi faire.
 */
export type MargeAbonne = {
  prixTtcCentimes: number;
  tvaCentimes: number;
  htCentimes: number;
  commissionCentimes: number;
  stripeCentimes: number;
  urssafCentimes: number;
  irCentimes: number;
  infraCentimes: number;
  /** Marge sur la période (mois pour le mensuel, an pour l'annuel). */
  margePeriodeCentimes: number;
  /** La même, ramenée au mois — seule base de comparaison valable. */
  margeMensuelleCentimes: number;
  /** Prix ramené au mois. */
  prixMensuelEquivalentCentimes: number;
  /** Durée de vie en mois. */
  dureeVieMois: number;
  /** Valeur vie : marge de la période × nombre de périodes vécues. */
  valeurVieCentimes: number;
};

export type Economie = {
  mensuel: MargeAbonne;
  annuel: MargeAbonne;

  /** Marge mensuelle moyenne d'un abonné, au mix courant. */
  margeMoyenneCentimes: number;
  /** Valeur vie moyenne, au mix courant. */
  valeurVieMoyenneCentimes: number;
  /** Chiffre d'affaires HT moyen par abonné et par mois. */
  htMoyenParMoisCentimes: number;
  /** Prix moyen encaissé par abonné et par mois (base du MRR). */
  prixMoyenParMoisCentimes: number;

  /**
   * Résiliation mensuelle moyenne, en fraction (0–1).
   * ⚠ L'annuel est converti par `1 − (1 − taux)^(1/12)`, pas par une division
   * par douze : 25 %/an ne fait pas 2,08 %/mois mais 2,37 %.
   */
  churnMensuelMoyen: number;

  ratioValeurCout: number | null;
  /** Mois de marge pour rembourser l'acquisition d'un abonné. */
  moisRetourAcquisition: number | null;
  /** Abonnés nécessaires pour couvrir les charges fixes. */
  pointMort: number | null;
  /** Abonnés nécessaires en comptant aussi le budget publicitaire. */
  pointMortAvecPub: number | null;

  nouveauxParMois: number;
  perdusParMois: number;
  croissanceNetteParMois: number;
  /** Base maximale atteignable à budget publicitaire constant. */
  plafondAbonnes: number | null;
};

/** Ce qu'un effectif donné produit — le cœur des paliers. */
export type Bilan = {
  abonnes: number;
  abonnesMensuels: number;
  abonnesAnnuels: number;
  caHtAnnuelCentimes: number;
  mrrCentimes: number;
  /** Marge dégagée par les abonnés, avant charges fixes et publicité. */
  margeBruteMensuelleCentimes: number;
  chargesFixesMensuellesCentimes: number;
  publiciteMensuelleCentimes: number;
  /** Avant impôt sur les sociétés. */
  resultatAvantImpotMensuelCentimes: number;
  impotMensuelCentimes: number;
  resultatMensuelCentimes: number;
  resultatAnnuelCentimes: number;
  /** Résiliations à compenser à cet effectif. */
  aRecruterParMois: number;
  croissanceNetteParMois: number;
};

const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const c = (n: number) => Math.round(n);

/**
 * Répartition des souscriptions entre les trois canaux, en fractions (0–1).
 *
 * ⚠ **LE SITE EST LE RESTE, JAMAIS UN RÉGLAGE.** Trois curseurs indépendants
 * autoriseraient un total de 130 %, et le modèle facturerait des commissions sur
 * des abonnements qui n'existent pas. Ici, la somme vaut toujours exactement 1.
 * ⚠ Si les deux magasins dépassent 100 % à eux seuls, ils sont ramenés au
 * prorata — plutôt que de rendre la part du site négative.
 */
export function partsCanaux(p: ParametresEco): { site: number; apple: number; google: number } {
  let apple = borne(p.partAppStorePct, 0, 100) / 100;
  let google = borne(p.partPlayStorePct, 0, 100) / 100;
  const total = apple + google;
  if (total > 1) {
    apple /= total;
    google /= total;
  }
  /*
   * ⚠ PLANCHER À ZÉRO, ET CE N'EST PAS UNE COQUETTERIE. Après la remise au
   * prorata, `1 − apple − google` vaut zéro à un cheveu près — et ce cheveu peut
   * tomber du mauvais côté (0,8/1,4 + 0,6/1,4 dépasse 1 d'un milliardième de
   * milliardième). Une part négative multiplierait les frais Stripe par un
   * nombre négatif : le modèle GAGNERAIT de l'argent sur chaque encaissement.
   * Une erreur minuscule, mais dans le sens agréable — donc la pire espèce.
   */
  return { site: Math.max(0, 1 - apple - google), apple, google };
}

/** Euros décimaux → centimes entiers. */
export const enCentimes = (euros: number) => Math.round(euros * 100);

/**
 * Marge d'un abonnement, poste par poste.
 *
 * @param periodesParAn 1 pour l'annuel, 12 pour le mensuel — le nombre de fois
 *   que le prix est encaissé dans l'année. `moisParPeriode` en est l'inverse.
 */
function margeDe(
  prixTtc: number,
  moisParPeriode: number,
  churnFraction: number,
  p: ParametresEco,
): MargeAbonne {
  // ⚠ En société la TVA n'est pas optionnelle. Laisser le réglage décider
  // produirait un scénario qui n'existe pas légalement.
  const tvaActive = p.regime === 'societe' ? true : p.assujettiTva;
  const tauxTva = borne(p.tvaTauxPct, 0, 100) / 100;
  const ht = tvaActive ? prixTtc / (1 + tauxTva) : prixTtc;
  const tva = prixTtc - ht;

  /*
   * ⚠ FRAIS DE PAIEMENT : EXCLUSIFS, PAS CUMULATIFS. Apple et Google encaissent
   * eux-mêmes — ils prennent leur commission et Stripe n'intervient pas. Le site
   * fait l'inverse. Les additionner sur la même souscription, ce que produit
   * toute reprise naïve des deux modèles d'origine, surestime les frais de la
   * part passant par les magasins.
   */
  const { site, apple, google } = partsCanaux(p);
  const commission =
    prixTtc * (borne(p.commissionAppStorePct, 0, 100) / 100) * apple +
    prixTtc * (borne(p.commissionPlayStorePct, 0, 100) / 100) * google;
  const stripe = (prixTtc * (borne(p.stripePct, 0, 100) / 100) + p.stripeFixeCentimes) * site;

  // Cotisations et impôt sur le revenu : micro-entreprise uniquement, assis sur
  // le chiffre d'affaires HT. L'ACRE en exonère la moitié.
  const micro = p.regime === 'micro';
  const tauxUrssaf = (borne(p.urssafPct, 0, 100) / 100) * (p.acre ? 0.5 : 1);
  const urssaf = micro ? ht * tauxUrssaf : 0;
  const ir = micro ? ht * (borne(p.irPct, 0, 100) / 100) : 0;

  // Coût d'infrastructure : par abonné et par mois, donc multiplié par la durée
  // de la période. Un abonné annuel consomme douze mois de serveur d'un coup.
  const infraMois = p.infraParAbonneCentimes + p.stockageGoParAbonne * p.prixGoCentimes;
  const infra = infraMois * moisParPeriode;

  const margePeriode = ht - commission - stripe - urssaf - ir - infra;

  // ⚠ `1/churn` = nombre de PÉRIODES vécues, pas de mois. Pour l'annuel, une
  // période vaut douze mois : oublier la conversion divise la durée de vie
  // d'un annuel par douze.
  const periodesVecues = churnFraction > 0 ? 1 / churnFraction : 0;

  return {
    prixTtcCentimes: c(prixTtc),
    tvaCentimes: c(tva),
    htCentimes: c(ht),
    commissionCentimes: c(commission),
    stripeCentimes: c(stripe),
    urssafCentimes: c(urssaf),
    irCentimes: c(ir),
    infraCentimes: c(infra),
    margePeriodeCentimes: c(margePeriode),
    margeMensuelleCentimes: c(margePeriode / moisParPeriode),
    prixMensuelEquivalentCentimes: c(prixTtc / moisParPeriode),
    dureeVieMois: Math.round(periodesVecues * moisParPeriode),
    valeurVieCentimes: c(margePeriode * periodesVecues),
  };
}

export function calculerEconomie(p: ParametresEco): Economie {
  // ⚠ Plancher à 0,1 % : un taux de résiliation nul rendrait la durée de vie
  // infinie et contaminerait la valeur vie, le ratio et le plafond. Le
  // calculateur d'origine posait déjà ce plancher.
  const churnM = Math.max(borne(p.churnMensuelPct, 0, 100), 0.1) / 100;
  const churnA = Math.max(borne(p.churnAnnuelPct, 0, 100), 0.1) / 100;

  const mensuel = margeDe(p.prixMensuelCentimes, 1, churnM, p);
  const annuel = margeDe(p.prixAnnuelCentimes, 12, churnA, p);

  const wa = borne(p.partAnnuellePct, 0, 100) / 100;
  const wm = 1 - wa;

  const margeMoyenne = c(wa * annuel.margeMensuelleCentimes + wm * mensuel.margeMensuelleCentimes);
  const valeurVieMoyenne = c(wa * annuel.valeurVieCentimes + wm * mensuel.valeurVieCentimes);
  const htMoyen = c((wa * annuel.htCentimes) / 12 + wm * mensuel.htCentimes);
  const prixMoyen = c(
    wa * annuel.prixMensuelEquivalentCentimes + wm * mensuel.prixMensuelEquivalentCentimes,
  );

  /*
   * ⚠ CONVERSION DU TAUX ANNUEL. 25 %/an ne fait PAS 2,08 %/mois : la survie se
   * compose. `1 − (1 − 0,25)^(1/12)` = 2,37 %. Diviser par douze sous-estime
   * l'érosion et gonfle le plafond de croissance.
   */
  const churnMensuelMoyen = wa * (1 - Math.pow(1 - churnA, 1 / 12)) + wm * churnM;

  const cac = Math.max(0, p.coutAcquisitionCentimes);
  const pub = Math.max(0, p.budgetPubMensuelCentimes);
  const fixe = Math.max(0, p.chargesFixesCentimes);

  const ratioValeurCout = cac > 0 ? Math.round((valeurVieMoyenne / cac) * 100) / 100 : null;
  const moisRetourAcquisition = cac > 0 && margeMoyenne > 0 ? Math.ceil(cac / margeMoyenne) : null;
  const pointMort = margeMoyenne > 0 ? Math.ceil(fixe / margeMoyenne) : null;
  const pointMortAvecPub = margeMoyenne > 0 ? Math.ceil((fixe + pub) / margeMoyenne) : null;

  // ⚠ `floor` : on n'achète pas 3,7 abonnés.
  const nouveauxParMois = cac > 0 ? Math.floor(pub / cac) : 0;
  const plafondAbonnes = churnMensuelMoyen > 0 ? Math.floor(nouveauxParMois / churnMensuelMoyen) : null;

  return {
    mensuel,
    annuel,
    margeMoyenneCentimes: margeMoyenne,
    valeurVieMoyenneCentimes: valeurVieMoyenne,
    htMoyenParMoisCentimes: htMoyen,
    prixMoyenParMoisCentimes: prixMoyen,
    churnMensuelMoyen,
    ratioValeurCout,
    moisRetourAcquisition,
    pointMort,
    pointMortAvecPub,
    nouveauxParMois,
    // Sans effectif, ces deux-là n'ont de sens qu'au niveau d'un `Bilan`.
    perdusParMois: 0,
    croissanceNetteParMois: nouveauxParMois,
    plafondAbonnes,
  };
}

/** Ce que produit un effectif donné, impôt compris. */
export function bilanPour(n: number, p: ParametresEco, eco: Economie): Bilan {
  const abonnes = Math.max(0, Math.round(n));
  const wa = borne(p.partAnnuellePct, 0, 100) / 100;
  const abonnesAnnuels = Math.round(abonnes * wa);
  const abonnesMensuels = abonnes - abonnesAnnuels;

  const margeBrute = abonnes * eco.margeMoyenneCentimes;
  const fixe = Math.max(0, p.chargesFixesCentimes);
  const pub = Math.max(0, p.budgetPubMensuelCentimes);
  const avantImpot = margeBrute - fixe - pub;

  /*
   * ⚠ L'IMPÔT NE S'APPLIQUE QU'EN SOCIÉTÉ, ET SEULEMENT SUR UN BÉNÉFICE. En
   * micro, l'URSSAF et le versement libératoire sont DÉJÀ retranchés dans la
   * marge unitaire : les reprendre ici les compterait deux fois. Et un impôt
   * sur un résultat négatif n'existe pas — `Math.max(0, …)`.
   */
  const impot =
    p.regime === 'societe' ? Math.round(Math.max(0, avantImpot) * (borne(p.isPct, 0, 100) / 100)) : 0;
  const resultat = avantImpot - impot;

  const perdus = Math.ceil(abonnes * eco.churnMensuelMoyen);

  return {
    abonnes,
    abonnesMensuels,
    abonnesAnnuels,
    caHtAnnuelCentimes: abonnes * eco.htMoyenParMoisCentimes * 12,
    mrrCentimes: abonnes * eco.prixMoyenParMoisCentimes,
    margeBruteMensuelleCentimes: margeBrute,
    chargesFixesMensuellesCentimes: fixe,
    publiciteMensuelleCentimes: pub,
    resultatAvantImpotMensuelCentimes: avantImpot,
    impotMensuelCentimes: impot,
    resultatMensuelCentimes: resultat,
    resultatAnnuelCentimes: resultat * 12,
    aRecruterParMois: perdus,
    croissanceNetteParMois: eco.nouveauxParMois - perdus,
  };
}

/** Effectif à partir duquel un seuil de chiffre d'affaires annuel HT est franchi. */
export function abonnesPourCaHt(seuilCentimes: number, eco: Economie): number | null {
  const parAn = eco.htMoyenParMoisCentimes * 12;
  return parAn > 0 ? Math.ceil(seuilCentimes / parAn) : null;
}

/** Échelons proposés — resserrés en bas, où se joue la décision. */
export const ECHELONS = [5, 10, 25, 50, 100, 200, 350, 500, 750, 1000, 2000, 5000];
