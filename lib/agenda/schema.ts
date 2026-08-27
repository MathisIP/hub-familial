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

/* ===================== VUES CALENDRIER (helpers purs) ===================== */

/** Modes d'affichage de l'agenda. */
export const VUES_AGENDA = ['jour', 'semaine', 'mois'] as const;
export type VueAgendaMode = (typeof VUES_AGENDA)[number];

/** Date ISO « aaaa-mm-jj » → objet Date local (midi, pour éviter les bords). */
function versDate(iso: string): Date {
  const [a, m, j] = iso.split('-').map(Number);
  return new Date(a, m - 1, j, 12);
}

/** Objet Date → « aaaa-mm-jj » local. */
export function versISOJour(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * Lundi de la semaine contenant `iso`.
 *
 * ⚠ LA SEMAINE COMMENCE LE LUNDI. `getDay()` renvoie 0 pour dimanche : la
 * formule anglo-saxonne `date - getDay()` donnerait un dimanche, et décalerait
 * tout l'affichage d'un jour pour un lecteur français. Le `+ 6) % 7` ramène
 * lundi à 0 et dimanche à 6.
 */
export function debutSemaine(iso: string): string {
  const d = versDate(iso);
  d.setDate(d.getDate() - ((d.getDay() + 6) % 7));
  return versISOJour(d);
}

/** Décale une date d'un nombre de jours (négatif accepté). */
export function decalerJours(iso: string, n: number): string {
  const d = versDate(iso);
  d.setDate(d.getDate() + n);
  return versISOJour(d);
}

/**
 * Décale une date d'un nombre de mois, en restant dans le mois visé.
 *
 * ⚠ `setMonth` seul déborde : le 31 mars moins un mois donne le 3 mars (le 31
 * février n'existant pas, JavaScript reporte). On se replace donc au 1er avant
 * de décaler — la navigation entre mois n'a de toute façon besoin que du mois.
 */
export function decalerMois(iso: string, n: number): string {
  const d = versDate(iso);
  d.setDate(1);
  d.setMonth(d.getMonth() + n);
  return versISOJour(d);
}

/** Premier jour du mois contenant `iso`. */
export function debutMois(iso: string): string {
  const d = versDate(iso);
  d.setDate(1);
  return versISOJour(d);
}

/** Les 7 jours de la semaine contenant `iso`, du lundi au dimanche. */
export function joursSemaine(iso: string): string[] {
  const lundi = debutSemaine(iso);
  return Array.from({ length: 7 }, (_, i) => decalerJours(lundi, i));
}

/**
 * Grille du mois : semaines complètes (lundi→dimanche) couvrant tout le mois.
 *
 * ⚠ **5 ou 6 semaines selon le mois, jamais 6 systématiquement.** Afficher une
 * sixième ligne vide sur les mois qui n'en ont pas besoin ajoute un écran de
 * défilement sur téléphone pour ne rien montrer.
 */
export function grilleMois(iso: string): string[][] {
  const premier = debutMois(iso);
  const debut = debutSemaine(premier);
  const moisVise = versDate(premier).getMonth();

  const semaines: string[][] = [];
  let curseur = debut;
  do {
    semaines.push(Array.from({ length: 7 }, (_, i) => decalerJours(curseur, i)));
    curseur = decalerJours(curseur, 7);
  } while (versDate(curseur).getMonth() === moisVise);
  return semaines;
}

/** Fenêtre [début, fin] à charger pour une vue et une date données. */
export function fenetreAgenda(vue: VueAgendaMode, iso: string): { debut: string; fin: string } {
  if (vue === 'jour') return { debut: iso, fin: iso };
  if (vue === 'semaine') {
    const jours = joursSemaine(iso);
    return { debut: jours[0], fin: jours[6] };
  }
  const grille = grilleMois(iso);
  return { debut: grille[0][0], fin: grille[grille.length - 1][6] };
}
