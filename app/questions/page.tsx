import Link from 'next/link';
import CadreSite from '@/components/vitrine-ds/CadreSite';
import ListeQuestions from '@/components/vitrine-ds/ListeQuestions';
import { QUESTIONS_SITE } from '@/lib/questions-site';

export const metadata = {
  title: 'Questions fréquentes — Nestync',
  description:
    'Essai gratuit, abonnement du foyer, résiliation, hébergement des données, accès bancaire : les réponses aux questions les plus posées sur Nestync.',
};

/**
 * `/questions` — la FAQ comme PAGE, pas seulement comme ancre.
 *
 * ⚠ **CRÉÉE LE 28/08/2026.** Le bas de page renvoyait vers `#faq`, une ancre de
 * l'accueil : depuis les mentions légales ou la page d'aide, elle ne menait
 * nulle part, la section n'existant pas sur ces pages. Une ancre dans un bas de
 * page présent sur tout le site est une promesse qu'on ne tient qu'une fois
 * sur deux.
 *
 * ⚠ **MÊME SOURCE QUE L'ACCUEIL** (`lib/questions-site.ts`). Recopier les
 * réponses créerait deux vérités, et une correction faite d'un seul côté ne
 * signalerait rien.
 *
 * Bénéfice secondaire assumé : une page indexable qui répond à une intention de
 * recherche précise, là où l'accueil doit d'abord convaincre.
 */
export default function PageQuestions() {
  return (
    <CadreSite
      surtitre="Avant de commencer"
      titre="Questions fréquentes"
      chapeau="Les réponses aux questions les plus posées. Si la vôtre n’y est pas, écrivez-nous : on lit tout."
    >
      <ListeQuestions questions={QUESTIONS_SITE} />

      <h2>Une autre question ?</h2>
      <p>
        La page <Link href="/aide">Aide et contact</Link> réunit des réponses plus détaillées et un
        formulaire pour nous écrire directement. Pour ce qui touche à vos données personnelles, la{' '}
        <Link href="/confidentialite">politique de confidentialité</Link> dit précisément ce qui est
        collecté et pourquoi ; les engagements contractuels figurent dans les{' '}
        <Link href="/conditions">conditions générales</Link>.
      </p>
    </CadreSite>
  );
}
