import LienAccueil from '@/components/LienAccueil';
import BoutonsAbonnement from '@/components/abonnement/BoutonsAbonnement';
import { etatAbonnement } from '@/lib/abonnement';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abonnement — Hub familial' };

const LIBELLE: Record<string, string> = {
  libre: 'Accès libre (facturation non activée).',
  actif: 'Abonnement actif ✓',
  essai: 'Période d’essai',
  impaye: 'Paiement en attente — régularise pour continuer.',
  annule: 'Abonnement annulé.',
};

/** Page abonnement : statut du foyer + paiement / gestion (Stripe). */
export default async function PageAbonnement() {
  const etat = await etatAbonnement();
  const fin = etat.finEssai ? new Date(etat.finEssai) : null;

  return (
    <>
      <LienAccueil />
      <header className="entete">
        <div>
          <h1>Abonnement</h1>
          <p>L’abonnement du foyer donne accès à tous les modules du Hub.</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Statut</h2>
        <p className={`abo-statut abo-${etat.statut}`}>{LIBELLE[etat.statut] ?? etat.statut}</p>
        {etat.statut === 'essai' && (
          <p className="compte-note">
            {fin
              ? `Essai gratuit jusqu’au ${fin.toLocaleDateString('fr-FR')}. Abonne-toi pour ne pas perdre l’accès.`
              : 'Essai en cours. Abonne-toi quand tu veux pour pérenniser l’accès.'}
          </p>
        )}
        {!etat.autorise && (
          <p className="message erreur">Ton accès est suspendu : un abonnement actif est requis.</p>
        )}
        <BoutonsAbonnement etat={etat} />
      </section>
    </>
  );
}
