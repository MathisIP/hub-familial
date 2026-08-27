'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/components/I18nProvider';
import { TYPE_DEPENSE, TYPE_REVENU, type SelectionMois, type Transaction } from '@/lib/budget/schema';

/**
 * Historique des opérations — replié par défaut, en bas de la page Budget.
 *
 * ⚠ Discret À DESSEIN. Le tableau de bord répond à « où en suis-je ce mois-ci »,
 * et c'est la question qu'on se pose neuf fois sur dix. L'historique répond à
 * « qu'ai-je dépensé en mars », qu'on se pose rarement mais qu'il faut pouvoir
 * poser. Le déplier d'office rallongerait la page pour tout le monde afin de
 * servir un besoin occasionnel.
 *
 * Il n'est chargé qu'au clic : c'est ce qui permet au tableau de bord de rester
 * léger quelle que soit l'ancienneté du foyer (cf. `chargerTables`).
 */
export default function Historique({
  selection,
  periodeLibelle,
}: {
  selection: SelectionMois;
  periodeLibelle: string;
}) {
  const tr = useT();
  const [ouvert, setOuvert] = useState(false);
  const [periode, setPeriode] = useState<'mois' | 'annee'>('mois');
  const [lignes, setLignes] = useState<Transaction[] | null>(null);
  const [tronque, setTronque] = useState(false);
  /** Filtre de type, posé par les tuiles du tableau de bord (ancre). */
  const [filtre, setFiltre] = useState<'' | typeof TYPE_REVENU | typeof TYPE_DEPENSE>('');
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  const charger = useCallback(async function charger(p: 'mois' | 'annee') {
    setPeriode(p);
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch(
        `/api/budget/historique?periode=${p}&annee=${selection.annee}&mois=${selection.mois}`,
        { cache: 'no-store' },
      );
      if (!r.ok) throw new Error((await r.json()).erreur ?? tr('G_ERR_CHARGEMENT'));
      const d = await r.json();
      setLignes(d.transactions);
      setTronque(d.tronque);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setLignes(null);
    } finally {
      setOccupe(false);
    }
  }, [selection.annee, selection.mois, tr]);

  /*
   * Ouverture depuis les tuiles du tableau de bord.
   *
   * ⚠ PAR L'ANCRE, et pas par un état partagé : `VueBudget` est un composant
   * SERVEUR, il ne peut ni tenir un état ni passer une fonction de rappel. Le
   * lien reste par ailleurs utilisable au clavier, au clic droit et avant même
   * que la page soit hydratée.
   *
   * ⚠ On écoute `hashchange` EN PLUS du montage : cliquer deux fois la même
   * tuile ne change pas l'URL et ne déclencherait donc aucun événement — mais
   * repartir d'une autre tuile, si. Sans cet écouteur, le filtre resterait figé
   * sur le premier choix de la visite.
   */
  const appliquerAncre = useCallback(() => {
    const h = typeof window === 'undefined' ? '' : window.location.hash;
    if (!h.startsWith('#historique')) return;
    setOuvert(true);
    setFiltre(h === '#historique-revenu' ? TYPE_REVENU : h === '#historique-depense' ? TYPE_DEPENSE : '');
    if (lignes === null) charger('mois');
  }, [charger, lignes]);

  useEffect(() => {
    appliquerAncre();
    window.addEventListener('hashchange', appliquerAncre);
    return () => window.removeEventListener('hashchange', appliquerAncre);
  }, [appliquerAncre]);

  function basculer() {
    const suivant = !ouvert;
    setOuvert(suivant);
    // Premier dépliage : on charge le mois affiché, celui que la personne regarde.
    if (suivant && lignes === null) charger('mois');
  }

  return (
    <section className="hist" id="historique">
      <button
        type="button"
        className="hist-bascule"
        onClick={basculer}
        aria-expanded={ouvert}
      >
        <span aria-hidden="true">{ouvert ? '－' : '＋'}</span> {tr('HIST_TITRE')}
      </button>

      {ouvert && (
        <div className="hist-corps">
          <div className="hist-periodes">
            <button
              type="button"
              className={`hist-onglet${periode === 'mois' ? ' actif' : ''}`}
              onClick={() => charger('mois')}
              disabled={occupe}
            >
              {periodeLibelle}
            </button>
            <button
              type="button"
              className={`hist-onglet${periode === 'annee' ? ' actif' : ''}`}
              onClick={() => charger('annee')}
              disabled={occupe}
            >
              {tr('HIST_ANNEE')} {selection.annee}
            </button>
          </div>

          {/* ⚠ Le filtre est VISIBLE et réinitialisable. Posé par une tuile, il
              resterait sinon un état caché : on verrait une liste incomplète
              sans savoir pourquoi, ni comment retrouver le reste. */}
          <div className="hist-periodes hist-filtres">
            {([['', 'HIST_TOUT'], [TYPE_REVENU, 'HIST_REVENUS'], [TYPE_DEPENSE, 'HIST_DEPENSES']] as const).map(
              ([v, cle]) => (
                <button
                  key={cle}
                  type="button"
                  className={`hist-onglet${filtre === v ? ' actif' : ''}`}
                  onClick={() => setFiltre(v)}
                  disabled={occupe}
                >
                  {tr(cle)}
                </button>
              ),
            )}
          </div>

          {occupe && <p className="hist-info">{tr('HIST_CHARGEMENT')}</p>}
          {erreur && <p className="message erreur">{erreur}</p>}

          {/* ⚠ Filtrage CÔTÉ CLIENT : les opérations de la période sont déjà
              chargées. Rappeler l'API à chaque bascule ajouterait un
              aller-retour pour retirer des lignes qu'on a déjà en main. */}
          {!occupe && lignes !== null && (() => {
            const visibles = filtre ? lignes.filter((t) => t.type === filtre) : lignes;
            return (
            <>
              <p className="hist-info">
                {visibles.length} {visibles.length === 1 ? tr('HIST_OP') : tr('HIST_OPS')}
                {tronque && ` · ${tr('HIST_TRONQUE')}`}
              </p>
              {visibles.length === 0 ? (
                <p className="hist-info">{tr('HIST_VIDE')}</p>
              ) : (
                <ul className="tx-liste">
                  {visibles.map((tx, i) => {
                    const classe =
                      tx.type === TYPE_DEPENSE
                        ? 'depense'
                        : tx.type === TYPE_REVENU
                          ? 'revenu'
                          : 'virement';
                    const signe =
                      tx.type === TYPE_DEPENSE ? '−' : tx.type === TYPE_REVENU ? '+' : '';
                    return (
                      <li className="tx" key={`${tx.date}-${tx.libelle}-${i}`}>
                        <span className="tx-date">{tx.date}</span>
                        <span className="tx-lib">{tx.libelle || tr('BUD_SANS_LIBELLE')}</span>
                        <span className="tx-meta">
                          {tx.compte}
                          {tx.dest ? ` → ${tx.dest}` : ''}
                          {tx.categorie ? ` · ${tx.categorie}` : ''}
                        </span>
                        <span className={`tx-montant ${classe}`}>
                          {signe}
                          {tx.montant}
                        </span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
            );
          })()}
        </div>
      )}
    </section>
  );
}
