/**
 * MODULE CADEAUX — TYPES & HELPERS PURS (partagés client + serveur).
 * =================================================================
 * Version base (multi-foyer) : les cadeaux/occasions viennent de Postgres
 * (cf. lib/db/schema.ts), plus des onglets Sheets. L'identifiant d'un cadeau est
 * son `id` (UUID). Les montants restent en texte (saisie libre) ; les nombres
 * sont recalculés ici via parseEuro. Aucun import serveur : ce fichier est
 * importé par le composant client.
 */
import { parseEuro, versISO, joursJusqua } from '@/lib/argent';

export const STATUTS_DEFAUT = ['Idée', 'À acheter', 'Commandé', 'Reçu', 'Emballé', 'Offert'];
export const STATUT_OFFERT = 'Offert';

export type Cadeau = {
  id: string;
  pourQui: string;
  occasion: string;
  idee: string;
  statut: string;
  budgetPrevu: string;
  prixPaye: string;
  budgetNum: number;
  payeNum: number;
  offertPar: string;
  ou: string;
  note: string;
};

export type Occasion = {
  occasion: string;
  date: string;
  dateISO: string | null;
  budget: string;
  budgetNum: number;
  note: string;
  joursRestants: number | null;
};

export type DonneesCadeaux = {
  cadeaux: Cadeau[];
  occasions: Occasion[];
  statuts: string[];
  offertPar: string[];
};

/** Champs éditables d'un cadeau (payload d'ajout/modification). */
export type ChampsCadeau = {
  pourQui?: string;
  occasion?: string;
  idee: string;
  statut?: string;
  budgetPrevu?: string;
  prixPaye?: string;
  offertPar?: string;
  ou?: string;
  note?: string;
};

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Construit un Cadeau (avec montants numériques) depuis une ligne de base. */
export function construireCadeau(r: {
  id: string;
  pourQui: string;
  occasion: string;
  idee: string;
  statut: string;
  budgetPrevu: string;
  prixPaye: string;
  offertPar: string;
  ou: string;
  note: string;
}): Cadeau {
  return {
    id: r.id,
    pourQui: r.pourQui,
    occasion: r.occasion,
    idee: r.idee,
    statut: r.statut,
    budgetPrevu: r.budgetPrevu,
    prixPaye: r.prixPaye,
    budgetNum: parseEuro(r.budgetPrevu),
    payeNum: parseEuro(r.prixPaye),
    offertPar: r.offertPar,
    ou: r.ou,
    note: r.note,
  };
}

/** Construit une Occasion (avec date ISO / jours restants) depuis une ligne de base. */
export function construireOccasion(o: {
  nom: string;
  date?: string | null;
  budget?: string | null;
  note?: string | null;
}): Occasion {
  const date = S(o.date);
  const dateISO = versISO(date);
  return {
    occasion: o.nom,
    date,
    dateISO,
    budget: S(o.budget),
    budgetNum: parseEuro(o.budget),
    note: S(o.note),
    joursRestants: dateISO ? joursJusqua(dateISO) : null,
  };
}

/** Occasion « proche » : à venir dans moins de 30 jours (comme le surlignage du Sheet). */
export function estProche(o: Occasion): boolean {
  return o.joursRestants !== null && o.joursRestants >= 0 && o.joursRestants <= 30;
}
