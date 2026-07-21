import { signIn } from '@/auth';
import { t } from '@/lib/i18n';

export const metadata = { title: 'Connexion — Hub familial' };

/**
 * Page de connexion : accès réservé (Google, liste blanche). Un seul bouton qui
 * lance le flux OAuth Google via une action serveur.
 */
export default function Connexion() {
  return (
    <div className="connexion">
      <div className="connexion-carte">
        <div className="connexion-logo">🏡</div>
        <h1>{t('APP_TITRE')}</h1>
        <p>Accès réservé au foyer. Connecte-toi avec ton compte Google.</p>
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: '/' });
          }}
        >
          <button type="submit" className="bouton connexion-bouton">
            Se connecter avec Google
          </button>
        </form>
      </div>
    </div>
  );
}
