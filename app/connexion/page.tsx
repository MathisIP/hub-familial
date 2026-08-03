import Image from 'next/image';
import Link from 'next/link';
import { signIn } from '@/auth';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const metadata = { title: 'Connexion — Nestync' };

/**
 * Page de connexion : accès réservé (Google, liste blanche). Un seul bouton qui
 * lance le flux OAuth Google via une action serveur.
 *
 * Un lien de retour vers la vitrine (`/`) évite d'enfermer un visiteur venu
 * simplement découvrir le produit, les tarifs ou les conditions.
 */
export default async function Connexion() {
  const langue = await langueCourante();
  return (
    <div className="connexion">
      <div className="connexion-carte">
        <Image
          src="/icon-192.png"
          alt=""
          width={72}
          height={72}
          className="connexion-logo-img"
          priority
        />
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
        <p className="connexion-retour">
          <Link href="/">{t('CNX_DECOUVRIR', langue)}</Link>
        </p>
      </div>
    </div>
  );
}
