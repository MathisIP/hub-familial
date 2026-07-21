import 'server-only';

/**
 * CONFIGURATION DU FOYER — le point de bascule mono-foyer → multi-foyer.
 * =====================================================================
 * Contrainte du cahier des charges (§6.3) : « zéro identifiant en dur ».
 * L'app doit un jour servir plusieurs foyers, chacun avec SES classeurs et SON
 * compte Google. Aucun composant, aucune route ne doit donc connaître un ID.
 *
 * Aujourd'hui (phase privée) : les IDs viennent de `.env`, et un compte de
 * service unique accède aux classeurs du foyer.
 * Demain (phase vendable) : `configFoyer()` ira chercher la config du foyer
 * connecté (session OAuth → base) et renverra le même objet.
 *
 * ⚠ C'est la SEULE fonction à réécrire pour ce changement. Tant que le reste
 * du code passe par elle, la bascule ne touche à rien d'autre. Ne jamais lire
 * `process.env.*_SHEET_ID` ailleurs.
 */

export type ClasseurId =
  | 'BUDGET'
  | 'TODO'
  | 'REPAS'
  | 'EVENEMENTS'
  | 'CADEAUX';

export type ConfigFoyer = {
  /** Identifiant du foyer. `local` tant qu'il n'y a pas de comptes. */
  foyerId: string;
  classeurs: Record<ClasseurId, string>;
  /** Agendas Google familiaux (module Agenda). Vide si non configuré. */
  agendaIds: string[];
};

const VARIABLES: Record<ClasseurId, string> = {
  BUDGET: 'BUDGET_SHEET_ID',
  TODO: 'TODO_SHEET_ID',
  REPAS: 'REPAS_SHEET_ID',
  EVENEMENTS: 'EVENEMENTS_SHEET_ID',
  CADEAUX: 'CADEAUX_SHEET_ID',
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
 * Config du foyer courant. Lève `ConfigManquante` plutôt que de laisser passer
 * un `undefined` qui se transformerait en erreur 404 opaque de l'API Sheets.
 */
export function configFoyer(): ConfigFoyer {
  const classeurs = {} as Record<ClasseurId, string>;
  const manquantes: string[] = [];

  for (const [cle, variable] of Object.entries(VARIABLES) as [ClasseurId, string][]) {
    const valeur = process.env[variable];
    if (!valeur) manquantes.push(variable);
    else classeurs[cle] = valeur;
  }

  if (manquantes.length > 0) throw new ConfigManquante(manquantes);

  // Agendas : AGENDA_IDS (séparés par des virgules) + AGENDA_ID (compat), dédoublonnés.
  const agendaIds = [process.env.AGENDA_IDS ?? '', process.env.AGENDA_ID ?? '']
    .flatMap((v) => v.split(','))
    .map((s) => s.trim())
    .filter((s) => s !== '');

  return {
    foyerId: 'local',
    classeurs,
    agendaIds: [...new Set(agendaIds)],
  };
}

export function idClasseur(cle: ClasseurId): string {
  return configFoyer().classeurs[cle];
}
