import { signIn } from '@/auth';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const metadata = { title: 'Connexion — Nestync' };

/**
 * Page de connexion : accès réservé (Google, liste blanche). Un seul bouton qui
 * lance le flux OAuth Google via une action serveur.
 */
export default async function Connexion() {
  const langue = await langueCourante();
  return (
    <div className="connexion">
      <div className="connexion-carte">
        <div className="connexion-logo">🏡</div>
        <h1>{t('APP_TITRE', langue)}</h1>
        <p>{t('CNX_ACCES', langue)}</p>
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
        >
          <button type="submit" className="bouton connexion-bouton">
            {t('CNX_BOUTON', langue)}
          </button>
        </form>
      </div>
    </div>
  );
}
