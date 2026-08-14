import Link from 'next/link';
import ZoneSuppression from '@/components/compte/ZoneSuppression';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';
import { monRoleDansLeFoyer } from '@/lib/rgpd';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon compte — Nestync' };

/**
 * Page « Mon compte » : droits RGPD de la personne — export (portabilité) et
 * suppression (effacement). Protégée par le middleware (session requise).
 *
 * ⚠ Les textes dépendent du RÔLE : un membre non propriétaire quitte le foyer,
 * il ne le supprime pas. Lui annoncer qu'il « efface toutes les données du
 * foyer » le dissuaderait d'exercer un droit qu'il a — et décrirait une action
 * que le code ne fait plus.
 */
export default async function PageCompte() {
  const [langue, role] = await Promise.all([langueCourante(), monRoleDansLeFoyer()]);
  const proprio = role === 'proprietaire';
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
        <p className="compte-note">{t('CPT_EXPORT_DESC_PARTIEL', langue)}</p>
        <a className="bouton bouton-action" href="/api/compte/export">{t('CPT_EXPORT_BTN', langue)}</a>
      </section>

      <section className="compte-bloc compte-danger">
        <h2 className="bloc-titre">{t('CPT_SUPPR_TITRE', langue)}</h2>
        <p className="compte-note">
          {t(proprio ? 'CPT_SUPPR_DESC' : 'CPT_SUPPR_DESC_MEMBRE', langue)}
        </p>
        <ZoneSuppression proprietaire={proprio} />
      </section>

      <p className="compte-lien-conf">
        <Link href="/confidentialite">{t('CPT_CONF_LIEN', langue)}</Link>
      </p>
    </>
  );
}
