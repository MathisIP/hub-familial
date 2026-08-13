/**
 * MODULE AGENDA — SCHÉMA & HELPERS PURS (partagés serveur ↔ client).
 * ==================================================================
 * Source = Google Agenda familial (pas un Sheet). Le service renvoie des
 * événements déjà mis en forme pour l'affichage + des champs ISO pour le groupage.
 */

export const FUSEAU = 'Europe/Paris';

/** Palette d'identité des agendas (couleurs douces, lisibles clair & sombre). */
export const COULEURS_AGENDA = ['#7fb0e0', '#6cc39a', '#e6a3b3', '#e6c07f', '#b096d8', '#7fc9d6'];

export type Agenda = { id: string; nom: string; couleur: string };

/**
 * Portée d'une suppression. N'a de sens que pour un événement récurrent :
 * Google raisonne en occurrences, l'utilisateur en « ce rendez-vous » ou
 * « ce rendez-vous chaque semaine ».
 */
export type PorteeSuppression = 'occurrence' | 'serie';

export type EvenementAgenda = {
  id: string;
  calendarId: string; // agenda d'origine (nécessaire à la suppression)
  couleur: string; // couleur de l'agenda d'origine
  /**
   * Identifiant de la SÉRIE si cette ligne est une occurrence d'un événement
   * récurrent ; '' sinon.
   *
   * ⚠ On liste avec `singleEvents: true` : un rendez-vous hebdomadaire arrive
   * donc en autant de lignes qu'il a d'occurrences, chacune avec son propre id
   * (« abc_20260812 »). Supprimer une de ces lignes n'annule QUE cette
   * date-là — les autres restent dans Google Agenda. Sans ce champ, l'app
   * répondait « supprimé » pendant que l'événement continuait d'exister, ce
   * qui la faisait passer pour cassée.
   */
  serieId: string;
  titre: string;
  journeeEntiere: boolean;
  dateISO: string; // aaaa-mm-jj du début (pour grouper par jour)
  finISO: string; // aaaa-mm-jj de fin
  heureDebut: string; // « 19:30 » ou '' si journée entière
  heureFin: string;
  lieu: string;
  description: string;
};

export type DonneesAgenda = {
  evenements: EvenementAgenda[]; // triés par début croissant
  agendas: Agenda[]; // les agendas configurés (pour le choix à l'ajout)
  jours: number; // fenêtre affichée (nb de jours)
};

/** Champs pour créer un événement. */
export type NouvelEvenement = {
  calendarId: string; // dans quel agenda créer
  titre: string;
  date: string; // aaaa-mm-jj (début)
  journeeEntiere: boolean;
  heureDebut?: string; // « HH:MM » (si pas journée entière)
  heureFin?: string; // « HH:MM » (optionnel ; défaut = +1 h)
  lieu?: string;
  description?: string;
};

/*
 * `libelleJourComplet` et `libelleRelatif` ont ete retires le 13/08/2026 :
 * ils formataient en francais en dur, alors que VueAgenda formate desormais
 * dans la langue choisie via Intl. Deux facons de nommer un jour valaient une
 * de trop.
 */

export function aujourdhuiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
