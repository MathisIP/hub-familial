import Image from 'next/image';
import Link from 'next/link';
import { signIn } from '@/auth';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const metadata = { title: 'Connexion — Nestync' };

/**
 * Normalise la destination d'après-connexion en CHEMIN INTERNE.
 * Garde-fou anti « open redirect » : on ne conserve jamais le domaine fourni —
 * seul le chemin est repris, sinon un lien piégé pourrait renvoyer l'utilisateur
 * (fraîchement authentifié) vers un site tiers.
 */
function destinationSure(brut: string | undefined): string {
  if (!brut) return '/';
  try {
    // Base arbitraire : on ne garde que le chemin, jamais l'origine reçue.
    const u = new URL(brut, 'https://nestync.app');
    const chemin = u.pathname + u.search;
    if (!chemin.startsWith('/') || chemin.startsWith('//')) return '/';
    if (chemin.startsWith('/connexion')) return '/'; // évite la boucle
    return chemin;
  } catch {
    return '/';
  }
}

/**
 * Page de connexion : accès réservé (Google, liste blanche). Un seul bouton qui
 * lance le flux OAuth Google via une action serveur.
 *
 * Un lien de retour vers la vitrine (`/`) évite d'enfermer un visiteur venu
 * simplement découvrir le produit, les tarifs ou les conditions.
 */
export default async function Connexion({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const langue = await langueCourante();
  // Le middleware ajoute `?callbackUrl=…` quand il intercepte une page protégée
  // (ex. « Rejoindre un foyer ») : on y revient après connexion, au lieu de
  // retomber systématiquement sur l'accueil. On n'accepte qu'un chemin interne.
  const { callbackUrl } = await searchParams;
  const retour = destinationSure(callbackUrl);
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
            await signIn('google', { redirectTo: retour });
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
