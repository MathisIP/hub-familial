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
 * brutes du téléphone (barre d'état comprise), d'autres ont été rognées à la
 * main, d'autres encore viennent du mode appareil des outils de développement
 * — celles-là n'ont AUCUNE barre d'état, alors qu'elles sont plus hautes que
 * les précédentes. Un seuil de hauteur se trompait donc sur ce dernier cas et
 * leur coupait le titre. On reconnaît les hauteurs d'appareil connues.
 *
 * ⚠ Le mode appareil est d'ailleurs la meilleure source : pas de barre d'état
 * à retirer, pas de connexion Google depuis une adresse IP privée (Google la
 * refuse), et le bac à sable reste sur le PC.
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
 * mobile : même sur un écran à trois pixels par point, 720 couvre largement le
 * besoin. En 1080 les neuf captures pesaient 8,9 Mo — sur une page d'accueil
 * qui reçoit du trafic Pinterest en 4G, c'est une image lourde de plus à
 * télécharger avant de comprendre ce qu'on vend.
 */
const LARGEUR = 720;
const HAUTEUR = Math.round(LARGEUR * RATIO);

/**
 * Barre d'état d'un iPhone en 3x. Appliquée seulement aux captures brutes.
 * ⚠ Le seuil (2450) sépare une capture pleine hauteur (2532) d'une capture
 * déjà rognée à la main (~2350-2410). Sans lui, on couperait deux fois.
 */
const BARRE_ETAT = 170;

/**
 * Bande de fond ajoutée AU-DESSUS du contenu, en fraction de la largeur.
 *
 * ⚠ SANS ELLE, LE COIN ARRONDI DE LA MAQUETTE MANGE LE TITRE DE L'ÉCRAN. Une
 * fois la barre d'état retirée, le titre (« Budget », « Repas »…) se retrouve
 * tout en haut à gauche — exactement là où l'écran de la maquette est rogné par
 * son rayon. On glisse donc une bande de fond, et le coin ronge du vide.
 *
 * ⚠ Le fond est PRÉLEVÉ SUR L'IMAGE, jamais écrit en dur : chaux et encre n'ont
 * pas la même couleur, et une valeur figée trahirait une bande claire en haut
 * d'une capture sombre.
 *
 * ⚠ Autant de pixels sont retirés EN BAS : la hauteur totale ne bouge pas, donc
 * le rapport de l'écran de maquette non plus. C'est la barre flottante de
 * l'application qui part — elle n'apporte rien à une vignette.
 */
const MARGE_HAUT = 0.085;

/**
 * Hauteurs des captures PRISES SUR L'APPAREIL, barre d'état comprise.
 * ⚠ Une capture faite depuis le mode appareil des outils de développement
 * (1179 × 2556 pour un iPhone 14 Pro) N'A PAS de barre d'état : lui couper
 * 170 px emporterait le titre de l'écran. On liste donc les hauteurs connues
 * des captures d'appareil au lieu de raisonner par « plus grand que ».
 */
const HAUTEURS_APPAREIL = new Set([2532, 2556, 2778, 2796, 2688, 2436]);

/**
 * Luminosité moyenne au-delà de laquelle une capture est « chaux ».
 * Chaux vaut ~231/255, encre ~22/255 : n'importe quel seuil médian convient,
 * on prend 128 et on affiche la valeur mesurée pour rester vérifiable.
 */
const SEUIL_CLAIR = 128;

const SOURCE = process.env.CAPTURES_SOURCE || 'C:/Users/mathi/Documents/Nestync/Captures';
const CIBLE = 'public/captures';

/**
 * Fautes de frappe courantes → slug attendu par le carrousel.
 * ⚠ On corrige ici plutot que de renommer les fichiers source : le nom qui
 * compte est celui que le composant demande, et une capture refaite demain
 * reviendrait avec la meme faute.
 */
const ALIAS = { acceuil: 'accueil', accueuil: 'accueil', 'to-do': 'todo', 'ev\u00e9nements': 'evenements' };

/** Les modules du carrousel (cf. MODULES dans SiteVitrine.tsx). */
const ATTENDUS = ['accueil', 'finances', 'agenda', 'repas', 'courses', 'todo', 'documents', 'evenements', 'cadeaux'];

async function traiter(fichierEntree, fichierSortie) {
  const img = sharp(fichierEntree);
  const { width: w, height: h } = await img.metadata();
  if (!w || !h) throw new Error('dimensions illisibles');

  // 1. Barre d'état.
  const haut = HAUTEURS_APPAREIL.has(h) ? BARRE_ETAT : 0;
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

  // Couleur de fond, prélevée juste sous la barre d'état, à gauche du titre :
  // c'est toujours du fond, quel que soit l'écran.
  const echantillon = await sharp(fichierEntree)
    .extract({ left: Math.round(w * 0.02), top: haut + 4, width: 8, height: 8 })
    .stats();
  const fond = {
    r: Math.round(echantillon.channels[0].mean),
    g: Math.round(echantillon.channels[1].mean),
    b: Math.round(echantillon.channels[2].mean),
    alpha: 1,
  };

  const marge = Math.round(cw * MARGE_HAUT);

  /*
   * ⚠ DEUX PASSES, ET C'EST OBLIGATOIRE. sharp applique ses opérations dans un
   * ordre fixe — extract, puis resize, puis extend — quel que soit l'ordre
   * d'écriture. Enchaîner `.extend()` avant `.resize()` ajoutait donc la bande
   * APRÈS le redimensionnement : sortie en 720×1653 au lieu de 720×1560, soit
   * un rapport faux, que la maquette aurait recadré une seconde fois.
   * On matérialise donc l'image agrandie avant de la redimensionner.
   */
  const avecMarge = await img
    .extract({ left: cx, top: haut, width: cw, height: ch - marge })
    .extend({ top: marge, background: fond })
    .toBuffer();

  await sharp(avecMarge)
    .resize(LARGEUR, HAUTEUR, { fit: 'fill' })
    // ⚠ WebP et non PNG : une capture d'interface est une image de synthèse,
    // que PNG encode sans perte — donc lourdement. À qualité 82 l'œil ne voit
    // pas la différence sur du texte d'interface, et le fichier perd 80 % de
    // son poids. Le format est compris par tous les navigateurs visés.
    .webp({ quality: 82 })
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

/**
 * Deux rangements sont acceptes, et c'est deliberé.
 *  · `Captures/chaux/` + `Captures/encre/` — le theme vient du dossier ;
 *  · un dossier plat — le theme est deduit de la luminosite.
 * ⚠ Meme quand le dossier fait foi, on MESURE quand meme la luminosite et on
 * signale un desaccord : une capture rangee dans le mauvais dossier passerait
 * sinon inapercue jusqu'a se retrouver en ligne.
 */
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

  const alerte = themeImpose && mesure !== themeImpose ? '  ⚠ LUMINOSITE INCOHERENTE' : '';
  // ⚠ Une capture prise a 1x (393 px de large) sera AGRANDIE trois fois pour
  // atteindre le format de sortie : le texte y devient flou, et ca se voit
  // d'autant plus que la maquette est le seul visuel du produit sur le site.
  const flou = r.w < LARGEUR ? `  ⚠ BASSE RESOLUTION (${r.w} px, sera agrandie)` : '';
  const renomme = slug !== brut ? ` (renomme depuis « ${brut} »)` : '';
  const note = r.haut ? "barre d'etat retiree" : 'sans barre d\'etat';
  console.log(
    `  ${theme.padEnd(5)} / ${(slug + '.webp').padEnd(18)} ${String(r.w).padStart(4)}\u00d7${String(r.h).padEnd(4)} · lum ${lum.toFixed(0).padStart(3)} · ${note}${renomme}${alerte}${flou}`,
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
        console.error(`  ${f} : ECHEC — ${e instanceof Error ? e.message : e}`);
      }
    }
  }
} else {
  const fichiers = (await readdir(SOURCE)).filter((f) => /\.(png|jpe?g)$/i.test(f)).sort();
  for (const f of fichiers) {
    try {
      await traiterUn(path.join(SOURCE, f), f, null);
    } catch (e) {
      console.error(`  ${f} : ECHEC — ${e instanceof Error ? e.message : e}`);
    }
  }
}

console.log(`\n  ${total} capture(s) en ${LARGEUR}\u00d7${HAUTEUR} dans ${CIBLE}/`);

/*
 * ⚠ LE CONTROLE DE COUVERTURE EST LA PARTIE UTILE. Le carrousel compose le
 * chemin a partir du theme courant : un module qui n'a de capture que dans un
 * theme afficherait une maquette vide des qu'on bascule. Mieux vaut le savoir
 * ici qu'en ligne — le composant ne declare donc `fichier` que pour les modules
 * presents des DEUX cotes.
 */
const complets = ATTENDUS.filter((m) => presents.chaux.has(m) && presents.encre.has(m));
const partiels = ATTENDUS.filter(
  (m) => presents.chaux.has(m) !== presents.encre.has(m),
);
const absents = ATTENDUS.filter((m) => !presents.chaux.has(m) && !presents.encre.has(m));
const enTrop = [...new Set([...presents.chaux, ...presents.encre])].filter(
  (m) => !ATTENDUS.includes(m),
);

console.log(`\n  COUVERTURE DU CARROUSEL`);
console.log(`    complets (les deux themes) : ${complets.join(', ') || 'aucun'}`);
if (partiels.length) {
  console.log(`    ⚠ un seul theme            : ${partiels
    .map((m) => `${m} (${presents.chaux.has(m) ? 'chaux' : 'encre'} seulement)`)
    .join(', ')}`);
}
if (absents.length) console.log(`    manquants                  : ${absents.join(', ')}`);
if (enTrop.length) console.log(`    hors carrousel             : ${enTrop.join(', ')}`);
console.log('');
