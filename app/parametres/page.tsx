import Link from 'next/link';
import ReglagesForm from '@/components/ReglagesForm';
import { auth } from '@/auth';
import { etatAbonnement } from '@/lib/abonnement';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Réglages — Hub familial' };

const ABO_LIBELLE: Record<string, string> = {
  libre: 'Accès libre',
  actif: 'Abonnement actif ✓',
  essai: 'Période d’essai',
  impaye: 'Paiement en attente',
  annule: 'Abonnement annulé',
};

/**
 * Page « Réglages » = hub des préférences et du compte. Regroupe la
 * personnalisation, l'apparence (rappel du pied de page), le foyer, le compte
 * (RGPD), l'abonnement et la confidentialité — ces entrées ont quitté le menu.
 */
export default async function PageParametres() {
  const session = await auth();
  const abo = await etatAbonnement().catch(() => null);

  return (
    <>
      <header className="entete">
        <div>
          <h1>Réglages</h1>
          <p>Tes préférences, ton foyer et ton compte</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Personnalisation</h2>
        <ReglagesForm nomCompte={session?.user?.name ?? ''} />
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Mon foyer</h2>
        <p className="compte-note">
          Les personnes qui partagent les données du foyer, les invitations et le nom du foyer.
        </p>
        <Link className="bouton reglage-lien" href="/foyer">Gérer mon foyer</Link>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Abonnement</h2>
        <p className="compte-note">
          {abo
            ? `Statut : ${ABO_LIBELLE[abo.statut] ?? abo.statut}.`
            : 'Gère l’abonnement du foyer (accès à tous les modules).'}
        </p>
        <Link className="bouton reglage-lien" href="/abonnement">Gérer l’abonnement</Link>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Mon compte</h2>
        <p className="compte-note">
          Exporter toutes tes données (portabilité) ou supprimer définitivement ton compte
          (effacement).
        </p>
        <Link className="bouton reglage-lien" href="/compte">Mes données &amp; mon compte</Link>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Confidentialité</h2>
        <p className="compte-note">
          Comment tes données sont traitées et conservées.
        </p>
        <Link className="bouton reglage-lien" href="/confidentialite">Politique de confidentialité</Link>
      </section>
    </>
  );
}
