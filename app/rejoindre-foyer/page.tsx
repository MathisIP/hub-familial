import Link from 'next/link';
import FormulaireAdhesion from '@/components/foyer/FormulaireAdhesion';
import { utilisateurCourant } from '@/lib/foyer';
import { maDemande } from '@/lib/membres';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rejoindre un foyer — Nestync' };

/**
 * « Rejoindre un foyer existant » — parcours à l'initiative de la personne.
 *
 * Route PROTÉGÉE : un visiteur qui clique depuis la vitrine passe d'abord par la
 * connexion, puis revient ici (callbackUrl). On n'appelle PAS `foyerCourant()`,
 * qui provisionnerait un foyer personnel au demandeur — c'est justement ce qu'on
 * veut éviter puisqu'il cherche à en rejoindre un.
 */
export default async function PageRejoindreFoyer() {
  const user = await utilisateurCourant();
  const demande = await maDemande(user.id);

  return (
    <main className="adh">
      <header className="entete">
        <div>
          <h1>Rejoindre un foyer</h1>
          <p>Quelqu’un de ta famille utilise déjà Nestync ? Demande-lui l’accès.</p>
        </div>
      </header>

      {demande?.statut === 'en_attente' ? (
        <div className="adh-ok">
          <p className="adh-ok-ic" aria-hidden="true">⏳</p>
          <h2>Demande en attente</h2>
          <p>
            Ta demande pour rejoindre <strong>{demande.foyerNom}</strong> a bien été
            transmise. Elle attend la validation du responsable.
          </p>
          <Link href="/" className="bouton bouton-primaire">Retour à l’accueil</Link>
        </div>
      ) : (
        <>
          {demande?.statut === 'refusee' && (
            <p className="message erreur">
              Ta précédente demande pour « {demande.foyerNom} » a été refusée. Tu peux en
              envoyer une nouvelle si c’est une erreur.
            </p>
          )}
          <FormulaireAdhesion monEmail={user.email} />
        </>
      )}
    </main>
  );
}
