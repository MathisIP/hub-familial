/**
 * BUDGET FAMILIAL — OUTILS COMMUNS
 * ================================
 * Fonctions utilitaires partagées par plusieurs modules. Elles étaient
 * auparavant dupliquées (ex. `trouverFeuille_` existait à l'identique dans
 * deux fichiers) : elles ne sont désormais définies qu'ICI, une seule fois.
 *
 * Toutes se terminent par « _ » : ce sont des fonctions internes (non exposées
 * dans les menus), à ne pas exécuter directement.
 */

/**
 * Trouve une feuille dont le nom CONTIENT le mot-clé (insensible à la casse et
 * robuste à l'apostrophe, ex. « 🌸 Vue d'ensemble » via « ensemble »).
 * ⚠ Phase H (2026-07-17) : le Budget ne l'utilise plus en interne — les noms
 * d'onglets varient désormais selon la langue active, donc le code appelle
 * `ss.getSheetByName(nomOnglet_('CLE'))` (nom exact) plutôt qu'une recherche
 * par mot-clé. Fonction conservée (compat / autres usages éventuels).
 */
function trouverFeuille_(ss, motCle) {
  var sheets = ss.getSheets();
  motCle = motCle.toLowerCase();
  for (var i = 0; i < sheets.length; i++) {
    if (sheets[i].getName().toLowerCase().indexOf(motCle) !== -1) return sheets[i];
  }
  return null;
}

/** Supprime les déclencheurs dont la fonction gérée est dans la liste `noms`. */
function supprimerDeclencheurs_(noms) {
  ScriptApp.getProjectTriggers().forEach(function (t) {
    if (noms.indexOf(t.getHandlerFunction()) >= 0) { ScriptApp.deleteTrigger(t); }
  });
}

/** Vrai si la colonne (1=A, 6=F, 11=K…) contient déjà la valeur (lignes 1..60). */
function colonneContient_(sh, colIndex, val) {
  var vals = sh.getRange(1, colIndex, 60, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim() === val) return true;
  }
  return false;
}

/** Vrai si la catégorie figure dans le tableau `budgets` (colonne 0 = libellé). */
function estBudgetee_(cat, budgets) {
  for (var i = 0; i < budgets.length; i++) {
    if (String(budgets[i][0]).trim() === cat) { return true; }
  }
  return false;
}

/** Renvoie une date « nue » (sans heure) — utile pour comparer des jours. */
function dateSeule_(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()); }

/** Formate une date en JJ/MM/AAAA. */
function fmtDate_(d) {
  return ("0" + d.getDate()).slice(-2) + "/" +
         ("0" + (d.getMonth() + 1)).slice(-2) + "/" + d.getFullYear();
}

/** Formate un nombre en euros « 1 234,56 € » (séparateur de milliers = espace). */
function eur_(n) {
  var signe = n < 0 ? "-" : "";
  n = Math.abs(n);
  var entier = Math.floor(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ");
  var dec = Math.round((n - Math.floor(n)) * 100);
  return signe + entier + "," + ("0" + dec).slice(-2) + " €";
}
