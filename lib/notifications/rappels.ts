import 'server-only';
import { and, eq, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  evenements as tEvenements,
  occasions as tOccasions,
  echeances as tEch,
  comptes as tComptes,
  comptesAcces as tComptesAcces,
  membres as tMembres,
} from '@/lib/db/schema';
import { envoyer, pushDisponible } from '@/lib/notifications/service';
import { PARTAGE_RESTREINT } from '@/lib/visibilite';

/**
 * RAPPELS DE LA VEILLE (tâche quotidienne).
 * =========================================
 * Un seul passage par jour, greffé sur le ménage existant : c'est ce que permet
 * une tâche planifiée quotidienne, et ça suffit à l'usage réel — savoir la veille
 * qu'un anniversaire arrive laisse le temps d'agir, contrairement à un rappel
 * une heure avant.
 *
 * ⚠ CHAQUE PERSONNE NE REÇOIT QUE CE QU'ELLE PEUT DÉJÀ VOIR DANS L'APP. Une
 * notification est un canal de plus vers les données : sans ce filtrage, elle
 * contournerait tout le travail de visibilité. Concrètement, une échéance
 * rattachée à un compte restreint n'est annoncée qu'aux personnes qui voient ce
 * compte — les autres n'apprennent même pas qu'elle existe.
 *
 * ⚠ LES ÉCHÉANCES SONT SUR OPT-IN (défaut `false`, cf. `preferences_notif`) :
 * un rappel de prélèvement s'affiche sur un écran verrouillé, lisible par
 * quiconque tient le téléphone. Les anniversaires n'ont pas cette sensibilité.
 *
 * ⚠ Les textes restent pauvres — jamais de montant, jamais de libellé de compte.
 * Le détail est derrière le clic, dans l'app, après authentification.
 */

export type RapportRappels = { foyers: number; envois: number };

/** aaaa-mm-jj de demain (heure locale du serveur, épinglé sur fra1). */
function demainISO(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/**
 * `date` d'une occasion est du texte : on ne compare que le mois et le jour.
 * Un anniversaire revient chaque année — comparer l'année complète ne
 * déclencherait le rappel qu'une seule fois dans la vie de l'occasion.
 */
function memeJourEtMois(dateTexte: string, cibleISO: string): boolean {
  const [, mois, jour] = cibleISO.split('-');
  const m = dateTexte.match(/^(\d{4})-(\d{2})-(\d{2})/) ?? dateTexte.match(/^(\d{2})\/(\d{2})\/(\d{4})/);
  if (!m) return false;
  // Format ISO (aaaa-mm-jj) ou français (jj/mm/aaaa) : on récupère mois et jour.
  const [mm, jj] = dateTexte.includes('-') ? [m[2], m[3]] : [m[2], m[1]];
  return mm === mois && jj === jour;
}

export async function envoyerRappelsQuotidiens(): Promise<RapportRappels> {
  if (!pushDisponible()) return { foyers: 0, envois: 0 };
  const d = db();
  const cible = demainISO();

  // Les foyers qui ont au moins un membre : inutile d'interroger les autres.
  const lignesMembres = await d
    .select({ foyerId: tMembres.foyerId, utilisateurId: tMembres.utilisateurId })
    .from(tMembres);
  const parFoyer = new Map<string, string[]>();
  for (const m of lignesMembres) {
    parFoyer.set(m.foyerId, [...(parFoyer.get(m.foyerId) ?? []), m.utilisateurId]);
  }

  let envois = 0;

  for (const [foyerId, tous] of parFoyer) {
    /* ---------------- Événements : niveau foyer, vus de tous ---------------- */
    const evs = await d
      .select({ nom: tEvenements.nom })
      .from(tEvenements)
      .where(and(eq(tEvenements.foyerId, foyerId), eq(tEvenements.date, cible)));

    for (const ev of evs) {
      envois += await envoyer(tous, 'evenements', {
        titre: 'Demain',
        corps: ev.nom,
        url: '/evenements',
        tag: `ev-${cible}`,
      });
    }

    /* ------------- Occasions : anniversaires, mois + jour seulement --------- */
    const occs = await d
      .select({ nom: tOccasions.nom, date: tOccasions.date })
      .from(tOccasions)
      .where(eq(tOccasions.foyerId, foyerId));

    for (const o of occs.filter((x) => x.date && memeJourEtMois(x.date, cible))) {
      // ⚠ On annonce l'OCCASION, jamais les cadeaux qui s'y rattachent : ceux-ci
      // peuvent être masqués à quelqu'un du foyer, et une notification les
      // trahirait. « Anniversaire de Noé demain » ne gâche aucune surprise.
      envois += await envoyer(tous, 'evenements', {
        titre: 'Demain',
        corps: o.nom,
        url: '/cadeaux',
        tag: `occ-${cible}`,
      });
    }

    /* ------- Échéances : opt-in, ET filtrées par visibilité du compte ------- */
    const echs = await d
      .select({
        libelle: tEch.libelle,
        compteId: tEch.compteId,
        partage: tComptes.partage,
      })
      .from(tEch)
      .leftJoin(tComptes, eq(tComptes.id, tEch.compteId))
      .where(and(eq(tEch.foyerId, foyerId), eq(tEch.dateIso, cible)));

    for (const e of echs) {
      let destinataires = tous;

      if (e.compteId && e.partage === PARTAGE_RESTREINT) {
        // Compte restreint : seules les personnes autorisées sont prévenues.
        // Les autres ne doivent pas même apprendre que l'échéance existe.
        const autorises = await d
          .select({ u: tComptesAcces.utilisateurId })
          .from(tComptesAcces)
          .where(
            and(
              eq(tComptesAcces.foyerId, foyerId),
              eq(tComptesAcces.compteId, e.compteId),
            ),
          );
        const permis = new Set(autorises.map((a) => a.u));
        destinataires = tous.filter((u) => permis.has(u));
      }

      if (destinataires.length === 0) continue;
      envois += await envoyer(destinataires, 'echeances', {
        // Ni montant ni nom de compte : la notification dit qu'il se passe
        // quelque chose, pas quoi ni combien.
        titre: 'Échéance demain',
        corps: e.libelle,
        url: '/budget',
        tag: `ech-${cible}`,
      });
    }
  }

  return { foyers: parFoyer.size, envois };
}

/** Compte les abonnements actifs (bulletin de santé). */
export async function nbAbonnementsPush(): Promise<number> {
  const [{ n }] = await db().execute<{ n: number }>(
    sql`select count(*)::int as n from abonnements_push`,
  );
  return Number(n ?? 0);
}
