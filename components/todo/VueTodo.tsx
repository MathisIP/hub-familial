'use client';

import { useCallback, useMemo, useState } from 'react';
import Liste from '@/components/Liste';
import Combobox from '@/components/Combobox';
import { useT } from '@/components/I18nProvider';
import { useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_STATUT_TODO, CLE_PRIORITE } from '@/lib/i18n';
import type { Course, DonneesTodo, Parametres, Tache } from '@/lib/todo/schema';
import { STATUT_FAIT } from '@/lib/todo/schema';
import Astuce from '@/components/Astuce';

/**
 * Écran To-Do complet (client). Reçoit un premier chargement rendu côté serveur
 * (`initial`), puis rafraîchit depuis /api/todo après chaque mutation — les
 * Sheets restent la source de vérité, l'app ne garde jamais d'état divergent.
 */
export default function VueTodo({ initial }: { initial: DonneesTodo }) {
  const tr = useT();
  const [donnees, setDonnees] = useState<DonneesTodo>(initial);
  /*
   * L'onglet peut être imposé par l'URL : c'est ce qui permet à la notification
   * « la liste de courses est prête » d'ouvrir directement la bonne liste, au
   * lieu de déposer la personne sur les tâches, à elle de chercher.
   */
  const [onglet, setOnglet] = useState<'taches' | 'courses'>(
    typeof window !== 'undefined' &&
      new URLSearchParams(window.location.search).get('onglet') === 'courses'
      ? 'courses'
      : 'taches',
  );
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const rafraichir = useCallback(async () => {
    const r = await fetch('/api/todo', { cache: 'no-store' });
    if (!r.ok) throw new Error((await r.json()).erreur ?? 'Erreur de chargement.');
    setDonnees(await r.json());
  }, []);

  /** Enveloppe commune : verrouille, appelle l'API, rafraîchit, gère l'erreur. */
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

  const nbCoursesFaites = useMemo(
    () => donnees.courses.filter((c) => c.fait).length,
    [donnees.courses],
  );

  return (
    <>
      <div className="tabs" role="tablist">
        <button
          className="tab"
          role="tab"
          aria-selected={onglet === 'taches'}
          onClick={() => setOnglet('taches')}
        >
          ✅ {tr('TODO_TAB_TACHES')} ({donnees.taches.filter((t) => t.statut !== STATUT_FAIT).length})
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={onglet === 'courses'}
          onClick={() => setOnglet('courses')}
        >
          🛒 {tr('TODO_TAB_COURSES')} ({donnees.courses.length - nbCoursesFaites})
        </button>
      </div>

      {erreur && <p className="message erreur">{erreur}</p>}

      {onglet === 'taches' ? (
        <OngletTaches
          taches={donnees.taches}
          params={donnees.parametres}
          occupe={occupe}
          action={action}
        />
      ) : (
        <OngletCourses
          courses={donnees.courses}
          params={donnees.parametres}
          occupe={occupe}
          nbFaites={nbCoursesFaites}
          action={action}
        />
      )}
    </>
  );
}

type ActionFn = (fn: () => Promise<Response>) => Promise<void>;
const json = (corps: unknown): RequestInit => ({
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(corps),
});

/* --------------------------------- TÂCHES --------------------------------- */

function OngletTaches({
  taches,
  params,
  occupe,
  action,
}: {
  taches: Tache[];
  params: Parametres;
  occupe: boolean;
  action: ActionFn;
}) {
  const tr = useT();
  const langue = useLangue();
  const [titre, setTitre] = useState('');
  const [assigne, setAssigne] = useState('');
  const [priorite, setPriorite] = useState('');
  const [filtrePersonne, setFiltrePersonne] = useState('');

  // La valeur « commune » (Les deux / Nous deux) et les personnes individuelles.
  const commun = params.personnes.find((p) => /deux/i.test(p)) ?? '';
  const individus = params.personnes.filter((p) => p !== commun);

  // Filtre : une personne voit SES tâches + les tâches communes (« Les deux »).
  const tachesAffichees = filtrePersonne
    ? taches.filter((t) => t.assigne === filtrePersonne || (commun !== '' && t.assigne === commun))
    : taches;

  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    const corps = { tache: titre.trim(), assigne, priorite };
    setTitre('');
    action(() => fetch('/api/todo/taches', json(corps)));
  }

  function changerStatut(id: string, statut: string) {
    action(() =>
      fetch('/api/todo/taches', { ...json({ id, statut }), method: 'PATCH' }),
    );
  }

  return (
    <>
      <form className="ajout" onSubmit={ajouter}>
        <input
          className="champ"
          placeholder={tr('TODO_NOUVELLE_TACHE')}
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          aria-label={tr('TODO_NOUVELLE_TACHE')}
        />
        <Combobox value={assigne} onChange={setAssigne} options={params.personnes} placeholder={tr('TODO_QUI')} ariaLabel={tr('TODO_QUI')} />
        <Liste
          valeur={priorite}
          onChange={setPriorite}
          options={params.priorites.map((p) => ({ valeur: p, libelle: tEnum(CLE_PRIORITE, p, langue) }))}
          placeholder={tr('TODO_PRIORITE')}
          ariaLabel={tr('TODO_PRIORITE')}
        />
        <button className="bouton" type="submit" disabled={occupe || !titre.trim()}>
          {tr('G_AJOUTER')}
        </button>
      </form>

      {individus.length > 1 && (
        <div className="filtre-personnes" role="tablist" aria-label="Filtrer par personne">
          <button
            className={`type-btn${!filtrePersonne ? ' actif' : ''}`}
            role="tab"
            aria-selected={!filtrePersonne}
            onClick={() => setFiltrePersonne('')}
          >
            {tr('TODO_TOUS')}
          </button>
          {individus.map((p) => (
            <button
              key={p}
              className={`type-btn${filtrePersonne === p ? ' actif' : ''}`}
              role="tab"
              aria-selected={filtrePersonne === p}
              onClick={() => setFiltrePersonne(p)}
            >
              {p}
            </button>
          ))}
        </div>
      )}

      {tachesAffichees.length === 0 ? (
        <p className="vide">
          {taches.length === 0
            ? tr('TODO_AUCUNE_TACHE')
            : `${tr('TODO_AUCUNE_POUR')} ${filtrePersonne}.`}
        </p>
      ) : (
        <ul className="liste">
          {tachesAffichees.map((t) => (
            <li
              key={t.id}
              className={`tache${t.statut === STATUT_FAIT ? ' faite' : ''}${t.enRetard ? ' retard' : ''}`}
            >
              <span className="titre-tache">{t.tache}</span>
              <span className="meta">
                {t.priorite && (
                  <span className={`puce prio-${accent(t.priorite)}`}>{tEnum(CLE_PRIORITE, t.priorite, langue)}</span>
                )}
                {t.assigne && <span className="puce assigne">{t.assigne}</span>}
                {t.categorie && <span className="puce categorie">{t.categorie}</span>}
                {t.echeanceLabel && (
                  <span className={`puce echeance${t.enRetard ? ' retard' : ''}`}>
                    {t.enRetard ? '⚠ ' : ''}{t.echeanceLabel}
                  </span>
                )}
                {t.recurrence && t.recurrence !== 'Aucune' && (
                  <span className="puce categorie">↻ {t.recurrence}</span>
                )}
              </span>
              <Liste
                className="statut"
                valeur={t.statut}
                disabled={occupe}
                onChange={(v) => changerStatut(t.id, v)}
                options={params.statuts.map((s) => ({ valeur: s, libelle: tEnum(CLE_STATUT_TODO, s, langue) }))}
                ariaLabel={`Statut de « ${t.tache} »`}
              />
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

/** « Haute » → « haute », « Moyenne » → « moyenne » (sert au nom de classe CSS). */
function accent(priorite: string): string {
  const p = priorite.toLowerCase();
  if (p.startsWith('h')) return 'haute';
  if (p.startsWith('m')) return 'moyenne';
  return 'basse';
}

/* --------------------------------- COURSES -------------------------------- */

function OngletCourses({
  courses,
  params,
  occupe,
  nbFaites,
  action,
}: {
  courses: Course[];
  params: Parametres;
  occupe: boolean;
  nbFaites: number;
  action: ActionFn;
}) {
  const tr = useT();
  const [article, setArticle] = useState('');
  const [quantite, setQuantite] = useState('');
  const [rayon, setRayon] = useState('');
  const [edite, setEdite] = useState<string | null>(null);

  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!article.trim()) return;
    const corps = { article: article.trim(), quantite: quantite.trim(), rayon };
    setArticle('');
    setQuantite('');
    setRayon('');
    action(() => fetch('/api/todo/courses', json(corps)));
  }

  function cocher(id: string, fait: boolean) {
    action(() =>
      fetch('/api/todo/courses', { ...json({ id, fait }), method: 'PATCH' }),
    );
  }

  function viderFaites() {
    action(() => fetch('/api/todo/courses', { method: 'DELETE' }));
  }

  // Regroupement par rayon, dans l'ordre déclaré dans Paramètres.
  const groupes = useMemo(() => grouperParRayon(courses, params.rayons), [courses, params.rayons]);

  return (
    <>
      <form className="ajout ajout-courses" onSubmit={ajouter}>
        <input
          className="champ"
          placeholder={tr('TODO_ARTICLE_PH')}
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          aria-label={tr('TODO_ARTICLE_PH')}
        />
        <input
          className="champ champ-qte"
          placeholder={tr('TODO_QTE_PH')}
          value={quantite}
          onChange={(e) => setQuantite(e.target.value)}
          aria-label={tr('CS_QTE')}
        />
        <Astuce texte={tr('AIDE_QUANTITE')} />
        <Combobox value={rayon} onChange={setRayon} options={params.rayons} placeholder={tr('TODO_RAYON')} ariaLabel={tr('TODO_RAYON')} />
        <button className="bouton" type="submit" disabled={occupe || !article.trim()}>
          {tr('G_AJOUTER')}
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="vide">{tr('TODO_LISTE_VIDE')}</p>
      ) : (
        <>
          {groupes.map(({ rayon: nomRayon, articles }) => (
            <div className="rayon-groupe" key={nomRayon || '—'}>
              {nomRayon && <p className="rayon-titre">{nomRayon}</p>}
              <ul className="liste">
                {articles.map((c) =>
                  edite === c.id ? (
                    <li key={c.id}>
                      <EditionCourse
                        course={c}
                        rayons={params.rayons}
                        occupe={occupe}
                        onAnnuler={() => setEdite(null)}
                        onEnregistrer={(corps) =>
                          action(() =>
                            fetch('/api/todo/courses', { ...json({ id: c.id, ...corps }), method: 'PUT' }),
                          ).then(() => setEdite(null))
                        }
                      />
                    </li>
                  ) : (
                    <li key={c.id} className={`course${c.fait ? ' faite' : ''}`}>
                      <input
                        type="checkbox"
                        checked={c.fait}
                        disabled={occupe}
                        onChange={(e) => cocher(c.id, e.target.checked)}
                        aria-label={c.article}
                      />
                      <span className="article">{c.article}</span>
                      {c.quantite && <span className="course-qte">{c.quantite}</span>}
                      {c.rayon && !nomRayon && <span className="rayon">{c.rayon}</span>}
                      <button
                        className="bouton discret course-mod"
                        onClick={() => setEdite(c.id)}
                        disabled={occupe}
                      >
                        {tr('G_MODIFIER')}
                      </button>
                    </li>
                  ),
                )}
              </ul>
            </div>
          ))}
          {nbFaites > 0 && (
            <div className="barre-outils">
              <button className="bouton discret" onClick={viderFaites} disabled={occupe}>
                {tr('TODO_RETIRER_1')} {nbFaites} {tr('TODO_RETIRER_2')}
              </button>
            </div>
          )}
        </>
      )}
    </>
  );
}

/** Édition inline d'un article de courses (libellé, quantité, rayon). */
function EditionCourse({
  course,
  rayons,
  occupe,
  onAnnuler,
  onEnregistrer,
}: {
  course: Course;
  rayons: string[];
  occupe: boolean;
  onAnnuler: () => void;
  onEnregistrer: (corps: { article: string; quantite: string; rayon: string }) => void;
}) {
  const tr = useT();
  const [article, setArticle] = useState(course.article);
  const [quantite, setQuantite] = useState(course.quantite);
  const [rayon, setRayon] = useState(course.rayon);

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!article.trim()) return;
    onEnregistrer({ article: article.trim(), quantite: quantite.trim(), rayon });
  }

  return (
    <form className="ajout ajout-courses course-edit" onSubmit={soumettre}>
      <input
        className="champ"
        value={article}
        onChange={(e) => setArticle(e.target.value)}
        aria-label="Article"
        autoFocus
      />
      <input
        className="champ champ-qte"
        value={quantite}
        placeholder={tr('CS_QTE')}
        onChange={(e) => setQuantite(e.target.value)}
        aria-label={tr('CS_QTE')}
      />
      <Combobox value={rayon} onChange={setRayon} options={rayons} placeholder={tr('TODO_RAYON')} ariaLabel={tr('TODO_RAYON')} />
      <button className="bouton" type="submit" disabled={occupe || !article.trim()}>
        {tr('G_OK')}
      </button>
      <button type="button" className="bouton discret" onClick={onAnnuler} disabled={occupe}>
        {tr('G_ANNULER')}
      </button>
    </form>
  );
}

function grouperParRayon(
  courses: Course[],
  ordreRayons: string[],
): { rayon: string; articles: Course[] }[] {
  const parRayon = new Map<string, Course[]>();
  for (const c of courses) {
    const cle = c.rayon || '';
    if (!parRayon.has(cle)) parRayon.set(cle, []);
    parRayon.get(cle)!.push(c);
  }
  const ordonnes: string[] = [...ordreRayons.filter((r) => parRayon.has(r))];
  for (const cle of parRayon.keys()) {
    if (!ordonnes.includes(cle)) ordonnes.push(cle); // rayons hors liste + sans rayon à la fin
  }
  return ordonnes.map((rayon) => ({ rayon, articles: parRayon.get(rayon)! }));
}
