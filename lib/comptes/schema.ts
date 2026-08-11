/**
 * COMPTES DU PROJET — SCHÉMA & CALCULS PURS (partagés serveur ↔ client).
 * =====================================================================
 * Aucune dépendance à la base ni au réseau : tout est calculable depuis les
 * mouvements, ce qui rend ces fonctions testables et réutilisables par le
 * script de synchronisation comme par la page.
 */

export type Sens = 'depense' | 'recette';
export type Recurrence = 'mensuel' | 'annuel';

export type Mouvement = {
  id: string;
  date: string; // aaaa-mm-jj — premier paiement si récurrent
  libelle: string;
  categorie: string;
  sens: Sens;
  /** Montant d'UNE occurrence, en centimes. `null` = pas encore renseigné. */
  montantCentimes: number | null;
  recurrence: Recurrence | null;
  fin: string | null; // aaaa-mm-jj — date d'arrêt d'un récurrent
  note: string;
};

/** Une ligne enrichie de ce que le calcul en a tiré. */
export type LigneCalculee = Mouvement & {
  occurrences: number;
  /** montant × occurrences, en centimes. 0 si le montant manque. */
  totalCentimes: number;
  /** Encore en cours à la date de référence ? */
  actif: boolean;
};

export type Bilan = {
  lignes: LigneCalculee[];
  depensesCentimes: number;
  recettesCentimes: number;
  soldeCentimes: number;
  /** Coût récurrent ramené au mois (annuel ÷ 12), abonnements actifs seulement. */
  chargeMensuelleCentimes: number;
  revenuMensuelCentimes: number;
  /** Lignes dont le montant reste à renseigner — le total est donc incomplet. */
  aCompleter: number;
  parCategorie: { categorie: string; totalCentimes: number }[];
};

const JOUR = 86_400_000;

/** « 2026-08-11 » → Date (midi UTC, pour ne pas basculer de jour au fuseau). */
function versDate(iso: string): Date | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso.trim());
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12));
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Date du jour au même format, pour comparer sans se soucier de l'heure. */
export function aujourdISO(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Combien de fois ce mouvement a-t-il été payé au `referenceISO` ?
 *
 * C'est le cœur de la règle « on n'écrit un récurrent qu'une fois » : le cumul
 * n'est jamais recopié dans le fichier, il se déduit du temps écoulé. Un
 * abonnement mensuel démarré le 6 août vaut 1 le 6 août, 2 le 6 septembre.
 *
 * - paiement unique  → 1 (ou 0 s'il est encore à venir)
 * - récurrent        → nombre d'échéances tombées, bornées par `fin`
 */
export function occurrences(m: Mouvement, referenceISO: string): number {
  const debut = versDate(m.date);
  const ref = versDate(referenceISO);
  if (!debut || !ref) return 0;
  if (debut > ref) return 0; // pas encore payé
  if (!m.recurrence) return 1;

  // Un abonnement arrêté cesse de compter à sa date de fin, pas aujourd'hui.
  const fin = m.fin ? versDate(m.fin) : null;
  const borne = fin && fin < ref ? fin : ref;
  if (borne < debut) return 0;

  const moisEcoules =
    (borne.getUTCFullYear() - debut.getUTCFullYear()) * 12 +
    (borne.getUTCMonth() - debut.getUTCMonth()) -
    // Le mois n'est pas dû tant que le jour du prélèvement n'est pas passé.
    (borne.getUTCDate() < debut.getUTCDate() ? 1 : 0);

  const pas = m.recurrence === 'mensuel' ? 1 : 12;
  return Math.floor(moisEcoules / pas) + 1;
}

/** Le mouvement court-il encore à la date de référence ? */
export function estActif(m: Mouvement, referenceISO: string): boolean {
  if (!m.recurrence) return false; // un paiement unique n'est pas « en cours »
  if (!m.fin) return true;
  return m.fin >= referenceISO;
}

/** Coût d'un récurrent ramené au mois, en centimes (0 s'il est inactif). */
function parMois(m: Mouvement, referenceISO: string): number {
  if (!estActif(m, referenceISO) || m.montantCentimes == null) return 0;
  return m.recurrence === 'annuel'
    ? Math.round(m.montantCentimes / 12)
    : m.montantCentimes;
}

/** Bilan complet à une date donnée (aujourd'hui par défaut). */
export function bilan(mouvements: Mouvement[], referenceISO = aujourdISO()): Bilan {
  const lignes: LigneCalculee[] = mouvements.map((m) => {
    const n = occurrences(m, referenceISO);
    return {
      ...m,
      occurrences: n,
      totalCentimes: (m.montantCentimes ?? 0) * n,
      actif: estActif(m, referenceISO),
    };
  });

  const somme = (s: Sens, f: (l: LigneCalculee) => number) =>
    lignes.filter((l) => l.sens === s).reduce((t, l) => t + f(l), 0);

  const depensesCentimes = somme('depense', (l) => l.totalCentimes);
  const recettesCentimes = somme('recette', (l) => l.totalCentimes);

  // Regroupement par catégorie, dépenses seules, du plus lourd au plus léger.
  const parCat = new Map<string, number>();
  for (const l of lignes) {
    if (l.sens !== 'depense' || l.totalCentimes === 0) continue;
    const c = l.categorie.trim() || 'Sans catégorie';
    parCat.set(c, (parCat.get(c) ?? 0) + l.totalCentimes);
  }

  return {
    lignes: lignes.sort((a, b) => b.date.localeCompare(a.date)),
    depensesCentimes,
    recettesCentimes,
    soldeCentimes: recettesCentimes - depensesCentimes,
    chargeMensuelleCentimes: somme('depense', (l) => parMois(l, referenceISO)),
    revenuMensuelCentimes: somme('recette', (l) => parMois(l, referenceISO)),
    aCompleter: lignes.filter((l) => l.montantCentimes == null).length,
    parCategorie: [...parCat.entries()]
      .map(([categorie, totalCentimes]) => ({ categorie, totalCentimes }))
      .sort((a, b) => b.totalCentimes - a.totalCentimes),
  };
}

/** 2050 → « 20,50 € ». */
export function euros(centimes: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' }).format(
    centimes / 100,
  );
}

/** « aaaa-mm-jj » → « 11 août 2026 ». */
export function dateCourte(iso: string): string {
  const d = versDate(iso);
  if (!d) return iso;
  return new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(d);
}

/** Étiquette lisible d'une périodicité. */
export function libelleRecurrence(r: Recurrence | null): string {
  return r === 'mensuel' ? 'par mois' : r === 'annuel' ? 'par an' : 'une fois';
}

/** Jours écoulés depuis la première dépense — pour situer le projet dans le temps. */
export function ancienneteJours(mouvements: Mouvement[], referenceISO = aujourdISO()): number {
  const dates = mouvements.map((m) => versDate(m.date)).filter((d): d is Date => d !== null);
  const ref = versDate(referenceISO);
  if (dates.length === 0 || !ref) return 0;
  const premiere = dates.reduce((a, b) => (a < b ? a : b));
  return Math.max(0, Math.round((ref.getTime() - premiere.getTime()) / JOUR));
}
