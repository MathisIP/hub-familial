'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendrierDispo } from '@/lib/agenda/calendriers';
import { useT } from '@/components/I18nProvider';
import { rattacherAction, detacherAction, deconnecterGoogleAction } from '@/app/agenda/actions';

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
}: {
  connecte: boolean;
  /** Permission d'écriture réellement accordée (elle a pu être décochée). */
  ecriture: boolean;
  disponibles: CalendrierDispo[];
  rattaches: { id: string; nom: string; parMoi: boolean }[];
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

          {/* Calendriers ajoutés par d'autres membres : visibles, non modifiables ici. */}
          {rattaches.some((r) => !r.parMoi) && (
            <>
              <h3 className="ag-config-sous">{tr('AGC_PAR_AUTRES')}</h3>
              <ul className="ag-cals">
                {rattaches
                  .filter((r) => !r.parMoi)
                  .map((r) => (
                    <li key={r.id} className="actif">
                      <span className="ag-cal-nom">{r.nom}</span>
                      <button
                        type="button"
                        className="bouton discret"
                        disabled={enCours}
                        onClick={() => agir(() => detacherAction(r.id))}
                      >
                        {tr('AGC_RETIRER')}
                      </button>
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
