'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendrierDispo } from '@/lib/agenda/calendriers';
import { useT } from '@/components/I18nProvider';
import {
  rattacherAction,
  detacherAction,
  deconnecterGoogleAction,
  definirPartageAgendaAction,
} from '@/app/foyer/agenda/actions';

/**
 * Configuration des agendas du foyer : connecter son compte Google, puis choisir
 * quels calendriers partager avec le foyer.
 *
 * Chaque calendrier rattaché l'est AU NOM de la personne qui l'a autorisé : c'est
 * son jeton qui sert ensuite à lire et écrire, y compris pour les autres membres.
 */
export default function ConfigAgendas({
  connecte,
  ecriture,
  disponibles,
  rattaches,
  membres,
}: {
  connecte: boolean;
  /** Permission d'écriture réellement accordée (elle a pu être décochée). */
  ecriture: boolean;
  disponibles: CalendrierDispo[];
  rattaches: {
    id: string;
    agendaId: string;
    nom: string;
    parMoi: boolean;
    restreint: boolean;
    personnes: string[];
  }[];
  /** Les AUTRES membres du foyer (pour choisir qui voit un agenda). */
  membres: { utilisateurId: string; nom: string }[];
}) {
  const tr = useT();
  const router = useRouter();
  const [ouvert, setOuvert] = useState(rattaches.length === 0);
  const [enCours, demarrer] = useTransition();
  const [erreur, setErreur] = useState<string | null>(null);

  function agir(fn: () => Promise<{ erreur?: string } | void>) {
    setErreur(null);
    demarrer(async () => {
      const r = await fn();
      if (r && 'erreur' in r && r.erreur) setErreur(r.erreur);
      else router.refresh();
    });
  }

  if (!ouvert) {
    return (
      <p className="ag-config-repli">
        <button type="button" className="bouton discret" onClick={() => setOuvert(true)}>
          {tr('AGC_GERER')}
        </button>
      </p>
    );
  }

  return (
    <section className="ag-config">
      <div className="ag-config-tete">
        <h2>{tr('AGC_TITRE')}</h2>
        {rattaches.length > 0 && (
          <button type="button" className="bouton discret" onClick={() => setOuvert(false)}>
            {tr('AGC_FERMER')}
          </button>
        )}
      </div>

      {erreur && <p className="message erreur">{erreur}</p>}

      {/* Autorisation partielle : lecture accordée mais pas l'écriture. */}
      {connecte && !ecriture && (
        <p className="message erreur">{tr('AGC_SANS_ECRITURE')}</p>
      )}

      {!connecte ? (
        <>
          <p className="ag-config-txt">{tr('AGC_INTRO')}</p>
          <a href="/api/agenda/connexion" className="bouton bouton-primaire">
            {tr('AGC_CONNECTER')}
          </a>
        </>
      ) : (
        <>
          {disponibles.length === 0 ? (
            <p className="ag-config-txt">{tr('AGC_AUCUN_CAL')}</p>
          ) : (
            <>
              <p className="ag-config-txt">{tr('AGC_CHOISIR')}</p>
              <ul className="ag-cals">
                {disponibles.map((c) => (
                  <li key={c.id} className={c.rattache ? 'actif' : ''}>
                    <span className="ag-cal-nom">
                      {c.nom}
                      {c.principal && <span className="ag-cal-tag">{tr('AGC_PRINCIPAL')}</span>}
                      {!c.ecriture && <span className="ag-cal-tag lecture">{tr('AGC_LECTURE')}</span>}
                    </span>
                    {c.rattache ? (
                      <button
                        type="button"
                        className="bouton discret"
                        disabled={enCours}
                        onClick={() => agir(() => detacherAction(c.id))}
                      >
                        {tr('AGC_RETIRER')}
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="bouton"
                        disabled={enCours}
                        onClick={() => agir(() => rattacherAction(c.id, c.nom))}
                      >
                        {tr('AGC_AJOUTER')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Mes agendas rattachés : c'est ici qu'on règle qui les voit. Le
              réglage appartient à celui qui a rattaché — pas au propriétaire du
              foyer : c'est son compte Google et ses événements. */}
          {rattaches.some((r) => r.parMoi) && membres.length > 0 && (
            <>
              <h3 className="ag-config-sous">{tr('AGC_QUI_VOIT')}</h3>
              <ul className="ag-cals">
                {rattaches
                  .filter((r) => r.parMoi)
                  .map((r) => (
                    <PartageAgenda
                      key={r.agendaId}
                      agenda={r}
                      membres={membres}
                      occupe={enCours}
                      onAgirAction={agir}
                    />
                  ))}
              </ul>
            </>
          )}

          {/* Calendriers ajoutés par d'autres membres : visibles, non modifiables.
              ⚠ Le bouton « Retirer » a été retiré d'ici : n'importe quel membre
              pouvait détacher l'agenda de n'importe qui. Le serveur le refuse
              désormais, l'interface ne doit plus le proposer. */}
          {rattaches.some((r) => !r.parMoi) && (
            <>
              <h3 className="ag-config-sous">{tr('AGC_PAR_AUTRES')}</h3>
              <ul className="ag-cals">
                {rattaches
                  .filter((r) => !r.parMoi)
                  .map((r) => (
                    <li key={r.id} className="actif">
                      <span className="ag-cal-nom">{r.nom}</span>
                      <span className="ag-cal-tag lecture">{tr('AGC_AUTRE_PROPRIO')}</span>
                    </li>
                  ))}
              </ul>
            </>
          )}

          <p className="ag-config-pied">
            <button
              type="button"
              className="bouton discret ag-deco"
              disabled={enCours}
              onClick={() => agir(deconnecterGoogleAction)}
            >
              {tr('AGC_DECONNECTER')}
            </button>
          </p>
        </>
      )}
    </section>
  );
}

/**
 * Réglage « qui voit cet agenda », pour un agenda que J'AI rattaché.
 *
 * Je m'y vois toujours implicitement : le serveur me laisse toujours l'agenda
 * visible (sinon me retirer de ma propre liste rendrait le réglage
 * irrattrapable). Les cases ne concernent donc que les autres.
 */
function PartageAgenda({
  agenda,
  membres,
  occupe,
  onAgirAction,
}: {
  agenda: { id: string; agendaId: string; nom: string; restreint: boolean; personnes: string[] };
  membres: { utilisateurId: string; nom: string }[];
  occupe: boolean;
  onAgirAction: (fn: () => Promise<{ erreur?: string } | void>) => void;
}) {
  const tr = useT();
  const [ouvert, setOuvert] = useState(false);
  const [restreint, setRestreint] = useState(agenda.restreint);
  const [choisis, setChoisis] = useState<string[]>(agenda.personnes);

  function basculer(id: string) {
    setChoisis((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  }

  return (
    <li className="actif ag-partage">
      <div className="ag-partage-tete">
        <span className="ag-cal-nom">{agenda.nom}</span>
        <span className="ag-cal-tag">
          {agenda.restreint
            ? `${tr('PART_VISIBLE_N')} ${agenda.personnes.length + 1}`
            : tr('PART_VISIBLE_TOUS')}
        </span>
        <button
          type="button"
          className="bouton discret"
          disabled={occupe}
          onClick={() => setOuvert((o) => !o)}
        >
          {ouvert ? tr('PART_ANNULER') : tr('PART_MODIFIER')}
        </button>
      </div>

      {ouvert && (
        <div className="ag-partage-corps">
          <label className="pc-radio">
            <input
              type="radio"
              name={`mode-${agenda.agendaId}`}
              checked={!restreint}
              onChange={() => setRestreint(false)}
            />
            <span>{tr('PART_TOUS')}</span>
          </label>
          <label className="pc-radio">
            <input
              type="radio"
              name={`mode-${agenda.agendaId}`}
              checked={restreint}
              onChange={() => setRestreint(true)}
            />
            <span>{tr('PART_RESTREINT')}</span>
          </label>

          {restreint && (
            <ul className="pc-membres">
              {membres.map((m) => (
                <li key={m.utilisateurId}>
                  <label className="pc-case">
                    <input
                      type="checkbox"
                      checked={choisis.includes(m.utilisateurId)}
                      onChange={() => basculer(m.utilisateurId)}
                    />
                    <span>{m.nom}</span>
                  </label>
                </li>
              ))}
            </ul>
          )}

          <div className="pc-actions">
            <button
              type="button"
              className="bouton bouton-action"
              disabled={occupe}
              onClick={() =>
                onAgirAction(async () => {
                  const r = await definirPartageAgendaAction(agenda.agendaId, restreint, choisis);
                  if (!r.erreur) setOuvert(false);
                  return r;
                })
              }
            >
              {tr('PART_ENREGISTRER')}
            </button>
          </div>
        </div>
      )}
    </li>
  );
}
