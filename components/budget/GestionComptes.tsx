'use client';

import { useActionState, useEffect, useState } from 'react';
import Astuce from '@/components/Astuce';
import InitComptes from '@/components/budget/InitComptes';
import { useT } from '@/components/I18nProvider';
import { modifierCompteAction, supprimerCompteAction } from '@/app/foyer/budget/actions';
import { formatEuro, type CompteGere } from '@/lib/budget/schema';

/**
 * Gestion des comptes : renommer, corriger un solde, supprimer, ajouter.
 *
 * Le solde présenté et modifiable est le solde COURANT — celui du relevé
 * bancaire. Le `solde_initial` stocké en base est recalculé à rebours par le
 * service : c'est un détail de calcul, on ne le montre pas.
 *
 * Une seule ligne est ouverte à la fois (édition OU suppression) : deux
 * formulaires ouverts sur la même liste invitent à se tromper de compte.
 */
export default function GestionComptes({ comptes }: { comptes: CompteGere[] }) {
  const tr = useT();
  const [edite, setEdite] = useState<string | null>(null);
  const [supprime, setSupprime] = useState<string | null>(null);
  const [ajoute, setAjoute] = useState(false);

  function ouvrirEdition(id: string) {
    setSupprime(null);
    setAjoute(false);
    setEdite(id);
  }
  function ouvrirSuppression(id: string) {
    setEdite(null);
    setAjoute(false);
    setSupprime(id);
  }

  return (
    <section className="gc">
      <h2 className="gc-titre">{tr('GC_TITRE')}</h2>

      {comptes.length === 0 && <p className="gc-vide">{tr('GC_VIDE')}</p>}

      <ul className="gc-liste">
        {comptes.map((c) => (
          <li className="gc-item" key={c.id}>
            {edite === c.id ? (
              <FormeEdition compte={c} onFini={() => setEdite(null)} />
            ) : supprime === c.id ? (
              <FormeSuppression compte={c} onFini={() => setSupprime(null)} />
            ) : (
              <div className="gc-ligne">
                <div className="gc-infos">
                  <span className="gc-nom">
                    {c.nom}
                    {/* Badge informatif : le réglage se fait dans « Qui voit quels
                        comptes », réservé au propriétaire du foyer. */}
                    {c.restreint && (
                      <span className="gc-cadenas" title={tr('GC_RESTREINT')}>
                        {' '}🔒
                      </span>
                    )}
                  </span>
                  <span className="gc-meta">
                    {c.nbOperations === 0
                      ? tr('GC_AUCUNE_OP')
                      : `${c.nbOperations} ${c.nbOperations === 1 ? tr('GC_OPERATION') : tr('GC_OPERATIONS')}`}
                  </span>
                </div>
                <span className={`gc-solde ${c.soldeCourant < 0 ? 'neg' : ''}`}>
                  {formatEuro(c.soldeCourant)}
                </span>
                <div className="gc-boutons">
                  <button type="button" className="bouton" onClick={() => ouvrirEdition(c.id)}>
                    {tr('GC_MODIFIER')}
                  </button>
                  <button
                    type="button"
                    className="bouton gc-danger"
                    onClick={() => ouvrirSuppression(c.id)}
                  >
                    {tr('GC_SUPPRIMER')}
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {ajoute ? (
        <div className="gc-ajout">
          <InitComptes ajout onSucces={() => setAjoute(false)} />
          <button type="button" className="bouton" onClick={() => setAjoute(false)}>
            {tr('GC_FERMER_AJOUT')}
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="bouton bouton-primaire gc-ajouter"
          onClick={() => {
            setEdite(null);
            setSupprime(null);
            setAjoute(true);
          }}
        >
          {tr('GC_AJOUTER')}
        </button>
      )}
    </section>
  );
}

/** Renommage + correction du solde. */
function FormeEdition({ compte, onFini }: { compte: CompteGere; onFini: () => void }) {
  const tr = useT();
  const [etat, action, enCours] = useActionState(modifierCompteAction, null);

  // Le serveur a accepté → on referme la ligne. `ok` est ce qui distingue le
  // succès de l'état initial (voir ResultatAction).
  useEffect(() => {
    if (etat?.ok) onFini();
  }, [etat, onFini]);

  return (
    <form action={action} className="gc-forme">
      <input type="hidden" name="id" value={compte.id} />
      <label className="gc-champ">
        <span className="gc-lbl">
          {tr('INIT_NOM')}
          <Astuce texte={tr('AIDE_NOM_COMPTE')} />
        </span>
        <input className="champ" name="nom" defaultValue={compte.nom} required />
      </label>
      <label className="gc-champ">
        <span className="gc-lbl">
          {tr('INIT_SOLDE')}
          <Astuce texte={tr('AIDE_SOLDE_ACTUEL')} />
        </span>
        <input
          className="champ"
          name="solde"
          defaultValue={String(compte.soldeCourant).replace('.', ',')}
          inputMode="decimal"
        />
      </label>

      {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

      <div className="gc-boutons">
        <button type="submit" className="bouton bouton-primaire" disabled={enCours}>
          {enCours ? tr('INIT_ENREGISTREMENT') : tr('GC_ENREGISTRER')}
        </button>
        <button type="button" className="bouton" onClick={onFini} disabled={enCours}>
          {tr('GC_ANNULER')}
        </button>
      </div>
    </form>
  );
}

/**
 * Confirmation de suppression. Elle DIT ce qui va être détruit — nombre
 * d'opérations, et mention explicite des virements, qui touchent un second
 * compte. La case n'apparaît que s'il y a réellement quelque chose à perdre.
 */
function FormeSuppression({ compte, onFini }: { compte: CompteGere; onFini: () => void }) {
  const tr = useT();
  const [etat, action, enCours] = useActionState(supprimerCompteAction, null);
  const aDesOperations = compte.nbOperations > 0;

  return (
    <form action={action} className="gc-forme gc-forme-suppr">
      <input type="hidden" name="id" value={compte.id} />
      <p className="gc-suppr-titre">
        {tr('GC_SUPPR_TITRE')} <strong>{compte.nom}</strong>
      </p>

      {aDesOperations ? (
        <>
          <p className="gc-suppr-txt">
            {tr('GC_SUPPR_OPS_A')} {compte.nbOperations}{' '}
            {compte.nbOperations === 1 ? tr('GC_OPERATION') : tr('GC_OPERATIONS')}
            {tr('GC_SUPPR_OPS_B')}
          </p>
          {compte.nbVirements > 0 && <p className="gc-suppr-note">{tr('GC_SUPPR_VIREMENTS')}</p>}
          <label className="gc-case">
            <input type="checkbox" name="confirme" value="oui" required />
            <span>{tr('GC_SUPPR_CASE')}</span>
          </label>
        </>
      ) : (
        <p className="gc-suppr-txt">{tr('GC_SUPPR_VIDE')}</p>
      )}

      {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

      <div className="gc-boutons">
        <button type="submit" className="bouton gc-danger" disabled={enCours}>
          {tr('GC_SUPPRIMER')}
        </button>
        <button type="button" className="bouton" onClick={onFini} disabled={enCours}>
          {tr('GC_ANNULER')}
        </button>
      </div>
    </form>
  );
}
