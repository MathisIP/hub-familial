import Link from 'next/link';
import { signIn } from '@/auth';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';
import CadreSite from '@/components/vitrine-ds/CadreSite';

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
 * Page de connexion : identification Google, ouverte à tous.
 *
 * ⚠ PASSÉE À LA CHARTE DU SITE (25/08/2026). Elle portait l'habillage de
 * l'application — carte très arrondie, halo, palette corail. Or c'est la
 * première page que voit quelqu'un venu de la vitrine : enchaîner un site sobre
 * et anguleux sur une interface arrondie et colorée donnait l'impression de
 * changer de produit au premier clic. Elle partage désormais le cadre des pages
 * publiques.
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
    <CadreSite surtitre="Votre foyer" titre="Se connecter" chapeau={t('CNX_ACCES', langue)}>
      <div className="nsy-connexion">
        <form
          action={async () => {
            'use server';
            await signIn('google', { redirectTo: retour });
          }}
        >
          {/*
            ⚠ BOUTON CONFORME AUX « SIGN IN WITH GOOGLE » BRANDING GUIDELINES :
            logo officiel quatre couleurs non modifié, fond blanc, bordure et
            typographie imposées. Google vérifie ce point lors de la validation
            de la marque — et la vérification du scope `calendar.events` est
            déjà obtenue, la remettre en cause coûterait des semaines.
            **Ne pas le repeindre aux couleurs du site**, contrairement à tout le
            reste de cette page. C'est le seul élément qui échappe à la charte,
            et c'est une contrainte externe, pas un oubli.
          */}
          <button type="submit" className="bouton-google">
            <span className="bouton-google-ic" aria-hidden="true">
              <svg viewBox="0 0 48 48" width="18" height="18" focusable="false">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24s.92 7.54 2.56 10.78l7.97-6.19z" />
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
              </svg>
            </span>
            {t('CNX_BOUTON', langue)}
          </button>
        </form>

        <p className="nsy-connexion-note">
          Créer un compte ne donne accès à rien : c&apos;est ce qui permet d&apos;être invité dans
          un foyer, ou de demander à en rejoindre un.
        </p>

        <p className="nsy-connexion-retour">
          <Link href="/">{t('CNX_DECOUVRIR', langue)}</Link>
        </p>
      </div>
    </CadreSite>
  );
}
