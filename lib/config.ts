import 'server-only';

/**
 * CONFIGURATION TRANSVERSE — ce qui n'appartient à aucun foyer.
 * ============================================================
 * ⚠ **Ce fichier était le point de bascule mono-foyer → multi-foyer.** Il ne
 * l'est plus. Les données de tous les modules vivent en base, et les agendas
 * Google sont passés **par foyer** (table `foyer_agendas`, migration 0014). Il
 * ne reste ici que ce qu'aucune requête et aucune ligne de base ne peuvent
 * fournir : l'adresse publique du site.
 *
 * `configFoyer()` et son type `ConfigFoyer` ont été **retirés le 13/08/2026** —
 * plus aucun appelant depuis l'isolation de l'Agenda. Les variables `AGENDA_IDS`
 * et `AGENDA_ID` qu'ils lisaient n'ont plus aucun effet : un calendrier se
 * rattache depuis l'écran `/foyer/agenda`, et le lien est stocké en base. Les laisser
 * dans `.env` ne casse rien, mais elles n'y servent plus à rien.
 */

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
