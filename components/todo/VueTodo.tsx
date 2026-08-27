'use client';

import { useCallback, useMemo, useState } from 'react';
import Liste from '@/components/Liste';
import Combobox from '@/components/Combobox';
import ChampDate from '@/components/ChampDate';
import { useT } from '@/components/I18nProvider';
import { useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_STATUT_TODO, CLE_PRIORITE } from '@/lib/i18n';
import type { Course, DonneesTodo, Parametres, Tache } from '@/lib/todo/schema';
import { STATUT_FAIT } from '@/lib/todo/schema';
import Astuce from '@/components/Astuce';
import ValiderCourses from '@/components/todo/ValiderCourses';

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
  const [categorie, setCategorie] = useState('');
  const [echeance, setEcheance] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [filtrePersonne, setFiltrePersonne] = useState('');

  // La valeur « commune » (Les deux / Nous deux) et les personnes individuelles.
  const nbFaites = taches.filter((t) => t.statut === STATUT_FAIT).length;
  const commun = params.personnes.find((p) => /deux/i.test(p)) ?? '';
  const individus = params.personnes.filter((p) => p !== commun);

  // Filtre : une personne voit SES tâches + les tâches communes (« Les deux »).
  const tachesAffichees = filtrePersonne
    ? taches.filter((t) => t.assigne === filtrePersonne || (commun !== '' && t.assigne === commun))
    : taches;

  /**
   * ⚠ LE FORMULAIRE N'ENVOYAIT QUE TROIS CHAMPS SUR SIX (25/08/2026). Les lignes
   * affichent la catégorie, l'échéance et la récurrence ; le service et la base
   * les acceptaient déjà — seule la saisie manquait. On voyait donc des
   * informations qu'on ne pouvait pas renseigner, et il fallait créer la tâche
   * puis la rouvrir pour les compléter.
   */
  function ajouter(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    const corps = {
      tache: titre.trim(),
      assigne,
      priorite,
      categorie,
      echeanceLabel: echeance,
      // ⚠ `'Aucune'` et non `''` : le service ne comble le défaut que sur
      // `null`/`undefined`, pas sur une chaîne vide. Sans ça, les tâches créées
      // ici porteraient une récurrence vide là où toutes les autres portent
      // « Aucune » — deux façons de dire la même chose dans la même colonne.
      recurrence: recurrence || 'Aucune',
    };
    setTitre('');
    setEcheance('');
    // ⚠ Assigné, priorité, catégorie et récurrence NE SONT PAS réinitialisés :
    // on saisit presque toujours plusieurs tâches de suite pour la même
    // personne ou le même sujet. Le titre et l'échéance, eux, changent à chaque
    // fois — les garder ferait recopier une date sur la tâche suivante.
    action(() => fetch('/api/todo/taches', json(corps)));
  }

  /**
   * Supprime une tâche.
   *
   * ⚠ CONFIRMATION EXIGÉE, y compris sur une tâche faite. Le bouton se trouve
   * au bout d'une ligne, à côté du sélecteur de statut : sur un téléphone, un
   * pouce mal placé effacerait sans retour possible. Une tâche ne vaut pas une
   * dépense, mais on ne fait pas disparaître le travail de quelqu'un d'autre
   * sans un mot.
   */
  function supprimer(t: Tache) {
    if (!confirm(`${tr('TODO_SUPPRIMER')} « ${t.tache} » ?`)) return;
    action(() =>
      fetch('/api/todo/taches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: t.id }),
      }),
    );
  }

  /** Vide toutes les tâches faites d'un coup. */
  function viderFaites() {
    if (!confirm(`${tr('TODO_VIDER_FAITES_Q')} (${nbFaites})`)) return;
    action(() =>
      fetch('/api/todo/taches', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ faites: true }),
      }),
    );
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
        {/* Les membres du foyer d'abord, puis les noms déjà employés.
            `note` dit qu'on peut assigner quelqu'un d'extérieur — la liste
            ressemble sinon à un choix fermé. */}
        <Combobox
          value={assigne}
          onChange={setAssigne}
          options={params.personnes}
          placeholder={tr('TODO_QUI')}
          ariaLabel={tr('TODO_QUI')}
          note={tr('TODO_QUI_AUTRE')}
        />
        <Liste
          valeur={priorite}
          onChange={setPriorite}
          options={params.priorites.map((p) => ({ valeur: p, libelle: tEnum(CLE_PRIORITE, p, langue) }))}
          placeholder={tr('TODO_PRIORITE')}
          ariaLabel={tr('TODO_PRIORITE')}
        />
        {/* Catégorie en saisie LIBRE : la liste est dérivée des tâches
            existantes, donc vide dans un foyer qui démarre. Un sélecteur fermé
            y bloquerait la première saisie. */}
        <Combobox
          value={categorie}
          onChange={setCategorie}
          options={params.categories}
          placeholder={tr('TODO_CATEGORIE')}
          ariaLabel={tr('TODO_CATEGORIE')}
        />
        {/* ⚠ Champ TEXTE et non `type="date"` : l'échéance est stockée en
            « jj/mm/aaaa », format hérité du classeur d'origine. Un sélecteur de
            date renverrait « aaaa-mm-jj » et les tâches se trieraient de
            travers sans que rien ne le signale.
            Les « / » sont posés automatiquement — voir ChampDate. */}
        <ChampDate
          className="champ champ-echeance"
          placeholder={tr('TODO_ECHEANCE_PH')}
          value={echeance}
          onChange={setEcheance}
          ariaLabel={tr('TODO_ECHEANCE')}
        />
        <Liste
          valeur={recurrence}
          onChange={setRecurrence}
          options={params.recurrences.map((r) => ({ valeur: r, libelle: r }))}
          placeholder={tr('TODO_RECURRENCE')}
          ariaLabel={tr('TODO_RECURRENCE')}
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
        <ul className="liste multi">
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
              {/* ⚠ Toujours présent, pas seulement sur les tâches faites : on
                  supprime aussi une tâche saisie par erreur, ou devenue sans
                  objet. La réserver aux « faites » obligerait à cocher une
                  tâche qu'on n'a jamais faite pour pouvoir l'effacer. */}
              <button
                type="button"
                className="bouton discret tache-suppr"
                onClick={() => supprimer(t)}
                disabled={occupe}
                aria-label={`${tr('TODO_SUPPRIMER')} ${t.tache}`}
              >
                ✕
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* ⚠ Sous la liste et non dans la barre du haut : c'est une action de fin
          de parcours, qu'on cherche APRÈS avoir constaté l'accumulation. En
          haut, elle se serait trouvée à portée de pouce en permanence. */}
      {nbFaites > 0 && (
        <div className="courses-actions">
          <button type="button" className="bouton discret" onClick={viderFaites} disabled={occupe}>
            {tr('TODO_VIDER_FAITES')} ({nbFaites})
          </button>
        </div>
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
        {/* ⚠ Liste FERMÉE, plus une saisie libre : les rayons sont les mêmes
            pour tout le monde, et « Autre » y est une vraie entrée. En saisie
            libre, « Epicerie » sans accent devenait un rayon de plus, aussitôt
            proposé comme suggestion — la liste se nourrissait de ses erreurs. */}
        <Liste
          valeur={rayon}
          onChange={setRayon}
          options={params.rayons.map((r) => ({ valeur: r, libelle: r }))}
          placeholder={tr('TODO_RAYON')}
          ariaLabel={tr('TODO_RAYON')}
        />
        <button className="bouton" type="submit" disabled={occupe || !article.trim()}>
          {tr('G_AJOUTER')}
        </button>
      </form>

      {courses.length === 0 ? (
        <p className="vide">{tr('TODO_LISTE_VIDE')}</p>
      ) : (
        <>
          {/* ⚠ Les rayons passent en grille sur grand écran : une liste de
              courses est faite de petits groupes, et empilés en colonne unique
              ils produisaient un ruban très long et très étroit. */}
          <div className="courses-rayons">
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
          </div>
          {/* Hors de la grille : ces actions concernent toute la liste, pas un
              rayon. ⚠ « Valider » vit désormais ICI en plus de l'accueil : on
              le cherche là où l'on vient de finir la liste. */}
          <div className="barre-outils courses-actions">
            <ValiderCourses compact />
          </div>
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
      {/* ⚠ Le rayon actuel est AJOUTÉ à la liste s'il n'y figure pas : un
          article rangé avant que la liste soit fixée garderait sinon un rayon
          que le sélecteur ne saurait pas afficher, et la simple ouverture du
          formulaire le remplacerait en silence. */}
      <Liste
        valeur={rayon}
        onChange={setRayon}
        options={(rayons.includes(rayon) || !rayon ? rayons : [rayon, ...rayons]).map((r) => ({
          valeur: r,
          libelle: r,
        }))}
        placeholder={tr('TODO_RAYON')}
        ariaLabel={tr('TODO_RAYON')}
      />
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
