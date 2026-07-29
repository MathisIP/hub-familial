import { utilisateurCourant } from '@/lib/foyer';
import { invitationParJeton } from '@/lib/membres';
import { accepterAction } from '@/app/foyer/actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rejoindre un foyer — Hub familial' };

/**
 * Acceptation d'une invitation. Le lien porte `?jeton=`. On N'appelle PAS
 * foyerCourant (qui créerait un foyer perso) : on rattache l'utilisateur au foyer
 * invité. L'e-mail connecté doit correspondre à celui de l'invitation.
 */
export default async function PageRejoindre({
  searchParams,
}: {
  searchParams: Promise<{ jeton?: string }>;
}) {
  const { jeton } = await searchParams;
  const user = await utilisateurCourant();
  const inv = jeton ? await invitationParJeton(jeton) : null;

  const bonCompte = !!inv && inv.email.toLowerCase() === user.email.toLowerCase();

  return (
    <>
      <header className="entete">
        <div>
          <h1>Rejoindre un foyer</h1>
        </div>
      </header>

      <section className="compte-bloc">
        {!inv ? (
          <p className="message erreur">Invitation introuvable ou déjà utilisée.</p>
        ) : inv.expiree ? (
          <p className="message erreur">Cette invitation a expiré. Demande-en une nouvelle.</p>
        ) : !bonCompte ? (
          <>
            <p className="compte-note">
              Tu es connecté·e avec <b>{user.email}</b>, mais cette invitation est destinée à{' '}
              <b>{inv.email}</b>.
            </p>
            <p className="message erreur">Reconnecte-toi avec le bon compte Google pour accepter.</p>
          </>
        ) : (
          <>
            <p className="compte-note">
              Tu es invité·e à rejoindre le foyer <b>« {inv.foyerNom} »</b> et à en partager toutes les
              données.
            </p>
            <form action={accepterAction}>
              <input type="hidden" name="jeton" value={jeton} />
              <button className="bouton bouton-primaire" type="submit">Rejoindre ce foyer</button>
            </form>
          </>
        )}
      </section>
    </>
  );
}
