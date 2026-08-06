import 'server-only';

/**
 * CONFIGURATION DU FOYER — le point de bascule mono-foyer → multi-foyer.
 * =====================================================================
 * Contrainte du cahier des charges (§6.3) : « zéro identifiant en dur ».
 * L'app doit un jour servir plusieurs foyers, chacun avec SA config. Aucun
 * composant, aucune route ne doit donc connaître un identifiant en dur.
 *
 * Les données du foyer vivent désormais en base (Postgres/Neon) ; il ne reste
 * ici que la config des services Google externes encore utilisés — les agendas
 * du module Agenda (Google Calendar). Aujourd'hui (phase privée) ces IDs viennent
 * de `.env` ; demain (multi-foyer) `configFoyer()` ira les chercher pour le foyer
 * connecté et renverra le même objet.
 */

export type ConfigFoyer = {
  /** Identifiant du foyer. `local` tant qu'il n'y a pas de comptes. */
  foyerId: string;
  /** Agendas Google familiaux (module Agenda). Vide si non configuré. */
  agendaIds: string[];
};

export class ConfigManquante extends Error {
  constructor(public readonly manquantes: string[]) {
    super(
      `Configuration incomplète — variables absentes de .env : ${manquantes.join(', ')}.`,
    );
    this.name = 'ConfigManquante';
  }
}

/**
 * Adresse publique du site, **sans barre finale** (ex. `https://www.nestync.app`).
 *
 * Pourquoi ici et pas en dur : un lien envoyé par courriel doit être absolu, et
 * la personne qui le reçoit n'a aucune requête en cours dont on pourrait déduire
 * l'origine — le cas du courriel de relance, expédié par la tâche planifiée, n'a
 * même pas de requête du tout. On lit donc `SITE_URL`, avec repli sur l'URL de
 * production fournie par Vercel afin que rien ne casse si la variable manque.
 *
 * ⚠ Aucun domaine en dur (règle « zéro identifiant en dur ») : le jour du
 * multi-foyer, seul ce fichier change.
 */
export function urlSite(): string {
  const brut =
    process.env.SITE_URL?.trim() ||
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : '');
  if (!brut) throw new ConfigManquante(['SITE_URL']);
  return brut.replace(/\/+$/, '');
}

/** Config du foyer courant (services Google externes). */
export function configFoyer(): ConfigFoyer {
  // Agendas : AGENDA_IDS (séparés par des virgules) + AGENDA_ID (compat), dédoublonnés.
  const agendaIds = [process.env.AGENDA_IDS ?? '', process.env.AGENDA_ID ?? '']
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter((s) => s !== '');

  return {
    foyerId: 'local',
    agendaIds: [...new Set(agendaIds)],
  };
}
