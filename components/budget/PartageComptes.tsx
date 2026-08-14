'use client';

import { useActionState, useEffect, useState } from 'react';
import Astuce from '@/components/Astuce';
import { useT } from '@/components/I18nProvider';
import { definirPartageAction } from '@/app/budget/actions';
import type { ComptePartage } from '@/lib/budget/service';

/**
 * Réglage de la visibilité des comptes — réservé au propriétaire du foyer.
 *
 * ⚠ ÉCRAN D'ADMINISTRATION, PAS DE LECTURE : aucun solde, aucune opération, rien
 * que des noms de comptes. C'est ce qui permet de régler le partage d'un compte
 * sans en devenir lecteur. Sans cette séparation, le cas colocation n'aurait
 * aucun sens : celui qui a créé le foyer lirait les comptes de ses colocataires.
 *
 * Une seule ligne ouverte à la fois, comme dans GestionComptes : deux
 * formulaires ouverts sur la même liste invitent à se tromper de compte.
 */
export type MembrePartage = { utilisateurId: string; nom: string };

export default function PartageComptes({
  comptes,
  membres,
}: {
  comptes: ComptePartage[];
  membres: MembrePartage[];
}) {
  const tr = useT();
  const [ouvert, setOuvert] = useState<string | null>(null);

  if (comptes.length === 0) {
    return (
      <section className="pc">
        <h2 className="pc-titre">{tr('PART_TITRE')}</h2>
        <p className="pc-vide">{tr('PART_AUCUN')}</p>
      </section>
    );
  }

  return (
    <section className="pc">
      <h2 className="pc-titre">{tr('PART_TITRE')}</h2>
      <p className="pc-sous">{tr('PART_SOUS')}</p>

      <ul className="pc-liste">
        {comptes.map((c) => (
          <li className="pc-item" key={c.id}>
            {ouvert === c.id ? (
              <FormePartage
                compte={c}
                membres={membres}
                onFini={() => setOuvert(null)}
              />
            ) : (
              <div className="pc-ligne">
                <div className="pc-infos">
                  <span className="pc-nom">{c.nom}</span>
                  <span className="pc-meta">
                    {c.restreint
                      ? `${tr('PART_VISIBLE_N')} ${c.utilisateurIds.length} ${
                          c.utilisateurIds.length === 1
                            ? tr('PART_PERSONNE_1')
                            : tr('PART_PERSONNES')
                        }`
                      : tr('PART_VISIBLE_TOUS')}
                  </span>
                </div>
                <button type="button" className="bouton" onClick={() => setOuvert(c.id)}>
                  {tr('PART_MODIFIER')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Astuce texte={tr('PART_AIDE')} />
    </section>
  );
}

function FormePartage({
  compte,
  membres,
  onFini,
}: {
  compte: ComptePartage;
  membres: MembrePartage[];
  onFini: () => void;
}) {
  const tr = useT();
  const [etat, action, enCours] = useActionState(definirPartageAction, null);
  const [restreint, setRestreint] = useState(compte.restreint);

  // Le formulaire ne se referme qu'une fois l'enregistrement CONFIRMÉ par le
  // serveur : le refermer au clic laisserait croire qu'un refus a été accepté.
  useEffect(() => {
    if (etat?.ok) onFini();
  }, [etat, onFini]);

  return (
    <form action={action} className="pc-forme">
      <input type="hidden" name="compteId" value={compte.id} />
      <input type="hidden" name="restreint" value={restreint ? 'oui' : 'non'} />

      <span className="pc-nom">{compte.nom}</span>

      <div className="pc-modes">
        <label className="pc-radio">
          <input
            type="radio"
            name="mode"
            checked={!restreint}
            onChange={() => setRestreint(false)}
          />
          <span>{tr('PART_TOUS')}</span>
        </label>
        <label className="pc-radio">
          <input
            type="radio"
            name="mode"
            checked={restreint}
            onChange={() => setRestreint(true)}
          />
          <span>{tr('PART_RESTREINT')}</span>
        </label>
      </div>

      {restreint && (
        <ul className="pc-membres">
          {membres.map((m) => (
            <li key={m.utilisateurId}>
              <label className="pc-case">
                <input
                  type="checkbox"
                  name="utilisateurs"
                  value={m.utilisateurId}
                  defaultChecked={compte.utilisateurIds.includes(m.utilisateurId)}
                />
                <span>{m.nom}</span>
              </label>
            </li>
          ))}
        </ul>
      )}

      {etat?.erreur && <p className="pc-erreur">{etat.erreur}</p>}

      <div className="pc-actions">
        <button type="submit" className="bouton bouton-action" disabled={enCours}>
          {tr('PART_ENREGISTRER')}
        </button>
        <button type="button" className="bouton" onClick={onFini} disabled={enCours}>
          {tr('PART_ANNULER')}
        </button>
      </div>
    </form>
  );
}
