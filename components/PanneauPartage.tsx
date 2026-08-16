'use client';

import { useActionState, useEffect, useState } from 'react';
import Astuce from '@/components/Astuce';
import { useT } from '@/components/I18nProvider';

/**
 * Panneau « qui voit quoi » — liste blanche, réutilisable par module.
 *
 * ⚠ ÉCRAN D'ADMINISTRATION, PAS DE LECTURE : rien que des noms d'éléments,
 * jamais leur contenu (ni solde, ni fichier, ni événement). C'est ce qui permet
 * de régler le partage d'un élément sans en devenir lecteur — sans quoi le cas
 * colocation n'aurait aucun sens : celui qui administre lirait tout.
 *
 * L'action serveur est injectée : le composant ne connaît ni les comptes, ni les
 * dossiers, seulement des lignes à cocher. Une seule ligne ouverte à la fois —
 * deux formulaires ouverts sur la même liste invitent à se tromper d'élément.
 */
export type ElementPartage = {
  id: string;
  nom: string;
  restreint: boolean;
  utilisateurIds: string[];
};

export type MembrePartage = { utilisateurId: string; nom: string };

type Resultat = { ok?: true; erreur?: string };

export default function PanneauPartage({
  titre,
  sous,
  aide,
  vide,
  elements,
  membres,
  action,
  className = 'pc',
}: {
  titre: string;
  sous: string;
  aide: string;
  vide: string;
  elements: ElementPartage[];
  membres: MembrePartage[];
  action: (precedent: Resultat | null, formData: FormData) => Promise<Resultat | null>;
  className?: string;
}) {
  const tr = useT();
  const [ouvert, setOuvert] = useState<string | null>(null);

  if (elements.length === 0) {
    return (
      <section className={className}>
        <h2 className="pc-titre">{titre}</h2>
        <p className="pc-vide">{vide}</p>
      </section>
    );
  }

  return (
    <section className={className}>
      <h2 className="pc-titre">{titre}</h2>
      <p className="pc-sous">{sous}</p>

      <ul className="pc-liste">
        {elements.map((el) => (
          <li className="pc-item" key={el.id}>
            {ouvert === el.id ? (
              <FormePartage
                element={el}
                membres={membres}
                action={action}
                onFini={() => setOuvert(null)}
              />
            ) : (
              <div className="pc-ligne">
                <div className="pc-infos">
                  <span className="pc-nom">
                    {el.restreint && '🔒 '}
                    {el.nom}
                  </span>
                  <span className="pc-meta">
                    {el.restreint
                      ? `${tr('PART_VISIBLE_N')} ${el.utilisateurIds.length} ${
                          el.utilisateurIds.length === 1
                            ? tr('PART_PERSONNE_1')
                            : tr('PART_PERSONNES')
                        }`
                      : tr('PART_VISIBLE_TOUS')}
                  </span>
                </div>
                <button type="button" className="bouton" onClick={() => setOuvert(el.id)}>
                  {tr('PART_MODIFIER')}
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>

      <Astuce texte={aide} />
    </section>
  );
}

function FormePartage({
  element,
  membres,
  action,
  onFini,
}: {
  element: ElementPartage;
  membres: MembrePartage[];
  action: (precedent: Resultat | null, formData: FormData) => Promise<Resultat | null>;
  onFini: () => void;
}) {
  const tr = useT();
  const [etat, envoyer, enCours] = useActionState(action, null);
  const [restreint, setRestreint] = useState(element.restreint);

  // Le formulaire ne se referme qu'une fois l'enregistrement CONFIRMÉ par le
  // serveur : le refermer au clic laisserait croire qu'un refus a été accepté.
  useEffect(() => {
    if (etat?.ok) onFini();
  }, [etat, onFini]);

  return (
    <form action={envoyer} className="pc-forme">
      <input type="hidden" name="id" value={element.id} />
      <input type="hidden" name="restreint" value={restreint ? 'oui' : 'non'} />

      <span className="pc-nom">{element.nom}</span>

      <div className="pc-modes">
        <label className="pc-radio">
          <input
            type="radio"
            name={`mode-${element.id}`}
            checked={!restreint}
            onChange={() => setRestreint(false)}
          />
          <span>{tr('PART_TOUS')}</span>
        </label>
        <label className="pc-radio">
          <input
            type="radio"
            name={`mode-${element.id}`}
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
                  defaultChecked={element.utilisateurIds.includes(m.utilisateurId)}
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
