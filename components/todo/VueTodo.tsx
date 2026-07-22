'use client';

import { useCallback, useMemo, useState } from 'react';
import type { Course, DonneesTodo, Parametres, Tache } from '@/lib/todo/schema';
import { STATUT_FAIT } from '@/lib/todo/schema';

/**
 * Écran To-Do complet (client). Reçoit un premier chargement rendu côté serveur
 * (`initial`), puis rafraîchit depuis /api/todo après chaque mutation — les
 * Sheets restent la source de vérité, l'app ne garde jamais d'état divergent.
 */
export default function VueTodo({ initial }: { initial: DonneesTodo }) {
  const [donnees, setDonnees] = useState<DonneesTodo>(initial);
  const [onglet, setOnglet] = useState<'taches' | 'courses'>('taches');
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
          ✅ Tâches ({donnees.taches.filter((t) => t.statut !== STATUT_FAIT).length})
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={onglet === 'courses'}
          onClick={() => setOnglet('courses')}
        >
          🛒 Courses ({donnees.courses.length - nbCoursesFaites})
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

  function changerStatut(ligne: number, statut: string) {
    action(() =>
      fetch('/api/todo/taches', { ...json({ ligne, statut }), method: 'PATCH' }),
    );
  }

  return (
    <>
      <form className="ajout" onSubmit={ajouter}>
        <input
          className="champ"
          placeholder="Nouvelle tâche…"
          value={titre}
          onChange={(e) => setTitre(e.target.value)}
          aria-label="Titre de la tâche"
        />
        <select className="champ" value={assigne} onChange={(e) => setAssigne(e.target.value)} aria-label="Assigné à">
          <option value="">Qui ?</option>
          {params.personnes.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <select className="champ" value={priorite} onChange={(e) => setPriorite(e.target.value)} aria-label="Priorité">
          <option value="">Priorité</option>
          {params.priorites.map((p) => (
            <option key={p} value={p}>{p}</option>
          ))}
        </select>
        <button className="bouton" type="submit" disabled={occupe || !titre.trim()}>
          Ajouter
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
            Tous
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
            ? 'Aucune tâche. Ajoute la première ci-dessus.'
            : `Aucune tâche pour ${filtrePersonne}.`}
        </p>
      ) : (
        <ul className="liste">
          {tachesAffichees.map((t) => (
            <li
              key={t.ligne}
              className={`tache${t.statut === STATUT_FAIT ? ' faite' : ''}${t.enRetard ? ' retard' : ''}`}
            >
              <span className="titre-tache">{t.tache}</span>
              <span className="meta">
                {t.priorite && (
                  <span className={`puce prio-${accent(t.priorite)}`}>{t.priorite}</span>
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
              <select
                className="statut"
                value={t.statut}
                disabled={occupe}
                onChange={(e) => changerStatut(t.ligne, e.target.value)}
                aria-label={`Statut de « ${t.tache} »`}
              >
                {params.statuts.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
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
  const [article, setArticle] = useState('');
  const [rayon, setRayon] = useState('');

  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!article.trim()) return;
    const corps = { article: article.trim(), rayon };
    setArticle('');
    action(() => fetch('/api/todo/courses', json(corps)));
  }

  function cocher(ligne: number, fait: boolean) {
    action(() =>
      fetch('/api/todo/courses', { ...json({ ligne, fait }), method: 'PATCH' }),
    );
  }

  function viderFaites() {
    action(() => fetch('/api/todo/courses', { method: 'DELETE' }));
  }

  // Regroupement par rayon, dans l'ordre déclaré dans Paramètres.
  const groupes = useMemo(() => grouperParRayon(courses, params.rayons), [courses, params.rayons]);

  return (
    <>
      <form className="ajout" onSubmit={ajouter}>
        <input
          className="champ"
          placeholder="Article à acheter…"
          value={article}
          onChange={(e) => setArticle(e.target.value)}
          aria-label="Article"
        />
        <select className="champ" value={rayon} onChange={(e) => setRayon(e.target.value)} aria-label="Rayon">
          <option value="">Rayon</option>
          {params.rayons.map((r) => (
            <option key={r} value={r}>{r}</option>
          ))}
        </select>
        <button className="bouton" type="submit" disabled={occupe || !article.trim()}>
          Ajouter
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="vide">Liste vide. Ajoute un article ci-dessus.</p>
      ) : (
        <>
          {groupes.map(({ rayon: nomRayon, articles }) => (
            <div className="rayon-groupe" key={nomRayon || '—'}>
              {nomRayon && <p className="rayon-titre">{nomRayon}</p>}
              <ul className="liste">
                {articles.map((c) => (
                  <li key={c.ligne} className={`course${c.fait ? ' faite' : ''}`}>
                    <input
                      type="checkbox"
                      checked={c.fait}
                      disabled={occupe}
                      onChange={(e) => cocher(c.ligne, e.target.checked)}
                      aria-label={c.article}
                    />
                    <span className="article">{c.article}</span>
                    {c.rayon && !nomRayon && <span className="rayon">{c.rayon}</span>}
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {nbFaites > 0 && (
            <div className="barre-outils">
              <button className="bouton discret" onClick={viderFaites} disabled={occupe}>
                Retirer les {nbFaites} article(s) coché(s)
              </button>
            </div>
          )}
        </>
      )}
    </>
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
