'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Liste from '@/components/Liste';
import { useT, useLangue } from '@/components/I18nProvider';
import { locale, type IdLangue } from '@/lib/i18n';
import {
  aujourdhuiISO,
  debutSemaine,
  decalerJours,
  decalerMois,
  fenetreAgenda,
  grilleMois,
  type Agenda,
  type DonneesAgenda,
  type EvenementAgenda,
  type PorteeSuppression,
  type VueAgendaMode,
} from '@/lib/agenda/schema';

/** Vues proposées : la liste « à venir » historique, plus les trois calendriers. */
type Vue = 'avenir' | VueAgendaMode;

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
  /** id de l'occurrence dont on demande la portée de suppression (récurrent). */
  const [aSupprimer, setASupprimer] = useState<string | null>(null);
  /** id de l'occurrence dont on demande la portée de MODIFICATION (récurrent). */
  const [aChoisirModif, setAChoisirModif] = useState<string | null>(null);
  /** Événement en cours d'édition, avec la portée retenue. */
  const [aModifier, setAModifier] = useState<{ e: EvenementAgenda; portee: PorteeSuppression } | null>(null);

  /*
   * ⚠ « À venir » RESTE LA VUE PAR DÉFAUT. C'est ce que les gens regardent au
   * quotidien sur un téléphone — la suite des prochains rendez-vous, sans
   * navigation. Les trois vues calendrier s'ajoutent ; elles ne la remplacent
   * pas, sous peine de transformer un coup d'œil en deux gestes.
   */
  const [vue, setVue] = useState<Vue>('avenir');
  /** Date de référence des vues calendrier (jour affiché, ou n'importe lequel
      de la semaine / du mois affiché). */
  const [curseur, setCurseur] = useState(aujourdhuiISO());

  /** Plage à charger pour l'état courant. `null` = les 30 jours à venir. */
  const plage = useMemo(
    () => (vue === 'avenir' ? null : fenetreAgenda(vue, curseur)),
    [vue, curseur],
  );

  const rafraichir = useCallback(async () => {
    const url = plage ? `/api/agenda?debut=${plage.debut}&fin=${plage.fin}` : '/api/agenda';
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error((await r.json()).erreur ?? 'Erreur de chargement.');
    setD(await r.json());
  }, [plage]);

  /*
   * Recharge quand la vue ou la période change.
   *
   * ⚠ On SAUTE LE PREMIER RENDU : les données de « à venir » arrivent déjà
   * rendues par le serveur. Refaire l'appel au montage produirait une requête
   * inutile sur chaque visite, et un bref clignotement de la liste.
   */
  const premierRendu = useRef(true);
  useEffect(() => {
    if (premierRendu.current) {
      premierRendu.current = false;
      return;
    }
    setOccupe(true);
    setErreur(null);
    rafraichir()
      .catch((e) => setErreur(e instanceof Error ? e.message : String(e)))
      .finally(() => setOccupe(false));
  }, [rafraichir]);

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

  const supprimer = useCallback(
    (e: EvenementAgenda, portee: PorteeSuppression) => {
      setASupprimer(null);
      action(() =>
        fetch('/api/agenda', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ calendarId: e.calendarId, id: e.id, portee }),
        }),
      );
    },
    [action],
  );

  /** Ouvre l'édition, en demandant d'abord la portée si l'événement est récurrent. */
  const ouvrirModif = useCallback(
    (e: EvenementAgenda) => {
      setASupprimer(null);
      if (e.serieId) {
        // Même geste que pour la suppression : « modifier » est ambigu tant
        // qu'on n'a pas dit *quoi*.
        setAChoisirModif((v) => (v === e.id ? null : e.id));
        return;
      }
      setAChoisirModif(null);
      setAModifier({ e, portee: 'occurrence' });
    },
    [],
  );

  const aujourd = aujourdhuiISO();
  const groupes = useMemo(() => grouper(d.evenements), [d.evenements]);

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
      // ⚠ Une semaine chevauche souvent deux mois : afficher « 31 août – 6
      // septembre » plutôt que le seul mois du lundi, sinon la fin de semaine
      // paraît manquante.
      return `${fmt({ day: 'numeric', month: 'short' }, lundi)} – ${fmt({ day: 'numeric', month: 'short' }, dimanche)}`;
    }
    return '';
  }, [vue, curseur, langue]);

  return (
    <>
      <div className="ag-vues" role="tablist">
        {(['avenir', 'jour', 'semaine', 'mois'] as Vue[]).map((v) => (
          <button
            key={v}
            role="tab"
            className="ag-vue-onglet"
            aria-selected={vue === v}
            onClick={() => {
              // Repartir d'aujourd'hui à chaque changement de vue : garder un
              // curseur d'il y a trois mois déposerait la personne loin de ce
              // qu'elle regardait.
              setCurseur(aujourdhuiISO());
              setVue(v);
            }}
            disabled={occupe}
          >
            {tr(v === 'avenir' ? 'AGD_VUE_AVENIR' : v === 'jour' ? 'AGD_VUE_JOUR' : v === 'semaine' ? 'AGD_VUE_SEMAINE' : 'AGD_VUE_MOIS')}
          </button>
        ))}
      </div>

      {vue !== 'avenir' && (
        <div className="ag-nav">
          <button className="bouton discret" onClick={() => naviguer(-1)} disabled={occupe} aria-label={tr('AGD_PRECEDENT')}>
            ‹
          </button>
          <span className="ag-periode">{periode}</span>
          <button className="bouton discret" onClick={() => naviguer(1)} disabled={occupe} aria-label={tr('AGD_SUIVANT')}>
            ›
          </button>
          <button className="bouton discret ag-aujourdhui" onClick={() => setCurseur(aujourdhuiISO())} disabled={occupe}>
            {tr('AGD_AUJOURDHUI')}
          </button>
        </div>
      )}

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

      {/*
        La vue MOIS est la seule à demander un rendu propre : une grille, pas une
        liste. Jour et semaine réutilisent le groupage par jour ci-dessous — seule
        la fenêtre chargée change, ce qui évite trois rendus à maintenir.
      */}
      {vue === 'mois' ? (
        <GrilleMois
          curseur={curseur}
          evenements={d.evenements}
          aujourd={aujourd}
          langue={langue}
          onJour={(iso) => {
            setCurseur(iso);
            setVue('jour');
          }}
        />
      ) : groupes.length === 0 ? (
        <p className="vide">
          {vue === 'avenir' ? `${tr('AGD_AUCUN_1')} ${d.jours} ${tr('AGD_AUCUN_2')}` : tr('AGD_VIDE_PERIODE')}
        </p>
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
                {evenements.map((e) =>
                  aModifier?.e.id === e.id ? (
                    /*
                      Le formulaire remplace la ligne au lieu de s'ouvrir
                      ailleurs : on garde l'événement sous les yeux, et la date
                      du jour au-dessus reste le repère.
                    */
                    <li className="ag-event ag-event-edit" key={`${e.calendarId}:${e.id}`}>
                      <FormAgenda
                        agendas={d.agendas}
                        occupe={occupe}
                        evenement={e}
                        portee={aModifier.portee}
                        onAnnulerAction={() => setAModifier(null)}
                        onEnregistrerAction={(corps) =>
                          action(() =>
                            fetch('/api/agenda', {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                ...corps,
                                id: e.id,
                                calendarId: e.calendarId,
                                portee: aModifier.portee,
                              }),
                            }),
                          ).then(() => setAModifier(null))
                        }
                      />
                    </li>
                  ) : (
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
                      {/* Récurrent : on demande la portée au lieu de deviner. */}
                      {aChoisirModif === e.id && (
                        <span className="ag-portee">
                          <span className="ag-portee-q">{tr('AGD_RECUR_MODIF_Q')}</span>
                          <span className="ag-portee-choix">
                            <button
                              type="button"
                              className="bouton discret"
                              onClick={() => {
                                setAChoisirModif(null);
                                setAModifier({ e, portee: 'occurrence' });
                              }}
                              disabled={occupe}
                            >
                              {tr('AGD_RECUR_UNE')}
                            </button>
                            <button
                              type="button"
                              className="bouton discret"
                              onClick={() => {
                                setAChoisirModif(null);
                                setAModifier({ e, portee: 'serie' });
                              }}
                              disabled={occupe}
                            >
                              {tr('AGD_RECUR_SERIE')}
                            </button>
                            <button
                              type="button"
                              className="bouton discret ag-portee-non"
                              onClick={() => setAChoisirModif(null)}
                              disabled={occupe}
                            >
                              {tr('G_ANNULER')}
                            </button>
                          </span>
                        </span>
                      )}
                      {aSupprimer === e.id && (
                        <span className="ag-portee">
                          <span className="ag-portee-q">{tr('AGD_RECUR_Q')}</span>
                          <span className="ag-portee-choix">
                            <button
                              type="button"
                              className="bouton discret"
                              onClick={() => supprimer(e, 'occurrence')}
                              disabled={occupe}
                            >
                              {tr('AGD_RECUR_UNE')}
                            </button>
                            <button
                              type="button"
                              className="bouton discret"
                              onClick={() => supprimer(e, 'serie')}
                              disabled={occupe}
                            >
                              {tr('AGD_RECUR_SERIE')}
                            </button>
                            <button
                              type="button"
                              className="bouton discret ag-portee-non"
                              onClick={() => setASupprimer(null)}
                              disabled={occupe}
                            >
                              {tr('G_ANNULER')}
                            </button>
                          </span>
                        </span>
                      )}
                    </span>
                    <button
                      className="bouton discret ag-modif"
                      onClick={() => ouvrirModif(e)}
                      disabled={occupe}
                      aria-label={`${tr('G_MODIFIER')} ${e.titre}`}
                    >
                      ✎
                    </button>
                    <button
                      className="bouton discret ag-suppr"
                      onClick={() => {
                        setAChoisirModif(null);
                        // Événement récurrent : « supprimer » est ambigu tant
                        // qu'on n'a pas dit *quoi*. On ouvre le choix.
                        if (e.serieId) {
                          setASupprimer(aSupprimer === e.id ? null : e.id);
                          return;
                        }
                        if (confirm(`${tr('G_SUPPRIMER')} « ${e.titre} » ?`)) supprimer(e, 'occurrence');
                      }}
                      disabled={occupe}
                      aria-label={`${tr('G_SUPPRIMER')} ${e.titre}`}
                    >
                      ✕
                    </button>
                  </li>
                  ),
                )}
              </ul>
            </section>
          );
        })
      )}
    </>
  );
}

/* --------------------------------- MOIS --------------------------------- */

/**
 * Grille du mois : une case par jour, les événements en pastilles.
 *
 * ⚠ AUCUN SURVOL, ET C'EST STRUCTURANT. Les calendriers de bureau montrent le
 * détail d'un événement au passage de la souris — geste qui n'existe pas sur un
 * écran tactile, c'est-à-dire sur l'usage principal de Nestync. Toucher un jour
 * bascule donc en vue Jour, où l'on peut lire, modifier et supprimer. Une case
 * de calendrier sur téléphone sert à repérer, pas à agir.
 */
function GrilleMois({
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

  // Noms courts des jours, dans la langue courante, en commençant par LUNDI.
  const entetes = useMemo(() => {
    const f = new Intl.DateTimeFormat(locale(langue), { weekday: 'short' });
    // 2026-08-24 est un lundi — point de départ arbitraire mais sûr.
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
                {/* Trois au plus : au-delà, la case devient illisible sur un
                    téléphone et le compteur dit l'essentiel. */}
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

/**
 * Formulaire d'événement — sert à la CRÉATION et à la MODIFICATION.
 *
 * ⚠ Un seul formulaire pour les deux, à dessein : deux écrans jumeaux auraient
 * divergé au premier champ ajouté, et l'un des deux aurait fini par ne plus
 * envoyer ce que l'autre envoie.
 *
 * ⚠ SUR UNE SÉRIE, LA DATE ET L'HEURE NE SONT PAS AFFICHÉES. Ce n'est pas une
 * omission : déplacer une série depuis une occurrence du milieu ferait
 * disparaître toutes les dates antérieures (cf. `modifierEvenement`). Le serveur
 * le refuse de toute façon — mais montrer un champ pour ensuite rejeter ce qu'on
 * y a saisi est la pire des deux options. Les valeurs d'origine sont renvoyées
 * telles quelles, pour que le contrôle serveur les reconnaisse.
 */
function FormAgenda({
  agendas,
  occupe,
  evenement,
  portee = 'occurrence',
  onEnregistrerAction,
  onAnnulerAction,
}: {
  agendas: Agenda[];
  occupe: boolean;
  /** Événement à modifier ; absent = création. */
  evenement?: EvenementAgenda;
  portee?: PorteeSuppression;
  onEnregistrerAction: (corps: {
    calendarId: string; titre: string; date: string; journeeEntiere: boolean;
    heureDebut: string; heureFin: string; lieu: string; description: string;
  }) => void;
  onAnnulerAction: () => void;
}) {
  const tr = useT();
  const edition = !!evenement;
  /** Série : seuls les champs de texte sont modifiables. */
  const texteSeul = edition && portee === 'serie';

  const [calendarId, setCalendarId] = useState(evenement?.calendarId ?? agendas[0]?.id ?? '');
  const [titre, setTitre] = useState(evenement?.titre ?? '');
  const [date, setDate] = useState(evenement?.dateISO ?? aujourdhuiISO());
  const [journeeEntiere, setJourneeEntiere] = useState(evenement?.journeeEntiere ?? false);
  const [heureDebut, setHeureDebut] = useState(evenement?.heureDebut || '19:00');
  const [heureFin, setHeureFin] = useState(evenement?.heureFin || '20:00');
  const [lieu, setLieu] = useState(evenement?.lieu ?? '');
  const [description, setDescription] = useState(evenement?.description ?? '');

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    /*
     * ⚠ Sur une série, on renvoie les valeurs D'ORIGINE, pas celles des états.
     * Les champs d'heure sont initialisés avec un repli (« 19:00 ») quand
     * l'événement n'en a pas — ce qui est le cas d'une journée entière. Envoyer
     * cet état ferait croire au serveur qu'on tente de déplacer la série, et il
     * refuserait une modification de titre parfaitement légitime. Le repli est
     * utile à l'affichage, jamais à l'envoi.
     */
    const horaire =
      texteSeul && evenement
        ? {
            date: evenement.dateISO,
            journeeEntiere: evenement.journeeEntiere,
            heureDebut: evenement.heureDebut,
            heureFin: evenement.heureFin,
          }
        : { date, journeeEntiere, heureDebut, heureFin };
    onEnregistrerAction({ calendarId, titre, lieu, description, ...horaire });
  }

  return (
    <form className="recette-form" onSubmit={soumettre}>
      {texteSeul && <p className="ag-portee-note">{tr('AGD_SERIE_TEXTE')}</p>}
      <div className="rf-ligne1">
        <input className="champ rf-nom" placeholder={tr('AGD_TITRE_PH')} value={titre} onChange={(e) => setTitre(e.target.value)} disabled={occupe} autoFocus />
        {/* ⚠ L'agenda d'origine ne se change pas en modification : déplacer un
            événement d'un calendrier à l'autre est un `move`, pas un `patch`. */}
        {!edition && agendas.length > 1 && (
          <Liste
            valeur={calendarId}
            onChange={setCalendarId}
            options={agendas.map((a) => ({ valeur: a.id, libelle: a.nom }))}
            disabled={occupe}
            ariaLabel="Agenda"
          />
        )}
        {!texteSeul && (
          <label className="saisie-champ"><span>{tr('SAISIE_DATE')}</span>
            <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} disabled={occupe} />
          </label>
        )}
      </div>
      {!texteSeul && (
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
      )}
      <input className="champ" placeholder={tr('G_LIEU')} value={lieu} onChange={(e) => setLieu(e.target.value)} disabled={occupe} />
      <input className="champ" placeholder={tr('AGD_DESC_PH')} value={description} onChange={(e) => setDescription(e.target.value)} disabled={occupe} />
      <div className="rf-actions">
        <span className="rf-espace" />
        <button type="button" className="bouton discret" onClick={onAnnulerAction} disabled={occupe}>{tr('G_ANNULER')}</button>
        <button type="submit" className="bouton" disabled={occupe || !titre.trim()}>
          {edition ? tr('G_ENREGISTRER') : tr('G_AJOUTER')}
        </button>
      </div>
    </form>
  );
}
