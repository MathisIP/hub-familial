/**
 * LEVIERS — ce qu'il y a de mieux à faire, déduit des chiffres du moment.
 * ======================================================================
 *
 * ⚠ **AUCUN CONSEIL GÉNÉRIQUE ICI.** « Améliorez votre rétention » ne vaut rien :
 * chaque levier doit être **chiffré sur les données réelles**, et classé par ce
 * qu'il rapporte. Un levier qu'on ne peut pas chiffrer n'est pas affiché.
 *
 * ⚠ **L'ORDRE EST LE MESSAGE.** Une liste de dix pistes toutes égales ne dit pas
 * quoi faire lundi matin. Le tri se fait sur l'effet mensuel estimé, et les
 * blocages (« ne dépense pas en publicité ») passent devant les opportunités :
 * cesser de perdre de l'argent prime sur en gagner.
 *
 * Fonctions pures : aucune base, aucun React.
 */

import type { Economie, ParametresEco } from '@/lib/admin/modele';
import { calculerEconomie } from '@/lib/admin/modele';

export type Urgence = 'blocage' | 'action' | 'veille';

export type Levier = {
  id: string;
  urgence: Urgence;
  titre: string;
  /** Ce qui, dans les chiffres, déclenche ce levier. */
  constat: string;
  /** Ce qu'il y a à faire, concrètement. */
  action: string;
  /** Effet mensuel estimé en centimes, quand il est calculable. */
  gainMensuelCentimes: number | null;
  /** Sert au tri quand le gain n'est pas chiffrable. */
  poids: number;
};

/** L'état réel du produit, tel que la console le connaît déjà. */
export type EtatReel = {
  abonnes: number;
  foyersEnEssai: number;
  essaisQuiExpirent: number;
  comptesSansFoyer: number;
  foyersJamaisVenus: number;
  foyersActifs30j: number;
  foyers: number;
  impayes: number;
  messagesNonTraites: number;
};

const euros = (centimes: number) =>
  (centimes / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/**
 * Rejoue le modèle en modifiant un seul paramètre, et renvoie l'écart de marge
 * mensuelle sur la base actuelle.
 *
 * ⚠ C'est ce qui rend les leviers comparables : chacun est mesuré dans la même
 * unité, sur le même effectif. Sans cela, on compare des pourcentages à des
 * nombres d'abonnés et on choisit au feeling.
 */
function ecartSi(
  p: ParametresEco,
  modif: Partial<ParametresEco>,
  abonnes: number,
  base: Economie,
): number {
  const variante = calculerEconomie({ ...p, ...modif });
  return (variante.margeMoyenneCentimes - base.margeMoyenneCentimes) * abonnes;
}

export function analyserLeviers(p: ParametresEco, eco: Economie, etat: EtatReel): Levier[] {
  const l: Levier[] = [];
  const n = Math.max(etat.abonnes, 1);

  /* ------------------------------------------------------------------ */
  /* BLOCAGES — cesser de perdre avant de chercher à gagner.             */
  /* ------------------------------------------------------------------ */

  // ⚠ LE VERDICT LE PLUS DUR. Sous 1, chaque abonné acquis coûte plus qu'il ne
  // rapportera jamais : augmenter le budget publicitaire aggrave la perte.
  if (eco.ratioValeurCout !== null && eco.ratioValeurCout < 1) {
    l.push({
      id: 'ratio-sous-1',
      urgence: 'blocage',
      titre: 'Ne pas dépenser un euro de publicité de plus',
      constat: `Un abonné rapporte ${euros(eco.valeurVieMoyenneCentimes)} sur sa vie et coûte ${euros(p.coutAcquisitionCentimes)} à acquérir : le rapport est de ${eco.ratioValeurCout}.`,
      action:
        'Chaque acquisition détruit de la valeur. Faire baisser le coût d’acquisition ou allonger la durée de vie AVANT de remettre du budget.',
      gainMensuelCentimes: p.budgetPubMensuelCentimes > 0 ? p.budgetPubMensuelCentimes : null,
      poids: 100,
    });
  } else if (eco.ratioValeurCout !== null && eco.ratioValeurCout < 3) {
    l.push({
      id: 'ratio-tendu',
      urgence: 'action',
      titre: 'Acquisition rentable mais tendue',
      constat: `Rapport valeur / coût de ${eco.ratioValeurCout}. L’usage retient 3 comme seuil de confort.`,
      action: 'Travailler la rétention avant d’augmenter le budget : elle agit sur le numérateur, à coût nul.',
      gainMensuelCentimes: null,
      poids: 60,
    });
  }

  if (p.budgetPubMensuelCentimes > 0 && eco.nouveauxParMois > 0) {
    const perdus = Math.ceil(etat.abonnes * eco.churnMensuelMoyen);
    if (eco.nouveauxParMois - perdus < 0) {
      l.push({
        id: 'croissance-negative',
        urgence: 'blocage',
        titre: 'Le budget publicitaire ne compense pas les départs',
        constat: `${eco.nouveauxParMois} abonnés gagnés par mois pour ${perdus} perdus : la base recule de ${perdus - eco.nouveauxParMois} par mois.`,
        action: 'Augmenter le budget ou réduire la résiliation. En l’état, aucun palier du tableau n’est atteignable.',
        gainMensuelCentimes: null,
        poids: 95,
      });
    }
  }

  if (etat.impayes > 0) {
    l.push({
      id: 'impayes',
      urgence: 'blocage',
      titre: `${etat.impayes} paiement${etat.impayes > 1 ? 's' : ''} en échec`,
      constat: 'Ces foyers utilisent le produit sans le payer, et repartiront d’eux-mêmes.',
      action: 'Relancer depuis Stripe. C’est le revenu le moins cher à récupérer : le client est déjà convaincu.',
      gainMensuelCentimes: etat.impayes * eco.margeMoyenneCentimes,
      poids: 90,
    });
  }

  /* ------------------------------------------------------------------ */
  /* ACTIONS — classées par ce qu'elles rapportent réellement.           */
  /* ------------------------------------------------------------------ */

  // ⚠ LE LEVIER QU'ON NE VOIT JAMAIS. Les essais qui expirent sont des gens qui
  // ont déjà installé, configuré et rempli le produit : leur conversion ne coûte
  // qu'un message. Comparé à un CAC de 12,50 €, c'est sans concurrence.
  if (etat.essaisQuiExpirent > 0) {
    l.push({
      id: 'essais',
      urgence: 'action',
      titre: `${etat.essaisQuiExpirent} essai${etat.essaisQuiExpirent > 1 ? 's' : ''} sur le point de finir`,
      constat: 'Ces foyers ont déjà installé et rempli le produit. Les convertir ne coûte qu’un message.',
      action: `Écrire à chacun avant l’échéance. À coût quasi nul, contre ${euros(p.coutAcquisitionCentimes)} pour un abonné acheté.`,
      gainMensuelCentimes: etat.essaisQuiExpirent * eco.margeMoyenneCentimes,
      poids: 85,
    });
  }

  // ⚠ La fuite la moins chère à colmater : ces gens sont déjà venus.
  if (etat.comptesSansFoyer > 0) {
    l.push({
      id: 'sans-foyer',
      urgence: 'action',
      titre: `${etat.comptesSansFoyer} personne${etat.comptesSansFoyer > 1 ? 's' : ''} connectée${etat.comptesSansFoyer > 1 ? 's' : ''} sans foyer`,
      constat: 'Elles se sont connectées puis se sont arrêtées là : le parcours d’arrivée les a perdues.',
      action:
        'Regarder ce que /bienvenue leur propose. Récupérer ces personnes-là ne coûte rien en publicité — elles sont déjà venues.',
      gainMensuelCentimes: Math.round(etat.comptesSansFoyer * 0.3 * eco.margeMoyenneCentimes),
      poids: 80,
    });
  }

  if (etat.foyersJamaisVenus > 0) {
    l.push({
      id: 'jamais-venus',
      urgence: 'action',
      titre: `${etat.foyersJamaisVenus} foyer${etat.foyersJamaisVenus > 1 ? 's' : ''} jamais utilisé${etat.foyersJamaisVenus > 1 ? 's' : ''}`,
      constat: 'Un foyer créé où personne ne revient ne s’abonnera pas, et ne se réveillera pas seul.',
      action: 'Relancer avec une action concrète à faire dans l’application, pas un rappel générique.',
      gainMensuelCentimes: null,
      poids: 70,
    });
  }

  /*
   * ⚠ BASCULER VERS L'ANNUEL : le levier le plus sous-estimé. Un annuel rapporte
   * moins par mois mais résilie bien moins souvent — sa valeur vie est très
   * supérieure. Le gain est mesuré en rejouant le modèle, pas estimé à la louche.
   */
  if (p.partAnnuellePct < 60) {
    const gain = ecartSi(p, { partAnnuellePct: Math.min(100, p.partAnnuellePct + 20) }, n, eco);
    if (gain > 0) {
      l.push({
        id: 'pousser-annuel',
        urgence: 'action',
        titre: 'Pousser l’abonnement annuel',
        constat: `${p.partAnnuellePct} % d’annuels aujourd’hui. Un annuel encaisse deux mois de moins mais reste ${Math.round(eco.annuel.dureeVieMois / Math.max(eco.mensuel.dureeVieMois, 1))} fois plus longtemps.`,
        action: 'Mettre l’annuel en avant à l’abonnement et à la fin d’essai. Vingt points de plus valent le gain ci-contre.',
        gainMensuelCentimes: Math.round(gain),
        poids: 65,
      });
    }
  }

  // Réduire la résiliation d'un point : mesuré, pas supposé.
  if (p.churnMensuelPct > 1) {
    const gain = ecartSi(p, { churnMensuelPct: p.churnMensuelPct - 1 }, n, eco);
    l.push({
      id: 'retention',
      urgence: 'action',
      titre: 'Gagner un point de rétention',
      constat: `${p.churnMensuelPct} % de résiliation mensuelle : un abonné reste ${eco.mensuel.dureeVieMois} mois.`,
      action:
        'Un point de moins allonge la durée de vie et augmente la valeur de chaque abonné, sans dépenser un euro de publicité.',
      gainMensuelCentimes: gain > 0 ? Math.round(gain) : null,
      poids: 62,
    });
  }

  /*
   * ⚠ LA PART FIXE DE STRIPE PÈSE À BAS PRIX. 0,25 € sur 4,99 € font 5 % du
   * prix — davantage que le pourcentage lui-même. C'est un argument de plus
   * pour l'annuel : une seule ponction fixe au lieu de douze.
   */
  const fixeAnnuel = p.stripeFixeCentimes * 12;
  if (p.partAnnuellePct < 100 && fixeAnnuel > eco.margeMoyenneCentimes) {
    l.push({
      id: 'stripe-fixe',
      urgence: 'veille',
      titre: 'La part fixe de Stripe coûte cher au mensuel',
      constat: `${euros(p.stripeFixeCentimes)} prélevés à chaque encaissement, soit ${euros(fixeAnnuel)} par an sur un mensuel contre ${euros(p.stripeFixeCentimes)} sur un annuel.`,
      action: 'Un abonné annuel économise onze ponctions fixes. Argument commercial concret pour l’annuel.',
      gainMensuelCentimes: null,
      poids: 40,
    });
  }

  if (etat.messagesNonTraites > 0) {
    l.push({
      id: 'messages',
      urgence: 'action',
      titre: `${etat.messagesNonTraites} message${etat.messagesNonTraites > 1 ? 's' : ''} sans réponse`,
      constat: 'Les mentions légales annoncent une réponse sous trente jours.',
      action: 'Répondre. Un utilisateur qui écrit est un utilisateur qui tient encore au produit.',
      gainMensuelCentimes: null,
      poids: 75,
    });
  }

  /* ------------------------------------------------------------------ */
  /* VEILLE — rien à faire aujourd'hui, mais à ne pas découvrir trop tard */
  /* ------------------------------------------------------------------ */

  if (p.regime === 'micro' && !p.assujettiTva) {
    l.push({
      id: 'seuil-tva',
      urgence: 'veille',
      titre: 'La TVA changera le modèle, pas le prix',
      constat: `Au-delà de 37 500 € de chiffre d’affaires, la TVA devient obligatoire : chaque abonnement perd ${p.tvaTauxPct / (100 + p.tvaTauxPct) * 100 | 0} % de sa valeur.`,
      action:
        'Simuler dès maintenant en cochant « assujetti à la TVA » : c’est le décrochage le plus brutal du modèle, mieux vaut le voir venir.',
      gainMensuelCentimes: null,
      poids: 30,
    });
  }

  if (p.acre) {
    l.push({
      id: 'fin-acre',
      urgence: 'veille',
      titre: 'L’ACRE double les cotisations à son terme',
      constat: `Cotisations à ${(p.urssafPct / 2).toFixed(1)} % aujourd’hui, ${p.urssafPct} % après la première année.`,
      action: 'Décocher l’ACRE pour voir le modèle tel qu’il sera. Le point mort remonte d’autant.',
      gainMensuelCentimes: null,
      poids: 28,
    });
  }

  if (p.partAppStorePct === 0 && p.partPlayStorePct === 0) {
    l.push({
      id: 'stores',
      urgence: 'veille',
      titre: 'Les magasins n’entrent pas encore dans le calcul',
      constat: 'Aucune part de souscription n’y est affectée : le modèle décrit le présent, pas le 2.0.',
      action:
        'Régler les deux parts pour chiffrer le lancement sur les stores. Google prend 15 % sur les abonnements, Apple 15 % via le Small Business Program.',
      gainMensuelCentimes: null,
      poids: 25,
    });
  }

  /*
   * ⚠ TRI : blocages d'abord, puis par gain chiffré décroissant, puis par poids.
   * Un levier chiffré passe toujours devant un levier qui ne l'est pas — non
   * parce qu'il compte plus, mais parce qu'on peut décider sur sa base.
   */
  const rang: Record<Urgence, number> = { blocage: 0, action: 1, veille: 2 };
  return l.sort((a, b) => {
    if (rang[a.urgence] !== rang[b.urgence]) return rang[a.urgence] - rang[b.urgence];
    const ga = a.gainMensuelCentimes ?? -1;
    const gb = b.gainMensuelCentimes ?? -1;
    if (ga !== gb) return gb - ga;
    return b.poids - a.poids;
  });
}
