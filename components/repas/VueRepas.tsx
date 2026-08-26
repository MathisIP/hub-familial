'use client';

import { useCallback, useMemo, useState } from 'react';
import Liste from '@/components/Liste';
import Combobox from '@/components/Combobox';
import { useT, useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_CATEGORIE_PLAT, CLE_TYPE_RECETTE, CLE_CHAUD_FROID, CLE_JOUR } from '@/lib/i18n';
import {
  agregerCourses,
  formatQuantite,
  PERSONNES_DEFAUT,
  type DonneesRepas,
  type Ingredient,
  type JourRepas,
  type Recette,
} from '@/lib/repas/schema';
import Astuce from '@/components/Astuce';

/**
 * Écran Repas (client). Deux onglets : planning de la semaine (avec nb de
 * personnes par jour → quantités mises à l'échelle) et éditeur de recettes
 * (quantités, unités, personnes de base). Rafraîchit depuis /api/repas après
 * chaque écriture.
 */
export default function VueRepas({ initial }: { initial: DonneesRepas }) {
  const tr = useT();
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
          🗓️ {tr('REPAS_TAB_SEMAINE')}
        </button>
        <button className="tab" role="tab" aria-selected={onglet === 'recettes'} onClick={() => setOnglet('recettes')}>
          📖 {tr('REPAS_TAB_RECETTES')} ({d.recettes.length})
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
  // Aperçu des courses : agrège les recettes des 3 services (entrée/plat/dessert)
  // de chaque jour, mises à l'échelle du nombre de personnes du jour.
  const platsPlanifies = useMemo(() => {
    const out: { ingredients: Recette['ingredients']; base: number; personnes: number }[] = [];
    for (const j of d.semaine) {
      for (const nom of [j.entree, j.plat, j.dessert]) {
        const r = trouverRecette(nom, d.recettes);
        if (r) out.push({ ingredients: r.ingredients, base: r.personnes, personnes: j.personnes });
      }
    }
    return out;
  }, [d.semaine, d.recettes]);
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

const SERVICES_UI = [
  { cle: 'entree' as const, label: 'Entrée', cat: 'Entrée' },
  { cle: 'plat' as const, label: 'Plat', cat: 'Plat' },
  { cle: 'dessert' as const, label: 'Dessert', cat: 'Dessert' },
];

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
  const tr = useT();
  const langue = useLangue();
  const [menu, setMenu] = useState({ entree: jour.entree, plat: jour.plat, dessert: jour.dessert });
  const [personnes, setPersonnes] = useState(String(jour.personnes));

  const nbPers = Math.max(parseInt(personnes, 10) || PERSONNES_DEFAUT, 1);

  function enregistrer(prochain = menu) {
    const inchange =
      prochain.entree === jour.entree &&
      prochain.plat === jour.plat &&
      prochain.dessert === jour.dessert &&
      String(nbPers) === String(jour.personnes);
    if (inchange) return;
    action(() =>
      patch('/api/repas/semaine', {
        jour: jour.jour,
        entree: prochain.entree,
        plat: prochain.plat,
        dessert: prochain.dessert,
        personnes: nbPers,
        note: jour.note,
      }),
    );
  }

  // Ingrédients du jour = agrégat des recettes des 3 services, mises à l'échelle.
  const platsJour = SERVICES_UI.map(({ cle }) => trouverRecette(menu[cle], recettes))
    .filter((r): r is Recette => !!r)
    .map((r) => ({ ingredients: r.ingredients, base: r.personnes, personnes: nbPers }));
  const ingredientsJour = agregerCourses(platsJour);

  return (
    <li className="jour-repas">
      <div className="jr-tete">
        <span className="jr-jour">{tEnum(CLE_JOUR, jour.jour, langue)}</span>
        <label className="jr-pers">
          <input
            className="champ"
            type="number"
            min={1}
            value={personnes}
            disabled={occupe}
            onChange={(e) => setPersonnes(e.target.value)}
            onBlur={() => enregistrer()}
            aria-label={`Nombre de personnes ${jour.jour}`}
          />
          <span>{tr('REPAS_PERS')}</span>
          <Astuce texte={tr('AIDE_PERSONNES')} />
        </label>
      </div>

      <div className="jr-services">
        {SERVICES_UI.map(({ cle, cat }) => {
          const label = tEnum(CLE_CATEGORIE_PLAT, cat, langue);
          return (
            <label className="jr-service" key={cle}>
              <span className="jr-service-lbl">{label}</span>
              <Combobox
                value={menu[cle]}
                onChange={(v) => setMenu((m) => ({ ...m, [cle]: v }))}
                onCommit={(v) => enregistrer({ ...menu, [cle]: v })}
                options={recettes.filter((r) => !r.categorie || r.categorie === cat).map((r) => r.nom)}
                placeholder={`${label}…`}
                disabled={occupe}
                ariaLabel={`${label} · ${jour.jour}`}
              />
            </label>
          );
        })}
      </div>

      {ingredientsJour.length > 0 && (
        <div className="jr-ingredients">
          <ul>
            {ingredientsJour.map((i, k) => (
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
      )}
    </li>
  );
}

function ApercuCourses({ courses }: { courses: ReturnType<typeof agregerCourses> }) {
  const tr = useT();
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
      <h2 className="bloc-titre">{tr('REPAS_APERCU_TITRE')}</h2>
      <p className="apercu-note">{tr('REPAS_APERCU_NOTE')}</p>
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
  const tr = useT();
  const langue = useLangue();
  const [edite, setEdite] = useState<string | 'nouvelle' | null>(null);

  return (
    <>
      {edite !== 'nouvelle' && (
        <div className="saisie-barre">
          <button className="bouton" onClick={() => setEdite('nouvelle')} disabled={occupe}>
            ＋ {tr('REPAS_NOUVELLE_RECETTE')}
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

      <ul className="liste recettes-liste rf-grille">
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
                  {r.categorie && <span className="puce cat-plat">{tEnum(CLE_CATEGORIE_PLAT, r.categorie, langue)}</span>}
                  {r.type && <span className="puce categorie">{tEnum(CLE_TYPE_RECETTE, r.type, langue)}</span>}
                  {r.chaudFroid && <span className="puce categorie">{tEnum(CLE_CHAUD_FROID, r.chaudFroid, langue)}</span>}
                  <span className="puce assigne">{r.personnes} {tr('REPAS_PERS')}</span>
                  {r.favoriBebe && <span className="puce bebe-favori">{tr('REPAS_BADGE_FAVORI')}</span>}
                  {r.bebePasGoute && <span className="puce bebe-agouter">{tr('REPAS_BADGE_AGOUTER')}</span>}
                </span>
                <button className="bouton discret" onClick={() => setEdite(r.id)} disabled={occupe}>
                  {tr('G_MODIFIER')}
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
    categorie: string;
    type: string;
    chaudFroid: string;
    note: string;
    personnes: number;
    favoriBebe: boolean;
    bebePasGoute: boolean;
  }) => void;
  onAnnulerAction: () => void;
  onSupprimerAction?: () => void;
}) {
  const tr = useT();
  const langue = useLangue();
  const [nom, setNom] = useState(recette?.nom ?? '');
  const [categorie, setCategorie] = useState(recette?.categorie ?? '');
  const [type, setType] = useState(recette?.type ?? '');
  const [chaudFroid, setChaudFroid] = useState(recette?.chaudFroid ?? '');
  const [note, setNote] = useState(recette?.note ?? '');
  const [personnes, setPersonnes] = useState(String(recette?.personnes ?? PERSONNES_DEFAUT));
  const [favoriBebe, setFavoriBebe] = useState(recette?.favoriBebe ?? false);
  const [bebePasGoute, setBebePasGoute] = useState(recette?.bebePasGoute ?? false);
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
      categorie,
      type,
      chaudFroid,
      note,
      personnes: Math.max(parseInt(personnes, 10) || PERSONNES_DEFAUT, 1),
      favoriBebe,
      bebePasGoute,
    });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      <div className="rf-ligne1">
        <input
          className="champ rf-nom"
          placeholder={tr('REPAS_NOM_PH')}
          value={nom}
          onChange={(e) => setNom(e.target.value)}
          disabled={occupe}
          autoFocus
        />
        <Liste
          valeur={categorie}
          onChange={setCategorie}
          options={d.categoriesPlat.map((c) => ({ valeur: c, libelle: tEnum(CLE_CATEGORIE_PLAT, c, langue) }))}
          placeholder={tr('REPAS_CATEGORIE')}
          disabled={occupe}
          ariaLabel={tr('REPAS_CATEGORIE')}
        />
        <Liste
          valeur={type}
          onChange={setType}
          options={d.types.map((ty) => ({ valeur: ty, libelle: tEnum(CLE_TYPE_RECETTE, ty, langue) }))}
          placeholder={tr('REPAS_TYPE')}
          disabled={occupe}
          ariaLabel={tr('REPAS_TYPE')}
        />
        <Liste
          valeur={chaudFroid}
          onChange={setChaudFroid}
          options={d.chaudFroid.map((c) => ({ valeur: c, libelle: tEnum(CLE_CHAUD_FROID, c, langue) }))}
          placeholder={tr('REPAS_CHAUDFROID')}
          disabled={occupe}
          ariaLabel={tr('REPAS_CHAUDFROID')}
        />
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
          <span>{tr('REPAS_PERS')}</span>
          <Astuce texte={tr('AIDE_PERSONNES_BASE')} />
        </label>
      </div>

      <div className="rf-ingredients">
        <div className="rf-ing-entete">
          <span>{tr('REPAS_ING_ARTICLE')}</span><span>{tr('REPAS_ING_QTE')}</span><span>{tr('REPAS_ING_UNITE')}</span><span>{tr('REPAS_ING_RAYON')}</span><span />
        </div>
        {ingredients.map((ing, k) => (
          <div className="rf-ing-ligne" key={k}>
            <input
              className="champ"
              placeholder={tr('REPAS_ING_ARTICLE')}
              value={ing.article}
              onChange={(e) => majIngredient(k, 'article', e.target.value)}
              disabled={occupe}
            />
            <input
              className="champ"
              inputMode="decimal"
              placeholder={tr('REPAS_ING_QTE_PH')}
              value={ing.quantite == null ? '' : formatQuantite(ing.quantite)}
              onChange={(e) => majIngredient(k, 'quantite', e.target.value)}
              disabled={occupe}
            />
            <Liste
              valeur={ing.unite}
              onChange={(v) => majIngredient(k, 'unite', v)}
              options={d.unites.map((u) => ({ valeur: u, libelle: u }))}
              placeholder="—"
              disabled={occupe}
              ariaLabel={tr('REPAS_ING_UNITE')}
            />
            <input
              className="champ"
              placeholder={tr('REPAS_ING_RAYON')}
              value={ing.rayon}
              onChange={(e) => majIngredient(k, 'rayon', e.target.value)}
              disabled={occupe}
            />
            <button
              type="button"
              className="bouton discret rf-suppr"
              onClick={() => setIngredients((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== k) : prev))}
              disabled={occupe}
              aria-label={tr('REPAS_RETIRER_ING')}
            >
              ✕
            </button>
          </div>
        ))}
        <button type="button" className="bouton discret" onClick={() => setIngredients((prev) => [...prev, ingredientVide()])} disabled={occupe}>
          {tr('REPAS_ING_AJOUTER')}
        </button>
      </div>

      <input
        className="champ"
        placeholder={tr('REPAS_NOTE_PH')}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        disabled={occupe}
      />

      <div className="rf-bebe">
        <label className="rf-check">
          <input
            type="checkbox"
            checked={favoriBebe}
            onChange={(e) => setFavoriBebe(e.target.checked)}
            disabled={occupe}
          />
          <span>{tr('REPAS_BEBE_FAVORI')}</span>
        </label>
        <label className="rf-check">
          <input
            type="checkbox"
            checked={bebePasGoute}
            onChange={(e) => setBebePasGoute(e.target.checked)}
            disabled={occupe}
          />
          <span>{tr('REPAS_BEBE_AGOUTER')}</span>
        </label>
      </div>

      <div className="rf-actions">
        {onSupprimerAction && (
          <button type="button" className="bouton discret rf-danger" onClick={onSupprimerAction} disabled={occupe}>
            {tr('G_SUPPRIMER')}
          </button>
        )}
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>
          {tr('G_ANNULER')}
        </button>
        <button type="submit" className="bouton" disabled={occupe || !nom.trim()}>
          {tr('G_ENREGISTRER')}
        </button>
      </div>
    </form>
  );
}
