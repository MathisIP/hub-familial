'use client';

import { useState, useTransition } from 'react';
import {
  actionActiver,
  actionDupliquer,
  actionRenommer,
  actionReinitialiser,
  actionSupprimer,
} from '@/app/admin/actions';
import type { Scenario } from '@/lib/admin/scenarios';

/**
 * BARRE DE SCÉNARIOS — plusieurs hypothèses gardées côte à côte.
 *
 * ⚠ **PLUSIEURS, ET NON UN SEUL JEU DE VALEURS.** Comparer « prudent » et
 * « avec les magasins » suppose de les garder tous les deux : avec un
 * enregistrement unique, ouvrir le second efface le premier, et l'on refait le
 * travail à chaque fois.
 *
 * ⚠ La suppression du dernier scénario est refusée **côté service**, pas
 * seulement masquée ici : se retrouver sans aucun ferait repartir les hypothèses
 * de zéro à la visite suivante.
 */
export default function BarreScenarios({
  scenarios,
  actifId,
}: {
  scenarios: Scenario[];
  actifId: string;
}) {
  const [enCours, demarrer] = useTransition();
  const [renomme, setRenomme] = useState(false);
  const actif = scenarios.find((s) => s.id === actifId);
  const [nom, setNom] = useState(actif?.nom ?? '');

  const lancer = (f: () => Promise<void>) => demarrer(() => void f());

  return (
    <div className="nsa-panneau" style={{ marginBottom: 'var(--nsa-gap)' }}>
      <div className="nsa-tete">
        <h2>Scénario</h2>
        <span className="nsa-quand">
          {enCours ? 'enregistrement…' : `modifié le ${actif?.majLe.toLocaleDateString('fr-FR')}`}
        </span>
      </div>
      <div className="nsa-corps">
        <div className="nsa-scenarios">
          {scenarios.map((s) => (
            <button
              key={s.id}
              type="button"
              className={`nsa-scenario ${s.id === actifId ? 'on' : ''}`}
              onClick={() => s.id !== actifId && lancer(() => actionActiver(s.id))}
            >
              {s.nom}
            </button>
          ))}
        </div>

        <div className="nsa-scenarios" style={{ marginTop: '.8rem' }}>
          {renomme ? (
            <>
              <input
                className="nsa-champ"
                style={{ textAlign: 'left', width: '16rem' }}
                value={nom}
                autoFocus
                onChange={(e) => setNom(e.target.value)}
                aria-label="Nom du scénario"
              />
              <button
                type="button"
                className="nsa-action"
                onClick={() => {
                  lancer(() => actionRenommer(actifId, nom, actif?.note ?? ''));
                  setRenomme(false);
                }}
              >
                Enregistrer
              </button>
              <button type="button" className="nsa-action" onClick={() => setRenomme(false)}>
                Annuler
              </button>
            </>
          ) : (
            <>
              <button type="button" className="nsa-action" onClick={() => setRenomme(true)}>
                Renommer
              </button>
              <button
                type="button"
                className="nsa-action"
                onClick={() => lancer(() => actionDupliquer(actifId))}
              >
                Dupliquer pour tester une variante
              </button>
              <button
                type="button"
                className="nsa-action"
                onClick={() => lancer(() => actionReinitialiser(actifId))}
              >
                Remettre aux hypothèses de départ
              </button>
              {/* ⚠ Le bouton disparaît quand il ne reste qu'un scénario : le
                  service refuserait de toute façon, autant ne pas le proposer. */}
              {scenarios.length > 1 && (
                <button
                  type="button"
                  className="nsa-action"
                  style={{ color: 'var(--over-tx)' }}
                  onClick={() => lancer(() => actionSupprimer(actifId))}
                >
                  Supprimer
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
