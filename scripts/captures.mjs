/**
 * RECADRAGE DES CAPTURES D'ÉCRAN POUR LE CARROUSEL DU SITE.
 * ========================================================
 *   npm run captures
 *
 * Lit les captures et écrit `public/captures/<theme>/<module>.webp`.
 * Deux rangements acceptés : `chaux/` + `encre/`, ou un dossier plat.
 *
 * ⚠ LE THÈME EST DÉDUIT DE L'IMAGE, PAS DU DOSSIER. Les captures sortent du
 * téléphone mélangées, sous des noms comme `IMG_3054.PNG` : demander un
 * classement manuel, c'est autant d'occasions de se tromper pour une
 * information que l'image porte déjà. Chaux (~230/255) et encre (~45/255) sont
 * aux deux extrémités de l'échelle. Quand le dossier fait foi, on mesure quand
 * même et on signale un désaccord — une capture rangée du mauvais côté
 * passerait sinon inaperçue jusqu'à se retrouver en ligne.
 *
 * ⚠ LE FORMAT DE SORTIE N'EST PAS ARBITRAIRE : il vaut exactement celui de
 * l'écran de la maquette (`ratio = 19.5 / 9` dans components/vitrine-ds/
 * Primitives.tsx). L'image y est posée en `object-fit: cover` — un rapport
 * différent la ferait recadrer une SECONDE fois par le navigateur, au hasard.
 * ⚠ Si ce ratio change dans Primitives.tsx, il doit changer ici aussi.
 *
 * ⚠ LES CAPTURES N'ARRIVENT PAS TOUTES DANS LE MÊME ÉTAT. Certaines sortent
 * brutes du téléphone (barre d'état comprise), d'autres ont été rognées à la
 * main, d'autres viennent du mode appareil des outils de développement — et
 * celles-là n'ont AUCUNE barre d'état tout en étant plus hautes. Un seuil de
 * hauteur se trompait sur ce dernier cas ; on reconnaît les hauteurs connues.
 *
 * Le mode appareil est la meilleure source : pas de barre d'état, et la
 * connexion Google fonctionne. Servir le bac à sable sur l'adresse IP privée du
 * PC pour y accéder depuis un téléphone ne marche pas — Google refuse les
 * adresses IP privées comme URI de redirection.
 */
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Rapport de l'écran de la maquette. Doit suivre `ratio` de Primitives.tsx. */
const RATIO = 19.5 / 9;

/**
 * Taille de sortie commune.
 *
 * ⚠ 720 ET NON 1080. La maquette fait 230 px de large en bureau, 150 en
 * mobile : même à trois pixels par point, 720 couvre largement le besoin. En
 * 1080 les captures pesaient 8,9 Mo — sur une page d'accueil qui reçoit du
 * trafic Pinterest en 4G, c'est une image lourde de plus à télécharger avant de
 * comprendre ce qu'on vend.
 */
const LARGEUR = 720;
const HAUTEUR = Math.round(LARGEUR * RATIO);

/** Barre d'état d'un iPhone en 3x. */
const BARRE_ETAT = 170;

/**
 * Hauteurs des captures PRISES SUR L'APPAREIL, barre d'état comprise.
 * ⚠ Une capture faite depuis le mode appareil des outils de développement
 * (1179 × 2556) N'A PAS de barre d'état : lui couper 170 px emporterait le
 * titre de l'écran.
 */
const HAUTEURS_APPAREIL = new Set([2532, 2556, 2778, 2796, 2688, 2436]);

/**
 * Répartition du fond ajouté, part revenant au HAUT.
 *
 * ⚠ ON NE ROGNE PLUS LES CÔTÉS. Pour atteindre le rapport de l'écran de
 * maquette il faut de la hauteur : soit on enlève de la largeur, soit on ajoute
 * du fond. Enlever de la largeur coupait les bords de l'interface — une
 * quantité alignée à droite, un bouton — alors qu'ajouter du fond ne coûte
 * rien, la maquette ayant le même fond que l'application.
 *
 * ⚠ Deux tiers vont EN HAUT, à dessein. Une fois la barre d'état retirée, le
 * titre de l'écran (« Budget », « Repas »…) se retrouve tout en haut à gauche,
 * exactement là où l'écran de la maquette est rogné par son rayon. La bande
 * haute est ce qui l'en écarte ; celle du bas ne fait qu'équilibrer.
 */
const PART_HAUT = 0.65;

/**
 * Bande haute minimale, en fraction de la largeur.
 * ⚠ Garantit que le coin arrondi ne touche jamais le titre, même quand la
 * capture est déjà presque au bon rapport et qu'il y a peu à ajouter.
 */
const MARGE_MIN = 0.06;

/** Luminosité au-delà de laquelle une capture est « chaux ». */
const SEUIL_CLAIR = 128;

const SOURCE = process.env.CAPTURES_SOURCE || 'C:/Users/mathi/Documents/Nestync/Captures';
const CIBLE = 'public/captures';

/**
 * Fautes de frappe courantes → slug attendu par le carrousel.
 * ⚠ On corrige ici plutôt que de renommer les fichiers source : le nom qui
 * compte est celui que le composant demande, et une capture refaite demain
 * reviendrait avec la même faute.
 */
const ALIAS = { acceuil: 'accueil', accueuil: 'accueil', 'to-do': 'todo' };

/** Les modules du carrousel (cf. MODULES dans SiteVitrine.tsx). */
const ATTENDUS = [
  'accueil', 'finances', 'agenda', 'repas', 'courses',
  'todo', 'documents', 'evenements', 'cadeaux',
];

async function traiter(fichierEntree, fichierSortie) {
  const img = sharp(fichierEntree);
  const { width: w, height: h } = await img.metadata();
  if (!w || !h) throw new Error('dimensions illisibles');

  const haut = HAUTEURS_APPAREIL.has(h) ? BARRE_ETAT : 0;
  const hUtile = h - haut;

  /*
   * Couleur de fond, prélevée juste sous la barre d'état et près du bord
   * gauche : c'est du fond quel que soit l'écran.
   * ⚠ JAMAIS ÉCRITE EN DUR — chaux et encre n'ont pas la même, et une valeur
   * figée poserait une bande claire en haut d'une capture sombre.
   */
  const ech = await sharp(fichierEntree)
    .extract({ left: Math.round(w * 0.02), top: haut + 4, width: 8, height: 8 })
    .stats();
  const fond = {
    r: Math.round(ech.channels[0].mean),
    g: Math.round(ech.channels[1].mean),
    b: Math.round(ech.channels[2].mean),
    alpha: 1,
  };

  const hVisee = Math.round(w * RATIO);
  const ajout = hVisee - hUtile;
  let bandeHaut;
  let bandeBas = 0;
  let corps;

  if (ajout >= 0) {
    bandeHaut = Math.max(Math.round(w * MARGE_MIN), Math.round(ajout * PART_HAUT));
    bandeBas = Math.max(0, ajout - bandeHaut);
    // La bande minimale peut dépasser ce qu'il y avait à ajouter : on reprend
    // alors le surplus en bas de l'image, jamais en haut.
    const trop = bandeHaut + bandeBas - ajout;
    corps = await img
      .extract({ left: 0, top: haut, width: w, height: hUtile - trop })
      .extend({ top: bandeHaut, bottom: bandeBas, background: fond })
      .toBuffer();
  } else {
    // Capture plus haute que le rapport visé : on rogne le BAS, jamais le haut
    // — le titre est ce qui identifie l'écran.
    bandeHaut = Math.round(w * MARGE_MIN);
    corps = await img
      .extract({ left: 0, top: haut, width: w, height: hVisee - bandeHaut })
      .extend({ top: bandeHaut, background: fond })
      .toBuffer();
  }

  /*
   * ⚠ DEUX PASSES, ET C'EST OBLIGATOIRE. sharp applique ses opérations dans un
   * ordre fixe — extract, puis resize, puis extend — quel que soit l'ordre
   * d'écriture. Enchaîner `.extend()` avant `.resize()` ajoutait la bande APRÈS
   * le redimensionnement : sortie en 720×1653 au lieu de 720×1560, soit un
   * rapport faux que la maquette aurait recadré une seconde fois.
   */
  await sharp(corps)
    .resize(LARGEUR, HAUTEUR, { fit: 'fill' })
    // ⚠ WebP et non PNG : une capture d'interface est une image de synthèse,
    // que PNG encode sans perte — donc lourdement. À qualité 82 l'œil ne voit
    // pas la différence sur du texte d'interface, et le fichier perd 80 % de
    // son poids.
    .webp({ quality: 82 })
    .toFile(fichierSortie);

  return { w, h, haut, bandeHaut, bandeBas };
}

/** Luminosité moyenne de l'image, 0–255. */
async function clarte(fichier) {
  const { channels } = await sharp(fichier).stats();
  return (channels[0].mean + channels[1].mean + channels[2].mean) / 3;
}

if (!existsSync(SOURCE)) {
  console.error(`  Dossier introuvable : ${SOURCE}`);
  process.exit(1);
}

const parDossier = ['chaux', 'encre'].some((t) => existsSync(path.join(SOURCE, t)));
for (const t of ['chaux', 'encre']) await mkdir(path.join(CIBLE, t), { recursive: true });

const presents = { chaux: new Set(), encre: new Set() };
let total = 0;

async function traiterUn(entree, nomFichier, themeImpose) {
  const lum = await clarte(entree);
  const mesure = lum >= SEUIL_CLAIR ? 'chaux' : 'encre';
  const theme = themeImpose || mesure;
  const brut = path.parse(nomFichier).name.toLowerCase().replace(/[^a-z0-9-]+/g, '-');
  const slug = ALIAS[brut] || brut;

  // ⚠ Tout ce qui n'est pas un module du carrousel est ignoré : `public/` est
  // servi tel quel, une capture inutilisée y partirait en production et
  // s'ajouterait au poids de la page sans jamais être affichée.
  if (!ATTENDUS.includes(slug)) {
    console.log(`  ${theme.padEnd(5)} / ${slug.padEnd(18)} ignoré — hors carrousel`);
    return;
  }

  const r = await traiter(entree, path.join(CIBLE, theme, `${slug}.webp`));
  presents[theme].add(slug);
  total++;

  const alerte = themeImpose && mesure !== themeImpose ? '  ⚠ LUMINOSITÉ INCOHÉRENTE' : '';
  // ⚠ Une capture prise à 1x sera AGRANDIE pour atteindre le format de sortie :
  // le texte y devient flou, et ça se voit d'autant plus que la maquette est le
  // seul visuel du produit sur le site.
  const flou = r.w < LARGEUR ? `  ⚠ BASSE RÉSOLUTION (${r.w} px)` : '';
  const renomme = slug !== brut ? ` (renommé depuis « ${brut} »)` : '';
  const note = r.haut ? "barre d'état retirée" : 'sans barre d’état';
  console.log(
    `  ${theme.padEnd(5)} / ${(slug + '.webp').padEnd(18)} ${String(r.w).padStart(4)}×${String(r.h).padEnd(4)} · lum ${lum.toFixed(0).padStart(3)} · ${note} · bandes ${r.bandeHaut}/${r.bandeBas}${renomme}${alerte}${flou}`,
  );
}

if (parDossier) {
  for (const theme of ['chaux', 'encre']) {
    const dossier = path.join(SOURCE, theme);
    if (!existsSync(dossier)) continue;
    const fichiers = (await readdir(dossier)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
    console.log(`\n  ${theme.toUpperCase()}`);
    for (const f of fichiers) {
      try {
        await traiterUn(path.join(dossier, f), f, theme);
      } catch (e) {
        console.error(`  ${f} : ÉCHEC — ${e instanceof Error ? e.message : e}`);
      }
    }
  }
} else {
  const fichiers = (await readdir(SOURCE)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  for (const f of fichiers) {
    try {
      await traiterUn(path.join(SOURCE, f), f, null);
    } catch (e) {
      console.error(`  ${f} : ÉCHEC — ${e instanceof Error ? e.message : e}`);
    }
  }
}

console.log(`\n  ${total} capture(s) en ${LARGEUR}×${HAUTEUR} dans ${CIBLE}/`);

/*
 * ⚠ LE CONTRÔLE DE COUVERTURE EST LA PARTIE UTILE. Le carrousel compose le
 * chemin à partir du thème courant : un module qui n'a de capture que dans un
 * thème afficherait une maquette vide dès qu'on bascule. Mieux vaut le savoir
 * ici qu'en ligne — le composant ne déclare `fichier` que pour les modules
 * présents des DEUX côtés.
 */
const complets = ATTENDUS.filter((m) => presents.chaux.has(m) && presents.encre.has(m));
const partiels = ATTENDUS.filter((m) => presents.chaux.has(m) !== presents.encre.has(m));
const absents = ATTENDUS.filter((m) => !presents.chaux.has(m) && !presents.encre.has(m));

console.log('\n  COUVERTURE DU CARROUSEL');
console.log(`    complets (les deux thèmes) : ${complets.join(', ') || 'aucun'}`);
if (partiels.length) {
  console.log(
    `    ⚠ un seul thème            : ${partiels
      .map((m) => `${m} (${presents.chaux.has(m) ? 'chaux' : 'encre'} seulement)`)
      .join(', ')}`,
  );
}
if (absents.length) console.log(`    manquants                  : ${absents.join(', ')}`);
console.log('');
