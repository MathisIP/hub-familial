'use client';

import { useCallback, useState } from 'react';
import Combobox from '@/components/Combobox';
import SousListes from '@/components/evenements/SousListes';
import { useT, useLangue } from '@/components/I18nProvider';
import { t, tEnum, CLE_STATUT_EVT, type IdLangue } from '@/lib/i18n';
import { formatEuro } from '@/lib/argent';
import { estDansAgenda, parseAgendaLien, type DonneesEvenements, type Evenement } from '@/lib/evenements/schema';
import type { Agenda } from '@/lib/agenda/schema';

/**
 * Écran Événements (client) : cartes d'événements avec récap (invités confirmés,
 * avancement de la checklist, coût du menu), statut et édition. Les événements
 * qui n'existent que dans les sous-onglets sont éditables → créent une ligne
 * dans l'onglet maître.
 */
export default function VueEvenements({ initial }: { initial: DonneesEvenements }) {
  const tr = useT();
  const langue = useLangue();
  const [d, setD] = useState<DonneesEvenements>(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);
  const [edite, setEdite] = useState<string | null>(null); // clé = id

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
    action(() => envoi('PATCH', { id: ev.id, statut }));
  }

  return (
    <>
      {!ajout && (
        <div className="saisie-barre">
          <button className="bouton" onClick={() => setAjout(true)} disabled={occupe}>
            ＋ {tr('EVT_NOUVEL')}
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
        <p className="vide">{tr('EVT_AUCUN')}</p>
      ) : (
        <ul className="liste ev-liste">
          {d.evenements.map((ev) =>
            edite === ev.id ? (
              <li key={ev.id}>
                <EvenementForm
                  d={d}
                  evenement={ev}
                  occupe={occupe}
                  onAnnulerAction={() => setEdite(null)}
                  onEnregistrerAction={(corps) =>
                    action(() => envoi('PATCH', { id: ev.id, ...corps })).then(() => setEdite(null))
                  }
                />
              </li>
            ) : (
              <li key={ev.id} className="ev-carte">
                <div className="ev-tete">
                  <span className="ev-nom">{ev.nom}</span>
                  {ev.type && <span className="puce categorie">{ev.type}</span>}
                  {ev.joursRestants !== null && (
                    <span className={`puce ${ev.joursRestants < 0 ? '' : ev.joursRestants <= 14 ? 'echec' : ''}`.trim() || 'echeance'}>
                      {libelleJours(ev.joursRestants, langue)}
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
                      <option key={s} value={s}>{tEnum(CLE_STATUT_EVT, s, langue)}</option>
                    ))}
                  </select>
                  <button className="bouton discret" onClick={() => setEdite(ev.id)} disabled={occupe}>
                    {tr('G_MODIFIER')}
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
                      👥 {ev.invitesOui}/{ev.invitesTotal} {tr('EVT_CONFIRMES')}
                      {ev.personnesOui > 0 && ` (${ev.personnesOui} ${tr('EVT_PERS')})`}
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
                      🍽️ {ev.menuItems} {tr('EVT_PLATS')}{ev.menuCoutNum > 0 ? ` · ~${formatEuro(ev.menuCoutNum)}` : ''}
                    </span>
                  )}
                </div>
                {ev.note && <p className="ev-note">{ev.note}</p>}

                <SousListes ev={ev} occupe={occupe} action={action} />

                {ev.dateISO && d.agendas.length > 0 && (
                  <SyncAgenda ev={ev} agendas={d.agendas} occupe={occupe} action={action} />
                )}
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

function envoiAgenda(methode: string, corps: unknown): Promise<Response> {
  return fetch('/api/evenements/agenda', {
    method: methode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(corps),
  });
}

/** Contrôle « Ajouter à l'agenda » / badge « dans l'agenda » pour un événement daté. */
function SyncAgenda({
  ev,
  agendas,
  occupe,
  action,
}: {
  ev: Evenement;
  agendas: Agenda[];
  occupe: boolean;
  action: (fn: () => Promise<Response>) => Promise<void>;
}) {
  const tr = useT();
  const [choix, setChoix] = useState(false);

  if (estDansAgenda(ev)) {
    const cal = agendas.find((a) => a.id === parseAgendaLien(ev.agendaLien)?.calendarId);
    return (
      <div className="ev-agenda">
        <span className="ev-agenda-ok">
          📅 {tr('EVT_DANS_AGENDA')}{cal ? ` · ${cal.nom}` : ''}
        </span>
        <button
          className="bouton discret"
          onClick={() => action(() => envoiAgenda('DELETE', { id: ev.id }))}
          disabled={occupe}
        >
          {tr('EVT_RETIRER')}
        </button>
      </div>
    );
  }

  return (
    <div className="ev-agenda">
      {!choix ? (
        <button className="bouton discret" onClick={() => setChoix(true)} disabled={occupe}>
          📅 {tr('EVT_AJOUTER_AGENDA')}
        </button>
      ) : (
        <>
          <select
            className="champ"
            defaultValue=""
            disabled={occupe}
            aria-label={tr('EVT_CHOISIR_AGENDA')}
            onChange={(e) => {
              if (e.target.value) {
                action(() => envoiAgenda('POST', { id: ev.id, calendarId: e.target.value })).then(() => setChoix(false));
              }
            }}
          >
            <option value="">{tr('EVT_CHOISIR_AGENDA')}</option>
            {agendas.map((a) => (
              <option key={a.id} value={a.id}>{a.nom}</option>
            ))}
          </select>
          <button className="bouton discret" onClick={() => setChoix(false)} disabled={occupe}>{tr('G_ANNULER')}</button>
        </>
      )}
    </div>
  );
}

function libelleJours(j: number, langue: IdLangue): string {
  if (j < 0) return t('REL_PASSE', langue);
  if (j === 0) return t('REL_AUJOURDHUI', langue);
  if (j === 1) return t('REL_DEMAIN', langue);
  return `${t('REL_DANS', langue)} ${j} ${t('REL_J', langue)}`;
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
  const tr = useT();
  const langue = useLangue();
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
        <input className="champ rf-nom" placeholder={tr('EVT_NOM_PH')} value={nom} onChange={(e) => setNom(e.target.value)} disabled={occupe} autoFocus />
        <Combobox value={type} onChange={setType} options={d.types} placeholder={tr('EVT_TYPE')} disabled={occupe} ariaLabel={tr('EVT_TYPE')} />
        <select className="champ" value={statut} onChange={(e) => setStatut(e.target.value)} disabled={occupe} aria-label={tr('EVT_STATUT')}>
          <option value="">{tr('EVT_STATUT')}…</option>
          {d.statuts.map((s) => <option key={s} value={s}>{tEnum(CLE_STATUT_EVT, s, langue)}</option>)}
        </select>
      </div>
      <div className="rf-ligne1">
        <label className="saisie-champ"><span>{tr('SAISIE_DATE')}</span>
          <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={occupe} />
        </label>
        <label className="saisie-champ"><span>{tr('EVT_HEURE')}</span>
          <input className="champ" type="time" value={heure} onChange={(e) => setHeure(e.target.value)} disabled={occupe} />
        </label>
        <input className="champ" placeholder={tr('G_LIEU')} value={lieu} onChange={(e) => setLieu(e.target.value)} disabled={occupe} />
      </div>
      <div className="rf-ligne1">
        <input className="champ" inputMode="decimal" placeholder={tr('EVT_BUDGET_PH')} value={budgetPrevu} onChange={(e) => setBudgetPrevu(e.target.value)} disabled={occupe} />
        <input className="champ" inputMode="decimal" placeholder={tr('EVT_DEPENSE_PH')} value={depense} onChange={(e) => setDepense(e.target.value)} disabled={occupe} />
      </div>
      <input className="champ" placeholder={tr('G_NOTE')} value={note} onChange={(e) => setNote(e.target.value)} disabled={occupe} />
      <div className="rf-actions">
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>{tr('G_ANNULER')}</button>
        <button type="submit" className="bouton" disabled={occupe || !nom.trim()}>{tr('G_ENREGISTRER')}</button>
      </div>
    </form>
  );
}
