'use client';

import { useCallback, useState } from 'react';
import { formatEuro } from '@/lib/argent';
import type { DonneesEvenements, Evenement } from '@/lib/evenements/schema';

/**
 * Écran Événements (client) : cartes d'événements avec récap (invités confirmés,
 * avancement de la checklist, coût du menu), statut et édition. Les événements
 * qui n'existent que dans les sous-onglets sont éditables → créent une ligne
 * dans l'onglet maître.
 */
export default function VueEvenements({ initial }: { initial: DonneesEvenements }) {
  const [d, setD] = useState<DonneesEvenements>(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [edite, setEdite] = useState<string | null>(null); // clé = nom

  const rafraichir = useCallback(async () => {
    const r = await fetch('/api/evenements', { cache: 'no-store' });
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

  function statutChange(ev: Evenement, statut: string) {
    // Stub (pas encore dans le maître) : on crée la ligne avec ce statut.
    action(() => (ev.ligne ? envoi('PATCH', { ligne: ev.ligne, statut }) : envoi('POST', { nom: ev.nom, statut })));
  }

  return (
    <>
      {!ajout && (
        <div className="saisie-barre">
          <button className="bouton" onClick={() => setAjout(true)} disabled={occupe}>
            ＋ Nouvel événement
          </button>
        </div>
      )}
      {ajout && (
        <EvenementForm
          d={d}
          occupe={occupe}
          onAnnulerAction={() => setAjout(false)}
          onEnregistrerAction={(corps) => action(() => envoi('POST', corps)).then(() => setAjout(false))}
        />
      )}

      {erreur && <p className="message erreur">{erreur}</p>}

      {d.evenements.length === 0 ? (
        <p className="vide">Aucun événement. Ajoute le premier ci-dessus.</p>
      ) : (
        <ul className="liste ev-liste">
          {d.evenements.map((ev) =>
            edite === ev.nom ? (
              <li key={ev.nom}>
                <EvenementForm
                  d={d}
                  evenement={ev}
                  occupe={occupe}
                  onAnnulerAction={() => setEdite(null)}
                  onEnregistrerAction={(corps) =>
                    action(() => (ev.ligne ? envoi('PATCH', { ligne: ev.ligne, ...corps }) : envoi('POST', corps))).then(() => setEdite(null))
                  }
                />
              </li>
            ) : (
              <li key={ev.nom} className="ev-carte">
                <div className="ev-tete">
                  <span className="ev-nom">{ev.nom}</span>
                  {ev.type && <span className="puce categorie">{ev.type}</span>}
                  {ev.joursRestants !== null && (
                    <span className={`puce ${ev.joursRestants < 0 ? '' : ev.joursRestants <= 14 ? 'echec' : ''}`.trim() || 'echeance'}>
                      {libelleJours(ev.joursRestants)}
                    </span>
                  )}
                  <select
                    className="statut"
                    value={ev.statut}
                    disabled={occupe}
                    onChange={(e) => statutChange(ev, e.target.value)}
                    aria-label={`Statut de ${ev.nom}`}
                  >
                    <option value="">—</option>
                    {d.statuts.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <button className="bouton discret" onClick={() => setEdite(ev.nom)} disabled={occupe}>
                    Modifier
                  </button>
                </div>

                <div className="ev-infos">
                  {ev.date && <span>📅 {ev.date}{ev.heure ? ` · ${ev.heure}` : ''}</span>}
                  {ev.lieu && <span>📍 {ev.lieu}</span>}
                  {ev.budgetNum > 0 && (
                    <span>💶 {formatEuro(ev.depenseNum)} / {formatEuro(ev.budgetNum)}</span>
                  )}
                </div>

                <div className="ev-recaps">
                  {ev.invitesTotal > 0 && (
                    <span className="ev-recap">
                      👥 {ev.invitesOui}/{ev.invitesTotal} confirmés
                      {ev.personnesOui > 0 && ` (${ev.personnesOui} pers.)`}
                    </span>
                  )}
                  {ev.checklistTotal > 0 && (
                    <span className="ev-recap ev-checklist">
                      ✅ {ev.checklistFait}/{ev.checklistTotal}
                      <span className="ev-jauge">
                        <span
                          className="ev-jauge-fill"
                          style={{ width: `${Math.round((ev.checklistFait / ev.checklistTotal) * 100)}%` }}
                        />
                      </span>
                    </span>
                  )}
                  {ev.menuItems > 0 && (
                    <span className="ev-recap">
                      🍽️ {ev.menuItems} plat(s){ev.menuCoutNum > 0 ? ` · ~${formatEuro(ev.menuCoutNum)}` : ''}
                    </span>
                  )}
                </div>
                {ev.note && <p className="ev-note">{ev.note}</p>}
              </li>
            ),
          )}
        </ul>
      )}
    </>
  );
}

function envoi(methode: string, corps: unknown): Promise<Response> {
  return fetch('/api/evenements/items', {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

function libelleJours(j: number): string {
  if (j < 0) return 'passé';
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'demain';
  return `dans ${j} j`;
}

/* -------------------------------- FORMULAIRE -------------------------------- */

function EvenementForm({
  d,
  evenement,
  occupe,
  onEnregistrerAction,
  onAnnulerAction,
}: {
  d: DonneesEvenements;
  evenement?: Evenement;
  occupe: boolean;
  onEnregistrerAction: (corps: Record<string, string>) => void;
  onAnnulerAction: () => void;
}) {
  const [nom, setNom] = useState(evenement?.nom ?? '');
  const [type, setType] = useState(evenement?.type ?? '');
  const [date, setDate] = useState(evenement?.dateISO ?? '');
  const [heure, setHeure] = useState(evenement?.heure ?? '');
  const [lieu, setLieu] = useState(evenement?.lieu ?? '');
  const [budgetPrevu, setBudgetPrevu] = useState(evenement?.budgetPrevu ?? '');
  const [depense, setDepense] = useState(evenement?.depense ?? '');
  const [statut, setStatut] = useState(evenement?.statut ?? d.statuts[0] ?? '');
  const [note, setNote] = useState(evenement?.note ?? '');

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    // input date (yyyy-mm-dd) → jj/mm/aaaa
    const dateLabel = date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : '';
    onEnregistrerAction({ nom, type, date: dateLabel, heure, lieu, budgetPrevu, depense, statut, note });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      <div className="rf-ligne1">
        <input className="champ rf-nom" placeholder="Nom de l'événement" value={nom} onChange={(e) => setNom(e.target.value)} disabled={occupe} autoFocus />
        <select className="champ" value={type} onChange={(e) => setType(e.target.value)} disabled={occupe} aria-label="Type">
          <option value="">Type…</option>
          {d.types.map((x) => <option key={x} value={x}>{x}</option>)}
        </select>
        <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)} disabled={occupe} aria-label="Statut">
          <option value="">Statut…</option>
          {d.statuts.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <div className="rf-ligne1">
        <label className="saisie-champ"><span>Date</span>
          <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={occupe} />
        </label>
        <label className="saisie-champ"><span>Heure</span>
          <input className="champ" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} disabled={occupe} />
        </label>
        <input className="champ" placeholder="Lieu" value={lieu} onChange={(e) => setLieu(e.target.value)} disabled={occupe} />
      </div>
      <div className="rf-ligne1">
        <input className="champ" inputMode="decimal" placeholder="Budget prévu (€)" value={budgetPrevu} onChange={(e) => setBudgetPrevu(e.target.value)} disabled={occupe} />
        <input className="champ" inputMode="decimal" placeholder="Dépensé (€)" value={depense} onChange={(e) => setDepense(e.target.value)} disabled={occupe} />
      </div>
      <input className="champ" placeholder="Note" value={note} onChange={(e) => setNote(e.target.value)} disabled={occupe} />
      <div className="rf-actions">
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>Annuler</button>
        <button type="submit" className="bouton" disabled={occupe || !nom.trim()}>Enregistrer</button>
      </div>
    </form>
  );
}
