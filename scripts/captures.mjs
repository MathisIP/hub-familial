/**
 * RECADRAGE DES CAPTURES D'ÉCRAN POUR LE CARROUSEL DU SITE.
 * ========================================================
 *   npm run captures
 *
 * Lit un dossier PLAT de captures et écrit `public/captures/<theme>/*.png`.
 *
 * ⚠ LE THÈME EST DÉDUIT DE L'IMAGE, PAS DU DOSSIER. Les captures sortent du
 * téléphone sous des noms comme `IMG_3054.PNG`, mélangées : demander un
 * classement manuel en deux dossiers, c'est seize occasions de se tromper pour
 * une information que l'image porte déjà. Chaux (#E7E9E4) et encre (#141C26)
 * sont aux deux extrémités de l'échelle — aucune ambiguïté possible.
 *
 * ⚠ LE FORMAT DE SORTIE N'EST PAS ARBITRAIRE : il vaut exactement celui de
 * l'écran de la maquette (`ratio = 19.5 / 9` dans components/vitrine-ds/
 * Primitives.tsx). L'image y est posée en `object-fit: cover` — un rapport
 * différent la ferait recadrer une SECONDE fois par le navigateur, au hasard,
 * et le haut ou les côtés d'une capture soigneusement cadrée disparaîtraient.
 * ⚠ Si ce ratio change dans Primitives.tsx, il doit changer ici aussi.
 *
 * Trois opérations, dans cet ordre :
 *  1. retirer la barre d'état (heure, réseau, batterie) ;
 *  2. ramener au rapport de l'écran de maquette, en rognant les côtés ;
 *  3. normaliser toutes les images à la même taille.
 *
 * ⚠ LES CAPTURES N'ARRIVENT PAS TOUTES DANS LE MÊME ÉTAT. Certaines sortent
 * brutes du téléphone (2532 px de haut, barre d'état comprise), d'autres ont
 * déjà été rognées à la main. On décide donc par la hauteur plutôt que
 * d'appliquer la même coupe à tout le monde — sinon les secondes perdraient
 * une bande de contenu utile.
 */
import { readdir, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import sharp from 'sharp';

/** Rapport de l'écran de la maquette. Doit suivre `ratio` de Primitives.tsx. */
const RATIO = 19.5 / 9;

/** Taille de sortie commune. 1080 de large donne 2340 de haut à ce rapport. */
const LARGEUR = 1080;
const HAUTEUR = Math.round(LARGEUR * RATIO);

/**
 * Barre d'état d'un iPhone en 3x. Appliquée seulement aux captures brutes.
 * ⚠ Le seuil (2450) sépare une capture pleine hauteur (2532) d'une capture
 * déjà rognée à la main (~2350-2410). Sans lui, on couperait deux fois.
 */
const BARRE_ETAT = 170;
const SEUIL_BRUTE = 2450;

/**
 * Luminosité moyenne au-delà de laquelle une capture est « chaux ».
 * Chaux vaut ~231/255, encre ~22/255 : n'importe quel seuil médian convient,
 * on prend 128 et on affiche la valeur mesurée pour rester vérifiable.
 */
const SEUIL_CLAIR = 128;

const SOURCE =
  process.env.CAPTURES_SOURCE ||
  'C:/Users/mathi/Documents/Nestync/Nestync-Site/Screenshots pour le site-20260826T155354Z-1-001/Screenshots pour le site';
const CIBLE = 'public/captures';

async function traiter(fichierEntree, fichierSortie) {
  const img = sharp(fichierEntree);
  const { width: w, height: h } = await img.metadata();
  if (!w || !h) throw new Error('dimensions illisibles');

  // 1. Barre d'état.
  const haut = h >= SEUIL_BRUTE ? BARRE_ETAT : 0;
  const hUtile = h - haut;

  // 2. Rapport de l'écran de maquette. On rogne d'abord les côtés — c'est là
  //    qu'il y a de la marge (l'application laisse 20 px de chaque bord) ;
  //    rogner en hauteur emporterait un titre ou une ligne de liste.
  let cx = 0;
  let cw = w;
  let ch = hUtile;
  const largeurIdeale = Math.round(hUtile / RATIO);
  if (largeurIdeale <= w) {
    cw = largeurIdeale;
    cx = Math.round((w - cw) / 2);
  } else {
    // Capture déjà plus étroite que le rapport visé : on rogne le bas, jamais
    // le haut — le titre de l'écran est ce qui identifie le module.
    ch = Math.round(w * RATIO);
  }

  await img
    .extract({ left: cx, top: haut, width: cw, height: ch })
    .resize(LARGEUR, HAUTEUR, { fit: 'fill' })
    .png({ compressionLevel: 9 })
    .toFile(fichierSortie);

  return { w, h, haut, cw, ch };
}

/** Luminosité moyenne de l'image, 0–255. */
async function clarte(fichier) {
  const { channels } = await sharp(fichier).stats();
  const [r, v, b] = channels;
  return (r.mean + v.mean + b.mean) / 3;
}

if (!existsSync(SOURCE)) {
  console.error(`  Dossier introuvable : ${SOURCE}`);
  process.exit(1);
}

const fichiers = (await readdir(SOURCE)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
if (fichiers.length === 0) {
  console.error(`  Aucune image dans ${SOURCE}`);
  process.exit(1);
}

for (const t of ['chaux', 'encre']) await mkdir(path.join(CIBLE, t), { recursive: true });

let total = 0;
for (const f of fichiers) {
  try {
    const entree = path.join(SOURCE, f);
    const lum = await clarte(entree);
    const theme = lum >= SEUIL_CLAIR ? 'chaux' : 'encre';
    const nom = path.parse(f).name.toLowerCase().replace(/[^a-z0-9]+/g, '-') + '.png';
    const r = await traiter(entree, path.join(CIBLE, theme, nom));
    const note = r.haut ? "barre d'état retirée" : 'déjà rognée';
    console.log(
      `  ${f.padEnd(16)} → ${theme.padEnd(5)} / ${nom.padEnd(16)} ${r.w}×${r.h} · lum ${lum.toFixed(0).padStart(3)} · ${note}`,
    );
    total++;
  } catch (e) {
    console.error(`  ${f} : ÉCHEC — ${e instanceof Error ? e.message : e}`);
  }
}

console.log(`
  ${total} capture(s) en ${LARGEUR}×${HAUTEUR} dans ${CIBLE}/
`);
console.log('  ⚠ Renomme les fichiers SOURCE avec le nom du module (accueil.png,');
console.log('    finances.png, agenda.png, repas.png, courses.png, todo.png,');
console.log('    documents.png, evenements.png) puis relance : seul toi sais');
console.log('    quel écran montre quel module.');
