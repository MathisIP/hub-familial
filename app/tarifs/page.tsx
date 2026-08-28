import Link from 'next/link';
import CadreSite from '@/components/vitrine-ds/CadreSite';
import ListeQuestions from '@/components/vitrine-ds/ListeQuestions';
import { OFFRES, INCLUS, ESSAI_JOURS, formatPrix } from '@/lib/offres';

export const metadata = {
  title: 'Tarifs — Nestync',
  description:
    'Un seul abonnement par foyer, tous les membres inclus. 4,99 € par mois ou 49,90 € par an, après 30 jours d’essai gratuit sans carte bancaire.',
};

/**
 * `/tarifs` — le prix comme PAGE autonome.
 *
 * ⚠ **CRÉÉE LE 28/08/2026**, pour la même raison que `/questions` : le bas de
 * page renvoyait vers `#tarifs`, une ancre qui ne mène nulle part depuis une
 * page intérieure.
 *
 * ⚠ **AUCUN MONTANT ÉCRIT ICI.** Tout vient de `lib/offres.ts`, comme sur la
 * vitrine et dans les conditions générales. Un prix recopié finit toujours par
 * diverger : le calculateur économique est resté à 47,90 € plus de quinze jours
 * après le passage à 49,90 €, sans que rien ne le signale.
 */
export default function PageTarifs() {
  const mensuel = OFFRES.find((o) => o.id === 'mensuel')!;
  const annuel = OFFRES.find((o) => o.id === 'annuel')!;

  return (
    <CadreSite
      surtitre="Un seul abonnement"
      titre="Tarifs"
      chapeau={`Une personne paie, tout le foyer accède. ${ESSAI_JOURS} jours d’essai, sans carte bancaire.`}
    >
      <h2>Les deux formules</h2>
      <p>
        <strong>{annuel.nom} — {formatPrix(annuel.prix)} par an</strong>, soit{' '}
        {formatPrix(annuel.parMois)} par mois. C’est exactement dix mois payés : les{' '}
        {annuel.economie ?? 'deux mois offerts'} annoncés ne sont pas une formule commerciale, ce
        sont bien deux mois que vous ne payez pas.
      </p>
      <p>
        <strong>{mensuel.nom} — {formatPrix(mensuel.prix)} par mois</strong>, sans engagement.
        L’essai de {ESSAI_JOURS} jours s’applique aux deux formules, à l’identique.
      </p>
      {/*
        ⚠ DIRE QUE LE PRIX EST PAR FOYER, PAS PAR PERSONNE, ET LE RÉPÉTER. C'est
        la question la plus posée, et le seul point où Nestync se distingue
        franchement des abonnements familiaux au tarif par utilisateur.
      */}
      <p>
        Ces montants s’entendent <strong>par foyer</strong>, quel que soit le nombre de membres.
        Inviter votre conjoint, vos enfants ou un proche ne change rien au prix. Il n’y a pas
        d’option payante, pas de module réservé à une formule supérieure, pas de limite de
        fonctions.
      </p>
      <p>
        <em>TVA non applicable, article 293 B du Code général des impôts.</em>
      </p>

      <h2>Ce qui est compris</h2>
      <ul>
        {INCLUS.map((ligne) => (
          <li key={ligne}>{ligne}</li>
        ))}
      </ul>

      <h2>L’essai gratuit</h2>
      <p>
        {ESSAI_JOURS} jours, <strong>sans carte bancaire</strong> et sans rien à annuler : si vous
        ne faites rien à la fin de l’essai, aucun prélèvement n’a lieu et le compte s’arrête
        simplement de donner accès aux modules. Vos données restent exportables.
      </p>
      {/*
        ⚠ 30 JOURS, PAS 14, ET LA RAISON EST DITE. Le module Budget ne montre sa
        valeur qu'après une clôture de mois : un essai plus court se terminait
        avant que la personne ait vu ce qui distingue vraiment le produit. Ne pas
        confondre avec les 14 jours du droit de rétractation, fixés par la loi.
      */}
      <p>
        La durée est de {ESSAI_JOURS} jours parce que le suivi du budget ne se juge qu’après une
        fin de mois : échéances tombées, dépenses réparties, soldes à jour. Un essai plus court se
        terminerait avant que vous ayez vu l’essentiel.
      </p>

      <h2>Résiliation</h2>
      <p>
        En trois clics depuis « Mon abonnement », sans e-mail à envoyer ni justification à donner.
        L’accès reste ouvert jusqu’au terme de la période déjà payée. Le détail figure à
        l’article 7 des <Link href="/conditions">conditions générales</Link>, avec le droit de
        rétractation de quatorze jours prévu par la loi.
      </p>

      <h2>Questions fréquentes</h2>
      <ListeQuestions
        questions={[
          {
            q: 'Les autres membres du foyer doivent-ils payer ?',
            r: 'Non. Un seul abonnement couvre tout le foyer : la personne qui paie invite les autres, qui accèdent à tous les modules gratuitement.',
          },
          {
            q: 'Que se passe-t-il si j’arrête de payer ?',
            r: 'L’accès aux modules se ferme, mais vos données ne sont pas supprimées : l’export complet reste disponible, et reprendre un abonnement les retrouve intactes.',
          },
          {
            q: 'Puis-je changer de formule en cours de route ?',
            r: 'Oui, depuis « Mon abonnement ». Le changement prend effet au terme de la période en cours.',
          },
        ]}
      />

      <p>
        <Link href="/connexion">Commencer l’essai gratuit</Link> ·{' '}
        <Link href="/questions">Toutes les questions</Link>
      </p>
    </CadreSite>
  );
}
