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
  /** Détail des sous-listes, pour l'écran de gestion de l'événement. */
  sousListes: SousListes;
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

/** Récaps à zéro — point de départ de l'agrégation des sous-listes. */
export function rollupVide() {
  return {
    invitesOui: 0, invitesTotal: 0, personnesOui: 0,
    checklistFait: 0, checklistTotal: 0,
    menuItems: 0, menuCoutNum: 0, menuAchetes: 0,
  };
}

/* --- Sous-listes d'un événement (invités, checklist, menu & courses) ------- */

/** Réponses possibles d'un invité. `Oui` est la seule qui compte un confirmé. */
export const RSVP_VALEURS = ['Sans réponse', 'Oui', 'Non', 'Peut-être'] as const;
export type Rsvp = (typeof RSVP_VALEURS)[number];

export type Invite = {
  id: string;
  nom: string;
  contact: string;
  rsvp: string;
  nbPersonnes: number;
  note: string;
};

export type TacheEvenement = {
  id: string;
  tache: string;
  responsable: string;
  echeance: string;
  fait: boolean;
};

export type PlatEvenement = {
  id: string;
  libelle: string;
  quantite: string;
  cout: string;
  coutNum: number;
  achete: boolean;
};

export type SousListes = {
  invites: Invite[];
  checklist: TacheEvenement[];
  menu: PlatEvenement[];
};

/**
 * Agrège les sous-listes d'UN événement en récapitulatif.
 *
 * Fonction **pure** : c'est elle qui définit ce que « 3 confirmés / 8 invités »
 * veut dire, et elle est testable sans base. `personnesOui` compte les
 * **personnes** et non les réponses — un « oui » pour une famille de quatre
 * pèse quatre couverts, ce qui est précisément le chiffre utile pour un traiteur.
 */
export function agregerSousListes(s: SousListes) {
  const r = rollupVide();
  for (const i of s.invites) {
    r.invitesTotal += 1;
    if (i.rsvp === 'Oui') {
      r.invitesOui += 1;
      r.personnesOui += Number.isFinite(i.nbPersonnes) && i.nbPersonnes > 0 ? i.nbPersonnes : 1;
    }
  }
  for (const t of s.checklist) {
    r.checklistTotal += 1;
    if (t.fait) r.checklistFait += 1;
  }
  for (const p of s.menu) {
    r.menuItems += 1;
    r.menuCoutNum += p.coutNum;
    if (p.achete) r.menuAchetes += 1;
  }
  r.menuCoutNum = Math.round(r.menuCoutNum * 100) / 100;
  return r;
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
    // Récaps et détail vides : l'appelant les remplace par l'agrégation réelle
    // (`agregerSousListes`). Les valeurs par défaut évitent qu'un oubli produise
    // un `undefined` traversant jusqu'à l'affichage.
    ...rollupVide(),
    sousListes: { invites: [], checklist: [], menu: [] },
  };
}
