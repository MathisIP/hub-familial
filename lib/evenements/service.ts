import 'server-only';
import { lireBatch, ecrirePlage } from '@/lib/google/sheets';
import { ErreurValidation } from '@/lib/erreurs';
import { nomOnglet, plage } from '@/lib/i18n';
import { parseEuro, versISO } from '@/lib/argent';
import { ajouterEvenement as creerEventAgenda, supprimerEvenement as supprimerEventAgenda, listerAgendas } from '@/lib/agenda/service';
import type { Agenda } from '@/lib/agenda/schema';
import {
  COL_EV,
  LIGNE_DONNEES_EV,
  LIGNE_DONNEES_PARAMS,
  STATUTS_DEFAUT,
  estCoche,
  evenementStub,
  ligneVersEvenement,
  parseAgendaLien,
  rollupVide,
  type DonneesEvenements,
  type Evenement,
  type Rollup,
} from '@/lib/evenements/schema';

/** SERVICE ÉVÉNEMENTS (serveur uniquement). */
const CL = 'EVENEMENTS' as const;

function pl(
  onglet: 'EVENEMENTS' | 'INVITES' | 'CHECKLIST' | 'MENU_COURSES' | 'PARAMETRES',
  a1: string,
): string {
  return plage(nomOnglet(CL, onglet), a1);
}
const S = (v: unknown): string => (v == null ? '' : String(v).trim());
const colonne = (m: unknown[][], i: number) => m.map((l) => S(l[i])).filter((v) => v !== '');

/** Accumule les récaps par nom d'événement (clé insensible à la casse). */
function rollupParEvenement(
  invites: unknown[][],
  checklist: unknown[][],
  menu: unknown[][],
): Map<string, { nomAffiche: string; r: Rollup }> {
  const map = new Map<string, { nomAffiche: string; r: Rollup }>();
  const acc = (nom: string) => {
    const cle = nom.toLowerCase();
    if (!map.has(cle)) map.set(cle, { nomAffiche: nom, r: rollupVide() });
    return map.get(cle)!.r;
  };

  for (const l of invites) {
    const nom = S(l[0]);
    if (!nom) continue;
    const r = acc(nom);
    r.invitesTotal += 1;
    if (S(l[3]).toLowerCase() === 'oui') {
      r.invitesOui += 1;
      r.personnesOui += Number(S(l[4]).replace(',', '.')) || 1; // Nb pers. (défaut 1)
    }
  }
  for (const l of checklist) {
    const nom = S(l[0]);
    if (!nom || !S(l[1])) continue;
    const r = acc(nom);
    r.checklistTotal += 1;
    if (estCoche(l[5])) r.checklistFait += 1;
  }
  for (const l of menu) {
    const nom = S(l[0]);
    if (!nom || !S(l[1])) continue;
    const r = acc(nom);
    r.menuItems += 1;
    r.menuCoutNum += parseEuro(l[4]);
    if (estCoche(l[5])) r.menuAchetes += 1;
  }
  return map;
}

export async function chargerEvenements(): Promise<DonneesEvenements> {
  const [maitre, invites, checklist, menu, par] = await lireBatch(CL, [
    pl('EVENEMENTS', 'A2:K'),
    pl('INVITES', 'A2:G'),
    pl('CHECKLIST', 'A2:F'),
    pl('MENU_COURSES', 'A2:F'),
    pl('PARAMETRES', `A${LIGNE_DONNEES_PARAMS}:B`),
  ]);

  const rollups = rollupParEvenement(invites, checklist, menu);
  const vusDansMaitre = new Set<string>();

  // 1) Événements du maître (avec leurs détails).
  const evenements: Evenement[] = [];
  maitre.forEach((l, i) => {
    const nom = S(l[COL_EV.NOM - 1]);
    if (!nom) return;
    vusDansMaitre.add(nom.toLowerCase());
    const entree = rollups.get(nom.toLowerCase());
    evenements.push(ligneVersEvenement(l, LIGNE_DONNEES_EV + i, entree?.r ?? rollupVide()));
  });

  // 2) Événements présents uniquement dans les sous-onglets (stubs).
  for (const [cle, { nomAffiche, r }] of rollups) {
    if (!vusDansMaitre.has(cle)) evenements.push(evenementStub(nomAffiche, r));
  }

  // Tri : par date croissante (sans date à la fin), puis par nom.
  evenements.sort((a, b) => {
    const da = a.dateISO ?? '9999-99-99';
    const db = b.dateISO ?? '9999-99-99';
    return da !== db ? da.localeCompare(db) : a.nom.localeCompare(b.nom);
  });

  const types = colonne(par, 0);
  const statuts = colonne(par, 1);

  // Agendas où pousser un événement (défensif : vide si Agenda indispo/non configuré).
  let agendas: Agenda[] = [];
  try {
    agendas = await listerAgendas();
  } catch {
    agendas = [];
  }

  return { evenements, types, statuts: statuts.length ? statuts : STATUTS_DEFAUT, agendas };
}

/* ------------------------------ MUTATIONS ------------------------------ */

export type ChampsEvenement = {
  nom: string;
  type?: string;
  date?: string;
  heure?: string;
  lieu?: string;
  budgetPrevu?: string;
  depense?: string;
  statut?: string;
  note?: string;
};

/** Ligne A→J (K AgendaID volontairement NON écrite pour la préserver). */
function ligneEvenement(c: ChampsEvenement): unknown[][] {
  return [[
    c.nom.trim(), c.type ?? '', c.date ?? '', c.heure ?? '', c.lieu ?? '',
    '', // F Nb invités : dérivé des invités, non saisi ici
    c.budgetPrevu ?? '', c.depense ?? '', c.statut ?? '', c.note ?? '',
  ]];
}

async function prochaineLigne(): Promise<number> {
  const [col] = await lireBatch(CL, [pl('EVENEMENTS', `A${LIGNE_DONNEES_EV}:A`)]);
  let derniere = LIGNE_DONNEES_EV - 1;
  col.forEach((l, i) => {
    if (S(l[0]) !== '') derniere = LIGNE_DONNEES_EV + i;
  });
  return derniere + 1;
}

/** Ajoute un événement au maître (crée aussi une ligne pour un ancien stub). */
export async function ajouterEvenement(c: ChampsEvenement): Promise<number> {
  if (!c.nom?.trim()) throw new ErreurValidation("Le nom de l'événement est requis.");
  const ligne = await prochaineLigne();
  await ecrirePlage(CL, pl('EVENEMENTS', `A${ligne}:J${ligne}`), ligneEvenement(c));
  return ligne;
}

export async function modifierEvenement(ligne: number, c: ChampsEvenement): Promise<void> {
  if (ligne < LIGNE_DONNEES_EV) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  if (!c.nom?.trim()) throw new ErreurValidation("Le nom de l'événement est requis.");
  await ecrirePlage(CL, pl('EVENEMENTS', `A${ligne}:J${ligne}`), ligneEvenement(c));
}

/** Change uniquement le statut (colonne I). */
export async function changerStatutEvenement(ligne: number, statut: string): Promise<void> {
  if (ligne < LIGNE_DONNEES_EV) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  await ecrirePlage(CL, pl('EVENEMENTS', `I${ligne}`), [[statut]]);
}

/* --------------------------- LIEN AVEC L'AGENDA --------------------------- */

/** « 19:00 » / « 19h00 » / « 19h » / « 9:5 » → « HH:MM », sinon null (journée entière). */
function parseHeure(v: string): string | null {
  const s = v.trim().toLowerCase().replace('h', ':');
  const m = s.match(/^(\d{1,2}):?(\d{0,2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  const mn = m[2] ? Number(m[2]) : 0;
  if (h > 23 || mn > 59) return null;
  return `${String(h).padStart(2, '0')}:${String(mn).padStart(2, '0')}`;
}

/**
 * Crée l'événement dans l'agenda choisi à partir de la ligne maître (nom, date,
 * heure, lieu, note) et mémorise « calendarId|eventId » en colonne K (dédoublonnage).
 */
export async function lierAgenda(ligne: number, calendarId: string): Promise<void> {
  if (ligne < LIGNE_DONNEES_EV) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  if (!calendarId.trim()) throw new ErreurValidation('Agenda cible requis.');

  const [brut] = await lireBatch(CL, [pl('EVENEMENTS', `A${ligne}:K${ligne}`)]);
  const l = brut[0] ?? [];
  const nom = S(l[COL_EV.NOM - 1]);
  if (!nom) throw new ErreurValidation(`Aucun événement à la ligne ${ligne}.`);
  if (S(l[COL_EV.AGENDA - 1])) throw new ErreurValidation('Événement déjà dans l’agenda.');

  const dateISO = versISO(S(l[COL_EV.DATE - 1]));
  if (!dateISO) throw new ErreurValidation("L'événement doit avoir une date pour aller dans l'agenda.");

  const heure = parseHeure(S(l[COL_EV.HEURE - 1]));
  const lieu = S(l[COL_EV.LIEU - 1]);
  const type = S(l[COL_EV.TYPE - 1]);
  const note = S(l[COL_EV.NOTE - 1]);

  const eventId = await creerEventAgenda({
    calendarId,
    titre: nom,
    date: dateISO,
    journeeEntiere: heure === null,
    heureDebut: heure ?? undefined,
    lieu,
    description: [type, note].filter(Boolean).join(' — '),
  });

  await ecrirePlage(CL, pl('EVENEMENTS', `K${ligne}`), [[`${calendarId}|${eventId}`]]);
}

/** Supprime l'événement d'agenda lié et vide la colonne K. */
export async function delierAgenda(ligne: number): Promise<void> {
  if (ligne < LIGNE_DONNEES_EV) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  const [brut] = await lireBatch(CL, [pl('EVENEMENTS', `K${ligne}:K${ligne}`)]);
  const lien = parseAgendaLien(S(brut[0]?.[0]));
  if (lien) {
    try {
      await supprimerEventAgenda(lien.calendarId, lien.eventId);
    } catch {
      // événement d'agenda déjà supprimé côté Google : on nettoie quand même la colonne K
    }
  }
  await ecrirePlage(CL, pl('EVENEMENTS', `K${ligne}`), [['']]);
}
