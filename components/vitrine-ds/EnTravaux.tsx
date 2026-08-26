import type { ReactNode } from 'react';

/**
 * BLOC « EN TRAVAUX » — ce qui n'existe pas encore, dit franchement.
 *
 * ⚠ POURQUOI UN COMPOSANT PLUTÔT QUE DU REMPLISSAGE. Le site parle de charge
 * mentale, de confidentialité et d'argent : sa crédibilité tient à ce qu'il
 * n'avance rien de faux. Un chiffre inventé sur les tâches domestiques ou un
 * avis client fabriqué se vérifient en une recherche — et Nestync sort d'essai,
 * donc l'avis serait forcément faux. **Un vide assumé se corrige ; un faux
 * publié se retrouve.**
 *
 * ⚠ ET ÇA REND LE MANQUE VISIBLE POUR NOUS. Un emplacement `—` discret finit par
 * se fondre dans la page et par partir en production sans que personne ne le
 * voie. Celui-ci ne peut pas passer inaperçu.
 *
 * Conforme à la charte : filet tireté (aucun aplat coloré, aucun dégradé),
 * rayon 2 px, surtitre en mono capitales, aucun emoji, aucune icône — le
 * système n'en a pas.
 */
export default function EnTravaux({
  quoi,
  pourquoi,
  attendu,
  children,
}: {
  /** Ce qui manque, en une ligne : « Les chiffres du problème ». */
  quoi: string;
  /** Pourquoi c'est vide plutôt que rempli — la raison, pas l'excuse. */
  pourquoi: string;
  /** Ce qu'il faudra pour lever le chantier. */
  attendu?: string;
  /** Gabarits ou aperçus éventuels, sous le texte. */
  children?: ReactNode;
}) {
  return (
    <div className="nsy-travaux" role="note">
      <p className="nsy-travaux-etiquette">En travaux</p>
      <p className="nsy-travaux-quoi">{quoi}</p>
      <p className="nsy-travaux-pourquoi">{pourquoi}</p>
      {attendu && <p className="nsy-travaux-attendu">{attendu}</p>}
      {children}
    </div>
  );
}
