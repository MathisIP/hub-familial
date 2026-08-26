import { redirect } from 'next/navigation';
import Demarrage from '@/components/onboarding/Demarrage';
import { foyerCourantOuBienvenue, utilisateurCourant } from '@/lib/foyer';
import { chargerFoyerMembres } from '@/lib/membres';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bienvenue — Nestync' };

/**
 * PRISE EN MAIN — affichée une seule fois, juste après la création d'un foyer.
 *
 * ⚠ N'appelle PAS `exigerAcces()` : c'est lui qui redirige ICI quand
 * `onboarding_fait` est faux — l'appeler créerait une boucle de redirection.
 * On se contente de garantir l'existence d'un foyer.
 */
export default async function PageDemarrage() {
  const foyer = await foyerCourantOuBienvenue();
  const user = await utilisateurCourant();

  // Prise en main déjà faite (ou lien ouvert par erreur) : on n'insiste pas.
  if (foyer.onboardingFait) redirect('/');

  const d = await chargerFoyerMembres(foyer.id, user.id);

  return (
    <main className="onb-page">
      <header className="onb-entete">
        <h1>Bienvenue sur Nestync</h1>
        <p>Trois petites questions et ton foyer est prêt.</p>
      </header>
      <Demarrage
        nomInitial={foyer.nom}
        invitationsInitiales={d.invitations.map((i) => ({ email: i.email, jeton: i.jeton }))}
      />
    </main>
  );
}
