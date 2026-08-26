import type { ReactNode } from 'react';

/**
 * BLOC « BIENTÔT » — une section encore vide, dite sobrement.
 *
 * ⚠ POURQUOI UN COMPOSANT PLUTÔT QUE DU REMPLISSAGE. Le site parle de charge
 * mentale, de confidentialité et d'argent : sa crédibilité tient à ce qu'il
 * n'avance rien de faux. Un chiffre inventé sur les tâches domestiques ou un
 * avis client fabriqué se vérifient en une recherche — et Nestync sort d'essai,
 * donc l'avis serait forcément faux. **Un vide assumé se corrige ; un faux
 * publié se retrouve.**
 *
 * ⚠ AUCUNE NOTE INTERNE NE PASSE PAR CE COMPOSANT (26/08/2026). La première
 * version prenait des props `pourquoi` et `attendu` et ne les rendait qu'en
 * développement — mais **une prop voyage dans le bundle même sans être
 * affichée** : `process.env.NODE_ENV` élimine la branche d'affichage, pas la
 * chaîne écrite dans le JSX de l'appelant. Vérifié après un build de
 * production : « un journaliste ira contrôler » s'y trouvait encore.
 *
 * Ce qui relève de l'atelier — pourquoi c'est vide, ce qu'il faut fournir —
 * s'écrit donc en **commentaire JSX** chez l'appelant. Un commentaire disparaît
 * à la compilation ; une chaîne, non.
 *
 * Le visiteur ne lit qu'une phrase sobre : il hésite à s'abonner, il n'a pas à
 * savoir ce qui nous manque.
 */
export default function EnTravaux({
  quoi,
  publique,
  children,
}: {
  /** Ce qui arrive, en une ligne : « Les chiffres du problème ». */
  quoi: string;
  /** La phrase montrée au visiteur. Sobre, sans aveu. */
  publique?: string;
  children?: ReactNode;
}) {
  return (
    <div className="nsy-travaux" role="note">
      <p className="nsy-travaux-etiquette">Bientôt</p>
      <p className="nsy-travaux-quoi">{quoi}</p>
      <p className="nsy-travaux-pourquoi">
        {publique ?? 'Cette section arrive prochainement.'}
      </p>
      {children}
    </div>
  );
}
