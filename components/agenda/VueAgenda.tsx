'use client';

import { useCallback, useMemo, useState } from 'react';
import { useT, useLangue } from '@/components/I18nProvider';
import { locale, type IdLangue } from '@/lib/i18n';
import {
  aujourdhuiISO,
  type Agenda,
  type DonneesAgenda,
  type EvenementAgenda,
} from '@/lib/agenda/schema';

/** Date ISO (yyyy-mm-dd) → « lundi 4 août » dans la langue courante. */
function jourComplet(iso: string, langue: IdLangue): string {
  const [a, m, j] = iso.split('-').map(Number);
  return new Intl.DateTimeFormat(locale(langue), { weekday: 'long', day: 'numeric', month: 'long' }).format(
    new Date(a, m - 1, j),
  );
}

/** Étiquette relative « aujourd'hui / demain » (ou vide) dans la langue courante. */
function relatif(iso: string, aujourdIso: string, t: (c: 'REL_AUJOURDHUI' | 'REL_DEMAIN') => string): string {
  if (iso === aujourdIso) return t('REL_AUJOURDHUI');
  const [a, m, j] = aujourdIso.split('-').map(Number);
  const demain = new Date(a, m - 1, j + 1);
  const demainIso = `${demain.getFullYear()}-${String(demain.getMonth() + 1).padStart(2, '0')}-${String(demain.getDate()).padStart(2, '0')}`;
  return iso === demainIso ? t('REL_DEMAIN') : '';
}

/**
 * Écran Agenda (client) : événements à venir groupés par jour, ajout (journée
 * entière ou horaire) et suppression. Rafraîchit depuis /api/agenda.
 */
export default function VueAgenda({ initial }: { initial: DonneesAgenda }) {
  const tr = useT();
  const langue = useLangue();
  const [d, setD] = useState<DonneesAgenda>(initial);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [ajout, setAjout] = useState(false);

  const rafraichir = useCallback(async () => {
    const r = await fetch('/api/agenda', { cache: 'no-store' });
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

  const aujourd = aujourdhuiISO();
  const groupes = useMemo(() => grouper(d.evenements), [d.evenements]);

  return (
    <>
      {!ajout && (
        <div className="saisie-barre">
          <button className="bouton" onClick={() => setAjout(true)} disabled={occupe}>
            ＋ {tr('AGD_NOUVEL')}
          </button>
        </div>
      )}
      {ajout && (
        <FormAgenda
          agendas={d.agendas}
          occupe={occupe}
          onAnnulerAction={() => setAjout(false)}
          onEnregistrerAction={(corps) =>
            action(() =>
              fetch('/api/agenda', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(corps),
              }),
            ).then(() => setAjout(false))
          }
        />
      )}

      {d.agendas.length > 1 && (
        <div className="ag-legende">
          {d.agendas.map((a) => (
            <span className="ag-legende-item" key={a.id}>
              <span className="ag-pastille" style={{ background: a.couleur }} />
              {a.nom}
            </span>
          ))}
        </div>
      )}

      {erreur && <p className="message erreur">{erreur}</p>}

      {groupes.length === 0 ? (
        <p className="vide">{tr('AGD_AUCUN_1')} {d.jours} {tr('AGD_AUCUN_2')}</p>
      ) : (
        groupes.map(({ jour, evenements }) => {
          const rel = relatif(jour, aujourd, tr);
          return (
            <section className="agenda-jour" key={jour}>
              <h2 className="ag-jour-titre">
                {rel && <span className="ag-relatif">{rel}</span>}
                {jourComplet(jour, langue)}
              </h2>
              <ul className="liste">
                {evenements.map((e) => (
                  <li className="ag-event" key={`${e.calendarId}:${e.id}`}>
                    <span className="ag-pastille ag-pastille-event" style={{ background: e.couleur }} aria-hidden="true" />
                    <span className="ag-heure">
                      {e.journeeEntiere ? tr('G_JOURNEE') : e.heureDebut}
                      {!e.journeeEntiere && e.heureFin ? `–${e.heureFin}` : ''}
                    </span>
                    <span className="ag-corps">
                      <span className="ag-titre">{e.titre}</span>
                      {(e.lieu || e.description) && (
                        <span className="ag-meta">
                          {e.lieu && <>📍 {e.lieu}</>}
                          {e.lieu && e.description ? ' · ' : ''}
                          {e.description}
                        </span>
                      )}
                    </span>
                    <button
                      className="bouton discret ag-suppr"
                      onClick={() => {
                        if (confirm(`${tr('G_SUPPRIMER')} « ${e.titre} » ?`)) {
                          action(() =>
                            fetch('/api/agenda', {
                              method: 'DELETE',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ calendarId: e.calendarId, id: e.id }),
                            }),
                          );
                        }
                      }}
                      disabled={occupe}
                      aria-label={`${tr('G_SUPPRIMER')} ${e.titre}`}
                    >
                      ✕
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}

function grouper(evenements: EvenementAgenda[]): { jour: string; evenements: EvenementAgenda[] }[] {
  const map = new Map<string, EvenementAgenda[]>();
  for (const e of evenements) {
    if (!map.has(e.dateISO)) map.set(e.dateISO, []);
    map.get(e.dateISO)!.push(e);
  }
  return [...map.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([jour, evs]) => ({ jour, evenements: evs }));
}

/* -------------------------------- FORMULAIRE -------------------------------- */

function FormAgenda({
  agendas,
  occupe,
  onEnregistrerAction,
  onAnnulerAction,
}: {
  agendas: Agenda[];
  occupe: boolean;
  onEnregistrerAction: (corps: {
    calendarId: string; titre: string; date: string; journeeEntiere: boolean;
    heureDebut: string; heureFin: string; lieu: string; description: string;
  }) => void;
  onAnnulerAction: () => void;
}) {
  const tr = useT();
  const [calendarId, setCalendarId] = useState(agendas[0]?.id ?? '');
  const [titre, setTitre] = useState('');
  const [date, setDate] = useState(aujourdhuiISO());
  const [journeeEntiere, setJourneeEntiere] = useState(false);
  const [heureDebut, setHeureDebut] = useState('19:00');
  const [heureFin, setHeureFin] = useState('20:00');
  const [lieu, setLieu] = useState('');
  const [description, setDescription] = useState('');

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    onEnregistrerAction({ calendarId, titre, date, journeeEntiere, heureDebut, heureFin, lieu, description });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      <div className="rf-ligne1">
        <input className="champ rf-nom" placeholder={tr('AGD_TITRE_PH')} value={titre} onChange={(e) => setTitre(e.target.value)} disabled={occupe} autoFocus />
        {agendas.length > 1 && (
          <select className="champ" value={calendarId} onChange={(e) => setCalendarId(e.target.value)} disabled={occupe} aria-label="Agenda">
            {agendas.map((a) => <option key={a.id} value={a.id}>{a.nom}</option>)}
          </select>
        )}
        <label className="saisie-champ"><span>{tr('SAISIE_DATE')}</span>
          <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={occupe} />
        </label>
      </div>
      <div className="rf-ligne1">
        <label className="ag-checkbox">
          <input type="checkbox" checked={journeeEntiere} onChange={(e) => setJourneeEntiere(e.target.checked)} disabled={occupe} />
          <span>{tr('AGD_JOURNEE_ENTIERE')}</span>
        </label>
        {!journeeEntiere && (
          <>
            <label className="saisie-champ"><span>{tr('AGD_DEBUT')}</span>
              <input className="champ" type="time" value={heureDebut} onChange={(e) => setHeureDebut(e.target.value)} disabled={occupe} />
            </label>
            <label className="saisie-champ"><span>{tr('AGD_FIN')}</span>
              <input className="champ" type="time" value={heureFin} onChange={(e) => setHeureFin(e.target.value)} disabled={occupe} />
            </label>
          </>
        )}
      </div>
      <input className="champ" placeholder={tr('G_LIEU')} value={lieu} onChange={(e) => setLieu(e.target.value)} disabled={occupe} />
      <input className="champ" placeholder={tr('AGD_DESC_PH')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={occupe} />
      <div className="rf-actions">
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>{tr('G_ANNULER')}</button>
        <button type="submit" className="bouton" disabled={occupe || !titre.trim()}>{tr('G_AJOUTER')}</button>
      </div>
    </form>
  );
}
