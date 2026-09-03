'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  aujourdhuiISO,
  debutSemaine,
  decalerJours,
  decalerMois,
  fenetreAgenda,
  grilleMois,
  type DonneesAgenda,
  type EvenementAgenda,
  type VueAgendaMode,
} from '@/lib/agenda/schema';
import { useT, useLangue } from '@/components/I18nProvider';
import { useSignalPret } from '@/components/accueil/SplashAccueil';
import { locale, type IdLangue } from '@/lib/i18n';

/** Vues proposées, identiques à l'onglet /agenda : « à venir » + les 3 calendriers. */
type Vue = 'avenir' | VueAgendaMode;
const VUES: Vue[] = ['avenir', 'jour', 'semaine', 'mois'];

/**
 * Clé de mémorisation — DISTINCTE de `hub-agenda-vue` (onglet /agenda).
 * ⚠ Deux emplacements, deux habitudes possibles : on peut vouloir un coup
 * d'œil « semaine » sur l'accueil tout en préférant la vue « mois » une fois
 * dans l'onglet complet. Partager la clé aurait couplé les deux sans raison.
 */
const CLE_VUE = 'hub-agenda-accueil-vue';

/**
 * AGENDA DE L'ACCUEIL — components/agenda/VueAgenda.tsx.
 * ==================================================================
 * ⚠ ÉTENDU LE 03/09/2026 avec le même sélecteur de vues que l'onglet complet
 * (Avenir/Jour/Semaine/Mois + navigation), à la demande : la carte d'accueil
 * ne montrait que la semaine en cours, sans moyen de voir plus loin ou de se
 * concentrer sur un seul jour.
 *
 * ⚠ VOLONTAIREMENT EN LECTURE SEULE, contrairement à VueAgenda (onglet
 * complet) : pas d'ajout/modification/suppression ici. La carte d'accueil
 * reste un aperçu ; éditer un événement passe par « Voir tout ». Duplier les
 * mêmes helpers purs (lib/agenda/schema.ts) et la même route `/api/agenda`
 * évite d'avoir deux logiques de fenêtre à maintenir, sans pour autant
 * réutiliser VueAgenda lui-même (qui embarque l'édition).
 */
export default function SemaineAgenda() {
  const tr = useT();
  const langue = useLangue();
  const [d, setD] = useState<DonneesAgenda | null>(null);
  const [etat, setEtat] = useState<'charge' | 'ok' | 'erreur'>('charge');
  const aujourd = aujourdhuiISO();
  const [vue, setVue] = useState<Vue>('semaine');
  const [curseur, setCurseur] = useState(aujourd);
  const [selection, setSelection] = useState(aujourd);

  useSignalPret('agenda', etat !== 'charge');

  // Restitue la vue choisie la fois précédente (voir même remarque dans VueAgenda).
  useEffect(() => {
    try {
      const enregistree = localStorage.getItem(CLE_VUE);
      if (enregistree && (VUES as string[]).includes(enregistree)) setVue(enregistree as Vue);
    } catch {
      // stockage indisponible : vue par défaut.
    }
  }, []);

  const choisirVue = useCallback((v: Vue) => {
    setCurseur(aujourdhuiISO());
    setSelection(aujourdhuiISO());
    setVue(v);
    try {
      localStorage.setItem(CLE_VUE, v);
    } catch {
      // sans conséquence : la vue reste choisie pour cette visite.
    }
  }, []);

  const plage = useMemo(
    () => (vue === 'avenir' ? null : fenetreAgenda(vue === 'semaine' ? 'semaine' : vue, curseur)),
    [vue, curseur],
  );

  useEffect(() => {
    let vivant = true;
    setEtat((e) => (e === 'ok' ? e : 'charge'));
    const url = plage ? `/api/agenda?debut=${plage.debut}&fin=${plage.fin}` : '/api/agenda';
    fetch(url, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error())))
      .then((data: DonneesAgenda) => vivant && (setD(data), setEtat('ok')))
      .catch(() => vivant && setEtat('erreur'));
    return () => {
      vivant = false;
    };
  }, [plage]);

  /** Déplace la période affichée d'un cran (sens = −1 ou +1). */
  const naviguer = useCallback(
    (sens: number) => {
      setCurseur((c) => {
        if (vue === 'jour') return decalerJours(c, sens);
        if (vue === 'semaine') return decalerJours(c, 7 * sens);
        return decalerMois(c, sens);
      });
    },
    [vue],
  );

  /** Intitulé de la période affichée, dans la langue courante. */
  const periode = useMemo(() => {
    const fmt = (o: Intl.DateTimeFormatOptions, iso: string) => {
      const [a, m, j] = iso.split('-').map(Number);
      return new Intl.DateTimeFormat(locale(langue), o).format(new Date(a, m - 1, j));
    };
    if (vue === 'jour') return fmt({ weekday: 'long', day: 'numeric', month: 'long' }, curseur);
    if (vue === 'mois') return fmt({ month: 'long', year: 'numeric' }, curseur);
    if (vue === 'semaine') {
      const lundi = debutSemaine(curseur);
      const dimanche = decalerJours(lundi, 6);
      return `${fmt({ day: 'numeric', month: 'short' }, lundi)} – ${fmt({ day: 'numeric', month: 'short' }, dimanche)}`;
    }
    return '';
  }, [vue, curseur, langue]);

  // Bandeau de jours cliquables : pour la vue Semaine (comportement historique)
  // et pour « à venir », qui couvre plusieurs jours sans navigation propre.
  const jours = useMemo(() => {
    if (!d) return [];
    const debut = vue === 'semaine' ? debutSemaine(curseur) : aujourd;
    const fmtJour = new Intl.DateTimeFormat(locale(langue), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const iso = decalerJours(debut, i);
      const [a, m, j] = iso.split('-').map(Number);
      return {
        iso,
        label: fmtJour.format(new Date(a, m - 1, j)).replace('.', ''),
        numero: j,
        evenements: d.evenements.filter((e) => e.dateISO === iso),
      };
    });
  }, [d, langue, vue, curseur, aujourd]);

  const jourSel = jours.find((x) => x.iso === selection) ?? jours.find((x) => x.iso === aujourd) ?? jours[0];

  return (
    <section className="semaine" aria-label="Agenda">
      <div className="semaine-tete">
        <h2>{tr('SEM_TITRE')}</h2>
        <Link href="/foyer/agenda" className="semaine-lien">{tr('SEM_LIEN')}</Link>
      </div>

      <div className="ag-vues" role="tablist">
        {VUES.map((v) => (
          <button
            key={v}
            role="tab"
            className="ag-vue-onglet"
            aria-selected={vue === v}
            onClick={() => choisirVue(v)}
          >
            {tr(v === 'avenir' ? 'AGD_VUE_AVENIR' : v === 'jour' ? 'AGD_VUE_JOUR' : v === 'semaine' ? 'AGD_VUE_SEMAINE' : 'AGD_VUE_MOIS')}
          </button>
        ))}
      </div>

      {vue !== 'avenir' && (
        <div className="ag-nav">
          <button className="bouton discret" onClick={() => naviguer(-1)} aria-label={tr('AGD_PRECEDENT')}>
            ‹
          </button>
          <span className="ag-periode">{periode}</span>
          <button className="bouton discret" onClick={() => naviguer(1)} aria-label={tr('AGD_SUIVANT')}>
            ›
          </button>
        </div>
      )}

      {etat === 'charge' && <p className="semaine-info">{tr('SEM_CHARGEMENT')}</p>}
      {etat === 'erreur' && <p className="semaine-info">{tr('SEM_INDISPO')}</p>}

      {etat === 'ok' && d && vue === 'mois' && (
        <GrilleMoisAccueil
          curseur={curseur}
          evenements={d.evenements}
          aujourd={aujourd}
          langue={langue}
          onJour={(iso) => {
            setCurseur(iso);
            setSelection(iso);
            setVue('jour');
          }}
        />
      )}

      {etat === 'ok' && d && (vue === 'semaine' || vue === 'avenir') && (
        <>
          <div className="sem-strip" role="tablist" aria-label="Jours">
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

          <ListeEvenements evenements={jourSel?.evenements ?? []} vide={tr('SEM_RIEN')} />
        </>
      )}

      {etat === 'ok' && d && vue === 'jour' && (
        <ListeEvenements
          evenements={d.evenements.filter((e) => e.dateISO === curseur)}
          vide={tr('AGD_VIDE_PERIODE')}
        />
      )}

      {etat === 'ok' && d && d.agendas.length > 1 && (
        <div className="semaine-legende">
          {d.agendas.map((ag) => (
            <span className="semaine-leg-item" key={ag.id}>
              <span className="pastille-cal" style={{ background: ag.couleur }} />
              {ag.nom}
            </span>
          ))}
        </div>
      )}
    </section>
  );
}

function ListeEvenements({ evenements, vide }: { evenements: EvenementAgenda[]; vide: string }) {
  const tr = useT();
  if (evenements.length === 0) return <p className="sem-vide">{vide}</p>;
  return (
    <div className="sem-liste">
      {evenements.map((e) => (
        <div className="sem-ev" key={`${e.calendarId}:${e.id}`}>
          <span className="sem-h">{e.journeeEntiere ? tr('G_JOURNEE') : e.heureDebut}</span>
          <span className="sem-bar" style={{ background: e.couleur }} />
          <span className="sem-corps">
            <span className="sem-titre">{e.titre}</span>
            {e.lieu && <span className="sem-lieu">{e.lieu}</span>}
          </span>
        </div>
      ))}
    </div>
  );
}

/** Grille du mois, en lecture seule : toucher un jour bascule en vue Jour. */
function GrilleMoisAccueil({
  curseur,
  evenements,
  aujourd,
  langue,
  onJour,
}: {
  curseur: string;
  evenements: EvenementAgenda[];
  aujourd: string;
  langue: IdLangue;
  onJour: (iso: string) => void;
}) {
  const semaines = useMemo(() => grilleMois(curseur), [curseur]);
  const moisAffiche = curseur.slice(0, 7);

  const parJour = useMemo(() => {
    const m = new Map<string, EvenementAgenda[]>();
    for (const e of evenements) {
      if (!m.has(e.dateISO)) m.set(e.dateISO, []);
      m.get(e.dateISO)!.push(e);
    }
    return m;
  }, [evenements]);

  const entetes = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale(langue), { weekday: 'short' });
    return Array.from({ length: 7 }, (_, i) => {
      const [a, m, j] = decalerJours('2026-08-24', i).split('-').map(Number);
      return f.format(new Date(a, m - 1, j));
    });
  }, [langue]);

  return (
    <div className="ag-mois">
      <div className="ag-mois-entete">
        {entetes.map((j) => (
          <span key={j} className="ag-mois-jourlbl">{j}</span>
        ))}
      </div>
      {semaines.map((semaine) => (
        <div className="ag-mois-semaine" key={semaine[0]}>
          {semaine.map((iso) => {
            const evs = parJour.get(iso) ?? [];
            const horsMois = iso.slice(0, 7) !== moisAffiche;
            return (
              <button
                type="button"
                key={iso}
                className={`ag-mois-case${horsMois ? ' hors' : ''}${iso === aujourd ? ' aujourd' : ''}`}
                onClick={() => onJour(iso)}
                aria-label={`${iso} — ${evs.length}`}
              >
                <span className="ag-mois-num">{Number(iso.slice(8, 10))}</span>
                {evs.slice(0, 3).map((e) => (
                  <span className="ag-mois-ev" key={`${e.calendarId}:${e.id}`}>
                    <span className="ag-mois-point" style={{ background: e.couleur }} />
                    <span className="ag-mois-titre">{e.titre}</span>
                  </span>
                ))}
                {evs.length > 3 && <span className="ag-mois-plus">+{evs.length - 3}</span>}
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}
