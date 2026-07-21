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
import { THEME_ORDRE, nomVariable, type IdTheme } from '@/lib/themes';

const ROLES_TODO = [
  'DONE_BG', 'DONE_TX',
  'STATUT_AFAIRE', 'STATUT_ENCOURS',
  'PRIO_HAUTE_BG', 'PRIO_MOY_BG', 'PRIO_MOY_TX', 'PRIO_BAS_BG',
  'ASSIGN_A', 'ASSIGN_B', 'ASSIGN_BOTH',
] as const;

type RoleTodo = (typeof ROLES_TODO)[number];

const THEMES_TODO: Record<IdTheme, Record<RoleTodo, string>> = {
  rose: {
    DONE_BG: '#f1efea', DONE_TX: '#b8b2a8', STATUT_AFAIRE: '#fbefd4', STATUT_ENCOURS: '#ddeaf7',
    PRIO_HAUTE_BG: '#f6cfd9', PRIO_MOY_BG: '#f3e0a2', PRIO_MOY_TX: '#8a6d1a', PRIO_BAS_BG: '#cbe8d5',
    ASSIGN_A: '#d7e7f6', ASSIGN_B: '#d3eddd', ASSIGN_BOTH: '#e7d8f4',
  },
  ocean: {
    DONE_BG: '#e6ecef', DONE_TX: '#93a1a8', STATUT_AFAIRE: '#cfe9e2', STATUT_ENCOURS: '#cbe3f2',
    PRIO_HAUTE_BG: '#f1cdd4', PRIO_MOY_BG: '#f1e2b0', PRIO_MOY_TX: '#8a6d1a', PRIO_BAS_BG: '#c0e4e2',
    ASSIGN_A: '#cfe6f6', ASSIGN_B: '#d0eee5', ASSIGN_BOTH: '#d7e1f1',
  },
  sauge: {
    DONE_BG: '#eceee6', DONE_TX: '#98a08e', STATUT_AFAIRE: '#eef0d6', STATUT_ENCOURS: '#cfe6d6',
    PRIO_HAUTE_BG: '#efd0c8', PRIO_MOY_BG: '#ece0b0', PRIO_MOY_TX: '#7d6320', PRIO_BAS_BG: '#d3e6c8',
    ASSIGN_A: '#cfe2e2', ASSIGN_B: '#d3e6c8', ASSIGN_BOTH: '#e3ddc6',
  },
  terracotta: {
    DONE_BG: '#efe7dd', DONE_TX: '#a8968a', STATUT_AFAIRE: '#f6e3bf', STATUT_ENCOURS: '#f3d9c0',
    PRIO_HAUTE_BG: '#f2c7bd', PRIO_MOY_BG: '#f1e2b0', PRIO_MOY_TX: '#8a6320', PRIO_BAS_BG: '#e2ebc8',
    ASSIGN_A: '#f3d3b0', ASSIGN_B: '#ece0c0', ASSIGN_BOTH: '#ecd0bd',
  },
  lila: {
    DONE_BG: '#eee9f0', DONE_TX: '#9a90a2', STATUT_AFAIRE: '#f4e2c0', STATUT_ENCOURS: '#d8cff0',
    PRIO_HAUTE_BG: '#f4cdd8', PRIO_MOY_BG: '#f4dca8', PRIO_MOY_TX: '#8a6d1a', PRIO_BAS_BG: '#d6ecd6',
    ASSIGN_A: '#e0d2f2', ASSIGN_B: '#f0d6e6', ASSIGN_BOTH: '#cdc4ea',
  },
  rouge: {
    DONE_BG: '#efe6e2', DONE_TX: '#a8948e', STATUT_AFAIRE: '#f7dcc4', STATUT_ENCOURS: '#f0d6d0',
    PRIO_HAUTE_BG: '#f4c4cc', PRIO_MOY_BG: '#f2dcc6', PRIO_MOY_TX: '#8a5a20', PRIO_BAS_BG: '#e2ecc8',
    ASSIGN_A: '#f6d2cd', ASSIGN_B: '#f3dcc4', ASSIGN_BOTH: '#eecfd6',
  },
  marron: {
    DONE_BG: '#ece5da', DONE_TX: '#a08d76', STATUT_AFAIRE: '#ecdcc0', STATUT_ENCOURS: '#d6dcc0',
    PRIO_HAUTE_BG: '#eccdc0', PRIO_MOY_BG: '#f0d9a0', PRIO_MOY_TX: '#7a5a20', PRIO_BAS_BG: '#dbe6c4',
    ASSIGN_A: '#e3d4b8', ASSIGN_B: '#dce4d0', ASSIGN_BOTH: '#e0cdbc',
  },
  gris: {
    DONE_BG: '#e6e6e6', DONE_TX: '#9a9ea2', STATUT_AFAIRE: '#ebe3cc', STATUT_ENCOURS: '#dbe1e6',
    PRIO_HAUTE_BG: '#e4d6d7', PRIO_MOY_BG: '#ebe3cc', PRIO_MOY_TX: '#7a6f4a', PRIO_BAS_BG: '#dce4de',
    ASSIGN_A: '#dbe1e6', ASSIGN_B: '#dce4de', ASSIGN_BOTH: '#e2dee6',
  },
  nuit: {
    DONE_BG: '#2f333c', DONE_TX: '#6a7078', STATUT_AFAIRE: '#4a4230', STATUT_ENCOURS: '#26364a',
    PRIO_HAUTE_BG: '#4a2b34', PRIO_MOY_BG: '#4a4230', PRIO_MOY_TX: '#f0cf7a', PRIO_BAS_BG: '#24402f',
    ASSIGN_A: '#263c50', ASSIGN_B: '#244035', ASSIGN_BOTH: '#362a48',
  },
};

/** CSS des rôles To-Do, par thème, avec les mêmes sélecteurs que le socle. */
export function cssTodoThemes(): string {
  return THEME_ORDRE.map((id: IdTheme) => {
    const t = THEMES_TODO[id];
    const vars = ROLES_TODO.map((r) => `  ${nomVariable(r)}: ${t[r]};`).join('\n');
    return `[data-theme="${id}"] {\n${vars}\n}`;
  }).join('\n\n');
}
