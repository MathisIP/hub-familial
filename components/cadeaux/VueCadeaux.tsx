'use client';

import { useCallback, useMemo, useState } from 'react';
import { formatEuro } from '@/lib/argent';
import {
  estProche,
  STATUT_OFFERT,
  type Cadeau,
  type DonneesCadeaux,
  type Occasion,
} from '@/lib/cadeaux/schema';

/**
 * Écran Cadeaux (client) : cadeaux regroupés par occasion, avec budget prévu /
 * payé, statut (Idée → Offert), et éditeur. Rafraîchit après chaque écriture.
 */
export default function VueCadeaux({ initial }: { initial: DonneesCadeaux }) {
  const [d, setD] = useState<DonneesCadeaux>(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [edite, setEdite] = useState<number | null>(null);

  const rafraichir = useCallback(async () => {
    const r = await fetch('/api/cadeaux', { cache: 'no-store' });
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

  // Regroupement par occasion, dans l'ordre chronologique des occasions.
  const groupes = useMemo(() => grouper(d.cadeaux, d.occasions), [d.cadeaux, d.occasions]);

  return (
    <>
      {!ajout && (
        <div className="saisie-barre">
          <button className="bouton" onClick={() => setAjout(true)} disabled={occupe}>
            ＋ Nouvelle idée
          </button>
        </div>
      )}
      {ajout && (
        <CadeauForm
          d={d}
          occupe={occupe}
          onAnnulerAction={() => setAjout(false)}
          onEnregistrerAction={(corps) =>
            action(() => envoi('POST', corps)).then(() => setAjout(false))
          }
        />
      )}

      {erreur && <p className="message erreur">{erreur}</p>}

      {groupes.map(({ occasion, cadeaux }) => (
        <section className="occasion-groupe" key={occasion?.occasion ?? '—'}>
          <div className="occ-tete">
            <h2 className="occ-nom">{occasion?.occasion ?? 'Sans occasion'}</h2>
            {occasion?.date && <span className="occ-date">{occasion.date}</span>}
            {occasion && estProche(occasion) && (
              <span className="pastille echec">dans {occasion.joursRestants} j</span>
            )}
            <BudgetOccasion cadeaux={cadeaux} occasion={occasion} />
          </div>

          <ul className="liste">
            {cadeaux.map((c) =>
              edite === c.ligne ? (
                <li key={c.ligne}>
                  <CadeauForm
                    d={d}
                    cadeau={c}
                    occupe={occupe}
                    onAnnulerAction={() => setEdite(null)}
                    onEnregistrerAction={(corps) =>
                      action(() => envoi('PATCH', { ligne: c.ligne, ...corps })).then(() => setEdite(null))
                    }
                    onSupprimerAction={() =>
                      action(() => envoi('DELETE', { ligne: c.ligne })).then(() => setEdite(null))
                    }
                  />
                </li>
              ) : (
                <li key={c.ligne} className={`cadeau${c.statut === STATUT_OFFERT ? ' offert' : ''}`}>
                  <div className="cad-principal">
                    <span className="cad-idee">{c.idee}</span>
                    <span className="cad-meta">
                      {c.pourQui && <span className="puce assigne">pour {c.pourQui}</span>}
                      {c.offertPar && <span className="puce categorie">par {c.offertPar}</span>}
                      {(c.budgetNum > 0 || c.payeNum > 0) && (
                        <span className="cad-budget">
                          {c.payeNum > 0 ? formatEuro(c.payeNum) : formatEuro(c.budgetNum)}
                          {c.payeNum > 0 && c.budgetNum > 0 && <span className="cad-prevu"> / prévu {formatEuro(c.budgetNum)}</span>}
                        </span>
                      )}
                    </span>
                    {(c.ou || c.note) && (
                      <span className="cad-note">
                        {c.ou}{c.ou && c.note ? ' · ' : ''}{c.note}
                      </span>
                    )}
                  </div>
                  <div className="cad-actions">
                    <select
                      className="statut"
                      value={c.statut}
                      disabled={occupe}
                      onChange={(e) => action(() => envoi('PATCH', { ligne: c.ligne, statut: e.target.value }))}
                      aria-label={`Statut de ${c.idee}`}
                    >
                      {d.statuts.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <button className="bouton discret" onClick={() => setEdite(c.ligne)} disabled={occupe}>
                      Modifier
                    </button>
                  </div>
                </li>
              ),
            )}
          </ul>
        </section>
      ))}
    </>
  );
}

function envoi(methode: string, corps: unknown): Promise<Response> {
  return fetch('/api/cadeaux/items', {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

function grouper(cadeaux: Cadeau[], occasions: Occasion[]): { occasion: Occasion | null; cadeaux: Cadeau[] }[] {
  const parNom = new Map<string, Cadeau[]>();
  for (const c of cadeaux) {
    const cle = c.occasion || '';
    if (!parNom.has(cle)) parNom.set(cle, []);
    parNom.get(cle)!.push(c);
  }
  const groupes: { occasion: Occasion | null; cadeaux: Cadeau[] }[] = [];
  for (const o of occasions) {
    const items = parNom.get(o.occasion);
    if (items) { groupes.push({ occasion: o, cadeaux: items }); parNom.delete(o.occasion); }
  }
  for (const [nom, items] of parNom) {
    const o = occasions.find((x) => x.occasion === nom) ?? null;
    groupes.push({ occasion: o ?? (nom ? { occasion: nom, date: '', dateISO: null, budget: '', budgetNum: 0, note: '', joursRestants: null } : null), cadeaux: items });
  }
  return groupes;
}

function BudgetOccasion({ cadeaux, occasion }: { cadeaux: Cadeau[]; occasion: Occasion | null }) {
  const prevu = cadeaux.reduce((s, c) => s + c.budgetNum, 0);
  const paye = cadeaux.reduce((s, c) => s + c.payeNum, 0);
  const budgetOcc = occasion?.budgetNum ?? 0;
  const depasse = budgetOcc > 0 && prevu > budgetOcc;
  return (
    <span className="occ-budget">
      prévu <b>{formatEuro(prevu)}</b>
      {paye > 0 && <> · payé {formatEuro(paye)}</>}
      {budgetOcc > 0 && (
        <span className={depasse ? 'depasse' : ''}> {depasse ? '⚠ ' : ''}(budget {formatEuro(budgetOcc)})</span>
      )}
    </span>
  );
}

/* -------------------------------- FORMULAIRE -------------------------------- */

function CadeauForm({
  d,
  cadeau,
  occupe,
  onEnregistrerAction,
  onAnnulerAction,
  onSupprimerAction,
}: {
  d: DonneesCadeaux;
  cadeau?: Cadeau;
  occupe: boolean;
  onEnregistrerAction: (corps: Record<string, string>) => void;
  onAnnulerAction: () => void;
  onSupprimerAction?: () => void;
}) {
  const [idee, setIdee] = useState(cadeau?.idee ?? '');
  const [pourQui, setPourQui] = useState(cadeau?.pourQui ?? '');
  const [occasion, setOccasion] = useState(cadeau?.occasion ?? '');
  const [statut, setStatut] = useState(cadeau?.statut ?? d.statuts[0] ?? 'Idée');
  const [budgetPrevu, setBudgetPrevu] = useState(cadeau?.budgetPrevu ?? '');
  const [prixPaye, setPrixPaye] = useState(cadeau?.prixPaye ?? '');
  const [offertPar, setOffertPar] = useState(cadeau?.offertPar ?? '');
  const [ou, setOu] = useState(cadeau?.ou ?? '');
  const [note, setNote] = useState(cadeau?.note ?? '');

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    onEnregistrerAction({ idee, pourQui, occasion, statut, budgetPrevu, prixPaye, offertPar, ou, note });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      <div className="rf-ligne1">
        <input className="champ rf-nom" placeholder="Idée / cadeau" value={idee} onChange={(e) => setIdee(e.target.value)} disabled={occupe} autoFocus />
        <input className="champ" placeholder="Pour qui" value={pourQui} onChange={(e) => setPourQui(e.target.value)} disabled={occupe} list="cad-personnes" />
        <datalist id="cad-personnes">
          {d.offertPar.map((p) => <option key={p} value={p} />)}
        </datalist>
        <select className="champ" value={occasion} onChange={(e) => setOccasion(e.target.value)} disabled={occupe} aria-label="Occasion">
          <option value="">Occasion…</option>
          {d.occasions.map((o) => <option key={o.occasion} value={o.occasion}>{o.occasion}</option>)}
        </select>
        <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)} disabled={occupe} aria-label="Statut">
          {d.statuts.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="rf-ligne1">
        <input className="champ" inputMode="decimal" placeholder="Budget prévu (€)" value={budgetPrevu} onChange={(e) => setBudgetPrevu(e.target.value)} disabled={occupe} />
        <input className="champ" inputMode="decimal" placeholder="Prix payé (€)" value={prixPaye} onChange={(e) => setPrixPaye(e.target.value)} disabled={occupe} />
        <select className="champ" value={offertPar} onChange={(e) => setOffertPar(e.target.value)} disabled={occupe} aria-label="Offert par">
          <option value="">Offert par…</option>
          {d.offertPar.map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <input className="champ" placeholder="Où / lien" value={ou} onChange={(e) => setOu(e.target.value)} disabled={occupe} />
      </div>
      <input className="champ" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} disabled={occupe} />
      <div className="rf-actions">
        {onSupprimerAction && (
          <button type="button" className="bouton discret rf-danger" onClick={onSupprimerAction} disabled={occupe}>Supprimer</button>
        )}
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>Annuler</button>
        <button type="submit" className="bouton" disabled={occupe || !idee.trim()}>Enregistrer</button>
      </div>
    </form>
  );
}
