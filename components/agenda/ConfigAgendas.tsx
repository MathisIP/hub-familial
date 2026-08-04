'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import type { CalendrierDispo } from '@/lib/agenda/calendriers';
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
  disponibles,
  rattaches,
}: {
  connecte: boolean;
  disponibles: CalendrierDispo[];
  rattaches: { id: string; nom: string; parMoi: boolean }[];
}) {
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
          ⚙ Gérer les agendas du foyer
        </button>
      </p>
    );
  }

  return (
    <section className="ag-config">
      <div className="ag-config-tete">
        <h2>Agendas du foyer</h2>
        {rattaches.length > 0 && (
          <button type="button" className="bouton discret" onClick={() => setOuvert(false)}>
            Fermer
          </button>
        )}
      </div>

      {erreur && <p className="message erreur">{erreur}</p>}

      {!connecte ? (
        <>
          <p className="ag-config-txt">
            Connecte ton Google Agenda pour afficher tes calendriers ici. Nestync ne
            demande que l’accès à tes agendas — jamais à tes e-mails ni à tes fichiers,
            et tu peux retirer cet accès à tout moment.
          </p>
          <a href="/api/agenda/connexion" className="bouton bouton-primaire">
            Connecter mon Google Agenda
          </a>
        </>
      ) : (
        <>
          {disponibles.length === 0 ? (
            <p className="ag-config-txt">Aucun calendrier trouvé sur ton compte Google.</p>
          ) : (
            <>
              <p className="ag-config-txt">
                Choisis les calendriers à partager avec ton foyer. Les autres membres
                verront leurs événements.
              </p>
              <ul className="ag-cals">
                {disponibles.map((c) => (
                  <li key={c.id} className={c.rattache ? 'actif' : ''}>
                    <span className="ag-cal-nom">
                      {c.nom}
                      {c.principal && <span className="ag-cal-tag">principal</span>}
                      {!c.ecriture && <span className="ag-cal-tag lecture">lecture seule</span>}
                    </span>
                    {c.rattache ? (
                      <button
                        type="button"
                        className="bouton discret"
                        disabled={enCours}
                        onClick={() => agir(() => detacherAction(c.id))}
                      >
                        Retirer
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="bouton"
                        disabled={enCours}
                        onClick={() => agir(() => rattacherAction(c.id, c.nom))}
                      >
                        Ajouter
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
              <h3 className="ag-config-sous">Ajoutés par d’autres membres</h3>
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
                        Retirer
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
              Déconnecter mon Google Agenda
            </button>
          </p>
        </>
      )}
    </section>
  );
}
