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

export type EvenementAgenda = {
  id: string;
  calendarId: string; // agenda d'origine (nécessaire à la suppression)
  couleur: string; // couleur de l'agenda d'origine
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

const JOURS_FR = ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'];
const MOIS_FR = ['janvier', 'février', 'mars', 'avril', 'mai', 'juin', 'juillet', 'août', 'septembre', 'octobre', 'novembre', 'décembre'];

/** « 2026-08-15 » → « samedi 15 août 2026 ». */
export function libelleJourComplet(iso: string): string {
  const [a, m, j] = iso.split('-').map(Number);
  if (!a || !m || !j) return iso;
  const d = new Date(a, m - 1, j);
  return `${JOURS_FR[d.getDay()]} ${j} ${MOIS_FR[m - 1]} ${a}`;
}

/** Étiquette relative courte : Aujourd'hui / Demain / sinon vide. */
export function libelleRelatif(iso: string, aujourdISO: string): string {
  if (iso === aujourdISO) return "Aujourd'hui";
  const [a, m, j] = aujourdISO.split('-').map(Number);
  const demain = new Date(a, m - 1, j + 1);
  const dISO = `${demain.getFullYear()}-${String(demain.getMonth() + 1).padStart(2, '0')}-${String(demain.getDate()).padStart(2, '0')}`;
  return iso === dISO ? 'Demain' : '';
}

export function aujourdhuiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
