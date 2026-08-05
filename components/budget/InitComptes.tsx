'use client';

import { useActionState, useState } from 'react';
import Astuce from '@/components/Astuce';
import { creerComptesAction } from '@/app/budget/actions';

type Ligne = { nom: string; solde: string };

/**
 * Initialisation du Budget : déclarer ses comptes et leur solde ACTUEL.
 *
 * Sans comptes, le module n'a rien à calculer. On demande le solde du jour car
 * il sert de point de départ : le solde affiché vaut ensuite
 * « solde saisi ici + somme des opérations ». Une saisie juste au démarrage,
 * c'est un budget juste pour toujours.
 *
 * Sert aussi à AJOUTER des comptes plus tard (`ajout`), sans réécrire d'écran.
 */
export default function InitComptes({ ajout = false }: { ajout?: boolean }) {
  const [lignes, setLignes] = useState<Ligne[]>(
    ajout ? [{ nom: '', solde: '' }] : [
      { nom: 'Compte courant', solde: '' },
      { nom: 'Livret A', solde: '' },
    ],
  );
  const [etat, action, enCours] = useActionState(creerComptesAction, null);

  function maj(i: number, champ: keyof Ligne, v: string) {
    setLignes((l) => l.map((x, j) => (j === i ? { ...x, [champ]: v } : x)));
  }

  return (
    <section className="init-comptes">
      {!ajout && (
        <>
          <h2 className="init-titre">Commençons par tes comptes 💶</h2>
          <p className="init-sous">
            Indique le <strong>solde actuel</strong> de chacun de tes comptes. Nestync
            partira de ces montants : chaque opération que tu saisiras viendra ensuite
            s’ajouter ou se soustraire automatiquement.
          </p>
        </>
      )}

      <form action={action} className="init-form">
        <input type="hidden" name="lignes" value={JSON.stringify(lignes)} />

        <div className="init-entetes">
          <span>
            Nom du compte
            <Astuce texte="Le nom que TU utilises au quotidien : « Compte commun », « Livret A », « Compte de Lou »… Il apparaîtra tel quel dans l'app." />
          </span>
          <span>
            Solde actuel (€)
            <Astuce
              coin="droite"
              texte="Le montant qu'il y a sur ce compte aujourd'hui. Regarde ton appli bancaire et recopie. Un découvert se saisit avec un signe moins (ex. -120,50)."
            />
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
                aria-label="Retirer cette ligne"
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
          ＋ Ajouter un compte
        </button>

        {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

        <div className="init-actions">
          <button type="submit" className="bouton bouton-primaire" disabled={enCours}>
            {enCours ? 'Enregistrement…' : ajout ? 'Ajouter' : 'Créer mes comptes'}
          </button>
        </div>

        {!ajout && (
          <p className="init-note">
            💡 Tu pourras ajouter, renommer ou retirer des comptes plus tard. Rien n’est
            figé — et aucune information bancaire ne t’est demandée, seulement un montant.
          </p>
        )}
      </form>
    </section>
  );
}
