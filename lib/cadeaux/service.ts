import 'server-only';
import { lireBatch, ecrirePlage, viderPlage } from '@/lib/google/sheets';
import { ErreurValidation } from '@/lib/erreurs';
import { nomOnglet, plage } from '@/lib/i18n';
import {
  COL_CADEAU,
  LIGNE_DONNEES_CADEAUX,
  LIGNE_DONNEES_PARAMS,
  STATUTS_DEFAUT,
  ligneVersCadeau,
  ligneVersOccasion,
  type Cadeau,
  type DonneesCadeaux,
  type Occasion,
} from '@/lib/cadeaux/schema';

/** SERVICE CADEAUX (serveur uniquement). */
const CL = 'CADEAUX' as const;

function pl(onglet: 'CADEAUX' | 'OCCASIONS' | 'PARAMETRES', a1: string): string {
  return plage(nomOnglet(CL, onglet), a1);
}
const S = (v: unknown): string => (v == null ? '' : String(v).trim());
const colonne = (m: unknown[][], i: number) => m.map((l) => S(l[i])).filter((v) => v !== '');

export async function chargerCadeaux(): Promise<DonneesCadeaux> {
  const [brutCad, brutOcc, brutPar] = await lireBatch(CL, [
    pl('CADEAUX', 'A2:I'),
    pl('OCCASIONS', 'A2:D'),
    pl('PARAMETRES', `A${LIGNE_DONNEES_PARAMS}:B`),
  ]);

  const cadeaux: Cadeau[] = brutCad
    .map((l, i) => ligneVersCadeau(l, LIGNE_DONNEES_CADEAUX + i))
    .filter((c) => c.idee !== '');

  const occasions: Occasion[] = brutOcc
    .map(ligneVersOccasion)
    .filter((o) => o.occasion !== '')
    .sort((a, b) => (a.dateISO ?? '9999').localeCompare(b.dateISO ?? '9999'));

  const statuts = colonne(brutPar, 0);
  const offertPar = colonne(brutPar, 1);

  return {
    cadeaux,
    occasions,
    statuts: statuts.length ? statuts : STATUTS_DEFAUT,
    offertPar,
  };
}

export type ChampsCadeau = {
  pourQui?: string;
  occasion?: string;
  idee: string;
  statut?: string;
  budgetPrevu?: string;
  prixPaye?: string;
  offertPar?: string;
  ou?: string;
  note?: string;
};

function ligneCadeau(c: ChampsCadeau): unknown[][] {
  return [[
    c.pourQui ?? '', c.occasion ?? '', c.idee.trim(), c.statut ?? 'Idée',
    c.budgetPrevu ?? '', c.prixPaye ?? '', c.offertPar ?? '', c.ou ?? '', c.note ?? '',
  ]];
}

async function prochaineLigne(): Promise<number> {
  const [col] = await lireBatch(CL, [pl('CADEAUX', `C${LIGNE_DONNEES_CADEAUX}:C`)]); // C = idée
  let derniere = LIGNE_DONNEES_CADEAUX - 1;
  col.forEach((l, i) => {
    if (S(l[0]) !== '') derniere = LIGNE_DONNEES_CADEAUX + i;
  });
  return derniere + 1;
}

export async function ajouterCadeau(c: ChampsCadeau): Promise<number> {
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  const ligne = await prochaineLigne();
  await ecrirePlage(CL, pl('CADEAUX', `A${ligne}:I${ligne}`), ligneCadeau(c));
  return ligne;
}

export async function modifierCadeau(ligne: number, c: ChampsCadeau): Promise<void> {
  if (ligne < LIGNE_DONNEES_CADEAUX) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  if (!c.idee?.trim()) throw new ErreurValidation("L'idée de cadeau est requise.");
  await ecrirePlage(CL, pl('CADEAUX', `A${ligne}:I${ligne}`), ligneCadeau(c));
}

/** Change uniquement le statut (colonne D). */
export async function changerStatutCadeau(ligne: number, statut: string): Promise<void> {
  if (ligne < LIGNE_DONNEES_CADEAUX) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  await ecrirePlage(CL, pl('CADEAUX', `D${ligne}`), [[statut]]);
}

/** Supprime un cadeau : relit, retire la ligne, réécrit compacté. */
export async function supprimerCadeau(ligne: number): Promise<void> {
  if (ligne < LIGNE_DONNEES_CADEAUX) throw new ErreurValidation(`Ligne invalide : ${ligne}.`);
  const [brut] = await lireBatch(CL, [pl('CADEAUX', 'A2:I')]);
  const gardees = brut.filter((_, i) => LIGNE_DONNEES_CADEAUX + i !== ligne && S(brut[i][COL_CADEAU.IDEE - 1]) !== '');
  await viderPlage(CL, pl('CADEAUX', 'A2:I'));
  if (gardees.length) {
    const norm = gardees.map((l) => {
      const r = l.slice(0, 9);
      while (r.length < 9) r.push('');
      return r;
    });
    await ecrirePlage(CL, pl('CADEAUX', 'A2'), norm);
  }
}
