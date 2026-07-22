'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { aujourdhuiISO, type Agenda, type EvenementAgenda } from '@/lib/agenda/schema';

type Donnees = { evenements: EvenementAgenda[]; agendas: Agenda[]; lundiISO: string };

const JOURS_COURTS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];

/**
 * Vue de l'agenda familial sur la semaine en cours (lundi → dimanche), tous les
 * agendas fusionnés et colorés. Chargée côté client pour ne pas ralentir l'accueil.
 */
export default function SemaineAgenda() {
  const [d, setD] = useState<Donnees | null>(null);
  const [etat, setEtat] = useState<'charge' | 'ok' | 'erreur'>('charge');

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

  const aujourd = aujourdhuiISO();

  // 7 jours de la semaine + événements bucketés par jour.
  const jours = useMemo(() => {
    if (!d) return [];
    const [a, m, j] = d.lundiISO.split('-').map(Number);
    return Array.from({ length: 7 }, (_, i) => {
      const date = new Date(a, m - 1, j + i);
      const iso = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return {
        iso,
        label: JOURS_COURTS[i],
        numero: date.getDate(),
        evenements: d.evenements.filter((e) => e.dateISO === iso),
      };
    });
  }, [d]);

  return (
    <section className="semaine" aria-label="Agenda de la semaine">
      <div className="semaine-tete">
        <h2>🗓️ Cette semaine</h2>
        <Link href="/agenda" className="semaine-lien">Agenda complet →</Link>
      </div>

      {etat === 'charge' && <p className="semaine-info">Chargement de l’agenda…</p>}
      {etat === 'erreur' && <p className="semaine-info">Agenda indisponible pour le moment.</p>}

      {etat === 'ok' && d && (
        <>
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

          <div className="semaine-grille">
            {jours.map((jour) => (
              <div className={`jour-col${jour.iso === aujourd ? ' aujourdhui' : ''}${jour.evenements.length === 0 ? ' vide' : ''}`} key={jour.iso}>
                <div className="jour-entete">
                  <span className="jour-nom">{jour.label}</span>
                  <span className="jour-num">{jour.numero}</span>
                </div>
                <div className="jour-events">
                  {jour.evenements.length === 0 ? (
                    <span className="jour-rien">—</span>
                  ) : (
                    jour.evenements.map((e) => (
                      <div className="mini-event" key={`${e.calendarId}:${e.id}`} title={`${e.titre}${e.lieu ? ' · ' + e.lieu : ''}`}>
                        <span className="mini-dot" style={{ background: e.couleur }} />
                        <span className="mini-heure">{e.journeeEntiere ? '' : e.heureDebut}</span>
                        <span className="mini-titre">{e.titre}</span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </section>
  );
}
