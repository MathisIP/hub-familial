import Link from 'next/link';
import ZoneSuppression from '@/components/compte/ZoneSuppression';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon compte — Nestync' };

/**
 * Page « Mon compte » : droits RGPD de la personne — export (portabilité) et
 * suppression (effacement). Protégée par le middleware (session requise).
 */
export default async function PageCompte() {
  const langue = await langueCourante();
  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('NAV_MON_COMPTE', langue)}</h1>
          <p>{t('CPT_SOUS', langue)}</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('CPT_EXPORT_TITRE', langue)}</h2>
        <p className="compte-note">{t('CPT_EXPORT_DESC', langue)}</p>
        <a className="bouton bouton-action" href="/api/compte/export">{t('CPT_EXPORT_BTN', langue)}</a>
      </section>

      <section className="compte-bloc compte-danger">
        <h2 className="bloc-titre">{t('CPT_SUPPR_TITRE', langue)}</h2>
        <p className="compte-note">{t('CPT_SUPPR_DESC', langue)}</p>
        <ZoneSuppression />
      </section>

      <p className="compte-lien-conf">
        <Link href="/confidentialite">{t('CPT_CONF_LIEN', langue)}</Link>
      </p>
    </>
  );
}
