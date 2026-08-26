'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Mockup, Pastille, type Fil } from '@/components/vitrine-ds/Primitives';

/**
 * ÉVENTAIL DE MODULES — portage du composant « card-fan-carousel ».
 *
 * ⚠ LE COMPOSANT FOURNI N'ÉTAIT PAS INSTALLABLE TEL QUEL. Il suppose une base
 * **shadcn + Tailwind**, que ce projet n'a pas : Nestync a du CSS écrit à la
 * main (2 700 lignes dans `globals.css`) et aucune de ces dépendances.
 * Installer Tailwind pour une seule section reviendrait à faire cohabiter deux
 * systèmes de style dans une application qui a des clients — pour un bénéfice
 * nul, puisque nos jetons existent déjà. Le composant est donc **porté** :
 * mêmes positions d'éventail, même comportement, notre CSS et nos jetons.
 *
 * ⚠ ET SANS GSAP, DÉLIBÉRÉMENT. GSAP n'apportait ici que l'easing
 * `elastic.out(1.05,.78)` et les décalages — or la charte l'interdit
 * explicitement : « pas d'échelle, pas de rotation, pas de rebond », et **une
 * seule courbe** (`cubic-bezier(.2,.7,.2,1)`). Ajouter 70 ko de bibliothèque à
 * la page de vente pour produire une animation que la charte proscrit n'avait
 * pas de sens. Les transitions CSS suffisent, et elles respectent
 * `prefers-reduced-motion` sans code supplémentaire.
 *
 * ⚠ LE SEUL POINT OÙ CE COMPOSANT SORT DE LA CHARTE, ET IL FAUT LE TRANCHER :
 * la charte fixe la rotation des mockups à **2–4°**, l'éventail va jusqu'à
 * **±21°**. À 4°, il n'y a plus d'éventail — les deux règles sont
 * incompatibles. J'ai gardé la géométrie du composant (c'est ce qui en fait
 * l'intérêt) et signalé l'écart plutôt que de le masquer. `ANGLE_MAX` ci-dessous
 * se baisse d'une valeur si tu préfères l'inverse.
 *
 * Le reste est aligné : rayon 2 px sur les flèches (le rond est réservé aux
 * pastilles et aux fils), aucun `backdrop-filter` (interdit), aucune ombre hors
 * celle des mockups, couleurs par jetons.
 */

/** Ouverture maximale de l'éventail. ⚠ Hors charte (2–4°) — cf. en-tête. */
const ANGLE_MAX = 21;
const VISIBLES_MAX = 7;
const MOITIE = 3;

/** Positions de l'éventail, reprises du composant d'origine. */
const POSITIONS = [
  { rot: -ANGLE_MAX, echelle: 0.7756, x: -30, y: 7.3, z: 1 },
  { rot: -14, echelle: 0.8498, x: -22, y: 4.0, z: 2 },
  { rot: -7, echelle: 0.9346, x: -11, y: 1.3, z: 3 },
  { rot: 0, echelle: 1.0, x: 0, y: 0.0, z: 10 },
  { rot: 7, echelle: 0.9346, x: 11, y: 1.3, z: 3 },
  { rot: 14, echelle: 0.8498, x: 22, y: 4.0, z: 2 },
  { rot: ANGLE_MAX, echelle: 0.7756, x: 30, y: 7.3, z: 1 },
];

/** L'éventail se resserre sur les petits écrans, sinon il déborde. */
function facteur(largeur: number) {
  if (largeur < 480) return 0.28;
  if (largeur < 640) return 0.38;
  if (largeur < 768) return 0.5;
  if (largeur < 1024) return 0.75;
  return 1;
}

export type ModuleEventail = {
  fil: Fil;
  titre: string;
  texte: string;
  alt: string;
  /**
   * Slug de la capture, sans chemin ni extension.
   * ⚠ Le chemin depend du theme, qui change a l'execution : le composant le
   * compose lui-meme. Un module sans slug garde son cartouche « capture a
   * fournir » — pointer vers une image absente donnerait une maquette vide,
   * qu'on lirait comme un bogue et non comme un contenu manquant.
   */
  fichier?: string;
};

export default function EventailModules({
  modules,
  theme = 'jour',
}: {
  modules: ModuleEventail[];
  /** Theme du site : la capture suit, chaux avec chaux et encre avec encre. */
  theme?: 'jour' | 'nuit';
}) {
  /*
   * ⚠ LA CAPTURE SUIT LE THEME, ET C'EST LA SEULE FACON D'ETRE CREDIBLE.
   * Une maquette de telephone affichant une interface claire au milieu d'un
   * site passe en nuit ne se lit pas comme un choix graphique mais comme une
   * image plaquee — elle detruit precisement ce qu'elle vient prouver, a savoir
   * que c'est bien le produit qu'on regarde.
   */
  const capture = (m: ModuleEventail) =>
    m.fichier ? `/captures/${theme === 'nuit' ? 'encre' : 'chaux'}/${m.fichier}.png` : undefined;

  const total = modules.length;
  const pagine = total > VISIBLES_MAX;
  const [centre, setCentre] = useState(pagine ? MOITIE : total >> 1);
  const [survole, setSurvole] = useState<number | null>(null);
  const [mult, setMult] = useState(1);
  /*
   * ⚠ EN MOBILE, L'EVENTAIL N'EST PAS REDUIT : IL EST ABANDONNE.
   *
   * Sept cartes ouvertes en perspective demandent de la largeur. Sur 390 px
   * elles se recouvrent, debordent par le haut sur le titre de section, et
   * leurs legendes inclinees s'empilent en bas — c'est ce qu'on voyait.
   * Aucun reglage d'echelle ne repare ca : le probleme est la forme meme.
   *
   * On affiche donc UNE carte, celle du centre, avec les fleches et les points
   * qui existent deja. Le geste reste le meme, l'effet disparait.
   *
   * ⚠ Ce drapeau ne vaut que sous 767 px : au-dessus, pas une ligne du
   * rendu ne change. L'eventail est le morceau le mieux reussi de la page en
   * bureau, il devait rester intact.
   *
   * ⚠ Lu au montage, jamais au rendu serveur — comme `mult` juste au-dessus :
   * une valeur qui differerait entre serveur et client casserait l'hydratation.
   */
  const [compact, setCompact] = useState(false);
  const conteneur = useRef<HTMLDivElement>(null);

  /* Le facteur dépend de la largeur : il se lit au montage, jamais au rendu
     serveur (sinon les deux divergeraient et l'hydratation échouerait). */
  useEffect(() => {
    const relire = () => {
      setMult(facteur(window.innerWidth));
      setCompact(window.innerWidth <= 767);
    };
    relire();
    window.addEventListener('resize', relire);
    return () => window.removeEventListener('resize', relire);
  }, []);

  /** Quelle carte occupe quelle place de l'éventail. */
  const places = useCallback(() => {
    const m = new Map<number, number>();
    if (!pagine) {
      modules.forEach((_, i) => m.set(i, i));
      return m;
    }
    for (let place = 0; place < VISIBLES_MAX; place++) {
      m.set(((centre + place - MOITIE) % total + total) % total, place);
    }
    return m;
  }, [centre, total, pagine, modules]);

  const config = (place: number) => {
    if (pagine || total >= VISIBLES_MAX) return POSITIONS[place];
    // Moins de cartes que de places : on répartit l'ouverture sur ce qu'on a.
    const milieu = total >> 1;
    const d = total > 1 ? (place - milieu) / milieu : 0;
    const ad = Math.abs(d);
    return { rot: d * ANGLE_MAX, echelle: 1 - 0.2244 * ad * ad, x: d * 30, y: ad * ad * 7.3, z: 10 - Math.abs(place - milieu) };
  };

  const tourner = (sens: 'avant' | 'arriere') =>
    setCentre((p) => (sens === 'avant' ? (p + 1) % total : (p - 1 + total) % total));

  /*
   * GLISSEMENT AU DOIGT.
   *
   * ⚠ ON NE BLOQUE JAMAIS LE DEFILEMENT. Aucun `preventDefault` sur le
   * mouvement : la page doit continuer de defiler verticalement pendant qu'on
   * pose le doigt sur la carte. Un carrousel qui capture le geste vertical
   * emprisonne le lecteur au milieu de la page — defaut classique, et
   * particulierement penible sur une page longue comme celle-ci.
   *
   * On decide donc APRES coup, au relachement.
   *
   * ⚠ LES DEUX SEUILS SE PAIENT L'UN L'AUTRE. Trop stricts, il faut
   * traverser l'ecran pour changer de carte — c'est ce qui a ete constate avec
   * 48 px et un rapport de 2. Trop laches, un simple defilement du pouce fait
   * tourner le carrousel par accident, ce qui est bien plus penible. On vise
   * 28 px, soit environ un pouce de large, et un rapport de 1,3 : le geste
   * doit rester nettement horizontal sans avoir a etre parfait.
   *
   * Ramene ensuite a 20 px et 1,1 : le premier reglage demandait encore un
   * geste trop appuye. En dessous, on entrerait dans le domaine du simple
   * tremblement du pouce pendant un defilement vertical.
   *
   * Les evenements tactiles ne se declenchent pas a la souris : rien de ceci
   * n'affecte le bureau.
   */
  const depart = useRef<{ x: number; y: number } | null>(null);

  const debutToucher = (e: React.TouchEvent) => {
    const t = e.touches[0];
    depart.current = { x: t.clientX, y: t.clientY };
  };

  const finToucher = (e: React.TouchEvent) => {
    const d = depart.current;
    depart.current = null;
    if (!d) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - d.x;
    const dy = t.clientY - d.y;
    if (Math.abs(dx) < 20 || Math.abs(dx) < Math.abs(dy) * 1.1) return;
    tourner(dx < 0 ? 'avant' : 'arriere');
  };

  const carte = places();
  const milieuVisible = (pagine ? VISIBLES_MAX : total) >> 1;

  return (
    <div className="nsy-eventail">
      <div
        ref={conteneur}
        className="nsy-eventail-scene"
        onMouseLeave={() => setSurvole(null)}
        onTouchStart={debutToucher}
        onTouchEnd={finToucher}
      >
        {modules.map((m, i) => {
          const place = carte.get(i);
          // En mobile c'est le bloc `compact` plus bas qui rend les cartes :
          // on sort d'ici sans rien produire, remplisseurs invisibles compris.
          if (compact) return null;
          if (place === undefined) {
            return <div key={m.titre} className="nsy-eventail-carte" style={{ opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />;
          }
          const base = config(place);
          let x = base.x * mult;
          let y = base.y;
          let rot = base.rot;
          let echelle = base.echelle;

          /* Survol : la carte pointée se soulève, les autres s'écartent —
             l'effet du composant d'origine, en transitions CSS. */
          if (survole !== null) {
            const d = Math.abs(place - survole);
            if (place === survole) {
              y -= 2.5;
              echelle *= 1.08;
            } else {
              const norm = milieuVisible > 0 ? (place - milieuVisible) / milieuVisible : 0;
              const pousse = 8 * (1 - Math.abs(norm)) * (1 + 0.2 * Math.max(0, 3 - d)) * mult;
              x += place < survole ? -pousse : pousse;
              rot += place < survole ? -3 / (d + 1) : 3 / (d + 1);
            }
          }

          return (
            <figure
              key={m.titre}
              className="nsy-eventail-carte"
              onMouseEnter={() => setSurvole(place)}
              /*
               * ⚠ CLIQUER UNE CARTE LA RAMENE AU CENTRE.
               *
               * Le survol souleve deja la carte pointee : la page promet donc
               * une interaction que rien ne concretisait, et les fleches
               * restaient le seul moyen d'avancer — deux crans pour atteindre
               * une carte qu'on a sous le curseur.
               *
               * `centre` est l'indice du module occupant la place du milieu
               * (cf. `places()`), il suffit donc de lui donner `i`.
               *
               * ⚠ Uniquement en mode pagine : sans pagination, les cartes
               * sont figees a leur indice et `centre` ne deplace rien. Un
               * curseur qui promet un clic sans effet serait pire que rien.
               *
               * ⚠ Ce n'est pas le chemin clavier : ce sont les fleches, qui
               * sont de vrais boutons. Le clic est un raccourci a la souris,
               * ajoute par-dessus un acces qui existe deja.
               */
              onClick={pagine && place !== milieuVisible ? () => setCentre(i) : undefined}
              style={{
                transform: `translate(${x}rem, ${y}rem) rotate(${rot}deg) scale(${echelle})`,
                zIndex: base.z,
                transitionDelay: `${Math.abs(place - milieuVisible) * 20}ms`,
                cursor: pagine && place !== milieuVisible ? 'pointer' : 'default',
              }}
            >
              <Mockup largeur={230} rotation={0} alt={m.alt} src={capture(m)} />
              {/* ⚠ LE TITRE SEUL. Les descriptions se chevauchaient : chaque légende
                  pivote avec sa carte, et sept blocs de deux lignes inclinés se
                  recouvrent forcément en bas de l'éventail. Le texte de la carte
                  centrale est affiché sous l'éventail, où il a la place. */}
              <figcaption className="nsy-eventail-legende">
                <Pastille fil={m.fil}>{m.titre}</Pastille>
              </figcaption>
            </figure>
          );
        })}

        {/*
          VUE MOBILE : un vrai carrousel, pas trois cartes cote a cote.

          ⚠ CE QUI A ECHOUE A L'ESSAI PRECEDENT, ET POURQUOI. On rendait trois
          cartes (precedente, centrale, suivante) dans une rangee. Quand on
          changeait de module, les cartes ne bougeaient pas : c'est leur CONTENU
          qui changeait. Aucune transition CSS ne peut s'accrocher a ca — une
          transition anime une propriete qui varie, pas un remplacement de
          noeud. D'ou l'absence totale d'animation.

          Ici, TOUTES les cartes sont rendues et positionnees en absolu selon
          leur ecart au centre. Changer de module change l'ecart, donc le
          `translateX` de chacune : le navigateur interpole, et le carrousel
          glisse. C'est exactement le principe de l'eventail en bureau.

          ⚠ L'ecart est CIRCULAIRE et signe. Sans le repliement autour de
          `total`, passer de la derniere carte a la premiere ferait traverser
          tout le jeu d'un bord a l'autre au lieu d'avancer d'un cran.

          ⚠ Le decalage (95 px pour une carte de 150) est choisi pour que la
          voisine soit a moitie masquee par la centrale TOUT EN gardant son bord
          exterieur dans le cadre. Un decalage plus grand la ferait couper par
          le bord de la scene : on verrait une tranche d'ecran, pas un
          telephone — c'est ce qui donnait l'impression d'une image coupee.
        */}
        {compact &&
          modules.map((m, i) => {
            let ecart = i - centre;
            if (ecart > total / 2) ecart -= total;
            if (ecart < -total / 2) ecart += total;

            const voisine = Math.abs(ecart) === 1;
            const visible = Math.abs(ecart) <= 1;

            return (
              <figure
                key={m.titre}
                className="nsy-eventail-carte"
                onClick={voisine ? () => tourner(ecart > 0 ? 'avant' : 'arriere') : undefined}
                aria-hidden={ecart !== 0}
                style={{
                  transform: `translateX(${ecart * 95}px) scale(${ecart === 0 ? 1 : 0.84})`,
                  opacity: visible ? (ecart === 0 ? 1 : 0.55) : 0,
                  zIndex: 10 - Math.abs(ecart),
                  // Les cartes lointaines restent dans l'arbre pour pouvoir
                  // s'animer, mais ne doivent capter aucun clic.
                  pointerEvents: voisine ? 'auto' : 'none',
                }}
              >
                <Mockup largeur={150} rotation={0} alt={m.alt} src={capture(m)} />
                {ecart === 0 && (
                  <figcaption className="nsy-eventail-legende">
                    <Pastille fil={m.fil}>{m.titre}</Pastille>
                  </figcaption>
                )}
              </figure>
            );
          })}
      </div>

      {/* Le texte du module centré, à hauteur fixe : sans elle, la page
          sauterait à chaque rotation de l'éventail. */}
      <p className="nsy-eventail-detail">{modules[centre]?.texte}</p>

      {pagine && (
        <div className="nsy-eventail-nav">
          <button type="button" onClick={() => tourner('arriere')} aria-label="Module précédent">
            <Chevron sens="gauche" />
          </button>
          {/* Les points disent où l'on est dans une liste de huit : sans eux,
              l'éventail tourne sans qu'on sache combien il reste. */}
          <div className="nsy-eventail-points" role="presentation">
            {modules.map((m, i) => (
              <span key={m.titre} className={i === centre ? 'actif' : undefined} />
            ))}
          </div>
          <button type="button" onClick={() => tourner('avant')} aria-label="Module suivant">
            <Chevron sens="droite" />
          </button>
        </div>
      )}

      {/* ⚠ L'éventail est décoratif dans sa forme, mais son CONTENU ne doit pas
          dépendre de la souris : la liste complète reste lisible ici pour les
          lecteurs d'écran et si le JavaScript ne s'exécute pas. */}
      <ul className="nsy-eventail-liste">
        {modules.map((m) => (
          <li key={m.titre}>
            <Pastille fil={m.fil}>{m.titre}</Pastille> {m.texte}
          </li>
        ))}
      </ul>
    </div>
  );
}

function Chevron({ sens }: { sens: 'gauche' | 'droite' }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <polyline points={sens === 'gauche' ? '15 18 9 12 15 6' : '9 18 15 12 9 6'} />
    </svg>
  );
}
