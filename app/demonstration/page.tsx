import Link from 'next/link';
import CadreSite from '@/components/vitrine-ds/CadreSite';
import Demonstration from '@/components/vitrine-ds/Demonstration';

export const metadata = {
  title: 'Démonstration — Nestync',
  description:
    'Essayez Nestync sans créer de compte : la liste de courses déduite des repas, l’agenda du foyer en trois vues, le suivi du budget sans connexion bancaire.',
};

/**
 * `/demonstration` — essayer avant de créer un compte.
 *
 * ⚠ **LES CALCULS SONT CEUX DU PRODUIT**, importés des modules et non réécrits
 * (cf. `components/vitrine-ds/Demonstration.tsx`). Une démonstration qui
 * réimplémente les règles finit par montrer autre chose que ce qu'on vend.
 *
 * ⚠ **PAGE PUBLIQUE ET SANS ÉCRITURE.** Rien n'est enregistré, aucun appel
 * réseau n'est fait : tout vit en mémoire le temps de la visite. Une page
 * ouverte aux visiteurs anonymes ne doit présenter aucune surface d'écriture.
 *
 * ⚠ **L'ACCUEIL GARDE SA DÉMONSTRATION UNIQUE.** Une page de conversion a
 * besoin d'un seul geste, pas d'un catalogue ; celle-ci se donne par lien,
 * depuis le menu et le bas de page.
 *
 * ⚠ À déclarer dans `middleware.ts` ET `app/sitemap.ts` — la posture est le
 * refus par défaut, une page publique oubliée redirige vers la connexion.
 */
export default function PageDemonstration() {
  return (
    <CadreSite
      surtitre="Démonstration"
      titre="Essayez avant de créer un compte."
      chapeau="Trois fonctions de Nestync, manipulables ici même, sur un foyer fictif. Les calculs sont ceux de l’application — pas une imitation."
      pleineLargeur
    >
      <Demonstration />

      <p className="nsy-demo-pied">
        Rien de ce que vous faites ici n’est enregistré : cette page ne crée aucun compte et ne
        conserve rien. Pour vous convaincre : l’essai dure 30 jours sans carte bancaire —{' '}
        <Link href="/connexion">commencer</Link>, ou lire d’abord les{' '}
        <Link href="/tarifs">tarifs</Link> et les{' '}
        <Link href="/questions">questions fréquentes</Link>.
      </p>
    </CadreSite>
  );
}
