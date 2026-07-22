/**
 * CADRE MULTILINGUE — transposition de la Phase H des Apps Script.
 * ================================================================
 * Règle héritée des Sheets, et la plus importante de tout ce fichier :
 * **aucun nom d'onglet n'est jamais écrit en dur ailleurs que dans ce registre.**
 * Le code désigne un onglet par sa CLÉ CANONIQUE (`SEMAINE`, `TACHES`…) et
 * appelle `nomOnglet()`. Changer de langue dans les Sheets RENOMME réellement
 * les onglets : toute plage A1 codée en dur casserait ce jour-là.
 *
 * C'est précisément ce qui a tué la première version Express : elle lisait
 * `'Semaine!A:B'` et `'Tâches!A2:H50'` en dur.
 *
 * FR = référence complète. EN/ES restent à remplir, comme côté Sheets.
 */

export type IdLangue = 'fr';
export type Module = keyof (typeof LANGUES)['fr']['ONGLETS'];
/** Clés d'onglet valides pour un module donné — vérifiées à la compilation. */
export type ClesOnglet<M extends Module> = keyof (typeof LANGUES)['fr']['ONGLETS'][M];

export const LANGUES = {
  fr: {
    NOM: '🇫🇷 Français',
    ONGLETS: {
      BUDGET: {
        VUE_ENSEMBLE: "🌸 Vue d'ensemble",
        TABLEAU_BORD: 'Tableau de bord',
        VUE_ANNUELLE: 'Vue annuelle',
        EPARGNE: 'Épargne',
        TRANSACTIONS: 'Transactions',
        IMPORT_CSV: 'Import CSV',
        PARAMETRES: 'Paramètres',
        ECHEANCES: 'Échéances',
        LISEZMOI: 'Lisez-moi',
        REPONSES_FORM: 'Réponses au formulaire 1',
      },
      TODO: {
        REPONSES_FORM: 'Réponses au formulaire 1',
        LISEZMOI: 'Lisez-moi',
        APERCU: 'Aperçu',
        TACHES: 'Tâches',
        COURSES: 'Courses',
        PARAMETRES: 'Paramètres',
        LOU: 'Lou',
        MATI: 'Mati',
        NOUS_DEUX: 'Nous deux',
      },
      REPAS: {
        LISEZMOI: 'Lisez-moi',
        SEMAINE: 'Semaine',
        RECETTES: 'Recettes',
        RECHERCHE: 'Recherche',
      },
      EVENEMENTS: {
        LISEZMOI: 'Lisez-moi',
        APERCU: 'Aperçu',
        EVENEMENTS: 'Événements',
        INVITES: 'Invités',
        CHECKLIST: 'Checklist',
        MENU_COURSES: 'Menu & Courses',
        PARAMETRES: 'Paramètres',
      },
      CADEAUX: {
        LISEZMOI: 'Lisez-moi',
        APERCU: 'Aperçu',
        CADEAUX: 'Cadeaux',
        OCCASIONS: 'Occasions',
        PARAMETRES: 'Paramètres',
      },
    },
    UI: {
      APP_TITRE: '🏡 Hub familial',
      APP_SOUS_TITRE: "L'organisation du foyer, en un seul endroit",
      THEME: '🎨 Thème',
      LANGUE: '🌍 Langue',
      MOD_BUDGET: '🌸 Budget',
      MOD_TODO: '✅ To-Do',
      MOD_REPAS: '🍽️ Repas',
      MOD_EVENEMENTS: '🎉 Événements',
      MOD_CADEAUX: '🎁 Cadeaux',
      MOD_AGENDA: '🗓️ Agenda',
      ETAT_CONNEXION: 'État de la connexion',
      ETAT_OK: 'Connecté',
      ETAT_ECHEC: 'Inaccessible',
      ETAT_VERIF: 'Vérification…',
      BIENTOT: 'À venir',
    },
  },
} as const;

export const LANGUE_ORDRE: IdLangue[] = ['fr'];
export const LANGUE_DEFAUT: IdLangue = 'fr';

/**
 * Nom réel de l'onglet `cle` du module `mod`, dans la langue active.
 * Repli sûr sur le français, exactement comme `nomOnglet_()` côté Apps Script.
 */
export function nomOnglet<M extends Module>(
  mod: M,
  cle: ClesOnglet<M>,
  langue: IdLangue = LANGUE_DEFAUT,
): string {
  const registre = LANGUES[langue] ?? LANGUES[LANGUE_DEFAUT];
  const onglets = registre.ONGLETS[mod] as Record<string, string>;
  return onglets[cle as string] ?? (LANGUES.fr.ONGLETS[mod] as Record<string, string>)[cle as string];
}

/** Libellé d'interface, repli sur le français puis sur la clé elle-même. */
export function t(cle: keyof (typeof LANGUES)['fr']['UI'], langue: IdLangue = LANGUE_DEFAUT): string {
  const registre = LANGUES[langue] ?? LANGUES[LANGUE_DEFAUT];
  return registre.UI[cle] ?? LANGUES.fr.UI[cle] ?? String(cle);
}

/**
 * Construit une plage A1 en échappant le nom d'onglet.
 * Les noms contiennent des emojis, des accents, des apostrophes
 * (« 🌸 Vue d'ensemble ») et des esperluettes (« Menu & Courses ») : sans
 * quotes ni doublement des apostrophes, l'API Sheets renvoie une erreur de parsing.
 */
export function plage(nomDeLOnglet: string, a1?: string): string {
  const echappe = `'${nomDeLOnglet.replace(/'/g, "''")}'`;
  return a1 ? `${echappe}!${a1}` : echappe;
}
