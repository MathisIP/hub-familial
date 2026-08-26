import Link from 'next/link';
import FormulaireAdhesion from '@/components/foyer/FormulaireAdhesion';
import { utilisateurCourant } from '@/lib/foyer';
import { maDemande } from '@/lib/membres';
import CadreSite from '@/components/vitrine-ds/CadreSite';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rejoindre un foyer — Nestync' };

/**
 * « Rejoindre un foyer existant » — parcours à l'initiative de la personne.
 *
 * Route PROTÉGÉE : un visiteur qui clique depuis la vitrine passe d'abord par la
 * connexion, puis revient ici (callbackUrl). On n'appelle PAS `foyerCourant()`,
 * qui provisionnerait un foyer personnel au demandeur — c'est justement ce qu'on
 * veut éviter puisqu'il cherche à en rejoindre un.
 *
 * ⚠ HABILLÉE À LA CHARTE DU SITE, bien qu'elle exige une session. Elle est
 * listée dans le pied du site vitrine, et surtout : celui qui l'atteint n'a
 * **pas encore de foyer**. Lui montrer l'habillage de l'application lui
 * présenterait un intérieur auquel il n'a pas accès — c'est le même
 * raisonnement que pour la page de connexion.
 */
export default async function PageRejoindreFoyer() {
  const user = await utilisateurCourant();
  const demande = await maDemande(user.id);

  return (
    <CadreSite
      surtitre="Vous êtes attendu"
      titre="Rejoindre un foyer"
      chapeau="Quelqu’un de votre famille utilise déjà Nestync ? Demandez-lui l’accès."
    >
      {demande?.statut === 'en_attente' ? (
        <div className="nsy-etat">
          {/* Pas d'emoji : la charte l'interdit, et l'attente se dit très bien
              en toutes lettres. */}
          <p className="nsy-etat-surtitre">Demande en attente</p>
          <p>
            Votre demande pour rejoindre <strong>{demande.foyerNom}</strong> a bien été
            transmise. Elle attend la validation du responsable du foyer.
          </p>
          <Link href="/" className="nsy-lien-mono">
            Retour à l’accueil
          </Link>
        </div>
      ) : (
        <>
          {demande?.statut === 'refusee' && (
            <div className="nsy-etat alerte">
              <p className="nsy-etat-surtitre">Demande refusée</p>
              <p>
                Votre précédente demande pour « {demande.foyerNom} » a été refusée. Vous
                pouvez en envoyer une nouvelle si c’est une erreur.
              </p>
            </div>
          )}
          <FormulaireAdhesion monEmail={user.email} />
        </>
      )}
    </CadreSite>
  );
}
