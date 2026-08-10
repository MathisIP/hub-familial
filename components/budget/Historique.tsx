'use client';

import { useState } from 'react';
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
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger(p: 'mois' | 'annee') {
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
  }

  function basculer() {
    const suivant = !ouvert;
    setOuvert(suivant);
    // Premier dépliage : on charge le mois affiché, celui que la personne regarde.
    if (suivant && lignes === null) charger('mois');
  }

  return (
    <section className="hist">
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

          {occupe && <p className="hist-info">{tr('HIST_CHARGEMENT')}</p>}
          {erreur && <p className="message erreur">{erreur}</p>}

          {!occupe && lignes !== null && (
            <>
              <p className="hist-info">
                {lignes.length} {lignes.length === 1 ? tr('HIST_OP') : tr('HIST_OPS')}
                {tronque && ` · ${tr('HIST_TRONQUE')}`}
              </p>
              {lignes.length === 0 ? (
                <p className="hist-info">{tr('HIST_VIDE')}</p>
              ) : (
                <ul className="tx-liste">
                  {lignes.map((tx, i) => {
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
          )}
        </div>
      )}
    </section>
  );
}
