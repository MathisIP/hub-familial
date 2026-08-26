/**
 * EXTENSION DE THÈME PROPRE AU MODULE TO-DO.
 * ==========================================
 * Le socle (lib/themes.ts) porte les rôles partagés par tous les modules.
 * Chaque module ajoute SES rôles de signal — ici les couleurs de statut,
 * priorité et assignation de la To-Do. Valeurs reprises telles quelles des
 * 9 thèmes de `Contexte/ToDo/00_Constantes.gs` : même charte que le tableur.
 *
 * Le CSS produit réutilise les mêmes sélecteurs `[data-theme="..."]` que le
 * socle ; injecté depuis la page To-Do, il complète les variables globales
 * uniquement là où le module en a besoin. C'est le patron que suivront les
 * futurs modules (Budget, Cadeaux…).
 */
import { THEME_ORDRE, THEMES, estSombre, nomVariable, type IdTheme } from '@/lib/themes';

const ROLES_TODO = [
  'DONE_BG', 'DONE_TX',
  'STATUT_AFAIRE', 'STATUT_ENCOURS',
  'PRIO_HAUTE_BG', 'PRIO_MOY_BG', 'PRIO_MOY_TX', 'PRIO_BAS_BG',
  'ASSIGN_A', 'ASSIGN_B', 'ASSIGN_BOTH',
] as const;

type RoleTodo = (typeof ROLES_TODO)[number];
type JeuTodo = Record<RoleTodo, string>;

/**
 * Réglages manuels du module To-Do.
 *
 * ⚠ Les statuts et priorités sont des SIGNAUX, pas de la décoration : « en
 * retard » doit se lire d'un coup d'œil. On les règle donc à la main plutôt que
 * de les dériver de l'accent, qui les rendrait tous indigo — et donc
 * indistinguables les uns des autres.
 *
 * Les teintes restent dans la famille du site : sable, ardoise, brique, olive.
 */
const FIXE: Partial<Record<IdTheme, JeuTodo>> = {
  chaux: {
    DONE_BG: '#E4E6E1', DONE_TX: '#8B939C', STATUT_AFAIRE: '#DDE0DA', STATUT_ENCOURS: '#EFE4D2',
    PRIO_HAUTE_BG: '#F2E2E0', PRIO_MOY_BG: '#F0E6D4', PRIO_MOY_TX: '#8A6420', PRIO_BAS_BG: '#E0EDE6',
    ASSIGN_A: '#E4E3F7', ASSIGN_B: '#DEE9F1', ASSIGN_BOTH: '#E7E4EF',
  },
  encre: {
    DONE_BG: '#1A2432', DONE_TX: '#6B7885', STATUT_AFAIRE: '#24313F', STATUT_ENCOURS: '#33301F',
    PRIO_HAUTE_BG: '#3A2320', PRIO_MOY_BG: '#332E1D', PRIO_MOY_TX: '#E0B978', PRIO_BAS_BG: '#1C3329',
    ASSIGN_A: '#232145', ASSIGN_B: '#1E2E3D', ASSIGN_BOTH: '#272442',
  },
};

/** Jeu To-Do clair dérivé de l'accent de la gamme (statuts/priorités = signal). */
function todoClair(acc: string): JeuTodo {
  return {
    DONE_BG: `color-mix(in srgb, ${acc} 7%, #F2EEF0)`,
    DONE_TX: `color-mix(in srgb, ${acc} 24%, #B0A8AD)`,
    STATUT_AFAIRE: `color-mix(in srgb, ${acc} 16%, #FFFFFF)`,
    STATUT_ENCOURS: '#FDE8CF',
    PRIO_HAUTE_BG: '#FBD2CC', PRIO_MOY_BG: '#FCE8C6', PRIO_MOY_TX: '#9A6A18', PRIO_BAS_BG: '#DCEFE0',
    ASSIGN_A: `color-mix(in srgb, ${acc} 24%, #FFFFFF)`, ASSIGN_B: '#DDEEFB', ASSIGN_BOTH: '#EADBF6',
  };
}

/** Jeu To-Do sombre dérivé de l'accent clair de la gamme. */
function todoSombre(acc: string): JeuTodo {
  return {
    DONE_BG: `color-mix(in srgb, ${acc} 12%, #221D1F)`,
    DONE_TX: `color-mix(in srgb, ${acc} 28%, #6E615E)`,
    STATUT_AFAIRE: `color-mix(in srgb, ${acc} 24%, #1E1622)`,
    STATUT_ENCOURS: '#3A2C1B',
    PRIO_HAUTE_BG: '#45231F', PRIO_MOY_BG: '#3E3320', PRIO_MOY_TX: '#F0C878', PRIO_BAS_BG: '#1E3327',
    ASSIGN_A: `color-mix(in srgb, ${acc} 28%, #241A1F)`, ASSIGN_B: '#21323F', ASSIGN_BOTH: '#2E2440',
  };
}

function jeuTodo(id: IdTheme): JeuTodo {
  return FIXE[id] ?? (estSombre(id) ? todoSombre(THEMES[id].ACC) : todoClair(THEMES[id].ACC));
}

/** CSS des rôles To-Do, par thème, avec les mêmes sélecteurs que le socle. */
export function cssTodoThemes(): string {
  return THEME_ORDRE.map((id: IdTheme) => {
    const t = jeuTodo(id);
    const vars = ROLES_TODO.map((r) => `  ${nomVariable(r)}: ${t[r]};`).join('\n');
    return `[data-theme="${id}"] {\n${vars}\n}`;
  }).join('\n\n');
}
