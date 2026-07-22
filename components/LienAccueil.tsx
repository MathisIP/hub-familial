import Link from 'next/link';
import { t } from '@/lib/i18n';

/**
 * Lien « retour à l'accueil » partagé par toutes les pages de module : flèche +
 * LOGO réel de l'app (même icône que l'en-tête d'accueil) + titre. Centralisé ici
 * pour que le futur changement de logo ne se fasse qu'à un seul endroit (l'icône).
 */
export default function LienAccueil() {
  return (
    <Link className="lien-retour" href="/">
      <span aria-hidden="true">←</span>
      <img className="lien-retour-logo" src="/icon-192.png" alt="" width={20} height={20} />
      <span>{t('APP_TITRE').replace(/^🏡\s*/, '')}</span>
    </Link>
  );
}
