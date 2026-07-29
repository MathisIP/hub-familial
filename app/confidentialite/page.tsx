import Link from 'next/link';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const metadata = { title: 'Politique de confidentialité — Hub familial' };

/**
 * Politique de confidentialité (RGPD). Page PUBLIQUE (exclue de l'authentification
 * dans middleware.ts). ⚠ GABARIT : les champs `[À COMPLÉTER]` doivent être
 * renseignés et le texte relu (idéalement par un juriste) avant mise en service
 * commerciale. Décrit les traitements réels de l'app.
 */
export default async function PageConfidentialite() {
  const langue = await langueCourante();
  return (
    <article className="doc-legal">
      <Link className="lien-retour" href="/">
        <span aria-hidden="true">←</span> <span>{t('CONF_RETOUR', langue)}</span>
      </Link>

      <h1>{t('CONF_TITRE', langue)}</h1>
      <p className="doc-maj">{t('CONF_MAJ', langue)}</p>

      <p className="doc-avertissement">{t('CONF_AVERT', langue)}</p>

      <h2>{t('CONF_S1_T', langue)}</h2>
      <p>{t('CONF_S1_P', langue)}</p>

      <h2>{t('CONF_S2_T', langue)}</h2>
      <ul>
        <li>{t('CONF_S2_LI1', langue)}</li>
        <li>{t('CONF_S2_LI2', langue)}</li>
        <li>{t('CONF_S2_LI3', langue)}</li>
      </ul>

      <h2>{t('CONF_S3_T', langue)}</h2>
      <p>{t('CONF_S3_P', langue)}</p>

      <h2>{t('CONF_S4_T', langue)}</h2>
      <ul>
        <li>{t('CONF_S4_LI1', langue)}</li>
        <li>{t('CONF_S4_LI2', langue)}</li>
        <li>{t('CONF_S4_LI3', langue)}</li>
        <li>{t('CONF_S4_LI4', langue)}</li>
      </ul>

      <h2>{t('CONF_S5_T', langue)}</h2>
      <p>
        {t('CONF_S5_A', langue)} <Link href="/compte">{t('NAV_MON_COMPTE', langue)}</Link>{' '}
        {t('CONF_S5_B', langue)}
      </p>

      <h2>{t('CONF_S6_T', langue)}</h2>
      <p>{t('CONF_S6_P', langue)}</p>

      <h2>{t('CONF_S7_T', langue)}</h2>
      <p>
        {t('CONF_S7_A', langue)} <Link href="/compte">{t('NAV_MON_COMPTE', langue)}</Link> :
      </p>
      <ul>
        <li>{t('CONF_S7_LI1', langue)}</li>
        <li>{t('CONF_S7_LI2', langue)}</li>
      </ul>
      <p>{t('CONF_S7_P2', langue)}</p>

      <h2>{t('CONF_S8_T', langue)}</h2>
      <p>{t('CONF_S8_P', langue)}</p>
    </article>
  );
}
