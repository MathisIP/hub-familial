import type { ReactNode } from 'react';

/**
 * LISTE DE QUESTIONS REPLIABLES — un seul rendu pour tout le site.
 *
 * ⚠ **CRÉÉ LE 28/08/2026 PARCE QU'IL Y EN AVAIT DEUX.** L'accueil et la page
 * d'aide affichaient les mêmes questions repliables avec deux mises en forme
 * différentes : styles en ligne d'un côté, classes `aide-*` de l'autre. Le
 * visiteur passait de l'une à l'autre en un clic et voyait le site changer
 * d'apparence — au moment précis où il cherche à savoir si le produit est
 * sérieux.
 *
 * ⚠ **EN CLASSES CSS, PAS EN STYLES EN LIGNE.** L'accueil mettait tout en
 * ligne ; ces objets de style JavaScript sont hors de portée d'une règle de
 * feuille, donc d'un point de rupture. C'est déjà ce qui avait empêché
 * d'adapter les sections au mobile ailleurs dans ce fichier.
 *
 * ⚠ `<details>` natif, pas un état React : le contenu reste dans le document,
 * donc indexable et trouvable par la recherche du navigateur (Ctrl+F) même
 * replié — ce qu'un affichage conditionnel perdrait.
 */
export default function ListeQuestions({
  questions,
}: {
  questions: { q: string; r: ReactNode }[];
}) {
  return (
    <div className="nsy-questions">
      {questions.map(({ q, r }) => (
        <details className="nsy-question" key={q}>
          <summary>{q}</summary>
          <div className="nsy-question-reponse">{r}</div>
        </details>
      ))}
    </div>
  );
}
