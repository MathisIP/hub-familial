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
  /** Membre à qui ce cadeau est caché (`null` = visible de tout le foyer). */
  masqueA: string | null;
  occasion: string;
  idee: string;
  statut: string;
  budgetPrevu: string;
  prixPaye: string; // coût (total si cadeau à plusieurs)
  budgetNum: number;
  payeNum: number; // coût total en nombre
  partage: boolean; // cadeau fait à plusieurs
  participation: string; // ta part (si partagé)
  participationNum: number;
  depenseNum: number; // dépense réelle du foyer = partage ? participationNum : payeNum
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

/** Un membre du foyer, pour le sélecteur « ne pas montrer à ». */
export type MembreFoyer = { utilisateurId: string; nom: string };

export type DonneesCadeaux = {
  cadeaux: Cadeau[];
  occasions: Occasion[];
  statuts: string[];
  offertPar: string[];
  /** Les AUTRES membres du foyer (jamais soi-même). */
  membres: MembreFoyer[];
};

/** Champs éditables d'un cadeau (payload d'ajout/modification). */
export type ChampsCadeau = {
  pourQui?: string;
  /**
   * Identifiant du membre à qui ce cadeau doit rester caché (la surprise).
   * Chaîne vide ou absent = visible de tout le foyer.
   */
  masqueA?: string | null;
  occasion?: string;
  idee: string;
  statut?: string;
  budgetPrevu?: string;
  prixPaye?: string;
  partage?: boolean;
  participation?: string;
  offertPar?: string;
  ou?: string;
  note?: string;
};

const S = (v: unknown): string => (v == null ? '' : String(v).trim());

/** Construit un Cadeau (avec montants numériques) depuis une ligne de base. */
export function construireCadeau(r: {
  id: string;
  pourQui: string;
  masqueA: string | null;
  occasion: string;
  idee: string;
  statut: string;
  budgetPrevu: string;
  prixPaye: string;
  partage: boolean;
  participation: string;
  offertPar: string;
  ou: string;
  note: string;
}): Cadeau {
  const payeNum = parseEuro(r.prixPaye);
  const participationNum = parseEuro(r.participation);
  return {
    id: r.id,
    pourQui: r.pourQui,
    masqueA: r.masqueA,
    occasion: r.occasion,
    idee: r.idee,
    statut: r.statut,
    budgetPrevu: r.budgetPrevu,
    prixPaye: r.prixPaye,
    budgetNum: parseEuro(r.budgetPrevu),
    payeNum,
    partage: r.partage,
    participation: r.participation,
    participationNum,
    // Dépense réelle du foyer : ta participation si partagé, sinon le prix payé.
    depenseNum: r.partage ? participationNum : payeNum,
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
