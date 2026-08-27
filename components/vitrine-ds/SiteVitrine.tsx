'use client';

import { useState } from 'react';
import { Bouton, Pastille, Mockup, type Fil } from '@/components/vitrine-ds/Primitives';
import EventailModules from '@/components/vitrine-ds/EventailModules';
import EnTravaux from '@/components/vitrine-ds/EnTravaux';
// ⚠ Les montants viennent de lib/offres.ts, JAMAIS recopies ici. Ils sont
// deja lus par les conditions generales et servent de reference aux tarifs
// Stripe : un prix ecrit en dur sur la vitrine finirait par annoncer autre
// chose que ce qui est facture.
import { OFFRES, formatPrix } from '@/lib/offres';

/**
 * SITE VITRINE NESTYNC — porté de `templates/accueil/Accueil.dc.html`.
 *
 * ⚠ PREMIÈRE VERSION CONSTRUITE DEPUIS LA MAUVAISE SOURCE (25/08/2026).
 * Elle s'appuyait sur `ui_kits/site-vitrine/Sections.jsx`, un kit plus ancien
 * bâti sur un tout autre concept — « les fils du foyer », un rail vertical de
 * cinq couleurs, une page-manifeste en six sections. Le gabarit réellement
 * demandé est une **page de conversion** : promesse, essai gratuit, tarifs, et
 * surtout la démonstration recette → semaine → courses.
 *
 * ⚠ IL N'Y A DONC PAS DE RAIL. Ce n'est pas un oubli : le gabarit n'en contient
 * aucun. Les fils appartenaient à l'autre direction.
 *
 * ═══ ÉCARTS ASSUMÉS PAR RAPPORT AU GABARIT ═══
 *
 * 1. ⚠ LA BASCULE DE THÈME NE TOUCHE PAS À `<html>`. Le gabarit lit et écrit
 *    `document.documentElement.dataset.theme`. Ici ce serait un défaut grave :
 *    l'application pose déjà `data-theme` sur `<html>`, et l'un de ses thèmes
 *    s'appelle `nuit`. Basculer le site en sombre changerait durablement le
 *    thème de l'application d'un membre connecté. Le thème du site vit sur le
 *    conteneur, en `data-site-theme`.
 *
 * 2. ⚠ PRÉNOMS DU FOYER DE DÉMONSTRATION : Clara, Antoine, Noé. Le gabarit
 *    livre « Léa », « Mathis », « Jules », « Camille ». « Mathis » est le
 *    prénom réel du créateur, et la règle de confidentialité du projet interdit
 *    toute donnée réelle sur un support public.
 *
 * 3. Les liens `#mentions`, `#confidentialite`, `#contact` du gabarit sont des
 *    ancres inertes ; les pages existent, ils pointent dessus.
 */

/** Nombre de convives servant de base aux quantités des recettes. */
const BASE_CONVIVES = 4;

/* Les deux formules, tirees de la source unique. */
const ANNUEL = OFFRES.find((o) => o.id === 'annuel')!;
const MENSUEL = OFFRES.find((o) => o.id === 'mensuel')!;

export default function SiteVitrine() {
  const [theme, setTheme] = useState<'jour' | 'nuit'>('jour');
  const [convives, setConvives] = useState(BASE_CONVIVES);
  /*
   * ⚠ L'ANNUEL EST LA FORMULE PAR DEFAUT, et ce n'est pas un detail
   * d'affichage. Deux cartes cote a cote presentaient deux options
   * equivalentes, en laissant au visiteur le travail de comparer 49,90 €/an
   * et 4,99 €/mois. Une formule mise en avant, avec l'economie annoncee sur
   * la bascule elle-meme, dit ce qu'on recommande.
   */
  const [formule, setFormule] = useState<'annuel' | 'mensuel'>('annuel');

  /* Mise à l'échelle : c'est exactement ce que fait le module Repas. */
  const ech = (v: number) => (v * convives) / BASE_CONVIVES;
  const nb = (v: number, d = 0) =>
    v.toLocaleString('fr-FR', { minimumFractionDigits: 0, maximumFractionDigits: d });
  const poids = (g: number) => {
    const v = ech(g);
    return v >= 1000 ? `${nb(v / 1000, 2)} kg` : `${Math.round(v)} g`;
  };

  const recette = [
    { nom: 'Courgettes', qte: poids(600) },
    { nom: 'Crème fraîche', qte: `${Math.round(ech(20))} cl` },
    { nom: 'Parmesan', qte: poids(60) },
    { nom: 'Œufs', qte: nb(Math.ceil(ech(2))) },
  ];

  const semaine = [
    { abrev: 'Lun', repas: 'Restes', clef: false },
    { abrev: 'Mar', repas: 'Gratin de courgettes', clef: true },
    { abrev: 'Mer', repas: 'Poulet rôti', clef: false },
    { abrev: 'Jeu', repas: 'Poêlée de courgettes au chèvre', clef: true },
    { abrev: 'Ven', repas: 'Pizza maison', clef: false },
    { abrev: 'Sam', repas: 'Dîner avec les Ferrand', clef: false },
    { abrev: 'Dim', repas: 'Soupe et tartines', clef: false },
  ];

  const rayons = [
    {
      nom: 'Fruits et légumes',
      items: [
        // 1000 g = les 600 g du gratin + les 400 g de la poêlée : la fusion.
        { nom: 'Courgettes', qte: poids(1000), fusion: true },
        { nom: 'Oignon jaune', qte: nb(Math.ceil(ech(1))), fusion: false },
        { nom: 'Basilic', qte: '1 bouquet', fusion: false },
      ],
    },
    {
      nom: 'Crémerie',
      items: [
        { nom: 'Crème fraîche', qte: `${Math.round(ech(20))} cl`, fusion: false },
        { nom: 'Parmesan', qte: poids(60), fusion: false },
        { nom: 'Bûche de chèvre', qte: poids(150), fusion: false },
        { nom: 'Œufs', qte: nb(Math.ceil(ech(2))), fusion: false },
      ],
    },
    {
      nom: 'Épicerie',
      items: [
        { nom: "Huile d'olive", qte: '1 bouteille', fusion: false },
        { nom: 'Pignons de pin', qte: poids(30), fusion: false },
      ],
    },
  ];
  const nbArticles = rayons.reduce((s, r) => s + r.items.length, 0);

  const mono = (taille: number | string, couleur = 'var(--texte-petit)'): React.CSSProperties => ({
    fontFamily: 'var(--font-donnees)',
    fontSize: taille,
    color: couleur,
  });
  const surtitre: React.CSSProperties = {
    margin: 0,
    ...mono(12),
    textTransform: 'uppercase',
    letterSpacing: '.14em',
  };
  const h2: React.CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontVariationSettings: 'var(--wonk)',
    fontWeight: 400,
    fontSize: 'clamp(2rem,4.5vw,3.5rem)',
    lineHeight: 1.02,
    letterSpacing: '-.02em',
  };
  const h3: React.CSSProperties = {
    margin: 0,
    fontFamily: 'var(--font-display)',
    fontVariationSettings: 'var(--wonk)',
    fontWeight: 400,
    fontSize: '1.5rem',
    lineHeight: 1.15,
  };
  const carte: React.CSSProperties = {
    background: 'var(--surface)',
    border: '1px solid var(--trait)',
    borderRadius: 'var(--rayon)',
    // ⚠ Des jetons, pas des valeurs ecrites ici : un objet de style
    // JavaScript ne peut pas etre repris par un point de rupture.
    padding: 'var(--carte-pad)',
    display: 'grid',
    gap: 'var(--carte-gap)',
    alignContent: 'start',
  };
  const section = (fond: 'base' | 'alt'): React.CSSProperties => ({
    background: fond === 'alt' ? 'var(--fond-alt)' : 'var(--fond)',
    color: 'var(--texte)',
    // ⚠ Des JETONS, pas des `clamp()` ecrits ici : un objet de style
    // JavaScript ne peut pas etre repris par une regle de feuille, donc le
    // point de rupture mobile n'avait aucune prise sur ce rembourrage.
    padding: 'var(--pad-section-v) var(--pad-section-h)',
    transition: 'background 300ms var(--courbe), color 300ms var(--courbe)',
  });
  const contenu: React.CSSProperties = { maxWidth: 1440, margin: '0 auto' };

  return (
    <div
      className="nsy-site"
      data-site-theme={theme}
      style={{ minHeight: '100vh', scrollBehavior: 'smooth' }}
    >
      {/* ============================ En-tête ============================ */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 20,
          background: 'var(--fond)',
          borderBottom: '1px solid var(--trait)',
          transition: 'background 300ms var(--courbe)',
        }}
      >
        <div
          style={{
            ...contenu,
            padding: '0 clamp(16px,5vw,96px)',
            height: 68,
            display: 'flex',
            alignItems: 'center',
            gap: 'clamp(12px,3vw,48px)',
          }}
        >
          {/* Aucun logo fourni : le nom en Fraunces EST la marque. */}
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontVariationSettings: 'var(--wonk)',
              fontWeight: 400,
              fontSize: 21,
              letterSpacing: '-.02em',
            }}
          >
            Nestync
          </span>
          {/*
            ⚠ AUCUN `display` EN STYLE INLINE ICI. Il y en avait un
            (`display: 'flex'`), et un style inline bat toute regle de feuille
            externe : le `display: none` prevu pour le mobile dans
            vitrine-ds.css n'a donc JAMAIS eu d'effet. Les trois liens
            restaient sur une ligne et « Se connecter » sortait de l'ecran.
            Rien ne le signalait — le CSS etait juste, le composant aussi.
            La mise en page de cette barre vit desormais entierement dans la
            feuille, ou le point de rupture peut la reprendre.
          */}
          <nav className="nsy-nav-liens">
            {/*
              ⚠ Les deux ancres disparaissent en mobile, PAS « Se connecter ».
              Elles ne menent qu'a des sections de la meme page, qu'on atteint
              en faisant defiler ; « Se connecter » est le seul chemin d'entree
              pour quelqu'un qui a deja un foyer.
            */}
            <a href="#demonstration" className="nsy-nav-ancre" style={{ ...surtitre, textDecoration: 'none' }}>
              Démonstration
            </a>
            <a href="#tarifs" className="nsy-nav-ancre" style={{ ...surtitre, textDecoration: 'none' }}>
              Tarifs
            </a>
            {/* ⚠ IL MANQUAIT UN CHEMIN POUR LES MEMBRES DÉJÀ INSCRITS. La page
                ne proposait que « Essayer gratuitement » : quelqu'un qui a déjà
                un foyer n'avait aucun moyen d'entrer depuis le site, et rien ne
                le lui disait. Le lien reste discret — le visiteur majoritaire
                est un prospect, pas un membre. */}
            <a
              href="/connexion"
              className="nsy-nav-connexion"
              style={{ ...surtitre, textDecoration: 'none', color: 'var(--texte)' }}
            >
              Se connecter
            </a>
            <BasculeTheme theme={theme} onBasculer={() => setTheme(theme === 'jour' ? 'nuit' : 'jour')} />
          </nav>
        </div>
      </header>

      {/* ============================== Hero ============================= */}
      <section
        id="hero"
        style={{
          ...section('base'),
          padding:
            'calc(var(--pad-section-v) * .75) var(--pad-section-h) var(--pad-section-v)',
        }}
      >
        <div
          style={{
            ...contenu,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,420px),1fr))',
            gap: 'clamp(40px,6vw,96px)',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 'clamp(20px,2.5vw,32px)', maxWidth: 640 }}>
            <p style={surtitre}>Nestync — l&apos;application du foyer</p>
            <h1
              style={{
                margin: 0,
                fontFamily: 'var(--font-display)',
                fontVariationSettings: 'var(--wonk)',
                fontWeight: 400,
                fontSize: 'clamp(2.75rem,7vw,5.25rem)',
                lineHeight: 0.96,
                letterSpacing: '-.025em',
              }}
            >
              Le foyer, sans la charge mentale.
            </h1>
            <p
              style={{
                margin: 0,
                maxWidth: '56ch',
                fontFamily: 'var(--font-corps)',
                fontSize: 'clamp(1.0625rem,1.6vw,1.25rem)',
                lineHeight: 1.55,
                color: 'var(--texte-doux)',
              }}
            >
              Les comptes, l&apos;agenda, les repas, les courses et les papiers de la maison au même
              endroit. Une couleur par personne, pour qu&apos;on sache toujours à qui appartient
              quoi.
            </p>
            <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
              {/* Le halo est l'unique survivance du néon de l'app, et seulement en nuit. */}
              <Bouton variante="principal" taille="l" href="#tarifs" halo={theme === 'nuit'}>
                Essayer gratuitement 30 jours
              </Bouton>
              <span style={{ ...mono(12), textTransform: 'uppercase', letterSpacing: '.12em' }}>
                Sans carte bancaire
              </span>
            </div>
            <div
              style={{
                display: 'flex',
                gap: 20,
                flexWrap: 'wrap',
                paddingTop: 8,
                borderTop: '1px solid var(--trait)',
                marginTop: 8,
              }}
            >
              {/* Foyer de démonstration canonique — cf. écart n°2. */}
              <Pastille fil="commun">Commun</Pastille>
              <Pastille fil="corail">Clara</Pastille>
              <Pastille fil="ambre">Antoine</Pastille>
              <Pastille fil="ciel">Noé</Pastille>
              <Pastille fil="sauge">Invités</Pastille>
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {/*
              ⚠ LA MAQUETTE DU BANDEAU EST UN COMPOSANT À PART, pas une carte du
              carrousel : brancher celui-ci ne l'avait donc pas branchée, et elle
              affichait encore « capture à fournir » — au-dessus de la ligne de
              flottaison, c'est-à-dire à l'endroit le plus vu de tout le site.

              ⚠ Le chemin se compose depuis le thème, comme dans le carrousel.
              L'écrire en dur figerait la capture claire sur un site passé en
              nuit.
            */}
            <Mockup
              largeur={300}
              rotation={3}
              alt="Écran d'accueil : la semaine du foyer, une couleur par personne"
              src={`/captures/${theme === 'nuit' ? 'encre' : 'chaux'}/accueil.webp?v=2`}
            />
          </div>
        </div>
      </section>

      {/* ========================= La démonstration =======================
          ⚠ LA PIÈCE MAÎTRESSE DE LA PAGE. C'est le seul endroit où le
          différenciant du produit — la liste de courses déduite des repas — est
          MONTRÉ plutôt qu'affirmé. Le compteur de convives est interactif : les
          quantités de la recette ET de la liste suivent, en direct. */}
      <section id="demonstration" style={section('alt')}>
        <div style={{ ...contenu, display: 'grid', gap: 'clamp(32px,5vw,64px)' }}>
          <div style={{ display: 'grid', gap: 16, maxWidth: '60ch' }}>
            <p style={surtitre}>La démonstration</p>
            <h2 style={h2}>On choisit les repas. La liste de courses se remplit toute seule.</h2>
          </div>

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              flexWrap: 'wrap',
              background: 'var(--surface)',
              border: '1px solid var(--trait)',
              borderRadius: 'var(--rayon)',
              padding: 'var(--carte-pad)',
              width: 'fit-content',
            }}
          >
            <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.14em' }}>
              Convives à table
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <BoutonCompteur
                signe="−"
                label="Retirer un convive"
                onClick={() => setConvives((c) => Math.max(1, c - 1))}
              />
              <span
                style={{
                  ...mono(26, 'var(--texte)'),
                  fontWeight: 300,
                  fontVariantNumeric: 'tabular-nums',
                  minWidth: '2ch',
                  textAlign: 'center',
                }}
              >
                {convives}
              </span>
              <BoutonCompteur
                signe="+"
                label="Ajouter un convive"
                onClick={() => setConvives((c) => Math.min(10, c + 1))}
              />
            </div>
            <span
              style={{
                fontFamily: 'var(--font-corps)',
                fontSize: 14,
                color: 'var(--texte-petit)',
                maxWidth: '34ch',
              }}
            >
              Les quantités des recettes et de la liste suivent.
            </span>
          </div>

          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,300px),1fr))',
              gap: 'var(--demo-gap)',
              alignItems: 'start',
            }}
          >
            {/* 01 — La recette */}
            <article style={carte}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.14em' }}>
                  01 — La recette
                </span>
                <span style={mono(11)}>Mardi</span>
              </div>
              <h3 style={h3}>Gratin de courgettes</h3>
              <ul
                style={{
                  margin: 0,
                  padding: '16px 0 0',
                  listStyle: 'none',
                  display: 'grid',
                  gap: 10,
                  borderTop: '1px solid var(--trait)',
                }}
              >
                {recette.map((l) => (
                  <li
                    key={l.nom}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      gap: 16,
                      fontFamily: 'var(--font-corps)',
                      fontSize: 16,
                      lineHeight: 1.4,
                    }}
                  >
                    <span>{l.nom}</span>
                    <span
                      style={{
                        ...mono(14),
                        fontVariantNumeric: 'tabular-nums',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {l.qte}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 14, lineHeight: 1.5, color: 'var(--texte-petit)' }}>
                On la place dans la semaine. C&apos;est tout ce qu&apos;on fait.
              </p>
            </article>

            {/* 02 — La semaine */}
            <article style={carte}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.14em' }}>
                  02 — La semaine
                </span>
                <span style={mono(11)}>12 → 18 mai</span>
              </div>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', borderTop: '1px solid var(--trait)' }}>
                {semaine.map((j) => (
                  <li
                    key={j.abrev}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '52px 1fr',
                      gap: 12,
                      alignItems: 'center',
                      padding: 'var(--demo-ligne) 0',
                      borderBottom: '1px solid var(--trait)',
                    }}
                  >
                    <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.1em' }}>
                      {j.abrev}
                    </span>
                    <span
                      style={{
                        fontFamily: 'var(--font-corps)',
                        fontSize: 15,
                        lineHeight: 1.35,
                        color: j.clef ? 'var(--texte)' : 'var(--texte-petit)',
                      }}
                    >
                      {j.repas}
                    </span>
                  </li>
                ))}
              </ul>
              <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 14, lineHeight: 1.5, color: 'var(--texte-petit)' }}>
                Deux recettes cette semaine partagent un ingrédient.
              </p>
            </article>

            {/* 03 — Les courses */}
            <article style={carte}>
              <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
                <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.14em' }}>
                  03 — Les courses
                </span>
                <span style={mono(11)}>{nbArticles} articles</span>
              </div>
              <div style={{ display: 'grid', gap: 18, borderTop: '1px solid var(--trait)', paddingTop: 16 }}>
                {rayons.map((r) => (
                  <div key={r.nom} style={{ display: 'grid', gap: 9 }}>
                    <span style={{ ...mono(10), textTransform: 'uppercase', letterSpacing: '.14em' }}>
                      {r.nom}
                    </span>
                    {r.items.map((it) => (
                      <div
                        key={it.nom}
                        style={{
                          display: 'grid',
                          // ⚠ `minmax(0,1fr)` ET NON `1fr`. Un élément de grille
                          // a `min-width: auto` : la piste refuse de descendre
                          // sous la largeur intrinsèque de son contenu. Avec le
                          // badge « 2 recettes », la colonne du libellé
                          // s'élargissait et poussait la quantité hors du cadre
                          // — « 1,5 kg » touchait le bord de l'écran.
                          // Même défaut que l'éditeur de recettes (13/08/2026) :
                          // il faut `minmax(0,1fr)` ET `minWidth: 0` sur
                          // l'enfant, l'un sans l'autre ne suffit pas.
                          gridTemplateColumns: '14px minmax(0, 1fr) auto',
                          gap: 10,
                          alignItems: 'baseline',
                        }}
                      >
                        <span
                          aria-hidden="true"
                          style={{
                            width: 11,
                            height: 11,
                            border: '1px solid var(--trait)',
                            borderRadius: 'var(--rayon)',
                            display: 'block',
                          }}
                        />
                        <span style={{ fontFamily: 'var(--font-corps)', fontSize: 16, lineHeight: 1.35, minWidth: 0 }}>
                          {it.nom}
                          {it.fusion && (
                            // Le badge qui rend la fusion visible : c'est LE geste
                            // que les autres applications ne font pas.
                            <span
                              style={{
                                display: 'inline-block',
                                marginLeft: 8,
                                ...mono(10, 'var(--sur-commun)'),
                                textTransform: 'uppercase',
                                letterSpacing: '.1em',
                                background: 'var(--commun)',
                                padding: '2px 6px',
                                borderRadius: 'var(--rayon)',
                                verticalAlign: 2,
                              }}
                            >
                              2 recettes
                            </span>
                          )}
                        </span>
                        <span style={{ ...mono(14), fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                          {it.qte}
                        </span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 14, lineHeight: 1.5, color: 'var(--texte-petit)' }}>
                Rangée par rayon, quantités additionnées. Personne ne l&apos;a écrite.
              </p>
            </article>
          </div>

          <p
            style={{
              margin: 0,
              maxWidth: '64ch',
              fontFamily: 'var(--font-corps)',
              fontSize: 'clamp(1rem,1.4vw,1.125rem)',
              lineHeight: 1.6,
              color: 'var(--texte-doux)',
            }}
          >
            Les autres applications de foyer s&apos;arrêtent au planning : la liste de courses reste
            à écrire à la main. Nestync la déduit des recettes, ajuste les quantités au nombre de
            convives et fusionne ce qui revient deux fois.
          </p>
        </div>
      </section>

      {/* ============================ Le problème ======================== */}
      <section id="probleme" style={section('base')}>
        <div style={{ ...contenu, display: 'grid', gap: 'clamp(32px,5vw,64px)' }}>
          <div style={{ display: 'grid', gap: 20, maxWidth: '52ch' }}>
            <p style={surtitre}>Le problème</p>
            <h2 style={h2}>Il y a toujours quelqu&apos;un qui sait tout.</h2>
            <p
              style={{
                margin: 0,
                fontFamily: 'var(--font-corps)',
                fontSize: 'clamp(1rem,1.4vw,1.125rem)',
                lineHeight: 1.6,
                color: 'var(--texte-doux)',
              }}
            >
              Qui a rendez-vous jeudi, ce qu&apos;il reste sur le compte commun, où est passée
              l&apos;attestation de la crèche. Cette personne existe dans presque tous les foyers, et
              ce n&apos;est pas un talent d&apos;organisation — c&apos;est une charge.
            </p>
          </div>
          {/* ⚠ NOTE INTERNE — commentaire, JAMAIS une prop. Trois données doivent
              chiffrer ici la charge mentale, l'empilement d'applications et les
              échéances oubliées. Rien ne se publie sans SOURCE et ANNÉE : un
              chiffre sur la vie domestique se vérifie en une recherche, et c'est
              le premier qu'un journaliste ira contrôler.
              À fournir pour chacun : la valeur, l'organisme source, l'année. */}
          <EnTravaux
            quoi="Les chiffres du problème"
            publique="Des données sourcées viendront ici étayer ce constat."
          />
        </div>
      </section>

      {/* ====================== Trois raisons d'essayer =================== */}
      <section id="piliers" style={section('alt')}>
        <div style={{ ...contenu, display: 'grid', gap: 'clamp(32px,5vw,64px)' }}>
          <div style={{ display: 'grid', gap: 16, maxWidth: '52ch' }}>
            <p style={surtitre}>Trois raisons d&apos;essayer</p>
            <h2 style={h2}>La charge se redistribue.</h2>
          </div>
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,290px),1fr))',
              gap: 'clamp(20px,2.5vw,32px)',
            }}
          >
            {PILIERS.map((p) => (
              <article key={p.titre} style={{ ...carte, padding: 'clamp(24px,3vw,32px)', gap: 16 }}>
                <Pastille fil={p.fil}>{p.etiquette}</Pastille>
                <h3 style={h3}>{p.titre}</h3>
                <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 16, lineHeight: 1.6, color: 'var(--texte-doux)' }}>
                  {p.texte}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===================== Le produit, module par module ============== */}
      <section id="parcours" style={section('base')}>
        <div style={{ ...contenu, display: 'grid', gap: 'clamp(32px,5vw,64px)' }}>
          <div style={{ display: 'grid', gap: 16, maxWidth: '52ch' }}>
            <p style={surtitre}>Le produit, module par module</p>
            <h2 style={h2}>Chaque chose appartient à quelqu&apos;un.</h2>
          </div>
          <EventailModules modules={MODULES} theme={theme} />
        </div>
      </section>

      {/* ======================= L'abonnement du foyer ==================== */}
      <section id="abonnement-foyer" style={section('alt')}>
        <div
          style={{
            ...contenu,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))',
            gap: 'clamp(32px,5vw,80px)',
            alignItems: 'center',
          }}
        >
          <div style={{ display: 'grid', gap: 20, maxWidth: '52ch' }}>
            <p style={surtitre}>L&apos;abonnement</p>
            <h2 style={h2}>Un seul abonnement pour tout le foyer.</h2>
            <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 'clamp(1rem,1.4vw,1.125rem)', lineHeight: 1.6, color: 'var(--texte-doux)' }}>
              Une personne paie, invite les autres membres du foyer, et ils accèdent à tout
              gratuitement. Pas de tarif par utilisateur, pas de compte à recréer à chaque arrivée.
            </p>
          </div>
          <div style={{ ...carte, padding: 'clamp(24px,3vw,36px)' }}>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'auto 1fr',
                gap: 14,
                alignItems: 'baseline',
                paddingBottom: 18,
                borderBottom: '1px solid var(--trait)',
              }}
            >
              <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: 'var(--commun)', display: 'block' }} />
              <div style={{ display: 'grid', gap: 3 }}>
                <span style={{ fontFamily: 'var(--font-corps)', fontSize: 16 }}>
                  Clara{' '}
                  <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.1em' }}>
                    — paie l&apos;abonnement
                  </span>
                </span>
                <span style={mono(12)}>4,16 €/mois</span>
              </div>
            </div>
            <div style={{ display: 'grid', gap: 14 }}>
              {[
                ['ambre', 'Antoine'],
                ['ciel', 'Noé'],
                ['corail', 'Invités'],
              ].map(([fil, nom]) => (
                <div key={nom} style={{ display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: 14, alignItems: 'baseline' }}>
                  <span aria-hidden="true" style={{ width: 10, height: 10, borderRadius: 999, background: `var(--${fil})`, display: 'block' }} />
                  <span style={{ fontFamily: 'var(--font-corps)', fontSize: 16 }}>{nom}</span>
                  <span style={mono(12)}>0,00 €</span>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'baseline', borderTop: '1px solid var(--trait)', paddingTop: 18 }}>
              <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.14em' }}>
                Total du foyer
              </span>
              <span style={{ ...mono(22, 'var(--texte)'), fontWeight: 300, fontVariantNumeric: 'tabular-nums' }}>
                4,16 €/mois
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ============================== Tarifs =========================== */}
      {/* ⚠ Ces montants correspondent à `lib/offres.ts` : 4,99 €/mois et
          49,90 €/an, soit exactement dix mois payés — d'où « deux mois offerts ».
          Prix et argument doivent tomber juste, sinon l'un des deux ment. */}
      <section id="tarifs" style={section('base')}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'grid', gap: 'clamp(32px,4vw,48px)' }}>
          <div style={{ display: 'grid', gap: 16, maxWidth: '52ch' }}>
            <p style={surtitre}>Tarifs</p>
            <h2 style={h2}>30 jours pour voir, puis {formatPrix(ANNUEL.parMois)} par mois.</h2>
          </div>
          {/*
            UNE SEULE CARTE, ET UNE BASCULE.

            ⚠ Les deux formules etaient presentees cote a cote, a egalite. Le
            visiteur devait comparer lui-meme 49,90 €/an et 4,99 €/mois pour
            decouvrir l'economie — travail qu'une page de conversion doit faire
            a sa place. L'annuel s'affiche donc par defaut, l'economie est
            portee par la bascule, et le mensuel reste a un clic.

            ⚠ LE MEME BOUTON DANS LES DEUX CAS. L'ancienne carte mensuelle
            disait « Choisir le mensuel », ce qui laissait croire qu'elle se
            payait tout de suite alors que l'essai de 30 jours s'applique aux
            deux. C'etait un desavantage inflige au mensuel par simple
            formulation.
          */}
          <div className="nsy-bascule" role="group" aria-label="Périodicité de l'abonnement">
            <button
              type="button"
              className={formule === 'annuel' ? 'nsy-bascule-choix actif' : 'nsy-bascule-choix'}
              aria-pressed={formule === 'annuel'}
              onClick={() => setFormule('annuel')}
            >
              Annuel
              <span className="nsy-bascule-eco">2 mois offerts</span>
            </button>
            <button
              type="button"
              className={formule === 'mensuel' ? 'nsy-bascule-choix actif' : 'nsy-bascule-choix'}
              aria-pressed={formule === 'mensuel'}
              onClick={() => setFormule('mensuel')}
            >
              Mensuel
            </button>
          </div>

          <article
            style={{
              ...carte,
              border: '2px solid var(--commun)',
              padding: 'clamp(24px,3vw,32px)',
              maxWidth: 420,
              width: '100%',
              justifySelf: 'center',
            }}
          >
            <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.14em' }}>
              {formule === 'annuel' ? 'Annuel' : 'Mensuel'}
            </span>
            <div style={{ display: 'grid', gap: 6 }}>
              <span
                style={{
                  ...mono('clamp(2rem,4vw,2.75rem)', 'var(--texte)'),
                  fontWeight: 300,
                  fontVariantNumeric: 'tabular-nums',
                  lineHeight: 1,
                }}
              >
                {formatPrix(formule === 'annuel' ? ANNUEL.prix : MENSUEL.prix)}
                <span style={{ fontSize: '.4em', color: 'var(--texte-doux)', marginLeft: '.3em' }}>
                  {formule === 'annuel' ? '/an' : '/mois'}
                </span>
              </span>
              <span style={mono(13)}>
                {formule === 'annuel'
                  ? `soit ${formatPrix(ANNUEL.parMois)}/mois`
                  : 'sans engagement'}
              </span>
            </div>
            <Bouton variante="principal" href="/connexion" style={{ justifyContent: 'center' }}>
              Essayer gratuitement 30 jours
            </Bouton>
            <span style={{ ...mono(11), textTransform: 'uppercase', letterSpacing: '.1em' }}>
              {formule === 'annuel' ? 'Sans carte bancaire' : 'Résiliation en trois clics'}
            </span>
          </article>

          <ul
            style={{
              margin: 0,
              padding: 'clamp(20px,2.5vw,28px) 0 0',
              listStyle: 'none',
              borderTop: '1px solid var(--trait)',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))',
              gap: 12,
              fontFamily: 'var(--font-corps)',
              fontSize: 15,
              lineHeight: 1.5,
              color: 'var(--texte-petit)',
            }}
          >
            <li>— Tout le foyer inclus, sans supplément</li>
            {/* ⚠ LE NOMBRE SUIT LE CARROUSEL. Il annoncait sept modules alors que
                les conditions generales en listaient huit, cadeaux compris : la
                vitrine promettait moins que le contrat. Compter les cartes du
                carrousel SANS « Accueil », qui est un ecran, pas un module. */}
            <li>— Les huit modules, sans option payante</li>
            <li>— Résiliation en trois clics, à tout moment</li>
          </ul>
        </div>
      </section>

      {/* ============================= Confiance ========================= */}
      <section id="confiance" style={section('alt')}>
        <div
          style={{
            ...contenu,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,360px),1fr))',
            gap: 'clamp(32px,5vw,80px)',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 20, maxWidth: '46ch' }}>
            <p style={surtitre}>Confiance</p>
            <h2 style={h2}>Aucun accès à vos comptes bancaires.</h2>
            <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 'clamp(1rem,1.4vw,1.125rem)', lineHeight: 1.6, color: 'var(--texte-doux)' }}>
              Nestync ne se connecte à aucune banque et ne demande aucun identifiant. Vous saisissez
              ce que vous voulez suivre, rien d&apos;autre ne circule.
            </p>
          </div>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'grid', borderTop: '1px solid var(--trait)' }}>
            {ENGAGEMENTS.map(([titre, detail], i) => (
              <li
                key={titre}
                style={{
                  padding: '18px 0',
                  borderBottom: i === ENGAGEMENTS.length - 1 ? 'none' : '1px solid var(--trait)',
                  display: 'grid',
                  gap: 5,
                }}
              >
                <span style={{ fontFamily: 'var(--font-corps)', fontSize: 17 }}>{titre}</span>
                <span style={{ fontFamily: 'var(--font-corps)', fontSize: 15, lineHeight: 1.5, color: 'var(--texte-petit)' }}>
                  {detail}
                </span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* =========================== Témoignages ========================= */}
      {/* ⚠ Zone volontairement vide. Aucun témoignage, aucune note et aucun logo
          de presse n'a été inventé — Nestync sort d'essai, ce serait faux. Si la
          section reste vide à la mise en ligne, la RETIRER plutôt que la meubler. */}
      {/* ============================ Témoignages =========================
          ⚠ SECTION ENTIÈREMENT VIDE, et elle le restera un moment : Nestync
          sort de période d'essai. Un avis, une note ou un logo de presse
          inventé ici serait faux — et vérifiable. Si elle est encore vide à la
          mise en ligne, la RETIRER plutôt que la meubler. */}
      <section id="temoignages" style={section('base')}>
        <div style={{ ...contenu, display: 'grid', gap: 'clamp(24px,3vw,40px)' }}>
          <div style={{ display: 'grid', gap: 16, maxWidth: '52ch' }}>
            <p style={surtitre}>Ils l&apos;utilisent</p>
            <h2 style={h2}>Ce que les foyers en disent.</h2>
          </div>
          {/* ⚠ NOTE INTERNE — commentaire, JAMAIS une prop. Nestync sort d'essai :
              aucun foyer ne l'utilise depuis assez longtemps pour en parler
              honnêtement. Aucun avis, aucune note, aucun logo de presse ne sera
              inventé pour occuper la place.
              À recueillir : deux à trois phrases sur un usage précis, avec
              prénom, ville et composition du foyer — auprès de vrais
              utilisateurs. Si la section est encore vide au lancement, la
              RETIRER plutôt que la meubler. */}
          <EnTravaux
            quoi="Les premiers retours"
            publique="Les premiers foyers utilisateurs témoigneront ici."
          />
        </div>
      </section>

      {/* =============================== FAQ ============================= */}
      <section id="faq" style={section('alt')}>
        <div style={{ maxWidth: 820, margin: '0 auto', display: 'grid', gap: 'clamp(28px,3.5vw,44px)' }}>
          <h2 style={h2}>Questions fréquentes</h2>
          <div style={{ display: 'grid', borderTop: '1px solid var(--trait)' }}>
            {FAQ.map(([q, r]) => (
              <details key={q} style={{ borderBottom: '1px solid var(--trait)', padding: '18px 0' }}>
                <summary
                  style={{
                    cursor: 'pointer',
                    fontFamily: 'var(--font-corps)',
                    fontSize: 'clamp(1rem,1.4vw,1.125rem)',
                    lineHeight: 1.4,
                    listStyle: 'none',
                  }}
                >
                  {q}
                </summary>
                <p style={{ margin: '12px 0 0', maxWidth: '64ch', fontFamily: 'var(--font-corps)', fontSize: 16, lineHeight: 1.65, color: 'var(--texte-doux)' }}>
                  {r}
                </p>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ============================== Essai ============================ */}
      <section id="essai" style={section('base')}>
        <div style={{ maxWidth: '60ch', margin: '0 auto', display: 'grid', gap: 32, justifyItems: 'start' }}>
          <h2
            style={{
              ...h2,
              fontSize: 'clamp(2.25rem,5vw,4rem)',
              lineHeight: 1,
              letterSpacing: '-.025em',
            }}
          >
            Trente jours pour arrêter de tout porter seul.e.
          </h2>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center', flexWrap: 'wrap' }}>
            <Bouton variante="principal" taille="l" href="/connexion">
              Essayer gratuitement 30 jours
            </Bouton>
            <span style={{ ...mono(12), textTransform: 'uppercase', letterSpacing: '.12em' }}>
              Sans carte bancaire
            </span>
          </div>
          <p style={{ margin: 0, fontFamily: 'var(--font-corps)', fontSize: 16, lineHeight: 1.6, color: 'var(--texte-doux)' }}>
            Quelqu&apos;un de votre foyer utilise déjà Nestync ?{' '}
            <a href="/rejoindre-foyer" style={{ color: 'var(--commun-texte)' }}>
              Rejoindre son foyer
            </a>
          </p>
        </div>
      </section>

      {/* ============================== Pied ============================= */}
      <footer
        style={{
          background: 'var(--fond-alt)',
          color: 'var(--texte)',
          borderTop: '1px solid var(--trait)',
          padding: 'clamp(40px,5vw,64px) clamp(20px,5vw,96px)',
          transition: 'background 300ms var(--courbe)',
        }}
      >
        <div
          style={{
            ...contenu,
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit,minmax(min(100%,220px),1fr))',
            gap: 'clamp(24px,3vw,40px)',
            alignItems: 'start',
          }}
        >
          <div style={{ display: 'grid', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontVariationSettings: 'var(--wonk)', fontSize: 20 }}>
              Nestync
            </span>
            <span style={{ ...mono(11), lineHeight: 1.7 }}>
              Éditeur français
              <br />
              Données hébergées en Europe
            </span>
          </div>
          {/* Le gabarit livrait des ancres inertes ; ces pages existent. */}
          <nav style={{ display: 'grid', gap: 10, fontFamily: 'var(--font-corps)', fontSize: 15 }}>
            <a href="#demonstration" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Découvrir Nestync</a>
            <a href="#tarifs" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Tarifs</a>
            <a href="#faq" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Questions fréquentes</a>
          </nav>
          <nav style={{ display: 'grid', gap: 10, fontFamily: 'var(--font-corps)', fontSize: 15 }}>
            <a href="/mentions-legales" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Mentions légales</a>
            <a href="/confidentialite" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Politique de confidentialité</a>
            <a href="/conditions" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Conditions générales</a>
            <a href="/aide" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Contact</a>
            {/* ⚠ Dans la colonne des liens de confiance, pas dans celle du
                produit : une page de mises à jour rassure un visiteur qui se
                demande si le produit vit encore, au même titre que les mentions
                légales lui disent qui est derrière. */}
            <a href="/mises-a-jour" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Mises à jour</a>
            <a href="/rejoindre-foyer" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Rejoindre un foyer</a>
            {/* ⚠ La barre du haut est masquee sous 767 px : sans ce lien,
                un membre n'a AUCUN moyen de se connecter depuis un telephone. */}
            <a href="/connexion" style={{ color: 'var(--texte-petit)', textDecoration: 'none' }}>Se connecter</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ Fragments ------------------------------- */

function BoutonCompteur({ signe, label, onClick }: { signe: string; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      style={{
        width: 34,
        height: 34,
        border: '1px solid var(--trait)',
        background: 'transparent',
        color: 'var(--texte)',
        borderRadius: 'var(--rayon)',
        fontFamily: 'var(--font-donnees)',
        fontSize: 17,
        lineHeight: 1,
        cursor: 'pointer',
      }}
    >
      {signe}
    </button>
  );
}

/** ⚠ Composant CONTRÔLÉ : il ne touche pas à `<html>`. Cf. écart n°1. */
function BasculeTheme({ theme, onBasculer }: { theme: 'jour' | 'nuit'; onBasculer: () => void }) {
  return (
    <>
      <button
        type="button"
        onClick={onBasculer}
        aria-label={theme === 'jour' ? 'Passer en thème encre (sombre)' : 'Passer en thème chaux (clair)'}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          background: 'transparent',
          border: '1px solid var(--trait)',
          borderRadius: 'var(--rayon)',
          color: 'var(--texte-petit)',
          cursor: 'pointer',
          fontFamily: 'var(--font-donnees)',
          fontSize: 12,
          textTransform: 'uppercase',
          letterSpacing: '.14em',
          padding: '8px 12px',
        }}
      >
        <span
          aria-hidden="true"
          style={{ width: 8, height: 8, borderRadius: 999, background: theme === 'jour' ? 'var(--encre)' : 'var(--chaux)' }}
        />
        {theme === 'jour' ? 'Encre' : 'Chaux'}
      </button>
      <span aria-live="polite" style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>
        {theme === 'jour' ? 'Thème chaux actif' : 'Thème encre actif'}
      </span>
    </>
  );
}

/* ------------------------------- Contenu -------------------------------- */

const PILIERS: { fil: Fil; etiquette: string; titre: string; texte: string }[] = [
  {
    fil: 'sauge',
    etiquette: 'Les finances du couple',
    titre: 'Qui a payé quoi, sans compter de tête',
    texte:
      'Le compte commun, les dépenses de chacun, ce qui reste avant la fin du mois. Nestync ne se connecte à aucune banque : vous saisissez, rien ne circule.',
  },
  {
    fil: 'ambre',
    etiquette: 'Le tout-en-un familial',
    titre: 'Huit usages, une seule application',
    texte:
      'Comptes, agenda, repas, courses, tâches, papiers, réceptions, cadeaux. Plus de huit applications qui ne se parlent pas, ni de groupe de messages qui sert d’aide-mémoire.',
  },
  {
    fil: 'commun',
    etiquette: 'La vie privée',
    titre: 'Rien ne sort du foyer',
    texte:
      'Aucun traceur publicitaire, aucune revente de données, hébergement en Europe. Export complet et suppression définitive dans les réglages.',
  },
];

/** Les huit modules réels, dans l'ordre du gabarit. */
/*
 * ⚠ `fichier` EST UN SLUG, PAS UN CHEMIN. Le chemin complet depend du theme
 * du site (`/captures/chaux/...` ou `/captures/encre/...`), et le theme change
 * a l'execution : ecrire l'un des deux ici figerait la capture claire sur un
 * site passe en nuit, et inversement.
 *
 * ⚠ UN MODULE SANS `fichier` GARDE SON CARTOUCHE « CAPTURE A FOURNIR ».
 * C'est volontaire : pointer vers une image absente afficherait une maquette
 * vide, qu'on prendrait pour un bogue plutot que pour un contenu manquant.
 * Agenda et Documents sont dans ce cas — l'un tire ses donnees de Google, que
 * le foyer de demonstration ne peut pas garnir, l'autre stocke ses fichiers sur
 * le disque du serveur de developpement.
 */
const MODULES: {
  fil: Fil;
  titre: string;
  texte: string;
  alt: string;
  rotation: number;
  fichier?: string;
}[] = [
  { fil: 'commun', titre: 'Accueil', texte: "Ce qui arrive aujourd'hui, pour tout le monde.", alt: "Accueil : la journée du foyer en un écran, une couleur par personne", rotation: 3 , fichier: 'accueil'},
  { fil: 'sauge', titre: 'Finances', texte: 'Le reste à vivre, sans identifiant bancaire.', alt: 'Finances : compte commun, dépenses par personne, reste à vivre', rotation: -2 , fichier: 'finances'},
  { fil: 'corail', titre: 'Agenda', texte: 'Les rendez-vous de chacun sur une même semaine.', alt: 'Agenda : la semaine du foyer, une ligne par personne', rotation: 2 , fichier: 'agenda'},
  { fil: 'ambre', titre: 'Repas', texte: 'On pose les recettes, les quantités suivent.', alt: 'Repas : le planning de la semaine et le nombre de convives par repas', rotation: -3 , fichier: 'repas'},
  { fil: 'ambre', titre: 'Courses', texte: 'Rangée par rayon, cochée à deux en magasin.', alt: 'Courses : la liste déduite des repas, rangée par rayon', rotation: 3, fichier: 'courses' },
  { fil: 'ciel', titre: 'To-do', texte: "Qui s'en occupe, visible sans avoir à le demander.", alt: 'To-do : les tâches du foyer, assignées par personne', rotation: -2 , fichier: 'todo'},
  { fil: 'ciel', titre: 'Documents', texte: 'Assurances, attestations, échéances à ne pas manquer.', alt: 'Documents : les papiers importants du foyer et leurs échéances', rotation: 2 , fichier: 'documents'},
  { fil: 'sauge', titre: 'Événements', texte: "Recevoir sans y penser trois soirs d'affilée.", alt: "Événements : la préparation d'une réception, invités et à-faire", rotation: -3 , fichier: 'evenements'},
  /*
   * ⚠ Le texte porte ce que le module a de PARTICULIER : un cadeau peut etre
   * masque a son destinataire, meme s'il partage le foyer. C'est la seule
   * fonction du produit qui protege une surprise plutot qu'une donnee, et
   * aucune autre application de foyer ne la propose. Un texte generique
   * (« suivez vos idees cadeaux ») perdrait tout l'interet.
   */
  { fil: 'corail', titre: 'Cadeaux', texte: 'Les idées de chacun, invisibles de celui qu’elles concernent.', alt: 'Cadeaux : les idées par occasion, avec un budget et un destinataire', rotation: 2, fichier: 'cadeaux' },
];

const ENGAGEMENTS: [string, string][] = [
  ['Aucune connexion bancaire', "Pas d'agrégation, pas d'identifiant à confier."],
  ['Données hébergées en Europe', 'Soumises au RGPD, sans transfert hors UE.'],
  ['Export complet, suppression définitive', 'Les deux sont dans les réglages, sans passer par le support.'],
  ['Aucun traceur publicitaire', 'Ni revente, ni profilage, ni régie tierce.'],
  ['Éditeur français', 'Une petite équipe, joignable, sans levée de fonds.'],
];

const FAQ: [string, string][] = [
  ["Faut-il une carte bancaire pour l'essai ?", 'Non. Les 30 jours démarrent sans moyen de paiement, et rien ne se déclenche à la fin de l’essai si vous ne faites rien.'],
  ['Les autres membres du foyer doivent-ils payer ?', 'Non. Un seul abonnement couvre tout le foyer : la personne qui paie invite les autres, qui accèdent à tous les modules gratuitement.'],
  ['Nestync se connecte-t-il à ma banque ?', 'Jamais. Aucun identifiant bancaire n’est demandé et aucune agrégation de comptes n’est proposée. Vous saisissez ce que vous voulez suivre.'],
  ['Comment se passe la résiliation ?', 'En trois clics dans les réglages, sans e-mail à envoyer ni justification à donner. L’accès continue jusqu’à la fin de la période payée.'],
  ['Où sont hébergées mes données ?', 'En Europe, sous régime RGPD, sans transfert hors UE. L’export complet et la suppression définitive sont accessibles dans les réglages.'],
  ['La liste de courses se remplit-elle vraiment toute seule ?', 'Oui. On place des recettes dans le planning, on indique le nombre de convives, et les ingrédients arrivent dans la liste rangés par rayon, quantités ajustées et doublons additionnés.'],
  ["Peut-on l'utiliser à deux sans enfants ?", 'Oui. Le foyer peut compter deux personnes comme cinq. Les modules qui ne vous servent pas se rangent hors de l’accueil.'],
  ['Sur quels appareils fonctionne l’application ?', 'Emplacement à compléter : préciser iOS, Android et l’accès web selon ce qui est réellement disponible aujourd’hui.'],
];

