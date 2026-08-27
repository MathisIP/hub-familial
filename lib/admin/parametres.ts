/**
 * PARAMÈTRES ÉCONOMIQUES — valeurs de départ et remise en forme.
 * ==============================================================
 *
 * Chaque valeur ici est une **hypothèse traçable**, pas un nombre choisi au
 * hasard : la provenance est notée à côté. C'est ce qui permet, dans six mois,
 * de savoir laquelle recaler sur du réel et laquelle est encore un pari.
 */

import { OFFRES } from '@/lib/offres';
import { enCentimes, type ParametresEco } from '@/lib/admin/modele';

const prixDe = (id: 'mensuel' | 'annuel') =>
  enCentimes(OFFRES.find((o) => o.id === id)?.prix ?? 0);

/**
 * Hypothèses de départ.
 *
 * ⚠ **LES PRIX NE SONT PAS ÉCRITS ICI**, ils sont lus dans [lib/offres.ts]. Le
 * calculateur d'origine (`docs/CALCULATEUR_ECO.html`) portait 47,90 € en dur
 * pour l'annuel ; le tarif est passé à 49,90 € le 13/08/2026 et le fichier n'a
 * pas suivi, si bien qu'il sous-estimait chaque abonné annuel de 2 € par an.
 * Une valeur recopiée finit toujours par diverger de sa source.
 */
export const PARAMS_DEFAUT: ParametresEco = {
  prixMensuelCentimes: prixDe('mensuel'),
  prixAnnuelCentimes: prixDe('annuel'),
  // Observé : la quasi-totalité des foyers actuels sont mensuels. 30 % est
  // l'objectif du calculateur d'origine, pas un constat.
  partAnnuellePct: 30,

  // Hypothèses tant qu'aucune résiliation réelle n'a été observée.
  churnMensuelPct: 5,
  churnAnnuelPct: 25,

  // Régime effectif de l'entreprise.
  regime: 'micro',
  // ⚠ En franchise en base tant que le CA reste sous 37 500 €. Cocher la TVA
  // ampute chaque prix de 16,7 % : c'est le plus gros décrochage du modèle.
  assujettiTva: false,
  tvaTauxPct: 20,
  // Prestations de services BNC en micro-entreprise.
  urssafPct: 24.6,
  acre: false,
  // Versement libératoire non retenu : à 0, l'impôt sur le revenu se règle au
  // barème, hors de ce modèle.
  irPct: 0,
  isPct: 25,

  // Tarification Stripe pour une carte européenne.
  stripePct: 1.5,
  stripeFixeCentimes: 25,

  // Coût d'infrastructure imputable à un abonné (Neon + Vercel + OVH), estimé.
  infraParAbonneCentimes: 20,
  stockageGoParAbonne: 2,
  prixGoCentimes: 1.5,
  // ⚠ Remplacé au chargement par les charges récurrentes RÉELLES lues dans
  // `comptes.json`. Cette valeur ne sert que si le registre est vide.
  chargesFixesCentimes: 4000,

  // ⚠ Zéro par défaut : aujourd'hui, rien ne passe par les magasins. Le 2.0
  // n'existe pas encore, et le modèle doit décrire le présent avant de servir à
  // projeter.
  partAppStorePct: 0,
  partPlayStorePct: 0,
  // Apple : 15 % via le Small Business Program (moins d'un million de dollars
  // par an), le cas au lancement. 30 % hors programme la première année.
  commissionAppStorePct: 15,
  // Google Play : 15 % sur tout revenu d'abonnement depuis 2022, sans condition.
  commissionPlayStorePct: 15,

  budgetPubMensuelCentimes: 0,
  // Hypothèse du calculateur d'origine, jamais confrontée à une campagne réelle.
  coutAcquisitionCentimes: 1250,
};

/**
 * Remet en forme un enregistrement venu de la base.
 *
 * ⚠ **INDISPENSABLE À LA DURABILITÉ DES SCÉNARIOS.** Un scénario enregistré
 * aujourd'hui sera relu après l'ajout de nouveaux paramètres : sans ce
 * complément par les défauts, un champ absent arriverait à `undefined`, tous les
 * calculs qui en dépendent donneraient `NaN`, et la page afficherait des tirets
 * là où l'utilisateur attend ses chiffres. Le scénario paraîtrait perdu alors
 * qu'il ne manque qu'une valeur.
 */
export function normaliserParams(brut: unknown): ParametresEco {
  const o = (brut ?? {}) as Record<string, unknown>;
  const n = (cle: keyof ParametresEco, defaut: number): number => {
    const v = o[cle];
    return typeof v === 'number' && Number.isFinite(v) ? v : defaut;
  };
  const b = (cle: keyof ParametresEco, defaut: boolean): boolean => {
    const v = o[cle];
    return typeof v === 'boolean' ? v : defaut;
  };
  const d = PARAMS_DEFAUT;

  return {
    prixMensuelCentimes: n('prixMensuelCentimes', d.prixMensuelCentimes),
    prixAnnuelCentimes: n('prixAnnuelCentimes', d.prixAnnuelCentimes),
    partAnnuellePct: n('partAnnuellePct', d.partAnnuellePct),
    churnMensuelPct: n('churnMensuelPct', d.churnMensuelPct),
    churnAnnuelPct: n('churnAnnuelPct', d.churnAnnuelPct),
    regime: o.regime === 'societe' ? 'societe' : 'micro',
    assujettiTva: b('assujettiTva', d.assujettiTva),
    tvaTauxPct: n('tvaTauxPct', d.tvaTauxPct),
    urssafPct: n('urssafPct', d.urssafPct),
    acre: b('acre', d.acre),
    irPct: n('irPct', d.irPct),
    isPct: n('isPct', d.isPct),
    stripePct: n('stripePct', d.stripePct),
    stripeFixeCentimes: n('stripeFixeCentimes', d.stripeFixeCentimes),
    infraParAbonneCentimes: n('infraParAbonneCentimes', d.infraParAbonneCentimes),
    stockageGoParAbonne: n('stockageGoParAbonne', d.stockageGoParAbonne),
    prixGoCentimes: n('prixGoCentimes', d.prixGoCentimes),
    chargesFixesCentimes: n('chargesFixesCentimes', d.chargesFixesCentimes),
    partAppStorePct: n('partAppStorePct', d.partAppStorePct),
    partPlayStorePct: n('partPlayStorePct', d.partPlayStorePct),
    commissionAppStorePct: n('commissionAppStorePct', d.commissionAppStorePct),
    commissionPlayStorePct: n('commissionPlayStorePct', d.commissionPlayStorePct),
    budgetPubMensuelCentimes: n('budgetPubMensuelCentimes', d.budgetPubMensuelCentimes),
    coutAcquisitionCentimes: n('coutAcquisitionCentimes', d.coutAcquisitionCentimes),
  };
}

/**
 * Description de chaque réglage, pour l'écran.
 *
 * ⚠ Mathis a demandé de **voir toutes les données, même celles qui ne se
 * modifient pas**. Un paramètre invisible est un paramètre auquel on ne pense
 * plus : c'est ainsi que le prix annuel du calculateur est resté à 47,90 € plus
 * de quinze jours après le changement de tarif.
 */
export type Reglage = {
  cle: keyof ParametresEco;
  libelle: string;
  unite: 'euro' | 'pct' | 'nombre' | 'booleen' | 'choix';
  groupe: 'Offre' | 'Fidélité' | 'Fiscalité' | 'Frais' | 'Magasins' | 'Croissance';
  aide: string;
  /** Non modifiable ici : la valeur a une source ailleurs, qui fait autorité. */
  source?: string;
};

export const REGLAGES: Reglage[] = [
  { cle: 'prixMensuelCentimes', libelle: 'Prix mensuel TTC', unite: 'euro', groupe: 'Offre',
    aide: 'Le tarif public de l’abonnement au mois.', source: 'lib/offres.ts' },
  { cle: 'prixAnnuelCentimes', libelle: 'Prix annuel TTC', unite: 'euro', groupe: 'Offre',
    aide: 'Exactement dix mois de mensuel : les « 2 mois offerts » annoncés.', source: 'lib/offres.ts' },
  { cle: 'partAnnuellePct', libelle: 'Part d’abonnés annuels', unite: 'pct', groupe: 'Offre',
    aide: 'Un annuel rapporte moins par mois mais reste bien plus longtemps.' },

  { cle: 'churnMensuelPct', libelle: 'Résiliation mensuelle', unite: 'pct', groupe: 'Fidélité',
    aide: 'Part des abonnés mensuels qui partent chaque mois.' },
  { cle: 'churnAnnuelPct', libelle: 'Résiliation annuelle', unite: 'pct', groupe: 'Fidélité',
    aide: 'Part des abonnés annuels qui ne renouvellent pas. Un annuel ne peut partir qu’à l’échéance.' },

  { cle: 'regime', libelle: 'Régime', unite: 'choix', groupe: 'Fiscalité',
    aide: 'Micro : cotisations sur le chiffre d’affaires. Société : impôt sur le bénéfice.' },
  { cle: 'assujettiTva', libelle: 'Assujetti à la TVA', unite: 'booleen', groupe: 'Fiscalité',
    aide: 'Obligatoire au-delà de 37 500 € de chiffre d’affaires, et toujours en société.' },
  { cle: 'tvaTauxPct', libelle: 'Taux de TVA', unite: 'pct', groupe: 'Fiscalité', aide: 'Taux normal en France.' },
  { cle: 'urssafPct', libelle: 'Cotisations URSSAF', unite: 'pct', groupe: 'Fiscalité',
    aide: 'Prestations de services en micro-entreprise, assises sur le chiffre d’affaires HT.' },
  { cle: 'acre', libelle: 'ACRE', unite: 'booleen', groupe: 'Fiscalité',
    aide: 'Exonère la moitié des cotisations la première année.' },
  { cle: 'irPct', libelle: 'Versement libératoire', unite: 'pct', groupe: 'Fiscalité',
    aide: 'Impôt sur le revenu prélevé à la source. À 0, il se règle au barème, hors de ce modèle.' },
  { cle: 'isPct', libelle: 'Impôt sur les sociétés', unite: 'pct', groupe: 'Fiscalité',
    aide: 'Appliqué au bénéfice, en société uniquement.' },

  { cle: 'stripePct', libelle: 'Commission Stripe', unite: 'pct', groupe: 'Frais',
    aide: 'Sur les souscriptions passant par le site. Aucune sur celles des magasins.' },
  { cle: 'stripeFixeCentimes', libelle: 'Part fixe Stripe', unite: 'euro', groupe: 'Frais',
    aide: 'Prélevée à chaque encaissement. Elle pèse d’autant plus que le prix est bas.' },
  { cle: 'infraParAbonneCentimes', libelle: 'Infrastructure par abonné', unite: 'euro', groupe: 'Frais',
    aide: 'Base, hébergement et calcul imputables à un abonné, par mois.' },
  { cle: 'stockageGoParAbonne', libelle: 'Stockage par abonné', unite: 'nombre', groupe: 'Frais',
    aide: 'Documents conservés, en Go. L’offre en annonce 2.' },
  { cle: 'prixGoCentimes', libelle: 'Prix du Go stocké', unite: 'euro', groupe: 'Frais', aide: 'Par mois, chez OVHcloud.' },
  { cle: 'chargesFixesCentimes', libelle: 'Charges fixes mensuelles', unite: 'euro', groupe: 'Frais',
    aide: 'Indépendantes du nombre d’abonnés.', source: 'comptes.json' },

  { cle: 'partAppStorePct', libelle: 'Part App Store', unite: 'pct', groupe: 'Magasins',
    aide: 'Souscriptions prises dans l’application iOS.' },
  { cle: 'partPlayStorePct', libelle: 'Part Play Store', unite: 'pct', groupe: 'Magasins',
    aide: 'Souscriptions prises dans l’application Android.' },
  { cle: 'commissionAppStorePct', libelle: 'Commission Apple', unite: 'pct', groupe: 'Magasins',
    aide: '15 % via le Small Business Program (moins d’un million de dollars par an), 30 % sinon la première année.' },
  { cle: 'commissionPlayStorePct', libelle: 'Commission Google', unite: 'pct', groupe: 'Magasins',
    aide: '15 % sur tout revenu d’abonnement depuis 2022, sans condition de volume.' },

  { cle: 'budgetPubMensuelCentimes', libelle: 'Budget publicitaire', unite: 'euro', groupe: 'Croissance',
    aide: 'Par mois. Seule dépense qui produit des abonnés.' },
  { cle: 'coutAcquisitionCentimes', libelle: 'Coût d’acquisition', unite: 'euro', groupe: 'Croissance',
    aide: 'Ce que coûte un abonné gagné. À recaler après la première campagne.' },
];
