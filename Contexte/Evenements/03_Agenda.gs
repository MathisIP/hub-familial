/**
 * ÉVÉNEMENTS — SYNCHRONISATION AVEC L'AGENDA FAMILIAL
 * ===================================================
 * Ajoute / actualise chaque événement daté dans l'agenda familial. Le
 * dédoublonnage se fait grâce à la colonne technique AgendaID (K, masquée) :
 * on y mémorise l'ID de l'événement d'agenda créé, pour le retrouver et le
 * mettre à jour ensuite.
 *
 * Lancement : menu 🎉 Événements ▸ « 📅 Synchroniser l'agenda » (à relancer
 * après chaque ajout ou modification de date).
 * Constante CAL_ID → voir 00_Constantes.gs.
 */
function synchroniserAgenda() {
  var ss  = SpreadsheetApp.getActiveSpreadsheet();
  var ev  = ss.getSheetByName(nomOnglet_('EVENEMENTS'));
  var cal = CalendarApp.getCalendarById(CAL_ID);
  if (!cal) {
    SpreadsheetApp.getUi().alert("Agenda introuvable.\nVérifie que l'agenda familial est bien partagé avec ce compte.");
    return;
  }

  var last = ev.getLastRow();
  if (last < 2) { return; }
  var data = ev.getRange(2, 1, last - 1, 11).getValues(); // A..K
  var ajoutes = 0, maj = 0;

  for (var i = 0; i < data.length; i++) {
    var row  = data[i];
    var nom  = String(row[0]).trim();        // A
    var dcell= row[2];                        // C  (Date)
    var heure= row[3];                        // D  (Heure)
    var lieu = String(row[4] || "").trim();   // E
    var id   = String(row[10] || "").trim();  // K  (AgendaID)
    if (!nom || !(dcell instanceof Date)) { continue; }

    // construit début / fin
    var hm = parseHeure_(heure);
    var start, end, allDay = false;
    if (hm) {
      start = new Date(dcell.getFullYear(), dcell.getMonth(), dcell.getDate(), hm.h, hm.m, 0);
      end   = new Date(start.getTime() + 3 * 3600 * 1000); // 3 h par défaut
    } else {
      start = new Date(dcell.getFullYear(), dcell.getMonth(), dcell.getDate());
      allDay = true;
    }
    var opts = { location: lieu, description: "Ajouté depuis le gestionnaire d'événements" };

    // événement déjà lié ?
    var e = null;
    if (id) { try { e = cal.getEventById(id); } catch (err) { e = null; } }

    if (e) {                                   // --- mise à jour ---
      e.setTitle(nom);
      if (lieu) e.setLocation(lieu);
      if (allDay) e.setAllDayDate(start); else e.setTime(start, end);
      maj++;
    } else {                                  // --- création ---
      var ne = allDay ? cal.createAllDayEvent(nom, start, opts)
                      : cal.createEvent(nom, start, end, opts);
      ev.getRange(i + 2, 11).setValue(ne.getId());  // mémorise l'ID en colonne K
      ajoutes++;
    }
  }

  SpreadsheetApp.flush();
  SpreadsheetApp.getUi().alert(
    "Agenda synchronisé !\n\n" + ajoutes + " événement(s) ajouté(s), " + maj + " mis à jour.\n" +
    "Relance « Synchroniser l'agenda » après chaque ajout ou modification de date.");
}

// "19h00" / "19h" / "19:30" / "9h" -> {h, m} ; vide -> null (journée entière)
function parseHeure_(h) {
  if (h === "" || h === null || h === undefined) return null;
  var s = String(h).trim().toLowerCase().replace("h", ":");
  var m = s.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (!m) return null;
  var hh = parseInt(m[1], 10);
  var mm = m[2] ? parseInt(m[2], 10) : 0;
  if (isNaN(hh) || hh > 23 || mm > 59) return null;
  return { h: hh, m: mm };
}
