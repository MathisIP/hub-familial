/**
 * SIMULATEUR DE RENTABILITÉ — fonctions pures, aucune base, aucun React.
 * =====================================================================
 *
 * `/admin` **constate** ce qui est ; ce module **projette** ce qui pourrait
 * être. Les deux ne doivent jamais se mélanger :
 *
 * ⚠ **UNE SIMULATION N'EST PAS UNE ÉCRITURE COMPTABLE.** Rien de ce qui est
 * saisi ici ne part dans `mouvements_projet` — cette table se remplit
 * exclusivement depuis le fichier `comptes.json` hors dépôt, et c'est ce qui
 * fait que le solde de `/comptes` est *vrai*. Une hypothèse rangée au milieu de
 * dépenses réelles produirait un solde qui n'est plus ni l'un ni l'autre, sans
 * que rien ne le signale. Les paramètres vivent donc dans le navigateur.
 *
 * ⚠ **LA COMMISSION DES MAGASINS NE SE COMPORTE PAS COMME UNE CHARGE.** Une
 * charge s'ajoute une fois au dénominateur ; une commission se retranche de
 * *chaque* abonnement, donc du numérateur unitaire. Conséquence contre-intuitive
 * et centrale pour la décision du 2.0 : à 30 % de commission, il ne faut pas
 * « quelques abonnés de plus » mais **43 % d'abonnés en plus** pour le même
 * résultat (1 / 0,7 = 1,43). C'est précisément ce qu'un tableur fait mal et ce
 * que ce module doit rendre visible.
 *
 * Tous les montants sont en **centimes entiers**. Un flottant finit toujours
 * par afficher 20,999999 € — la leçon est déjà tirée dans `lib/comptes`.
 */

import { OFFRES } from '@/lib/offres';

/** Périodicité d'une charge. `unique` n'existe pas ici : voir `Investissement`. */
export type PeriodeCharge = 'mensuel' | 'annuel';

export type ChargeSimulee = {
  id: string;
  libelle: string;
  montantCentimes: number;
  periode: PeriodeCharge;
  /** Décochée = conservée dans la liste mais exclue du calcul. */
  active: boolean;
  /** Vraie dépense relevée dans `comptes.json`, par opposition à une hypothèse. */
  reelle: boolean;
};

/**
 * Dépense engagée **une fois**.
 *
 * ⚠ Distincte d'une charge à dessein. Une charge décale le point mort ; un
 * investissement ne le décale pas — il se rembourse. Les confondre ferait
 * paraître un achat unique éternellement pesant.
 */
export type Investissement = {
  id: string;
  libelle: string;
  montantCentimes: number;
  actif: boolean;
};

export type ParamsSimulation = {
  abonnesMensuels: number;
  abonnesAnnuels: number;
  charges: ChargeSimulee[];
  investissements: Investissement[];
  /**
   * Commission prélevée par les magasins, en pourcentage (0–100).
   * Repères 2026 : Apple et Google prennent **30 %**, ramenés à **15 %** pour
   * les petits éditeurs (moins d'un million de dollars par an) — le cas de
   * Nestync au lancement.
   */
  commissionPct: number;
  /**
   * Part des abonnements souscrits **dans l'application** (0–100).
   *
   * ⚠ Le levier le plus sous-estimé. Un abonnement pris sur le site passe par
   * Stripe et ne paie aucune commission : ce curseur, et non le taux, décide de
   * ce que le 2.0 coûte réellement.
   */
  partViaStorePct: number;
  /**
   * Résiliations mensuelles, en pourcentage de la base (0–100).
   *
   * ⚠ **NE SE RETRANCHE PAS DU RÉSULTAT DU MOIS.** Le revenu encaissé ce mois-ci
   * est encaissé : le soustraire serait un double comptage, et ferait mentir le
   * simulateur dans le sens pessimiste — l'erreur symétrique de celle qui
   * consiste à oublier la commission. Ce qu'il change est ailleurs : la **durée
   * de vie** d'un abonné, sa **valeur totale**, et le nombre d'abonnés à
   * recruter chaque mois **pour ne pas reculer**.
   *
   * ⚠ Taux **moyen sur toute la base**, à dessein. Un abonné annuel ne peut pas
   * partir en cours d'année : il n'a de fenêtre de sortie qu'au renouvellement.
   * Plus la part d'annuels est forte, plus l'érosion réelle est lente que ce que
   * ce curseur laisse croire.
   */
  resiliationPct: number;
};

export type Resultat = {
  revenuBrutCentimes: number;
  commissionCentimes: number;
  revenuNetCentimes: number;
  chargeMensuelleCentimes: number;
  /** Net moins charges. Négatif = on perd de l'argent chaque mois. */
  resultatCentimes: number;
  /** Ce que rapporte un abonné mensuel de plus, commission déduite. */
  revenuParAbonneCentimes: number;
  /**
   * Abonnés mensuels nécessaires pour couvrir les charges, à mix constant.
   * `null` quand aucun nombre n'y suffit (commission absurde ou prix nul).
   */
  pointMort: number | null;
  /** Ce qu'il manque encore. 0 = atteint. */
  resteAvantPointMort: number | null;
  investissementCentimes: number;
  /** Mois de résultat positif pour rembourser les investissements. */
  moisDeRemboursement: number | null;

  /**
   * Durée de vie moyenne d'un abonné, en mois (1 / taux de résiliation).
   * `null` quand le taux est nul — « infini » se dit, ne se chiffre pas.
   */
  dureeVieMois: number | null;
  /** Ce que rapporte un abonné sur toute sa durée de vie, commission déduite. */
  valeurVieCentimes: number | null;
  /**
   * Abonnés à recruter chaque mois **pour rester au même niveau**.
   *
   * ⚠ Le chiffre qui manque le plus souvent aux projections. Atteindre le point
   * mort ne sert à rien si l'on n'y reste pas : une base de 500 abonnés à 5 %
   * de résiliation exige 25 recrutements mensuels rien que pour faire du
   * surplace.
   */
  aRecruterParMois: number;
};

export type Palier = {
  abonnes: number;
  revenuNetCentimes: number;
  resultatCentimes: number;
  /** Premier palier où le résultat cesse d'être négatif. */
  franchit: boolean;
  /**
   * Recrutements mensuels nécessaires pour tenir ce palier.
   *
   * ⚠ Sans cette colonne, le tableau laisse croire qu'un palier élevé est un
   * état stable qu'il suffit d'atteindre. Il faut le regarder à côté du
   * résultat : c'est là qu'on voit si l'objectif est atteignable ou seulement
   * souhaitable.
   */
  aRecruterParMois: number;
};

const prix = (id: 'mensuel' | 'annuel') => OFFRES.find((o) => o.id === id)!.prix;

/** Euros décimaux → centimes entiers, sans dérive de virgule flottante. */
export const enCentimes = (euros: number) => Math.round(euros * 100);

const borne = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));

/**
 * Charge mensuelle équivalente.
 *
 * ⚠ L'annuel est ramené au douzième, comme dans le MRR de la console. Compter
 * un abonnement annuel à son prix entier dans un total mensuel multiplie la
 * charge par douze et rend le point mort faux d'autant.
 */
export function chargeMensuelle(charges: ChargeSimulee[]): number {
  return charges
    .filter((c) => c.active)
    .reduce(
      (t, c) =>
        t + (c.periode === 'annuel' ? Math.round(c.montantCentimes / 12) : c.montantCentimes),
      0,
    );
}

export function simuler(p: ParamsSimulation): Resultat {
  const commission = borne(p.commissionPct, 0, 100) / 100;
  const partStore = borne(p.partViaStorePct, 0, 100) / 100;
  /** Ce qui reste d'un euro encaissé, une fois le magasin servi. */
  const garde = 1 - commission * partStore;

  const mensuels = Math.max(0, Math.trunc(p.abonnesMensuels));
  const annuels = Math.max(0, Math.trunc(p.abonnesAnnuels));

  const parMensuel = enCentimes(prix('mensuel'));
  // ⚠ Douzième, ici aussi : un annuel encaissé en une fois se lit au mois.
  const parAnnuel = Math.round(enCentimes(prix('annuel')) / 12);

  const revenuBrut = mensuels * parMensuel + annuels * parAnnuel;
  const revenuNet = Math.round(revenuBrut * garde);
  const commissionCentimes = revenuBrut - revenuNet;

  const charge = chargeMensuelle(p.charges);
  const resultat = revenuNet - charge;

  const parAbonne = Math.round(parMensuel * garde);
  // ⚠ `parAbonne <= 0` n'est pas qu'une garde arithmétique : c'est le cas où
  // aucun volume ne sauve le modèle. Afficher « ∞ » vaut mieux qu'une division
  // par zéro déguisée en grand nombre.
  const pointMort = parAbonne > 0 ? Math.ceil(charge / parAbonne) : null;
  const resteAvantPointMort = pointMort === null ? null : Math.max(0, pointMort - mensuels);

  const investissement = p.investissements
    .filter((i) => i.actif)
    .reduce((t, i) => t + i.montantCentimes, 0);
  const moisDeRemboursement =
    investissement > 0 && resultat > 0
      ? Math.ceil(investissement / resultat)
      : investissement > 0
        ? null
        : 0;

  /*
   * ⚠ RÉSILIATION : elle n'intervient NULLE PART au-dessus. Le résultat du mois
   * en cours ne la connaît pas, et c'est volontaire — le revenu encaissé ce
   * mois-ci est encaissé. Elle ne décide que de l'avenir : combien de temps un
   * abonné reste, ce qu'il rapporte en tout, et combien il faut en recruter
   * pour ne pas reculer.
   */
  const churn = borne(p.resiliationPct, 0, 100) / 100;
  const base = mensuels + annuels;

  const dureeVieMois = churn > 0 ? Math.round(1 / churn) : null;
  // Revenu mensuel moyen par abonné, tous types confondus : un annuel et un
  // mensuel ne rapportent pas pareil, la moyenne doit refléter le mix réel.
  const netMoyenParAbonne = base > 0 ? revenuNet / base : parAbonne;
  const valeurVieCentimes = dureeVieMois === null ? null : Math.round(netMoyenParAbonne * dureeVieMois);
  const aRecruterParMois = Math.ceil(base * churn);

  return {
    revenuBrutCentimes: revenuBrut,
    commissionCentimes,
    revenuNetCentimes: revenuNet,
    chargeMensuelleCentimes: charge,
    resultatCentimes: resultat,
    revenuParAbonneCentimes: parAbonne,
    pointMort,
    resteAvantPointMort,
    investissementCentimes: investissement,
    moisDeRemboursement,
    dureeVieMois,
    valeurVieCentimes,
    aRecruterParMois,
  };
}

/**
 * Paliers d'abonnés : la même simulation à plusieurs volumes.
 *
 * ⚠ Le mix mensuel/annuel est **conservé en proportion**. Projeter dix fois plus
 * d'abonnés en supposant qu'ils seraient tous mensuels flatterait le résultat de
 * 20 % — l'annuel rapporte deux mois de moins.
 */
export function paliers(p: ParamsSimulation, echelons: number[]): Palier[] {
  const total = p.abonnesMensuels + p.abonnesAnnuels;
  const partAnnuelle = total > 0 ? p.abonnesAnnuels / total : 0;

  let dejaFranchi = false;
  return echelons.map((n) => {
    const annuels = Math.round(n * partAnnuelle);
    const r = simuler({ ...p, abonnesMensuels: n - annuels, abonnesAnnuels: annuels });
    const franchit = !dejaFranchi && r.resultatCentimes >= 0;
    if (franchit) dejaFranchi = true;
    return {
      abonnes: n,
      revenuNetCentimes: r.revenuNetCentimes,
      resultatCentimes: r.resultatCentimes,
      franchit,
      aRecruterParMois: r.aRecruterParMois,
    };
  });
}

/** Échelons proposés par défaut — resserrés en bas, où se joue la décision. */
export const ECHELONS = [5, 10, 25, 50, 100, 200, 350, 500, 1000];
