/**
 * MODULE ÉVÉNEMENTS — TYPES & HELPERS PURS (partagés client + serveur).
 * ====================================================================
 * Version base (multi-foyer) : les événements viennent de Postgres, scopés au
 * foyer. Identifiant = `id` (UUID). Les récapitulatifs (invités/checklist/menu)
 * restent dans le type mais valent 0 tant que les SOUS-LISTES ne sont pas en base
 * (extension future). Le lien agenda « calendarId|eventId » (ex-colonne K) est
 * porté par `agendaLien`. Aucun import serveur ici (fichier importé côté client).
 */
import { parseEuro, versISO, joursJusqua } from '@/lib/argent';
import type { Agenda } from '@/lib/agenda/schema';

export const STATUTS_DEFAUT = ['À planifier', 'En préparation', 'Prêt', 'Passé'];

export type Evenement = {
  id: string;
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
  agendaLien: string; // « calendarId|eventId » si lié à l'agenda, sinon ''
  // Récapitulatifs (sous-listes) — 0 tant qu'elles ne sont pas en base :
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

/** Décompose le lien agenda « calendarId|eventId ». */
export function parseAgendaLien(lien: string): { calendarId: string; eventId: string } | null {
  const i = lien.indexOf('|');
  if (i === -1) return null;
  const calendarId = lien.slice(0, i).trim();
  const eventId = lien.slice(i + 1).trim();
  return calendarId && eventId ? { calendarId, eventId } : null;
}

/** Vrai si l'événement est lié à l'agenda. */
export function estDansAgenda(ev: Evenement): boolean {
  return parseAgendaLien(ev.agendaLien) !== null;
}

/** Récaps à zéro (sous-listes non encore en base). */
export function rollupVide() {
  return {
    invitesOui: 0, invitesTotal: 0, personnesOui: 0,
    checklistFait: 0, checklistTotal: 0,
    menuItems: 0, menuCoutNum: 0, menuAchetes: 0,
  };
}

/** Construit un Evenement (dates + montants) depuis une ligne de base. */
export function construireEvenement(r: {
  id: string;
  nom: string;
  type: string;
  date: string;
  heure: string;
  lieu: string;
  budgetPrevu: string;
  depense: string;
  statut: string;
  note: string;
  agendaLien: string;
}): Evenement {
  const dateISO = versISO(r.date);
  return {
    id: r.id,
    nom: r.nom,
    type: r.type,
    date: r.date,
    dateISO,
    heure: r.heure,
    lieu: r.lieu,
    budgetPrevu: r.budgetPrevu,
    depense: r.depense,
    budgetNum: parseEuro(r.budgetPrevu),
    depenseNum: parseEuro(r.depense),
    statut: r.statut,
    note: r.note,
    joursRestants: dateISO ? joursJusqua(dateISO) : null,
    agendaLien: r.agendaLien,
    ...rollupVide(),
  };
}
