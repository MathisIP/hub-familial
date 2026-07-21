/**
 * TO-DO FAMILIALE — OUTILS COMMUNS
 * ================================
 * Helpers partagés, définis ICI une seule fois. Ils remplacent d'anciens
 * doublons du projet :
 *   · `supprimerDeclencheurs_` remplace `supprTrig_`, `supprTrigV_` et
 *     `supprimerAnciensDeclencheurs_` (même rôle : purger des déclencheurs).
 *   · `prochaineDate_` remplace `prochaineDate_` + `prochaineDateV_` (identiques).
 * Toutes se terminent par « _ » (fonctions internes, à ne pas exécuter seules).
 */

/** Lit une colonne de Paramètres (à partir de la ligne 5) jusqu'à la 1re cellule vide. */
function lire_(sh, col) {
  var out = [], r = 5;
  while (r < 60) { var v = sh.getRange(r, col).getValue(); if (v === "" || v === null) break; out.push(String(v)); r++; }
  return out;
}

/** Supprime les déclencheurs dont la fonction gérée est dans la liste `noms`. */
function supprimerDeclencheurs_(noms) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (noms.indexOf(t.getHandlerFunction()) >= 0) ScriptApp.deleteTrigger(t);
  });
}

/** Renvoie une date « nue » (sans heure) — utile pour comparer des jours. */
function dateSeule_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/** Accepte « 2026-07-13 », « 13/07/2026 » ou vide. */
function parseDate_(s) {
  if (!s) return null;
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return new Date(+m[1], +m[2] - 1, +m[3]);
  m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return new Date(+m[3], +m[2] - 1, +m[1]);
  var d = new Date(s); return isNaN(d.getTime()) ? null : d;
}

/** Vrai si deux valeurs représentent le même jour (ou sont toutes deux non-dates). */
function memeDate_(a, b) {
  var da = (a instanceof Date), db = (b instanceof Date);
  if (!da && !db) return true;
  if (da !== db) return false;
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth()
      && a.getDate() === b.getDate();
}

/** Date de la prochaine occurrence d'une tâche récurrente. */
function prochaineDate_(dd, rec) {
  var n = new Date(dd.getFullYear(), dd.getMonth(), dd.getDate());
  if (rec === "hebdomadaire") n.setDate(n.getDate() + 7);
  else if (rec === "mensuelle") n.setMonth(n.getMonth() + 1);
  else if (rec === "annuelle") n.setFullYear(n.getFullYear() + 1);
  return n;
}
