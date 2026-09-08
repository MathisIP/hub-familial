import 'server-only';
import { and, eq, isNotNull, ne } from 'drizzle-orm';
import { db } from '@/lib/db';
import { taches as tTaches } from '@/lib/db/schema';
import { STATUT_FAIT, RECURRENCES_AVEC_PREAVIS, aujourdhuiISO, prochaineOccurrenceLabel, versISO } from '@/lib/todo/schema';

/**
 * PRÉAVIS DES TÂCHES RÉCURRENTES (tâche planifiée quotidienne).
 * ===============================================================
 * Signalé par un utilisateur (08/09/2026) : une tâche mensuelle/annuelle
 * n'apparaissait dans « À faire » qu'à son échéance exacte, sans qu'on
 * puisse s'y préparer à l'avance (renouveler une assurance, prendre un
 * rendez-vous). `preavisJours` (lib/db/schema.ts, colonne sur `taches`) fixe
 * ce délai par tâche ; ce module avance l'échéance affichée dès que la
 * fenêtre de préavis est atteinte.
 *
 * ⚠ AVANCE L'ÉCHÉANCE DE LA LIGNE EXISTANTE, NE CRÉE PAS UNE SECONDE LIGNE
 * (contrairement à `changerStatutTache`, qui engendre une nouvelle occurrence
 * quand on coche « Fait »). Décision utilisateur : une seule tâche visible à
 * la fois, jamais deux échéances de la même récurrence en même temps. Comme
 * la tâche n'a jamais été cochée « Fait » ici (le préavis se déclenche AVANT
 * l'échéance, sur une tâche encore « À faire »), il n'y a pas d'historique
 * d'occurrence passée à préserver — avancer la date suffit.
 *
 * ⚠ PAS DE SCOPE `idFoyerCourant()` : ce module tourne dans une tâche
 * planifiée, sans session (comme `envoyerRappelsQuotidiens`,
 * lib/notifications/rappels.ts) — la requête porte sur tous les foyers.
 *
 * ⚠ HEBDOMADAIRE EXCLUE À DESSEIN (`RECURRENCES_AVEC_PREAVIS`, lib/todo/schema.ts) :
 * un cycle de 7 jours est trop court pour qu'un préavis en jours ait un sens
 * pratique, et ce n'était pas la demande (« récurrence mensuelle et annuelle »).
 */

export type RapportPreavis = { avancees: number };

export async function appliquerPreavisRecurrences(): Promise<RapportPreavis> {
  const today = aujourdhuiISO();
  const d = db();

  const candidates = await d
    .select()
    .from(tTaches)
    .where(and(ne(tTaches.statut, STATUT_FAIT), isNotNull(tTaches.preavisJours)));

  let avancees = 0;
  for (const t of candidates) {
    const rec = t.recurrence.trim().toLowerCase();
    if (!RECURRENCES_AVEC_PREAVIS.includes(rec)) continue;
    const preavis = t.preavisJours;
    if (preavis == null || preavis <= 0) continue;

    const echeanceISO = versISO(t.echeance);
    if (!echeanceISO) continue; // pas de date exploitable : rien à anticiper

    // Fenêtre de préavis atteinte ? `echeance - preavis <= aujourd'hui`.
    // ⚠ Composants parsés à la main : `new Date('aaaa-mm-jj')` est interprété
    // en UTC par JavaScript, ce qui peut décaler la date d'un jour selon le
    // fuseau (même piège documenté dans prochaineOccurrenceLabel).
    const [a, m, j] = echeanceISO.split('-').map(Number);
    const echeance = new Date(a, m - 1, j);
    echeance.setDate(echeance.getDate() - preavis);
    const seuilISO = `${echeance.getFullYear()}-${String(echeance.getMonth() + 1).padStart(2, '0')}-${String(echeance.getDate()).padStart(2, '0')}`;
    if (seuilISO > today) continue; // pas encore dans la fenêtre

    const prochaine = prochaineOccurrenceLabel(echeanceISO, t.recurrence, t.recurrenceJour);
    // ⚠ Idempotent par construction : une fois l'échéance avancée, elle ne
    // retombe plus dans la fenêtre de préavis tant qu'on n'approche pas de LA
    // NOUVELLE date — un même passage de cron ne ré-avance jamais deux fois.
    await d.update(tTaches).set({ echeance: prochaine }).where(eq(tTaches.id, t.id));
    avancees++;
  }

  return { avancees };
}
