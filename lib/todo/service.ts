import 'server-only';
import { lireBatch, ecrirePlage, viderPlage } from '@/lib/google/sheets';
import { nomOnglet, plage } from '@/lib/i18n';
import {
  COL_COURSE,
  COL_TACHE,
  LIGNE_DONNEES_COURSES,
  LIGNE_DONNEES_TACHES,
  RECURRENCES_ACTIVES,
  STATUT_FAIT,
  STATUTS_DEFAUT,
  PRIORITES_DEFAUT,
  RECURRENCES_DEFAUT,
  aujourdhuiISO,
  ligneVersCourse,
  ligneVersTache,
  prochaineOccurrenceLabel,
  rangPriorite,
  type Course,
  type DonneesTodo,
  type Parametres,
  type Tache,
} from '@/lib/todo/schema';

/**
 * SERVICE TO-DO — accès Sheets pour le module (serveur uniquement).
 * Toutes les plages sont construites via nomOnglet()+plage() : jamais de nom
 * d'onglet en dur, robuste au changement de langue.
 */

const CL = 'TODO' as const;

// Plages canoniques du module (l'onglet est résolu à l'appel, pas ici).
const A1_TACHES = 'A2:H';
const A1_COURSES = 'A2:C';
const A1_PARAMS = 'A5:F';

function pl(onglet: 'TACHES' | 'COURSES' | 'PARAMETRES', a1: string): string {
  return plage(nomOnglet(CL, onglet), a1);
}

function colonne(brutes: unknown[][], index0: number): string[] {
  return brutes
    .map((l) => (l[index0] == null ? '' : String(l[index0]).trim()))
    .filter((v) => v !== '');
}

/** Lit tâches + courses + paramètres en un seul aller-retour. */
export async function chargerTodo(): Promise<DonneesTodo> {
  const [brutTaches, brutCourses, brutParams] = await lireBatch(CL, [
    pl('TACHES', A1_TACHES),
    pl('COURSES', A1_COURSES),
    pl('PARAMETRES', A1_PARAMS),
  ]);

  const today = aujourdhuiISO();

  const taches: Tache[] = brutTaches
    .map((l, i) => ligneVersTache(l, LIGNE_DONNEES_TACHES + i, today))
    .filter((t) => t.tache !== '');

  const courses: Course[] = brutCourses
    .map((l, i) => ligneVersCourse(l, LIGNE_DONNEES_COURSES + i))
    .filter((c) => c.article !== '');

  const parametres: Parametres = {
    statuts: colonne(brutParams, 0).length ? colonne(brutParams, 0) : STATUTS_DEFAUT,
    personnes: colonne(brutParams, 1),
    priorites: colonne(brutParams, 2).length ? colonne(brutParams, 2) : PRIORITES_DEFAUT,
    recurrences: colonne(brutParams, 3).length ? colonne(brutParams, 3) : RECURRENCES_DEFAUT,
    categories: colonne(brutParams, 4),
    rayons: colonne(brutParams, 5),
  };

  // Tri d'affichage : non-faites d'abord, puis retard, puis priorité, puis échéance.
  taches.sort((a, b) => {
    const fa = a.statut === STATUT_FAIT ? 1 : 0;
    const fb = b.statut === STATUT_FAIT ? 1 : 0;
    if (fa !== fb) return fa - fb;
    if (a.enRetard !== b.enRetard) return a.enRetard ? -1 : 1;
    const rp = rangPriorite(a.priorite) - rangPriorite(b.priorite);
    if (rp !== 0) return rp;
    return (a.echeance ?? '9999').localeCompare(b.echeance ?? '9999');
  });

  return { taches, courses, parametres };
}

/* ----------------------------- MUTATIONS TÂCHES ----------------------------- */

export type NouvelleTache = {
  tache: string;
  assigne?: string;
  categorie?: string;
  priorite?: string;
  echeanceLabel?: string; // jj/mm/aaaa
  recurrence?: string;
  note?: string;
};

/**
 * Prochaine ligne libre d'un onglet, repérée par la 1re colonne de texte.
 * On N'UTILISE PAS `append` de l'API : sur l'onglet Courses, les cases à cocher
 * couvrent toute la colonne, si bien qu'`append` place les nouveaux articles en
 * bas de la grille (ligne ~1001), détachés des autres — moche dans le vrai Sheet
 * que la famille consulte. Écrire à la ligne calculée les garde contigus.
 */
async function prochaineLigne(
  onglet: 'TACHES' | 'COURSES',
  colTexte1based: number,
  ligneDebut: number,
): Promise<number> {
  const colLettre = String.fromCharCode(64 + colTexte1based); // 2 -> 'B'
  const [col] = await lireBatch(CL, [pl(onglet, `${colLettre}${ligneDebut}:${colLettre}`)]);
  let derniere = ligneDebut - 1;
  col.forEach((l, i) => {
    if (String(l[0] ?? '').trim() !== '') derniere = ligneDebut + i;
  });
  return derniere + 1;
}

/** Ajoute une tâche (statut initial « À faire »), comme le formulaire Google. */
export async function ajouterTache(t: NouvelleTache): Promise<void> {
  const titre = t.tache.trim();
  if (!titre) throw new Error('Le titre de la tâche est requis.');
  const ligne = await prochaineLigne('TACHES', COL_TACHE.TACHE, LIGNE_DONNEES_TACHES);
  await ecrirePlage(CL, pl('TACHES', `A${ligne}:H${ligne}`), [[
    'À faire',
    titre,
    t.assigne ?? '',
    t.categorie ?? '',
    t.priorite ?? '',
    t.echeanceLabel ?? '',
    t.recurrence ?? 'Aucune',
    t.note ?? '',
  ]]);
}

/**
 * Change le statut d'une tâche (adressée par n° de ligne). Si elle passe à
 * « Fait » et qu'elle est récurrente, engendre la prochaine occurrence —
 * réplique du déclencheur onEdit, qui ne s'exécute pas sur nos écritures API.
 */
export async function changerStatutTache(ligne: number, statut: string): Promise<void> {
  if (ligne < LIGNE_DONNEES_TACHES) throw new Error(`Ligne invalide : ${ligne}.`);

  // Relire la ligne cible : source de vérité pour la récurrence + garde-fou.
  const [brute] = await lireBatch(CL, [pl('TACHES', `A${ligne}:H${ligne}`)]);
  const cible = brute[0];
  if (!cible || !String(cible[COL_TACHE.TACHE - 1] ?? '').trim()) {
    throw new Error(`Aucune tâche à la ligne ${ligne}.`);
  }

  await ecrirePlage(CL, pl('TACHES', `A${ligne}`), [[statut]]);

  if (statut === STATUT_FAIT) {
    const recurrence = String(cible[COL_TACHE.RECURRENCE - 1] ?? '').trim();
    if (RECURRENCES_ACTIVES.includes(recurrence.toLowerCase())) {
      const echeanceLabel = String(cible[COL_TACHE.ECHEANCE - 1] ?? '').trim();
      const baseISO = echeanceLabel ? versISOsafe(echeanceLabel) : null;
      const prochaine = prochaineOccurrenceLabel(baseISO, recurrence);
      const ligneNouvelle = await prochaineLigne('TACHES', COL_TACHE.TACHE, LIGNE_DONNEES_TACHES);
      await ecrirePlage(CL, pl('TACHES', `A${ligneNouvelle}:H${ligneNouvelle}`), [[
        'À faire',
        String(cible[COL_TACHE.TACHE - 1] ?? ''),
        String(cible[COL_TACHE.ASSIGNE - 1] ?? ''),
        String(cible[COL_TACHE.CATEGORIE - 1] ?? ''),
        String(cible[COL_TACHE.PRIORITE - 1] ?? ''),
        prochaine,
        recurrence,
        String(cible[COL_TACHE.NOTE - 1] ?? ''),
      ]]);
    }
  }
}

// Local : versISO tolérant, sans réimporter (évite un cycle inutile).
function versISOsafe(label: string): string | null {
  const m = label.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  return m ? `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}` : null;
}

/* ----------------------------- MUTATIONS COURSES ---------------------------- */

/** Ajoute un article à la liste de courses (case décochée), contigu aux autres. */
export async function ajouterCourse(article: string, rayon = ''): Promise<void> {
  const art = article.trim();
  if (!art) throw new Error("L'article est requis.");
  const ligne = await prochaineLigne('COURSES', COL_COURSE.ARTICLE, LIGNE_DONNEES_COURSES);
  await ecrirePlage(CL, pl('COURSES', `A${ligne}:C${ligne}`), [[false, art, rayon.trim()]]);
}

/** Coche / décoche un article (adressé par n° de ligne). */
export async function cocherCourse(ligne: number, fait: boolean): Promise<void> {
  if (ligne < LIGNE_DONNEES_COURSES) throw new Error(`Ligne invalide : ${ligne}.`);
  await ecrirePlage(CL, pl('COURSES', `A${ligne}`), [[fait]]);
}

/**
 * Ajoute plusieurs articles d'un coup (cases décochées), en sautant ceux déjà
 * présents dans la liste (dédoublonnage sur le libellé, insensible à la casse) —
 * comme l'ancien `envoyerVersCourses` des Apps Script. Écrit à la suite, contigu.
 * Renvoie le nombre ajouté et le nombre ignoré.
 */
export async function ajouterCoursesEnLot(
  items: { article: string; rayon?: string }[],
): Promise<{ ajoutes: number; ignores: number }> {
  const nettoyes = items
    .map((i) => ({ article: (i.article ?? '').trim(), rayon: (i.rayon ?? '').trim() }))
    .filter((i) => i.article !== '');
  if (nettoyes.length === 0) return { ajoutes: 0, ignores: 0 };

  const [existants] = await lireBatch(CL, [pl('COURSES', `B${LIGNE_DONNEES_COURSES}:B`)]);
  const dejaLa = new Set(existants.map((l) => String(l[0] ?? '').trim().toLowerCase()).filter(Boolean));

  const aAjouter: { article: string; rayon: string }[] = [];
  let ignores = 0;
  for (const it of nettoyes) {
    const cle = it.article.toLowerCase();
    if (dejaLa.has(cle)) { ignores++; continue; }
    dejaLa.add(cle); // évite aussi les doublons dans le lot lui-même
    aAjouter.push(it);
  }
  if (aAjouter.length === 0) return { ajoutes: 0, ignores };

  const debut = await prochaineLigne('COURSES', COL_COURSE.ARTICLE, LIGNE_DONNEES_COURSES);
  const valeurs = aAjouter.map((i) => [false, i.article, i.rayon]);
  await ecrirePlage(CL, pl('COURSES', `A${debut}:C${debut + valeurs.length - 1}`), valeurs);
  return { ajoutes: aAjouter.length, ignores };
}

/**
 * Retire les articles cochés : relit la liste, garde les non-cochés et réécrit
 * la plage compactée, puis efface la traîne. Robuste aux décalages de lignes,
 * contrairement à une suppression ligne à ligne.
 */
export async function viderCoursesFaites(): Promise<number> {
  const [brut] = await lireBatch(CL, [pl('COURSES', A1_COURSES)]);
  const articles = brut
    .map((l, i) => ligneVersCourse(l, LIGNE_DONNEES_COURSES + i))
    .filter((c) => c.article !== '');
  const gardes = articles.filter((c) => !c.fait);
  const retires = articles.length - gardes.length;
  if (retires === 0) return 0;

  if (gardes.length > 0) {
    const valeurs = gardes.map((c) => [false, c.article, c.rayon]);
    await ecrirePlage(CL, pl('COURSES', `A${LIGNE_DONNEES_COURSES}`), valeurs);
  }
  // Efface les lignes résiduelles au-delà des articles conservés.
  const premiereVide = LIGNE_DONNEES_COURSES + gardes.length;
  const derniere = LIGNE_DONNEES_COURSES + brut.length - 1;
  if (derniere >= premiereVide) {
    await viderPlage(CL, pl('COURSES', `A${premiereVide}:C${derniere}`));
  }
  return retires;
}
