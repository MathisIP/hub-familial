/**
 * MODULE CADEAUX — SCHÉMA & HELPERS PURS.
 * =======================================
 * Onglet Cadeaux — en-têtes ligne 1, données ligne 2+ :
 *   A Pour qui · B Occasion · C Idée/cadeau · D Statut · E Budget prévu (€)
 *   F Prix payé (€) · G Offert par · H Où/lien · I Note
 * Onglet Occasions — en-têtes ligne 1, données ligne 2+ :
 *   A Occasion · B Date · C Budget occasion (€) · D Note
 * Onglet Paramètres — en-têtes ligne 3, listes ligne 4+ :
 *   A Statuts · B Offert par
 */
import { parseEuro, versISO, joursJusqua } from '@/lib/argent';

export const COL_CADEAU = {
  POUR_QUI: 1, OCCASION: 2, IDEE: 3, STATUT: 4, BUDGET: 5, PAYE: 6, OFFERT_PAR: 7, OU: 8, NOTE: 9,
} as const;
export const LIGNE_DONNEES_CADEAUX = 2;

export const COL_OCC = { OCCASION: 1, DATE: 2, BUDGET: 3, NOTE: 4 } as const;
export const LIGNE_DONNEES_OCCASIONS = 2;

export const LIGNE_DONNEES_PARAMS = 4;

export const STATUTS_DEFAUT = ['Idée', 'À acheter', 'Commandé', 'Reçu', 'Emballé', 'Offert'];
export const STATUT_OFFERT = 'Offert';

export type Cadeau = {
  ligne: number;
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

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

export function ligneVersCadeau(l: unknown[], ligne: number): Cadeau {
  return {
    ligne,
    pourQui: S(l[COL_CADEAU.POUR_QUI - 1]),
    occasion: S(l[COL_CADEAU.OCCASION - 1]),
    idee: S(l[COL_CADEAU.IDEE - 1]),
    statut: S(l[COL_CADEAU.STATUT - 1]),
    budgetPrevu: S(l[COL_CADEAU.BUDGET - 1]),
    prixPaye: S(l[COL_CADEAU.PAYE - 1]),
    budgetNum: parseEuro(l[COL_CADEAU.BUDGET - 1]),
    payeNum: parseEuro(l[COL_CADEAU.PAYE - 1]),
    offertPar: S(l[COL_CADEAU.OFFERT_PAR - 1]),
    ou: S(l[COL_CADEAU.OU - 1]),
    note: S(l[COL_CADEAU.NOTE - 1]),
  };
}

export function ligneVersOccasion(l: unknown[]): Occasion {
  const date = S(l[COL_OCC.DATE - 1]);
  const dateISO = versISO(date);
  return {
    occasion: S(l[COL_OCC.OCCASION - 1]),
    date,
    dateISO,
    budget: S(l[COL_OCC.BUDGET - 1]),
    budgetNum: parseEuro(l[COL_OCC.BUDGET - 1]),
    note: S(l[COL_OCC.NOTE - 1]),
    joursRestants: dateISO ? joursJusqua(dateISO) : null,
  };
}

/** Occasion « proche » : à venir dans moins de 30 jours (comme le surlignage du Sheet). */
export function estProche(o: Occasion): boolean {
  return o.joursRestants !== null && o.joursRestants >= 0 && o.joursRestants <= 30;
}
