'use client';

import { useActionState, useEffect, useState } from 'react';
import Liste from '@/components/Liste';
import Astuce from '@/components/Astuce';
import ChampDate from '@/components/ChampDate';
import { useT } from '@/components/I18nProvider';
import {
  ajouterEcheanceAction,
  modifierEcheanceAction,
  supprimerEcheanceAction,
} from '@/app/foyer/budget/actions';
import { RECURRENCES_ECHEANCE, type Echeance } from '@/lib/budget/schema';

/**
 * Gestion des échéances : ajouter, modifier, supprimer.
 *
 * ⚠ Cet écran n'existait pas. Le tableau de bord affichait une section
 * « échéances » qu'aucune interface ne permettait de remplir — elles ne
 * pouvaient venir que d'une écriture SQL directe. Un foyer réel voyait donc une
 * section vide sans comprendre pourquoi.
 *
 * Le **compte rattaché est facultatif** et porte la visibilité : une échéance
 * liée à un compte masqué disparaît pour ceux qui ne voient pas ce compte, une
 * échéance sans compte reste commune au foyer. Pas de réglage de partage propre,
 * donc pas d'écran de plus à comprendre.
 *
 * Une seule ligne ouverte à la fois, comme GestionComptes : deux formulaires
 * ouverts sur la même liste invitent à se tromper de ligne.
 */
export default function GestionEcheances({
  echeances,
  comptes,
}: {
  echeances: Echeance[];
  comptes: { id: string; nom: string }[];
}) {
  const tr = useT();
  const [edite, setEdite] = useState<string | null>(null);
  const [ajoute, setAjoute] = useState(false);

  return (
    <section className="ge">
      <h2 className="ge-titre">{tr('ECH_TITRE')}</h2>

      {echeances.length === 0 && !ajoute && <p className="ge-vide">{tr('ECH_VIDE')}</p>}

      <ul className="ge-liste">
        {echeances.map((e) => (
          <li className="ge-item" key={e.id}>
            {edite === e.id ? (
              <FormeEcheance
                echeance={e}
                comptes={comptes}
                onFini={() => setEdite(null)}
              />
            ) : (
              <div className="ge-ligne">
                <div className="ge-infos">
                  <span className="ge-lib">{e.libelle}</span>
                  <span className="ge-meta">
                    {e.date || tr('ECH_SANS_DATE')}
                    {e.recurrence !== 'Aucune' && ` · ↻ ${e.recurrence}`}
                    {e.compte && ` · ${e.compte}`}
                  </span>
                </div>
                {e.joursRestants !== null && (
                  <span className={`ge-quand ${e.joursRestants <= 30 ? 'proche' : ''}`}>
                    {e.joursRestants === 0
                      ? tr('REL_AUJOURDHUI')
                      : e.joursRestants === 1
                        ? tr('REL_DEMAIN')
                        : `${tr('REL_DANS')} ${e.joursRestants} ${tr('REL_J')}`}
                  </span>
                )}
                <button
                  type="button"
                  className="bouton"
                  onClick={() => {
                    setAjoute(false);
                    setEdite(e.id);
                  }}
                >
                  {tr('GC_MODIFIER')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      {ajoute ? (
        <FormeEcheance comptes={comptes} onFini={() => setAjoute(false)} />
      ) : (
        <button
          type="button"
          className="bouton discret ge-ajouter"
          onClick={() => {
            setEdite(null);
            setAjoute(true);
          }}
        >
          {tr('ECH_AJOUTER')}
        </button>
      )}

      <Astuce texte={tr('AIDE_ECHEANCE_COMPTE')} />
    </section>
  );
}

function FormeEcheance({
  echeance,
  comptes,
  onFini,
}: {
  echeance?: Echeance;
  comptes: { id: string; nom: string }[];
  onFini: () => void;
}) {
  const tr = useT();
  const [etat, action, enCours] = useActionState(
    echeance ? modifierEcheanceAction : ajouterEcheanceAction,
    null,
  );
  const [etatSuppr, actionSuppr, supprEnCours] = useActionState(supprimerEcheanceAction, null);
  const [recurrence, setRecurrence] = useState(echeance?.recurrence ?? 'Aucune');
  const [compteId, setCompteId] = useState(echeance?.compteId ?? '');

  // Le formulaire ne se referme qu'une fois l'enregistrement CONFIRMÉ par le
  // serveur : le refermer au clic laisserait croire qu'un refus a été accepté.
  useEffect(() => {
    if (etat?.ok || etatSuppr?.ok) onFini();
  }, [etat, etatSuppr, onFini]);

  return (
    <div className="ge-forme-bloc">
      <form action={action} className="ge-forme">
        {echeance && <input type="hidden" name="id" value={echeance.id} />}

        <div className="ge-champs">
          <label className="ge-champ">
            <span className="ge-lbl">{tr('ECH_LIBELLE')}</span>
            <input
              className="champ"
              name="libelle"
              defaultValue={echeance?.libelle ?? ''}
              placeholder={tr('ECH_LIBELLE_PH')}
              disabled={enCours}
              required
              autoFocus
            />
          </label>

          <label className="ge-champ">
            <span className="ge-lbl">{tr('ECH_DATE')}</span>
            {/* Les « / » sont posés automatiquement (voir ChampDate) : le pavé
                numérique de beaucoup de téléphones n'en propose pas. */}
            <ChampDate
              name="date"
              defaultValue={echeance?.date ?? ''}
              disabled={enCours}
            />
          </label>

          <label className="ge-champ">
            <span className="ge-lbl">{tr('ECH_RECURRENCE')}</span>
            <Liste
              name="recurrence"
              valeur={recurrence}
              onChange={setRecurrence}
              options={RECURRENCES_ECHEANCE.map((r) => ({ valeur: r, libelle: r }))}
              disabled={enCours}
              ariaLabel={tr('ECH_RECURRENCE')}
            />
          </label>

          <label className="ge-champ">
            <span className="ge-lbl">{tr('ECH_COMPTE')}</span>
            <Liste
              name="compteId"
              valeur={compteId}
              onChange={setCompteId}
              options={comptes.map((c) => ({ valeur: c.id, libelle: c.nom }))}
              placeholder={tr('ECH_COMPTE_CHOISIR')}
              disabled={enCours}
              ariaLabel={tr('ECH_COMPTE')}
            />
          </label>
        </div>

        <input
          className="champ"
          name="note"
          defaultValue={echeance?.note ?? ''}
          placeholder={tr('G_NOTE')}
          disabled={enCours}
        />

        {(etat?.erreur || etatSuppr?.erreur) && (
          <p className="ge-erreur">{etat?.erreur ?? etatSuppr?.erreur}</p>
        )}

        <div className="ge-actions">
          <button type="submit" className="bouton bouton-action" disabled={enCours || supprEnCours}>
            {tr('GC_ENREGISTRER')}
          </button>
          <button
            type="button"
            className="bouton"
            onClick={onFini}
            disabled={enCours || supprEnCours}
          >
            {tr('GC_ANNULER')}
          </button>
        </div>
      </form>

      {/* Formulaire distinct : imbriquer deux <form> est invalide en HTML, et
          un bouton « supprimer » dans le formulaire d'édition soumettrait les
          champs modifiés au passage. */}
      {echeance && (
        <form action={actionSuppr} className="ge-suppr">
          <input type="hidden" name="id" value={echeance.id} />
          <button
            type="submit"
            className="bouton discret ge-danger"
            disabled={enCours || supprEnCours}
          >
            {tr('GC_SUPPRIMER')}
          </button>
        </form>
      )}
    </div>
  );
}
