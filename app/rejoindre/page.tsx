import { utilisateurCourant } from '@/lib/foyer';
import { invitationParJeton } from '@/lib/membres';
import { accepterAction } from '@/app/foyer/membres/actions';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rejoindre un foyer — Nestync' };

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
  const [user, langue] = [await utilisateurCourant(), await langueCourante()];
  const inv = jeton ? await invitationParJeton(jeton) : null;

  const bonCompte = !!inv && inv.email.toLowerCase() === user.email.toLowerCase();

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('RJ_TITRE', langue)}</h1>
        </div>
      </header>

      <section className="compte-bloc">
        {!inv ? (
          <p className="message erreur">{t('RJ_INTROUVABLE', langue)}</p>
        ) : inv.expiree ? (
          <p className="message erreur">{t('RJ_EXPIREE', langue)}</p>
        ) : !bonCompte ? (
          <>
            <p className="compte-note">
              {t('RJ_MAUVAIS_A', langue)} <b>{user.email}</b>{t('RJ_MAUVAIS_B', langue)}{' '}
              <b>{inv.email}</b>.
            </p>
            <p className="message erreur">{t('RJ_RECONNECTE', langue)}</p>
          </>
        ) : (
          <>
            <p className="compte-note">
              {t('RJ_INVITE_A', langue)} <b>« {inv.foyerNom} »</b> {t('RJ_INVITE_B', langue)}
            </p>
            <form action={accepterAction}>
              <input type="hidden" name="jeton" value={jeton} />
              <button className="bouton bouton-primaire" type="submit">{t('RJ_REJOINDRE', langue)}</button>
            </form>
          </>
        )}
      </section>
    </>
  );
}
