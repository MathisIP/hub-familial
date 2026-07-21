import 'server-only';
import { lireBatch, ecrirePlage } from '@/lib/google/sheets';
import { ErreurValidation } from '@/lib/erreurs';
import { nomOnglet, plage } from '@/lib/i18n';
import { parseEuro } from '@/lib/argent';
import {
  COL_EV,
  LIGNE_DONNEES_EV,
  LIGNE_DONNEES_PARAMS,
  STATUTS_DEFAUT,
  estCoche,
  evenementStub,
  ligneVersEvenement,
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
  return { evenements, types, statuts: statuts.length ? statuts : STATUTS_DEFAUT };
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
