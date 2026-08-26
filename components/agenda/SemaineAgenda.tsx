'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { aujourdhuiISO, type Agenda, type EvenementAgenda } from '@/lib/agenda/schema';
import { useT, useLangue } from '@/components/I18nProvider';
import { useSignalPret } from '@/components/accueil/SplashAccueil';
import { locale } from '@/lib/i18n';

type Donnees = { evenements: EvenementAgenda[]; agendas: Agenda[]; lundiISO: string };

/**
 * Agenda de la semaine (lundi → dimanche), tous agendas fusionnés. Bandeau de
 * jours cliquables ; sous le bandeau, les événements du jour sélectionné (par
 * défaut aujourd'hui). Chargé côté client pour ne pas ralentir l'accueil.
 */
export default function SemaineAgenda() {
  const tr = useT();
  const langue = useLangue();
  const [d, setD] = useState<Donnees | null>(null);
  const [etat, setEtat] = useState<'charge' | 'ok' | 'erreur'>('charge');
  const aujourd = aujourdhuiISO();
  const [selection, setSelection] = useState(aujourd);

  // Écran de chargement de l'accueil : signale « prêt » dès que le chargement est fini.
  useSignalPret('agenda', etat !== 'charge');

  useEffect(() => {
    let vivant = true;
    fetch('/api/agenda/semaine', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data) => vivant && (setD(data), setEtat('ok')))
      .catch(() => vivant && setEtat('erreur'));
    return () => {
      vivant = false;
    };
  }, []);

  const jours = useMemo(() => {
    if (!d) return [];
    const fmtJour = new Intl.DateTimeFormat(locale(langue), { weekday: 'short' });
    const [a, m, j] = d.lundiISO.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(a, m - 1, j + i);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        iso,
        label: fmtJour.format(date).replace('.', ''),
        numero: date.getDate(),
        evenements: d.evenements.filter((e) => e.dateISO === iso),
      };
    });
  }, [d, langue]);

  const jourSel = jours.find((x) => x.iso === selection) ?? jours.find((x) => x.iso === aujourd);

  return (
    <section className="semaine" aria-label="Agenda de la semaine">
      <div className="semaine-tete">
        <h2>{tr('SEM_TITRE')}</h2>
        <Link href="/foyer/agenda" className="semaine-lien">{tr('SEM_LIEN')}</Link>
      </div>

      {etat === 'charge' && <p className="semaine-info">{tr('SEM_CHARGEMENT')}</p>}
      {etat === 'erreur' && <p className="semaine-info">{tr('SEM_INDISPO')}</p>}

      {etat === 'ok' && d && (
        <>
          <div className="sem-strip" role="tablist" aria-label="Jours de la semaine">
            {jours.map((jour) => {
              const classe = [
                'sem-jour',
                jour.iso === selection ? 'on' : '',
                jour.iso === aujourd ? 'today' : '',
                jour.evenements.length ? 'has' : '',
              ].join(' ').trim();
              return (
                <button
                  key={jour.iso}
                  className={classe}
                  role="tab"
                  aria-selected={jour.iso === selection}
                  onClick={() => setSelection(jour.iso)}
                >
                  <span className="sem-jn">{jour.label}</span>
                  <span className="sem-nn">{jour.numero}</span>
                </button>
              );
            })}
          </div>

          <div className="sem-liste">
            {!jourSel || jourSel.evenements.length === 0 ? (
              <p className="sem-vide">{tr('SEM_RIEN')}</p>
            ) : (
              jourSel.evenements.map((e) => (
                <div className="sem-ev" key={`${e.calendarId}:${e.id}`}>
                  <span className="sem-h">{e.journeeEntiere ? tr('G_JOURNEE') : e.heureDebut}</span>
                  <span className="sem-bar" style={{ background: e.couleur }} />
                  <span className="sem-corps">
                    <span className="sem-titre">{e.titre}</span>
                    {e.lieu && <span className="sem-lieu">{e.lieu}</span>}
                  </span>
                </div>
              ))
            )}
          </div>

          {d.agendas.length > 1 && (
            <div className="semaine-legende">
              {d.agendas.map((ag) => (
                <span className="semaine-leg-item" key={ag.id}>
                  <span className="pastille-cal" style={{ background: ag.couleur }} />
                  {ag.nom}
                </span>
              ))}
            </div>
          )}
        </>
      )}
    </section>
  );
}
