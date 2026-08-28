'use client';

import { useMemo, useState } from 'react';
// ⚠ LES VRAIES FONCTIONS DU PRODUIT, pas des copies. Voir l'en-tête ci-dessous.
import {
  agregerCourses,
  formatQuantite,
  parseQuantite,
  JOURS,
  CATEGORIES_PLAT,
  UNITES,
  type Ingredient,
} from '@/lib/repas/schema';
import { RAYONS } from '@/lib/todo/schema';
import {
  aujourdhuiISO,
  debutMois,
  debutSemaine,
  decalerJours,
  grilleMois,
  joursSemaine,
  VUES_AGENDA,
  type VueAgendaMode,
} from '@/lib/agenda/schema';
import { formatEuro, parseEuro, CATEGORIES_DEPENSE } from '@/lib/budget/schema';
import {
  ARTICLES_DEMO,
  COMPTES_DEMO,
  ENVELOPPES_DEMO,
  OPERATIONS_DEMO,
  PLANNING_DEMO,
  PONCTUELS_DEMO,
  RECETTES_DEMO,
  RECURRENTS_DEMO,
  type RecetteDemo,
} from '@/lib/demonstration';

/**
 * DÉMONSTRATION PUBLIQUE — trois fonctions de Nestync, essayables sans compte.
 *
 * ⚠ **TOUT CE QUI CALCULE EST IMPORTÉ DU PRODUIT**, jamais réécrit ici :
 * `agregerCourses` et `formatQuantite` (module Repas), `RAYONS` (To-Do),
 * `grilleMois` / `joursSemaine` / `debutSemaine` (Agenda), `parseEuro` et
 * `formatEuro` (Budget). Une démonstration qui réimplémente les règles finit
 * par montrer autre chose que ce qu'on vend, et personne ne s'en aperçoit avant
 * qu'un client le remarque. Ici, le jour où la fusion des quantités change, la
 * page change avec elle.
 *
 * ⚠ **AUCUN APPEL RÉSEAU, AUCUNE ÉCRITURE.** Tout vit en mémoire, le temps de
 * la visite. La page est publique : elle ne doit rien créer, rien enregistrer,
 * et ne présenter aucune surface d'écriture à un visiteur anonyme.
 *
 * ⚠ Les données sont celles du foyer FICTIF (Clara, Antoine, Noé), comme le
 * reste de la vitrine — cf. `lib/demonstration.ts`.
 */

type Services = { Entrée?: string; Plat?: string; Dessert?: string };
type Planning = Record<string, Services>;

const PERSONNES_BASE = 4;

/** Les trois services, dans l'ordre où on les sert. */
const SERVICES_AFFICHES = CATEGORIES_PLAT;

export default function Demonstration() {
  return (
    <div className="nsy-demo">
      <BlocRepas />
      <BlocAgenda />
      <BlocBudget />
    </div>
  );
}

/* ══════════════════════ 1. Repas → Courses ══════════════════════ */

function BlocRepas() {
  const [recettes, setRecettes] = useState<RecetteDemo[]>(RECETTES_DEMO);
  const [planning, setPlanning] = useState<Planning>(PLANNING_DEMO);
  const [convives, setConvives] = useState(PERSONNES_BASE);
  const [manuels, setManuels] = useState<Ingredient[]>(ARTICLES_DEMO);
  const [coches, setCoches] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState('');

  /*
   * ⚠ C'EST `agregerCourses` DU MODULE REPAS QUI FAIT LE TRAVAIL. On lui donne
   * les plats planifiés (ingrédients + base + convives) et les articles saisis
   * à la main comme un « plat » de base 1 : la mise à l'échelle les laisse
   * alors intacts, et ils se fondent dans la même agrégation que les recettes.
   * C'est ce qui rend la fusion démontrable sur une seule liste.
   */
  const articles = useMemo(() => {
    const plats = Object.values(planning).flatMap((jour) =>
      SERVICES_AFFICHES.map((s) => jour[s])
        .filter((nom): nom is string => Boolean(nom))
        .map((nom) => {
          const r = recettes.find((x) => x.nom === nom);
          return r ? { ingredients: r.ingredients, base: r.personnes, personnes: convives } : null;
        })
        .filter((x): x is { ingredients: Ingredient[]; base: number; personnes: number } => x !== null),
    );
    // Base 1 et personnes 1 : aucune mise à l'échelle sur un ajout manuel.
    return agregerCourses([...plats, { ingredients: manuels, base: 1, personnes: 1 }]);
  }, [planning, recettes, convives, manuels]);

  const cle = (a: { article: string; unite: string }) =>
    `${a.article.toLowerCase()}|${a.unite.toLowerCase()}`;
  const restants = articles.filter((a) => !coches.has(cle(a))).length;

  const definir = (jour: string, service: string, nom: string) =>
    setPlanning((p) => {
      const suivant = { ...p, [jour]: { ...(p[jour] ?? {}) } };
      if (nom) (suivant[jour] as Record<string, string>)[service] = nom;
      else delete (suivant[jour] as Record<string, string>)[service];
      return suivant;
    });

  return (
    <section className="nsy-demo-bloc">
      <p className="nsy-demo-eyebrow">01 — Repas et courses</p>
      <h2>La liste de courses se déduit des repas.</h2>
      <p className="nsy-demo-intro">
        Composez la semaine, entrée, plat et dessert. Dites combien vous êtes à table. Les
        ingrédients arrivent rangés par rayon, quantités ajustées, doublons additionnés — et vous
        pouvez y ajouter ce qui ne vient d’aucune recette.
      </p>

      <div className="nsy-demo-cadre">
        <div className="nsy-demo-duo">
          <div>
            <p className="nsy-demo-titre">La semaine</p>
            <div className="nsy-plan">
              <div className="nsy-plan-tete">
                <span>Jour</span>
                {SERVICES_AFFICHES.map((s) => (
                  <span key={s}>{s}</span>
                ))}
              </div>
              {JOURS.map((jour) => (
                <div className="nsy-plan-jour" key={jour}>
                  <span className="nsy-plan-j">{jour.slice(0, 3)}</span>
                  {SERVICES_AFFICHES.map((service) => (
                    <select
                      key={service}
                      value={planning[jour]?.[service] ?? ''}
                      onChange={(e) => definir(jour, service, e.target.value)}
                      aria-label={`${service} du ${jour}`}
                    >
                      <option value="">—</option>
                      {/* Chaque créneau ne propose QUE les recettes de sa catégorie. */}
                      {recettes
                        .filter((r) => r.categorie === service)
                        .map((r) => (
                          <option key={r.nom}>{r.nom}</option>
                        ))}
                    </select>
                  ))}
                </div>
              ))}
            </div>

            <div className="nsy-demo-convives">
              <span className="nsy-demo-titre">À table</span>
              <span className="nsy-compteur">
                <button type="button" onClick={() => setConvives((n) => Math.max(1, n - 1))} aria-label="Un convive de moins">−</button>
                <span className="nsy-compteur-val">{convives}</span>
                <button type="button" onClick={() => setConvives((n) => Math.min(12, n + 1))} aria-label="Un convive de plus">+</button>
              </span>
            </div>
          </div>

          <div>
            <div className="nsy-demo-barre">
              <p className="nsy-demo-titre" style={{ margin: 0 }}>
                La liste de courses{' '}
                <span className="nsy-qte">
                  {articles.length > 0 && `· ${restants} à prendre sur ${articles.length}`}
                </span>
              </p>
              <button
                type="button"
                className="nsy-demo-mini"
                onClick={() => {
                  setManuels((m) => m.filter((a) => !coches.has(cle(a))));
                  setMessage('');
                }}
              >
                Retirer les articles cochés
              </button>
            </div>

            <AjoutArticle
              articles={articles}
              onAjout={(a, msg) => {
                setManuels((m) => [...m, a]);
                setMessage(msg);
              }}
            />
            {message && <p className="nsy-demo-note nsy-demo-msg" dangerouslySetInnerHTML={{ __html: message }} />}

            {articles.length === 0 ? (
              <p className="nsy-demo-note" style={{ border: 0, padding: 0 }}>
                Aucun repas planifié, aucun article.
              </p>
            ) : (
              <div className="nsy-rayons">
                {RAYONS.map((rayon) => {
                  const l = articles.filter((a) => a.rayon === rayon);
                  if (l.length === 0) return null;
                  return (
                    <div key={rayon}>
                      <p className="nsy-rayon">{rayon}</p>
                      <ul className="nsy-liste">
                        {l.map((a) => {
                          const k = cle(a);
                          const fait = coches.has(k);
                          return (
                            <li key={k}>
                              <label className="nsy-coche">
                                <input
                                  type="checkbox"
                                  checked={fait}
                                  onChange={(e) =>
                                    setCoches((s) => {
                                      const n = new Set(s);
                                      if (e.target.checked) n.add(k);
                                      else n.delete(k);
                                      return n;
                                    })
                                  }
                                />
                                <span className={fait ? 'nsy-fait' : ''}>{a.article}</span>
                              </label>
                              <span className={`nsy-qte ${fait ? 'nsy-fait' : ''}`}>
                                {/* `formatQuantite` rend les fractions : 0,5 → « 1/2 ». */}
                                {a.quantite == null ? '—' : `${formatQuantite(a.quantite)} ${a.unite}`.trim()}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <EditeurRecette
          onCreer={(r) => {
            setRecettes((l) => [...l, r]);
            // On la place aussitôt dans le premier créneau libre de sa catégorie.
            const jour = JOURS.find((j) => !planning[j]?.[r.categorie]);
            if (jour) definir(jour, r.categorie, r.nom);
            return jour ?? null;
          }}
        />

        <p className="nsy-demo-note">
          Les quantités se recalculent avec le nombre de convives, et les ingrédients identiques
          fusionnent en une seule ligne. Chaque créneau ne propose que les recettes de sa
          catégorie, et une recette créée ici entre aussitôt dans la liste.
        </p>
      </div>
    </section>
  );
}

/** Ajout d'un article qui ne vient d'aucune recette — et démonstration de la fusion. */
function AjoutArticle({
  articles,
  onAjout,
}: {
  articles: { article: string; quantite: number | null; unite: string; rayon: string }[];
  onAjout: (a: Ingredient, message: string) => void;
}) {
  const [nom, setNom] = useState('Courgettes');
  const [qte, setQte] = useState('500');
  const [unite, setUnite] = useState<string>('g');
  const [rayon, setRayon] = useState<string>('Fruits & légumes');

  const ajouter = () => {
    const article = nom.trim();
    if (!article) return;
    // `parseQuantite` comprend « 1/2 », « 1 1/2 » et les décimales à virgule.
    const n = parseQuantite(qte);
    const existant = articles.find((a) => a.article.toLowerCase() === article.toLowerCase());

    let message = '';
    if (existant && existant.unite.toLowerCase() === unite.toLowerCase() && existant.quantite != null && n != null) {
      const total = existant.quantite + n;
      message = `<strong>${formatQuantite(existant.quantite)} ${existant.unite}</strong> + <strong>${formatQuantite(n)} ${unite}</strong> = <strong>${formatQuantite(total)} ${unite}</strong>. Une seule ligne, pas deux.`;
    } else if (existant) {
      /*
       * ⚠ LE CAS HONNÊTE, ET IL COMPTE AUTANT QUE L'AUTRE. Deux unités
       * différentes ne s'additionnent pas : le module garde deux lignes plutôt
       * que d'inventer un total. C'est ce qui distingue un produit soigné d'un
       * produit qui bricole, et il faut le MONTRER.
       */
      message = `<strong>${article}</strong> existe déjà en « ${existant.unite || 'sans unité'} » : cette quantité ne s’y additionne pas. Nestync garde les deux lignes plutôt que d’inventer un total.`;
    }
    onAjout({ article, quantite: n, unite, rayon: existant?.rayon ?? rayon }, message);
  };

  return (
    <div className="nsy-ajout">
      <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Article" aria-label="Article à ajouter" />
      <input value={qte} onChange={(e) => setQte(e.target.value)} placeholder="Qté" aria-label="Quantité" />
      <select value={unite} onChange={(e) => setUnite(e.target.value)} aria-label="Unité">
        <option value="">—</option>
        {UNITES.map((u) => (
          <option key={u}>{u}</option>
        ))}
      </select>
      <select value={rayon} onChange={(e) => setRayon(e.target.value)} aria-label="Rayon">
        {RAYONS.map((r) => (
          <option key={r}>{r}</option>
        ))}
      </select>
      <button type="button" className="nsy-demo-btn" onClick={ajouter}>
        Ajouter
      </button>
    </div>
  );
}

/** Éditeur de recette : une ligne par ingrédient, avec son rayon. */
function EditeurRecette({ onCreer }: { onCreer: (r: RecetteDemo) => string | null }) {
  const vide = (): Ingredient => ({ article: '', quantite: null, unite: 'g', rayon: 'Fruits & légumes' });
  const [nom, setNom] = useState('');
  const [categorie, setCategorie] = useState<'Entrée' | 'Plat' | 'Dessert'>('Plat');
  const [lignes, setLignes] = useState<{ article: string; qte: string; unite: string; rayon: string }[]>([
    { article: '', qte: '', unite: 'g', rayon: 'Fruits & légumes' },
    { article: '', qte: '', unite: 'g', rayon: 'Épicerie' },
  ]);
  const [msg, setMsg] = useState('');

  const majLigne = (i: number, champ: string, valeur: string) =>
    setLignes((l) => l.map((x, k) => (k === i ? { ...x, [champ]: valeur } : x)));

  const creer = () => {
    const propre = nom.trim();
    const ingredients: Ingredient[] = lignes
      .filter((l) => l.article.trim())
      .map((l) => ({
        article: l.article.trim(),
        quantite: parseQuantite(l.qte),
        unite: l.unite,
        rayon: l.rayon,
      }));
    if (!propre) return setMsg('Donnez un nom à la recette.');
    if (ingredients.length === 0) return setMsg('Ajoutez au moins un ingrédient.');

    const jour = onCreer({ nom: propre, categorie, personnes: PERSONNES_BASE, ingredients });
    setMsg(
      jour
        ? `« ${propre} » créée et placée au ${jour.toLowerCase()}. Ses ingrédients sont dans la liste.`
        : `« ${propre} » créée. Placez-la dans la semaine pour voir ses ingrédients.`,
    );
    setNom('');
    setLignes([vide()].map((i) => ({ article: '', qte: '', unite: i.unite, rayon: i.rayon })));
  };

  return (
    <details className="nsy-recette">
      <summary>+ Créer une recette</summary>
      <div className="nsy-recette-corps">
        <div className="nsy-recette-tete">
          <input value={nom} onChange={(e) => setNom(e.target.value)} placeholder="Nom de la recette" aria-label="Nom de la recette" />
          <select
            value={categorie}
            onChange={(e) => setCategorie(e.target.value as 'Entrée' | 'Plat' | 'Dessert')}
            aria-label="Catégorie"
          >
            {CATEGORIES_PLAT.map((c) => (
              <option key={c}>{c}</option>
            ))}
          </select>
        </div>

        <p className="nsy-demo-titre" style={{ margin: '20px 0 8px' }}>
          Ingrédients — pour {PERSONNES_BASE} personnes
        </p>
        <div className="nsy-ing-tete">
          <span>Article</span><span>Quantité</span><span>Unité</span><span>Rayon</span><span />
        </div>
        {lignes.map((l, i) => (
          <div className="nsy-ing" key={i}>
            <input value={l.article} onChange={(e) => majLigne(i, 'article', e.target.value)} placeholder="Article" aria-label={`Ingrédient ${i + 1}`} />
            <input value={l.qte} onChange={(e) => majLigne(i, 'qte', e.target.value)} placeholder="Qté" aria-label={`Quantité ${i + 1}`} />
            <select value={l.unite} onChange={(e) => majLigne(i, 'unite', e.target.value)} aria-label={`Unité ${i + 1}`}>
              <option value="">—</option>
              {UNITES.map((u) => (
                <option key={u}>{u}</option>
              ))}
            </select>
            <select value={l.rayon} onChange={(e) => majLigne(i, 'rayon', e.target.value)} aria-label={`Rayon ${i + 1}`}>
              {RAYONS.map((r) => (
                <option key={r}>{r}</option>
              ))}
            </select>
            {/* ⚠ Jamais moins d'une ligne : un éditeur vide n'offre plus de prise. */}
            <button
              type="button"
              className="nsy-ing-x"
              onClick={() => setLignes((x) => (x.length > 1 ? x.filter((_, k) => k !== i) : x))}
              aria-label={`Retirer l’ingrédient ${i + 1}`}
            >
              ×
            </button>
          </div>
        ))}

        <div className="nsy-recette-actions">
          <button type="button" onClick={() => setLignes((l) => [...l, { article: '', qte: '', unite: 'g', rayon: 'Épicerie' }])}>
            + Ajouter un ingrédient
          </button>
          <button type="button" className="nsy-demo-btn" onClick={creer}>
            Créer la recette
          </button>
        </div>
        {msg && <p className="nsy-qte" style={{ marginTop: 12 }}>{msg}</p>}
      </div>
    </details>
  );
}

/* ══════════════════════ 2. Agenda ══════════════════════ */

const COULEURS_DEMO: Record<string, string> = {
  Commun: 'var(--commun)',
  Clara: 'var(--corail)',
  Antoine: 'var(--ambre)',
  'Noé': 'var(--ciel)',
};
const NOMS_JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

function BlocAgenda() {
  const [vue, setVue] = useState<VueAgendaMode>('mois');
  const auj = aujourdhuiISO();

  /*
   * ⚠ LES DATES SONT CALCULÉES PAR LE MODULE : `grilleMois` produit des semaines
   * entières (4, 5 ou 6 selon le mois) à partir du lundi, `joursSemaine` la
   * semaine courante. Refaire cette arithmétique à la main est le meilleur moyen
   * d'afficher un calendrier faux un mois sur douze.
   */
  const evenements = useMemo(() => {
    const premier = debutMois(auj);
    const nbJours = new Date(
      Number(premier.slice(0, 4)),
      Number(premier.slice(5, 7)),
      0,
    ).getDate();
    const l: { jour: string; heure: string; titre: string; qui: string }[] = [];
    for (let i = 0; i < nbJours; i++) {
      const iso = decalerJours(premier, i);
      const dow = new Date(`${iso}T12:00:00`).getDay();
      RECURRENTS_DEMO.forEach((r) => {
        if (r.jours.includes(dow)) l.push({ jour: iso, heure: r.heure, titre: r.titre, qui: r.qui });
      });
    }
    PONCTUELS_DEMO.forEach((p) => {
      if (p.jourDuMois <= nbJours) {
        l.push({ jour: decalerJours(premier, p.jourDuMois - 1), heure: p.heure, titre: p.titre, qui: p.qui });
      }
    });
    return l;
  }, [auj]);

  const duJour = (iso: string) =>
    evenements.filter((e) => e.jour === iso).sort((a, b) => a.heure.localeCompare(b.heure));

  const titre =
    vue === 'jour'
      ? new Date(`${auj}T12:00:00`).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
      : vue === 'semaine'
        ? `Semaine du ${new Date(`${debutSemaine(auj)}T12:00:00`).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })}`
        : new Date(`${auj}T12:00:00`).toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });

  return (
    <section className="nsy-demo-bloc">
      <p className="nsy-demo-eyebrow">02 — Agenda</p>
      <h2>Le jour, la semaine, ou le mois entier.</h2>
      <p className="nsy-demo-intro">
        L’agenda du foyer réunit les calendriers de chacun, une couleur par personne. La vue
        choisie est mémorisée d’une visite à l’autre.
      </p>

      <div className="nsy-demo-cadre">
        <div className="nsy-demo-barre" style={{ marginBottom: 18 }}>
          <span className="nsy-bascule" role="group" aria-label="Vue de l’agenda">
            {VUES_AGENDA.map((v) => (
              <button key={v} type="button" className={v === vue ? 'on' : ''} aria-pressed={v === vue} onClick={() => setVue(v)}>
                {v === 'jour' ? 'Jour' : v === 'semaine' ? 'Semaine' : 'Mois'}
              </button>
            ))}
          </span>
          <span className="nsy-qte">{titre}</span>
        </div>

        {vue === 'jour' && (
          <ul className="nsy-liste nsy-jour">
            {duJour(auj).length === 0 ? (
              <li>Rien de prévu aujourd’hui.</li>
            ) : (
              duJour(auj).map((e, i) => (
                <li key={i}>
                  <span className="nsy-h">{e.heure}</span>
                  <span>{e.titre}</span>
                  <span className="nsy-qte" style={{ marginLeft: 'auto', color: COULEURS_DEMO[e.qui] }}>{e.qui}</span>
                </li>
              ))
            )}
          </ul>
        )}

        {vue === 'semaine' && (
          <div className="nsy-semaine">
            {joursSemaine(auj).map((iso, i) => (
              <div key={iso}>
                <p className="nsy-case-tete">
                  {NOMS_JOURS[i]} {Number(iso.slice(8, 10))}
                </p>
                <div className={`nsy-case nsy-case-haute ${iso === auj ? 'auj' : ''}`}>
                  {duJour(iso).map((e, k) => (
                    <span key={k} className="nsy-ev" style={{ background: COULEURS_DEMO[e.qui] }}>
                      {e.heure} {e.titre}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        {vue === 'mois' && (
          <div className="nsy-mois">
            {NOMS_JOURS.map((n) => (
              <div className="nsy-case-tete" key={n}>{n}</div>
            ))}
            {grilleMois(auj).flat().map((iso) => {
              const hors = iso.slice(0, 7) !== auj.slice(0, 7);
              const l = duJour(iso);
              return (
                <div className={`nsy-case ${hors ? 'hors' : ''} ${iso === auj ? 'auj' : ''}`} key={iso}>
                  <span className="nsy-case-n">{Number(iso.slice(8, 10))}</span>
                  {l.slice(0, 2).map((e, k) => (
                    <span key={k} className="nsy-ev" style={{ background: COULEURS_DEMO[e.qui] }}>{e.titre}</span>
                  ))}
                  {l.length > 2 && <span className="nsy-ev-plus">+ {l.length - 2}</span>}
                </div>
              );
            })}
          </div>
        )}

        <p className="nsy-demo-note">
          {Object.entries(COULEURS_DEMO).map(([qui, c]) => (
            <span key={qui} style={{ marginRight: 14 }}>
              <span style={{ color: c }}>■</span> {qui}
            </span>
          ))}
          Chaque personne relie son propre agenda ; le foyer voit la réunion des trois.
        </p>
      </div>
    </section>
  );
}

/* ══════════════════════ 3. Budget ══════════════════════ */

function BlocBudget() {
  const [ops, setOps] = useState(OPERATIONS_DEMO);
  const [libelle, setLibelle] = useState('Pharmacie');
  const [compte, setCompte] = useState(COMPTES_DEMO[0].nom);
  const [categorie, setCategorie] = useState('Santé');
  const [montant, setMontant] = useState('24,90');

  // Solde = solde initial − somme des dépenses : le modèle réel du module.
  const soldes = COMPTES_DEMO.map((c) => ({
    nom: c.nom,
    solde: c.initial - ops.filter((o) => o.compte === c.nom).reduce((s, o) => s + o.montant, 0),
  }));
  const total = soldes.reduce((s, c) => s + c.solde, 0);

  return (
    <section className="nsy-demo-bloc">
      <p className="nsy-demo-eyebrow">03 — Budget</p>
      <h2>Aucune connexion à votre banque.</h2>
      <p className="nsy-demo-intro">
        Nestync ne demande aucun identifiant bancaire et n’agrège aucun compte. Vous saisissez ce
        que vous voulez suivre, avec vos mots — les soldes et les enveloppes se recalculent.
      </p>

      <div className="nsy-demo-cadre">
        <div className="nsy-kpi">
          {soldes.map((c) => (
            <div key={c.nom}>
              <div className={`nsy-kpi-v ${c.solde < 0 ? 'nsy-neg' : ''}`}>{formatEuro(c.solde)}</div>
              <div className="nsy-kpi-l">{c.nom}</div>
            </div>
          ))}
          <div>
            <div className="nsy-kpi-v">{formatEuro(total)}</div>
            <div className="nsy-kpi-l">Total du foyer</div>
          </div>
        </div>

        <div className="nsy-demo-duo">
          <div>
            <p className="nsy-demo-titre">Enveloppes du mois</p>
            {ENVELOPPES_DEMO.map((e) => {
              const reel = ops.filter((o) => o.categorie === e.nom).reduce((s, o) => s + o.montant, 0);
              const depasse = reel > e.budget;
              return (
                <div className="nsy-jauge" key={e.nom}>
                  <div className="nsy-jauge-tete">
                    <span>{e.nom}{depasse && ' ⚠'}</span>
                    <span className={`nsy-qte ${depasse ? 'nsy-neg' : ''}`}>
                      {formatEuro(reel)} / {formatEuro(e.budget)}
                    </span>
                  </div>
                  <span className="nsy-piste">
                    <span
                      className={`nsy-plein ${depasse ? 'over' : ''}`}
                      style={{ width: `${Math.min(100, (reel / e.budget) * 100)}%` }}
                    />
                  </span>
                </div>
              );
            })}
          </div>

          <div>
            <p className="nsy-demo-titre">Ajouter une opération</p>
            <div className="nsy-champs">
              {/* Le libellé d'abord : c'est lui qu'on relit trois mois plus tard. */}
              <input value={libelle} onChange={(e) => setLibelle(e.target.value)} placeholder="Libellé — ex. Courses du samedi" aria-label="Libellé" />
              <div className="nsy-paire">
                <select value={compte} onChange={(e) => setCompte(e.target.value)} aria-label="Compte">
                  {COMPTES_DEMO.map((c) => (
                    <option key={c.nom}>{c.nom}</option>
                  ))}
                </select>
                <select value={categorie} onChange={(e) => setCategorie(e.target.value)} aria-label="Catégorie">
                  {CATEGORIES_DEPENSE.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="nsy-paire">
                <input value={montant} onChange={(e) => setMontant(e.target.value)} placeholder="Montant" aria-label="Montant" />
                <button
                  type="button"
                  className="nsy-demo-btn"
                  onClick={() => {
                    // `parseEuro` accepte la virgule décimale et les espaces.
                    const m = parseEuro(montant);
                    if (m <= 0) return;
                    setOps((l) => [...l, { compte, categorie, montant: m, libelle: libelle.trim() || 'Sans libellé' }]);
                    setLibelle('');
                  }}
                >
                  Enregistrer
                </button>
              </div>
            </div>

            <p className="nsy-demo-titre" style={{ marginTop: 24 }}>Dernières opérations</p>
            <ul className="nsy-liste">
              {ops.slice(-6).reverse().map((o, i) => (
                <li key={i}>
                  <span>
                    {o.libelle} <span className="nsy-qte">· {o.categorie}</span>
                  </span>
                  <span className="nsy-qte">− {formatEuro(o.montant)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <p className="nsy-demo-note">
          Le <strong>libellé</strong> est ce qui rend une ligne relisible trois mois plus tard :
          « Pharmacie » dit ce que « −24,90 € » ne dira jamais. C’est aussi ce qu’aucune agrégation
          bancaire ne sait écrire à votre place.
        </p>
      </div>
    </section>
  );
}
