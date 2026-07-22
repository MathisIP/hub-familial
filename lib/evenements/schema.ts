/**
 * MODULE ÉVÉNEMENTS — SCHÉMA & HELPERS PURS.
 * ==========================================
 * Onglet Événements (maître) — en-têtes ligne 1, données ligne 2+ :
 *   A Événement · B Type · C Date · D Heure · E Lieu · F Nb invités
 *   G Budget prévu (€) · H Dépensé (€) · I Statut · J Note · K 🔒 AgendaID
 * Sous-onglets (référencent l'événement par son NOM en colonne A) :
 *   Invités   : A Événement · B Invité · C Contact · D RSVP · E Nb pers. · F Régime · G Note
 *   Checklist : A Événement · B Tâche · C Catégorie · D Assigné · E Échéance · F Fait
 *   Menu&Courses : A Événement · B Plat/Article · C Type · D Quantité · E Coût estimé (€) · F Acheté
 *
 * Le maître peut être vide alors que des sous-onglets portent des événements :
 * la liste affichée est l'UNION des noms (maître + sous-onglets). Éditer écrit
 * dans le maître (colonnes A→J ; K AgendaID est préservée).
 */
import { parseEuro, versISO, joursJusqua } from '@/lib/argent';
import type { Agenda } from '@/lib/agenda/schema';

export const COL_EV = {
  NOM: 1, TYPE: 2, DATE: 3, HEURE: 4, LIEU: 5, NB_INVITES: 6,
  BUDGET: 7, DEPENSE: 8, STATUT: 9, NOTE: 10, AGENDA: 11,
} as const;
export const LIGNE_DONNEES_EV = 2;
export const LIGNE_DONNEES_PARAMS = 4;

export const STATUTS_DEFAUT = ['À planifier', 'En préparation', 'Prêt', 'Passé'];

export type Evenement = {
  ligne: number | null; // ligne du maître, ou null si l'événement n'existe que dans les sous-onglets
  nom: string;
  type: string;
  date: string;
  dateISO: string | null;
  heure: string;
  lieu: string;
  budgetPrevu: string;
  depense: string;
  budgetNum: number;
  depenseNum: number;
  statut: string;
  note: string;
  joursRestants: number | null;
  agendaLien: string; // colonne K : « calendarId|eventId » si lié à l'agenda, sinon ''
  // Récapitulatifs calculés depuis les sous-onglets :
  invitesOui: number;
  invitesTotal: number;
  personnesOui: number;
  checklistFait: number;
  checklistTotal: number;
  menuItems: number;
  menuCoutNum: number;
  menuAchetes: number;
};

export type DonneesEvenements = {
  evenements: Evenement[];
  types: string[];
  statuts: string[];
  agendas: Agenda[]; // agendas où l'on peut pousser un événement (vide si indispo)
};

/** Décompose le lien agenda « calendarId|eventId » (col K). */
export function parseAgendaLien(lien: string): { calendarId: string; eventId: string } | null {
  const i = lien.indexOf('|');
  if (i === -1) return null;
  const calendarId = lien.slice(0, i).trim();
  const eventId = lien.slice(i + 1).trim();
  return calendarId && eventId ? { calendarId, eventId } : null;
}

/** Vrai si l'événement est lié à l'agenda (col K exploitable). */
export function estDansAgenda(ev: Evenement): boolean {
  return parseAgendaLien(ev.agendaLien) !== null;
}

const S = (v: unknown): string => (v == null ? '' : String(v).trim());
export const estCoche = (v: unknown): boolean => v === true || v === 'TRUE' || v === 'VRAI';

/** Récapitulatifs d'un événement à partir des lignes des sous-onglets. */
export type Rollup = {
  invitesOui: number; invitesTotal: number; personnesOui: number;
  checklistFait: number; checklistTotal: number;
  menuItems: number; menuCoutNum: number; menuAchetes: number;
};

export function rollupVide(): Rollup {
  return {
    invitesOui: 0, invitesTotal: 0, personnesOui: 0,
    checklistFait: 0, checklistTotal: 0,
    menuItems: 0, menuCoutNum: 0, menuAchetes: 0,
  };
}

/** Construit un événement depuis une ligne du maître + son récap. */
export function ligneVersEvenement(l: unknown[], ligne: number, r: Rollup): Evenement {
  const date = S(l[COL_EV.DATE - 1]);
  const dateISO = versISO(date);
  return {
    ligne,
    nom: S(l[COL_EV.NOM - 1]),
    type: S(l[COL_EV.TYPE - 1]),
    date,
    dateISO,
    heure: S(l[COL_EV.HEURE - 1]),
    lieu: S(l[COL_EV.LIEU - 1]),
    budgetPrevu: S(l[COL_EV.BUDGET - 1]),
    depense: S(l[COL_EV.DEPENSE - 1]),
    budgetNum: parseEuro(l[COL_EV.BUDGET - 1]),
    depenseNum: parseEuro(l[COL_EV.DEPENSE - 1]),
    statut: S(l[COL_EV.STATUT - 1]),
    note: S(l[COL_EV.NOTE - 1]),
    joursRestants: dateISO ? joursJusqua(dateISO) : null,
    agendaLien: S(l[COL_EV.AGENDA - 1]),
    ...r,
  };
}

/** Événement présent seulement dans les sous-onglets (pas encore dans le maître). */
export function evenementStub(nom: string, r: Rollup): Evenement {
  return {
    ligne: null, nom, type: '', date: '', dateISO: null, heure: '', lieu: '',
    budgetPrevu: '', depense: '', budgetNum: 0, depenseNum: 0, statut: '', note: '',
    joursRestants: null, agendaLien: '', ...r,
  };
}
