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

/** Corail réglé à la main (look validé) ; les autres gammes sont générées. */
const FIXE: Partial<Record<IdTheme, JeuTodo>> = {
  corail: {
    DONE_BG: '#F4EDEC', DONE_TX: '#C0A9AB', STATUT_AFAIRE: '#FFE7E4', STATUT_ENCOURS: '#FDE8CF',
    PRIO_HAUTE_BG: '#FBD2CC', PRIO_MOY_BG: '#FCE8C6', PRIO_MOY_TX: '#9A6A18', PRIO_BAS_BG: '#DCEFE0',
    ASSIGN_A: '#FFDEE4', ASSIGN_B: '#DDEEFB', ASSIGN_BOTH: '#EADBF6',
  },
  nuit: {
    DONE_BG: '#2A1F21', DONE_TX: '#7A6663', STATUT_AFAIRE: '#3A2528', STATUT_ENCOURS: '#3A2C1B',
    PRIO_HAUTE_BG: '#45231F', PRIO_MOY_BG: '#3E3320', PRIO_MOY_TX: '#F0C878', PRIO_BAS_BG: '#1E3327',
    ASSIGN_A: '#3A2530', ASSIGN_B: '#21323F', ASSIGN_BOTH: '#2E2440',
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
