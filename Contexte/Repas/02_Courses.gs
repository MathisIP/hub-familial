/**
 * REPAS_SEMAINE — ENVOYER LES INGRÉDIENTS VERS LA LISTE DE COURSES
 * ===============================================================
 * Compile les ingrédients des dîners de la semaine (à partir de la banque de
 * recettes) et les ajoute dans ToDo_familiale › onglet « Courses » (colonnes
 * Fait / Article / Rayon), sans doublon et avec la case à cocher.
 *
 * Lancement : menu 🍽️ Repas ▸ « 🛒 Envoyer les ingrédients vers ma liste de courses »
 * (la 1re fois, autoriser l'accès aux deux fichiers).
 * Constantes (TODO_ID, TODO_ONGLET, JOUR_LIGNE_DEBUT, JOUR_NB) → voir 00_Constantes.gs.
 */
function envoyerVersCourses() {
  var ui = SpreadsheetApp.getUi();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sem = ss.getSheetByName(nomOnglet_('SEMAINE'));
  var rec = ss.getSheetByName(nomOnglet_('RECETTES'));
  if (!sem || !rec) { ui.alert("Onglet Semaine ou Recettes introuvable."); return; }

  // --- 1) Banque de recettes : nom -> liste [article, rayon] ---
  var mapRec = {};
  var nR = Math.max(rec.getLastRow() - 1, 0);
  if (nR > 0) {
    var recData = rec.getRange(2, 1, nR, 2).getValues();  // A: nom, B: ingrédients
    for (var i = 0; i < recData.length; i++) {
      var nom = String(recData[i][0]).trim();
      if (nom) mapRec[nom.toLowerCase()] = parseIngredients_(recData[i][1]);
    }
  }

  // --- 2) Colonne « Dîner » de la Semaine (repérée par son en-tête, robuste) ---
  var colDiner = 3;  // défaut = C
  var entetes = sem.getRange(7, 1, 1, sem.getLastColumn()).getValues()[0];
  for (var c = 0; c < entetes.length; c++) {
    if (String(entetes[c]).toLowerCase().indexOf("îner") !== -1) { colDiner = c + 1; break; }
  }
  var diners = sem.getRange(JOUR_LIGNE_DEBUT, colDiner, JOUR_NB, 1).getValues();

  // --- 3) Compiler les ingrédients (dédoublonnés) ---
  var aAjouter = [];       // [ [article, rayon], ... ]
  var vus = {};
  var nonTrouves = [];
  for (var d = 0; d < diners.length; d++) {
    var plat = String(diners[d][0]).trim();
    if (!plat) continue;
    var ings = mapRec[plat.toLowerCase()];
    if (!ings) { if (nonTrouves.indexOf(plat) === -1) nonTrouves.push(plat); continue; }
    for (var j = 0; j < ings.length; j++) {
      var art = ings[j][0], ray = ings[j][1];
      var key = art.toLowerCase();
      if (vus[key]) continue;
      vus[key] = true;
      aAjouter.push([art, ray]);
    }
  }
  if (aAjouter.length === 0) {
    ui.alert("Aucun ingrédient à envoyer.\n\nRemplis des dîners qui correspondent à des recettes de ta banque " +
             (nonTrouves.length ? "(non reconnus : " + nonTrouves.join(", ") + ")." : "."));
    return;
  }

  // --- 4) Ouvrir ToDo_familiale > Courses, dédoublonner, ajouter ---
  var todo, cs;
  try { todo = SpreadsheetApp.openById(TODO_ID); cs = todo.getSheetByName(TODO_ONGLET); }
  catch (e) { ui.alert("Impossible d'ouvrir le fichier de courses.\nVérifie l'ID ou tes autorisations.\n\n" + e); return; }
  if (!cs) { ui.alert("Onglet « " + TODO_ONGLET + " » introuvable dans ToDo_familiale."); return; }

  var existants = {};
  var last = cs.getLastRow();
  if (last >= 2) {
    var ex = cs.getRange(2, 2, last - 1, 1).getValues();  // colonne B = Article
    for (var e = 0; e < ex.length; e++) { existants[String(ex[e][0]).trim().toLowerCase()] = true; }
  }
  var rows = [], ignores = 0;
  for (var a = 0; a < aAjouter.length; a++) {
    if (existants[aAjouter[a][0].toLowerCase()]) { ignores++; continue; }
    rows.push(aAjouter[a]);
  }
  if (rows.length === 0) { ui.alert("Tout est déjà dans ta liste de courses (" + ignores + " ingrédient(s) déjà présent(s))."); return; }

  var start = cs.getLastRow() + 1;
  cs.getRange(start, 2, rows.length, 2).setValues(rows);   // B = Article, C = Rayon
  cs.getRange(start, 1, rows.length, 1).insertCheckboxes(); // A = Fait (case à cocher, décochée)
  SpreadsheetApp.flush();

  var msg = rows.length + " ingrédient(s) ajouté(s) à ta liste de courses (ToDo_familiale).";
  if (ignores > 0)          msg += "\n" + ignores + " déjà présent(s), ignoré(s).";
  if (nonTrouves.length > 0) msg += "\n\nDîners sans recette dans ta banque (non envoyés) : " + nonTrouves.join(", ") +
                                    ".\nAjoute-les dans l'onglet Recettes pour la prochaine fois.";
  ui.alert(msg);
}

// "Pâtes | Épicerie" (un par ligne) -> [ ["Pâtes","Épicerie"], ... ]
function parseIngredients_(cell) {
  var out = [];
  if (cell === null || cell === undefined) return out;
  var lignes = String(cell).split(/[\n;]+/);
  for (var i = 0; i < lignes.length; i++) {
    var ln = lignes[i].trim();
    if (!ln) continue;
    var art = ln, ray = "";
    var p = ln.indexOf("|");
    if (p >= 0) { art = ln.substring(0, p).trim(); ray = ln.substring(p + 1).trim(); }
    if (art) out.push([art, ray]);
  }
  return out;
}
