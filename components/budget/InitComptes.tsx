'use client';

import { useActionState, useEffect, useState } from 'react';
import Astuce from '@/components/Astuce';
import { useT } from '@/components/I18nProvider';
import { creerComptesAction } from '@/app/foyer/budget/actions';

type Ligne = { nom: string; solde: string };

/**
 * Initialisation du Budget : déclarer ses comptes et leur solde ACTUEL.
 *
 * Sans comptes, le module n'a rien à calculer. On demande le solde du jour car
 * il sert de point de départ : le solde affiché vaut ensuite
 * « solde saisi ici + somme des opérations ». Une saisie juste au démarrage,
 * c'est un budget juste pour toujours.
 *
 * Sert aussi à AJOUTER des comptes plus tard (`ajout`), sans réécrire d'écran ;
 * `onSucces` permet alors à l'appelant de refermer son panneau.
 */
export default function InitComptes({
  ajout = false,
  onSucces,
}: {
  ajout?: boolean;
  onSucces?: () => void;
}) {
  const tr = useT();
  const [lignes, setLignes] = useState<Ligne[]>(
    ajout ? [{ nom: '', solde: '' }] : [
      { nom: 'Compte courant', solde: '' },
      { nom: 'Livret A', solde: '' },
    ],
  );
  const [etat, action, enCours] = useActionState(creerComptesAction, null);

  useEffect(() => {
    if (etat?.ok) onSucces?.();
  }, [etat, onSucces]);

  function maj(i: number, champ: keyof Ligne, v: string) {
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: v } : x)));
  }

  return (
    <section className="init-comptes">
      {!ajout && (
        <>
          <h2 className="init-titre">{tr('INIT_TITRE')}</h2>
          <p className="init-sous">
            {tr('INIT_SOUS_A')} <strong>{tr('INIT_SOUS_B')}</strong> {tr('INIT_SOUS_C')}
          </p>
        </>
      )}

      <form action={action} className="init-form">
        <input type="hidden" name="lignes" value={JSON.stringify(lignes)} />

        <div className="init-entetes">
          <span>
            {tr('INIT_NOM')}
            <Astuce texte={tr('AIDE_NOM_COMPTE')} />
          </span>
          <span>
            {tr('INIT_SOLDE')}
            <Astuce coin="droite" texte={tr('AIDE_SOLDE_ACTUEL')} />
          </span>
        </div>

        {lignes.map((l, i) => (
          <div className="init-ligne" key={i}>
            <input
              className="champ"
              value={l.nom}
              onChange={(e) => maj(i, 'nom', e.target.value)}
              placeholder="Compte courant"
              aria-label={`Nom du compte ${i + 1}`}
            />
            <input
              className="champ init-solde"
              value={l.solde}
              onChange={(e) => maj(i, 'solde', e.target.value)}
              placeholder="0"
              inputMode="decimal"
              aria-label={`Solde du compte ${i + 1}`}
            />
            {lignes.length > 1 && (
              <button
                type="button"
                className="init-retirer"
                onClick={() => setLignes((x) => x.filter((_, j) => j !== i))}
                aria-label={tr('INIT_RETIRER_LIGNE')}
              >
                ✕
              </button>
            )}
          </div>
        ))}

        <button
          type="button"
          className="bouton init-ajout"
          onClick={() => setLignes((l) => [...l, { nom: '', solde: '' }])}
        >
          {tr('INIT_AJOUTER_LIGNE')}
        </button>

        {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

        <div className="init-actions">
          <button type="submit" className="bouton bouton-primaire" disabled={enCours}>
            {enCours ? tr('INIT_ENREGISTREMENT') : ajout ? tr('INIT_VALIDER_AJOUT') : tr('INIT_VALIDER')}
          </button>
        </div>

        {!ajout && (
          <p className="init-note">{tr('INIT_NOTE')}</p>
        )}
      </form>
    </section>
  );
}
