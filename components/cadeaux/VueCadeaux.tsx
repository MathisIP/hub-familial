'use client';

import { useCallback, useMemo, useState } from 'react';
import Combobox from '@/components/Combobox';
import { useT, useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_STATUT_CADEAU } from '@/lib/i18n';
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
  const tr = useT();
  const langue = useLangue();
  const [d, setD] = useState<DonneesCadeaux>(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [edite, setEdite] = useState<string | null>(null);

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
            ＋ {tr('CAD_NOUVELLE')}
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
            <h2 className="occ-nom">{occasion?.occasion ?? tr('CAD_SANS_OCCASION')}</h2>
            {occasion?.date && <span className="occ-date">{occasion.date}</span>}
            {occasion && estProche(occasion) && (
              <span className="pastille echec">{tr('REL_DANS')} {occasion.joursRestants} {tr('REL_J')}</span>
            )}
            <BudgetOccasion cadeaux={cadeaux} occasion={occasion} />
          </div>

          <ul className="liste">
            {cadeaux.map((c) =>
              edite === c.id ? (
                <li key={c.id}>
                  <CadeauForm
                    d={d}
                    cadeau={c}
                    occupe={occupe}
                    onAnnulerAction={() => setEdite(null)}
                    onEnregistrerAction={(corps) =>
                      action(() => envoi('PATCH', { id: c.id, ...corps })).then(() => setEdite(null))
                    }
                    onSupprimerAction={() =>
                      action(() => envoi('DELETE', { id: c.id })).then(() => setEdite(null))
                    }
                  />
                </li>
              ) : (
                <li key={c.id} className={`cadeau${c.statut === STATUT_OFFERT ? ' offert' : ''}`}>
                  <div className="cad-principal">
                    <span className="cad-idee">{c.idee}</span>
                    <span className="cad-meta">
                      {c.pourQui && <span className="puce assigne">{tr('CAD_POUR')} {c.pourQui}</span>}
                      {c.offertPar && <span className="puce categorie">{tr('CAD_PAR')} {c.offertPar}</span>}
                      {c.partage && <span className="puce categorie">🎁 {tr('CAD_BADGE_PARTAGE')}</span>}
                      {c.partage ? (
                        (c.participationNum > 0 || c.payeNum > 0) && (
                          <span className="cad-budget">
                            {formatEuro(c.participationNum)} <span className="cad-prevu">({tr('CAD_PART')})</span>
                            {c.payeNum > 0 && <span className="cad-prevu"> · {tr('CAD_COUT')} {formatEuro(c.payeNum)}</span>}
                          </span>
                        )
                      ) : (
                        (c.budgetNum > 0 || c.payeNum > 0) && (
                          <span className="cad-budget">
                            {c.payeNum > 0 ? formatEuro(c.payeNum) : formatEuro(c.budgetNum)}
                            {c.payeNum > 0 && c.budgetNum > 0 && <span className="cad-prevu"> / {tr('CAD_PREVU')} {formatEuro(c.budgetNum)}</span>}
                          </span>
                        )
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
                      onChange={(e) => action(() => envoi('PATCH', { id: c.id, statut: e.target.value }))}
                      aria-label={`Statut de ${c.idee}`}
                    >
                      {d.statuts.map((s) => (
                        <option key={s} value={s}>{tEnum(CLE_STATUT_CADEAU, s, langue)}</option>
                      ))}
                    </select>
                    <button className="bouton discret" onClick={() => setEdite(c.id)} disabled={occupe}>
                      {tr('G_MODIFIER')}
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
  const tr = useT();
  const prevu = cadeaux.reduce((s, c) => s + c.budgetNum, 0);
  const paye = cadeaux.reduce((s, c) => s + c.depenseNum, 0);
  const budgetOcc = occasion?.budgetNum ?? 0;
  const depasse = budgetOcc > 0 && prevu > budgetOcc;
  return (
    <span className="occ-budget">
      {tr('CAD_PREVU')} <b>{formatEuro(prevu)}</b>
      {paye > 0 && <> · {tr('CAD_PAYE')} {formatEuro(paye)}</>}
      {budgetOcc > 0 && (
        <span className={depasse ? 'depasse' : ''}> {depasse ? '⚠ ' : ''}({tr('CAD_BUDGET')} {formatEuro(budgetOcc)})</span>
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
  onEnregistrerAction: (corps: Record<string, string | boolean>) => void;
  onAnnulerAction: () => void;
  onSupprimerAction?: () => void;
}) {
  const tr = useT();
  const langue = useLangue();
  const [idee, setIdee] = useState(cadeau?.idee ?? '');
  const [pourQui, setPourQui] = useState(cadeau?.pourQui ?? '');
  const [occasion, setOccasion] = useState(cadeau?.occasion ?? '');
  const [statut, setStatut] = useState(cadeau?.statut ?? d.statuts[0] ?? 'Idée');
  const [budgetPrevu, setBudgetPrevu] = useState(cadeau?.budgetPrevu ?? '');
  const [prixPaye, setPrixPaye] = useState(cadeau?.prixPaye ?? '');
  const [partage, setPartage] = useState(cadeau?.partage ?? false);
  const [participation, setParticipation] = useState(cadeau?.participation ?? '');
  const [offertPar, setOffertPar] = useState(cadeau?.offertPar ?? '');
  const [ou, setOu] = useState(cadeau?.ou ?? '');
  const [note, setNote] = useState(cadeau?.note ?? '');

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    onEnregistrerAction({ idee, pourQui, occasion, statut, budgetPrevu, prixPaye, partage, participation, offertPar, ou, note });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      <div className="rf-ligne1">
        <input className="champ rf-nom" placeholder={tr('CAD_IDEE_PH')} value={idee} onChange={(e) => setIdee(e.target.value)} disabled={occupe} autoFocus />
        <Combobox value={pourQui} onChange={setPourQui} options={d.offertPar} placeholder={tr('CAD_POUR_QUI')} disabled={occupe} ariaLabel={tr('CAD_POUR_QUI')} />
        <Combobox value={occasion} onChange={setOccasion} options={d.occasions.map((o) => o.occasion)} placeholder={tr('CAD_OCCASION')} disabled={occupe} ariaLabel={tr('CAD_OCCASION')} />
        <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)} disabled={occupe} aria-label={tr('EVT_STATUT')}>
          {d.statuts.map((s) => <option key={s} value={s}>{tEnum(CLE_STATUT_CADEAU, s, langue)}</option>)}
        </select>
      </div>
      <div className="rf-ligne1">
        <input className="champ" inputMode="decimal" placeholder={tr('CAD_BUDGET_PH')} value={budgetPrevu} onChange={(e) => setBudgetPrevu(e.target.value)} disabled={occupe} />
        <input className="champ" inputMode="decimal" placeholder={partage ? tr('CAD_COUT_PH') : tr('CAD_PRIX_PH')} value={prixPaye} onChange={(e) => setPrixPaye(e.target.value)} disabled={occupe} />
        <Combobox value={offertPar} onChange={setOffertPar} options={d.offertPar} placeholder={tr('CAD_OFFERT_PAR')} disabled={occupe} ariaLabel={tr('CAD_OFFERT_PAR')} />
        <input className="champ" placeholder={tr('CAD_OU_PH')} value={ou} onChange={(e) => setOu(e.target.value)} disabled={occupe} />
      </div>
      <div className="rf-ligne1">
        <label className="rf-check">
          <input type="checkbox" checked={partage} onChange={(e) => setPartage(e.target.checked)} disabled={occupe} />
          <span>🎁 {tr('CAD_PARTAGE')}</span>
        </label>
        {partage && (
          <input className="champ" inputMode="decimal" placeholder={tr('CAD_PARTICIPATION_PH')} value={participation} onChange={(e) => setParticipation(e.target.value)} disabled={occupe} />
        )}
      </div>
      <input className="champ" placeholder={tr('G_NOTE')} value={note} onChange={(e) => setNote(e.target.value)} disabled={occupe} />
      <div className="rf-actions">
        {onSupprimerAction && (
          <button type="button" className="bouton discret rf-danger" onClick={onSupprimerAction} disabled={occupe}>{tr('G_SUPPRIMER')}</button>
        )}
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>{tr('G_ANNULER')}</button>
        <button type="submit" className="bouton" disabled={occupe || !idee.trim()}>{tr('G_ENREGISTRER')}</button>
      </div>
    </form>
  );
}
