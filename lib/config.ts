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
