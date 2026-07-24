'use client';

import { useCallback, useMemo, useState } from 'react';
import {
  agregerCourses,
  formatQuantite,
  mettreALechelle,
  PERSONNES_DEFAUT,
  type DonneesRepas,
  type Ingredient,
  type JourRepas,
  type Recette,
} from '@/lib/repas/schema';

/**
 * Écran Repas (client). Deux onglets : planning de la semaine (avec nb de
 * personnes par jour → quantités mises à l'échelle) et éditeur de recettes
 * (quantités, unités, personnes de base). Rafraîchit depuis /api/repas après
 * chaque écriture.
 */
export default function VueRepas({ initial }: { initial: DonneesRepas }) {
  const [d, setD] = useState<DonneesRepas>(initial);
  const [onglet, setOnglet] = useState<'semaine' | 'recettes'>('semaine');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    const r = await fetch('/api/repas', { cache: 'no-store' });
    if (!r.ok) throw new Error((await r.json()).erreur ?? 'Erreur de chargement.');
    setD(await r.json());
  }, []);

  const action = useCallback(
    async (fn: () => Promise<Response>) => {
      setOccupe(true);
      setErreur(null);
      try {
        const r = await fn();
        if (!r.ok) throw new Error((await r.json()).erreur ?? 'Action refusée.');
        await rafraichir();
      } catch (e) {
        setErreur(e instanceof Error ? e.message : String(e));
      } finally {
        setOccupe(false);
      }
    },
    [rafraichir],
  );

  return (
    <>
      <div className="tabs" role="tablist">
        <button className="tab" role="tab" aria-selected={onglet === 'semaine'} onClick={() => setOnglet('semaine')}>
          🗓️ Semaine
        </button>
        <button className="tab" role="tab" aria-selected={onglet === 'recettes'} onClick={() => setOnglet('recettes')}>
          📖 Recettes ({d.recettes.length})
        </button>
      </div>

      {erreur && <p className="message erreur">{erreur}</p>}

      {onglet === 'semaine' ? (
        <PlanningSemaine d={d} occupe={occupe} action={action} />
      ) : (
        <EditeurRecettes d={d} occupe={occupe} action={action} />
      )}
    </>
  );
}

type ActionFn = (fn: () => Promise<Response>) => Promise<void>;
const patch = (url: string, corps: unknown): Promise<Response> =>
  fetch(url, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corps) });

function trouverRecette(nom: string, recettes: Recette[]): Recette | undefined {
  const n = nom.trim().toLowerCase();
  return n ? recettes.find((r) => r.nom.toLowerCase() === n) : undefined;
}

/* =============================== SEMAINE =============================== */

function PlanningSemaine({ d, occupe, action }: { d: DonneesRepas; occupe: boolean; action: ActionFn }) {
  // Aperçu des courses : plats planifiés qui correspondent à une recette connue.
  const platsPlanifies = useMemo(
    () =>
      d.semaine
        .map((j) => ({ jour: j, recette: trouverRecette(j.diner, d.recettes) }))
        .filter((x): x is { jour: JourRepas; recette: Recette } => !!x.recette)
        .map((x) => ({ ingredients: x.recette.ingredients, base: x.recette.personnes, personnes: x.jour.personnes })),
    [d.semaine, d.recettes],
  );
  const courses = useMemo(() => agregerCourses(platsPlanifies), [platsPlanifies]);

  return (
    <>
      <ul className="liste">
        {d.semaine.map((j) => (
          <JourLigne key={j.jour} jour={j} recettes={d.recettes} occupe={occupe} action={action} />
        ))}
      </ul>

      <ApercuCourses courses={courses} />
    </>
  );
}

function JourLigne({
  jour,
  recettes,
  occupe,
  action,
}: {
  jour: JourRepas;
  recettes: Recette[];
  occupe: boolean;
  action: ActionFn;
}) {
  const [diner, setDiner] = useState(jour.diner);
  const [personnes, setPersonnes] = useState(String(jour.personnes));

  const recette = trouverRecette(diner, recettes);
  const nbPers = Math.max(parseInt(personnes, 10) || PERSONNES_DEFAUT, 1);
  const ingredientsEchelle =
    recette && recette.ingredients.length
      ? mettreALechelle(recette.ingredients, recette.personnes, nbPers)
      : [];

  function enregistrer() {
    if (diner === jour.diner && String(nbPers) === String(jour.personnes)) return;
    // La note du jour est conservée telle quelle (pas d'édition sur cette ligne).
    action(() => patch('/api/repas/semaine', { jour: jour.jour, diner, personnes: nbPers, note: jour.note }));
  }

  const listeId = `recettes-${jour.jour}`;
  return (
    <li className="jour-repas">
      <div className="jr-tete">
        <span className="jr-jour">{jour.jour}</span>
        <input
          className="champ jr-diner"
          list={listeId}
          placeholder="Dîner…"
          value={diner}
          disabled={occupe}
          onChange={(e) => setDiner(e.target.value)}
          onBlur={enregistrer}
          aria-label={`Dîner de ${jour.jour}`}
        />
        <datalist id={listeId}>
          {recettes.map((r) => (
            <option key={r.id} value={r.nom} />
          ))}
        </datalist>
        <label className="jr-pers">
          <input
            className="champ"
            type="number"
            min={1}
            value={personnes}
            disabled={occupe}
            onChange={(e) => setPersonnes(e.target.value)}
            onBlur={enregistrer}
            aria-label={`Nombre de personnes ${jour.jour}`}
          />
          <span>pers.</span>
        </label>
      </div>

      {recette ? (
        ingredientsEchelle.length > 0 ? (
          <div className="jr-ingredients">
            {recette.personnes !== nbPers && (
              <span className="jr-echelle">
                ↔ mis à l’échelle {recette.personnes} → {nbPers} pers.
              </span>
            )}
            <ul>
              {ingredientsEchelle.map((i, k) => (
                <li key={k}>
                  <span className="i-art">{i.article}</span>
                  {i.quantite != null && (
                    <span className="i-qte">{formatQuantite(i.quantite)} {i.unite}</span>
                  )}
                  {i.rayon && <span className="i-rayon">{i.rayon}</span>}
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="jr-vide">Recette sans ingrédient chiffré — ajoute des quantités dans l’onglet Recettes.</p>
        )
      ) : diner ? (
        <p className="jr-vide">Plat libre (pas dans les recettes) — pas de quantités calculées.</p>
      ) : null}
    </li>
  );
}

function ApercuCourses({ courses }: { courses: ReturnType<typeof agregerCourses> }) {
  if (courses.length === 0) return null;
  // Regroupement par rayon.
  const parRayon = new Map<string, typeof courses>();
  for (const c of courses) {
    const cle = c.rayon || 'Autre';
    if (!parRayon.has(cle)) parRayon.set(cle, []);
    parRayon.get(cle)!.push(c);
  }
  return (
    <section className="apercu-courses">
      <h2 className="bloc-titre">Aperçu des courses de la semaine</h2>
      <p className="apercu-note">
        Somme des ingrédients des dîners planifiés, quantités mises à l’échelle. Le bouton d’envoi
        vers la liste de courses arrivera sur l’accueil.
      </p>
      {[...parRayon.entries()].map(([rayon, items]) => (
        <div className="rayon-groupe" key={rayon}>
          <p className="rayon-titre">{rayon}</p>
          <ul className="courses-apercu">
            {items.map((c, k) => (
              <li key={k}>
                <span className="i-art">{c.article}</span>
                {c.quantite != null && <span className="i-qte">{formatQuantite(c.quantite)} {c.unite}</span>}
              </li>
            ))}
          </ul>
        </div>
      ))}
    </section>
  );
}

/* =============================== RECETTES =============================== */

function EditeurRecettes({ d, occupe, action }: { d: DonneesRepas; occupe: boolean; action: ActionFn }) {
  const [edite, setEdite] = useState<string | 'nouvelle' | null>(null);

  return (
    <>
      {edite !== 'nouvelle' && (
        <div className="saisie-barre">
          <button className="bouton" onClick={() => setEdite('nouvelle')} disabled={occupe}>
            ＋ Nouvelle recette
          </button>
        </div>
      )}

      {edite === 'nouvelle' && (
        <RecetteForm
          d={d}
          occupe={occupe}
          onAnnulerAction={() => setEdite(null)}
          onEnregistrerAction={(corps) =>
            action(() =>
              fetch('/api/repas/recettes', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corps),
              }),
            ).then(() => setEdite(null))
          }
        />
      )}

      <ul className="liste recettes-liste">
        {d.recettes.map((r) =>
          edite === r.id ? (
            <li key={r.id}>
              <RecetteForm
                d={d}
                recette={r}
                occupe={occupe}
                onAnnulerAction={() => setEdite(null)}
                onEnregistrerAction={(corps) =>
                  action(() => patch('/api/repas/recettes', { id: r.id, ...corps })).then(() => setEdite(null))
                }
                onSupprimerAction={() =>
                  action(() =>
                    fetch('/api/repas/recettes', {
                      method: 'DELETE',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ id: r.id }),
                    }),
                  ).then(() => setEdite(null))
                }
              />
            </li>
          ) : (
            <li key={r.id} className="recette-carte">
              <div className="rc-tete">
                <span className="rc-nom">{r.nom}</span>
                <span className="rc-meta">
                  {r.type && <span className="puce categorie">{r.type}</span>}
                  {r.chaudFroid && <span className="puce categorie">{r.chaudFroid}</span>}
                  <span className="puce assigne">{r.personnes} pers.</span>
                </span>
                <button className="bouton discret" onClick={() => setEdite(r.id)} disabled={occupe}>
                  Modifier
                </button>
              </div>
              <ul className="rc-ingredients">
                {r.ingredients.map((i, k) => (
                  <li key={k}>
                    <span className="i-art">{i.article}</span>
                    {i.quantite != null && <span className="i-qte">{formatQuantite(i.quantite)} {i.unite}</span>}
                    {i.rayon && <span className="i-rayon">{i.rayon}</span>}
                  </li>
                ))}
              </ul>
            </li>
          ),
        )}
      </ul>
    </>
  );
}

function ingredientVide(): Ingredient {
  return { article: '', quantite: null, unite: '', rayon: '' };
}

function RecetteForm({
  d,
  recette,
  occupe,
  onEnregistrerAction,
  onAnnulerAction,
  onSupprimerAction,
}: {
  d: DonneesRepas;
  recette?: Recette;
  occupe: boolean;
  onEnregistrerAction: (corps: {
    nom: string;
    ingredients: Ingredient[];
    type: string;
    chaudFroid: string;
    note: string;
    personnes: number;
  }) => void;
  onAnnulerAction: () => void;
  onSupprimerAction?: () => void;
}) {
  const [nom, setNom] = useState(recette?.nom ?? '');
  const [type, setType] = useState(recette?.type ?? '');
  const [chaudFroid, setChaudFroid] = useState(recette?.chaudFroid ?? '');
  const [note, setNote] = useState(recette?.note ?? '');
  const [personnes, setPersonnes] = useState(String(recette?.personnes ?? PERSONNES_DEFAUT));
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recette && recette.ingredients.length ? recette.ingredients.map((i) => ({ ...i })) : [ingredientVide()],
  );

  function majIngredient(index: number, champ: keyof Ingredient, valeur: string) {
    setIngredients((prev) =>
      prev.map((ing, k) =>
        k !== index
          ? ing
          : champ === 'quantite'
            ? { ...ing, quantite: valeur.trim() === '' ? null : Number(valeur.replace(',', '.')) }
            : { ...ing, [champ]: valeur },
      ),
    );
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    onEnregistrerAction({
      nom,
      ingredients: ingredients.filter((i) => i.article.trim() !== ''),
      type,
      chaudFroid,
      note,
      personnes: Math.max(parseInt(personnes, 10) || PERSONNES_DEFAUT, 1),
    });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      <div className="rf-ligne1">
        <input
          className="champ rf-nom"
          placeholder="Nom de la recette"
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          disabled={occupe}
          autoFocus
        />
        <select className="champ" value={type} onChange={(e) => setType(e.target.value)} disabled={occupe} aria-label="Type">
          <option value="">Type</option>
          {d.types.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select className="champ" value={chaudFroid} onChange={(e) => setChaudFroid(e.target.value)} disabled={occupe} aria-label="Chaud/Froid">
          <option value="">Chaud/Froid</option>
          {d.chaudFroid.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <label className="jr-pers">
          <input
            className="champ"
            type="number"
            min={1}
            value={personnes}
            onChange={(e) => setPersonnes(e.target.value)}
            disabled={occupe}
            aria-label="Personnes (base)"
          />
          <span>pers.</span>
        </label>
      </div>

      <div className="rf-ingredients">
        <div className="rf-ing-entete">
          <span>Article</span><span>Quantité</span><span>Unité</span><span>Rayon</span><span />
        </div>
        {ingredients.map((ing, k) => (
          <div className="rf-ing-ligne" key={k}>
            <input
              className="champ"
              placeholder="Article"
              value={ing.article}
              onChange={(e) => majIngredient(k, 'article', e.target.value)}
              disabled={occupe}
            />
            <input
              className="champ"
              inputMode="decimal"
              placeholder="Qté"
              value={ing.quantite == null ? '' : formatQuantite(ing.quantite)}
              onChange={(e) => majIngredient(k, 'quantite', e.target.value)}
              disabled={occupe}
            />
            <select
              className="champ"
              value={ing.unite}
              onChange={(e) => majIngredient(k, 'unite', e.target.value)}
              disabled={occupe}
              aria-label="Unité"
            >
              <option value="">—</option>
              {d.unites.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
            <input
              className="champ"
              placeholder="Rayon"
              value={ing.rayon}
              onChange={(e) => majIngredient(k, 'rayon', e.target.value)}
              disabled={occupe}
            />
            <button
              type="button"
              className="bouton discret rf-suppr"
              onClick={() => setIngredients((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== k) : prev))}
              disabled={occupe}
              aria-label="Retirer l'ingrédient"
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="bouton discret" onClick={() => setIngredients((prev) => [...prev, ingredientVide()])} disabled={occupe}>
          ＋ Ingrédient
        </button>
      </div>

      <input
        className="champ"
        placeholder="Note (facultatif)"
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={occupe}
      />

      <div className="rf-actions">
        {onSupprimerAction && (
          <button type="button" className="bouton discret rf-danger" onClick={onSupprimerAction} disabled={occupe}>
            Supprimer
          </button>
        )}
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>
          Annuler
        </button>
        <button type="submit" className="bouton" disabled={occupe || !nom.trim()}>
          Enregistrer
        </button>
      </div>
    </form>
  );
}
