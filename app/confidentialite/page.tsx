import Link from 'next/link';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';
import CadreSite from '@/components/vitrine-ds/CadreSite';

export const metadata = { title: 'Politique de confidentialité — Nestync' };

/**
 * Politique de confidentialité (RGPD). Page PUBLIQUE (exclue de l'authentification
 * dans middleware.ts). Décrit les traitements réels de l'app.
 *
 * ⚠ COMPLÈTE et destinée à être lue telle quelle : elle est examinée par Google
 * lors de la vérification des scopes Agenda (section 9 : finalité de chaque
 * scope, engagements d'usage limité, conservation, révocation). Ne pas y
 * réintroduire de mention « gabarit » ni de champ à compléter — ce serait un
 * motif de rejet. Une relecture juridique reste recommandée avant la vente.
 */

/**
 * TÉMOINS DÉPOSÉS SUR L'APPAREIL — liste exhaustive, hors cookie de session.
 *
 * ⚠ **CETTE LISTE EST UNE DÉCLARATION LÉGALE, PAS UNE DOCUMENTATION.** Elle doit
 * correspondre exactement à ce que le code pose. Le texte annonçait deux
 * préférences quand il y en avait six : l'écart s'est creusé en ajoutant la
 * mémoire de la vue d'agenda sans rouvrir ce fichier.
 *
 * ⚠ Aucun n'est publicitaire et aucun ne suit l'utilisateur d'un site à l'autre :
 * ils relèvent tous du confort demandé par la personne elle-même, donc exemptés
 * de consentement — mais pas de déclaration.
 *
 * ⚠ Le cookie de session d'authentification n'y figure pas : il est décrit dans
 * la phrase qui précède, comme strictement nécessaire.
 */
const TEMOINS: [string, string, string][] = [
  ['hub-theme', 'le thème choisi (clair ou nuit)', 'jusqu’à effacement, sur l’appareil'],
  ['hub-neon', 'l’effet lumineux de l’interface, activé ou non', 'jusqu’à effacement, sur l’appareil'],
  ['hub-nom', 'le prénom affiché sur l’accueil, si vous l’avez personnalisé', 'jusqu’à effacement, sur l’appareil'],
  ['hub-langue', 'la langue de l’interface', 'cookie, 1 an'],
  ['hub-agenda-vue', 'la vue d’agenda préférée (jour, semaine ou mois)', 'jusqu’à effacement, sur l’appareil'],
  ['hub-install-ios', 'le fait que vous ayez fermé le rappel d’installation sur iPhone', 'jusqu’à effacement, sur l’appareil'],
  ['nsy-origine', 'le canal (ex. un réseau social) par lequel vous êtes arrivé sur le site, si le lien suivi le précisait', 'cookie, 1 an'],
];
export default async function PageConfidentialite() {
  const langue = await langueCourante();
  return (
    <CadreSite surtitre="Vos données" titre={t('CONF_TITRE', langue)}>
      <p className="doc-maj">{t('CONF_MAJ', langue)}</p>
      <p className="doc-langue">{t('CONF_LANGUE', langue)}</p>


      <h2>{t('CONF_S1_T', langue)}</h2>
      <p>{t('CONF_S1_P', langue)}</p>

      <h2>{t('CONF_S2_T', langue)}</h2>
      <ul>
        <li>{t('CONF_S2_LI1', langue)}</li>
        <li>{t('CONF_S2_LI2', langue)}</li>
        <li>{t('CONF_S2_LI3', langue)}</li>
        <li>{t('CONF_S2_LI4', langue)}</li>
        <li>{t('CONF_S2_LI5', langue)}</li>
      </ul>

      <h2>{t('CONF_S3_T', langue)}</h2>
      <p>{t('CONF_S3_P', langue)}</p>
      <p>{t('CONF_S3_ORIGINE', langue)}</p>
      {/*
        ⚠ Greffé sur la section « base légale » plutôt qu'en section propre : le
        consentement parental EST une question de base légale, et créer une
        section renumérerait les six suivantes — des liens et des renvois pour
        rien. À lire avec l'article 4 des CGV, qui recueille la déclaration.
      */}
      <p>{t('CONF_S3_MINEURS', langue)}</p>

      <h2>{t('CONF_S4_T', langue)}</h2>
      <ul>
        <li>{t('CONF_S4_LI1', langue)}</li>
        <li>{t('CONF_S4_LI2', langue)}</li>
        <li>{t('CONF_S4_LI3', langue)}</li>
        <li>{t('CONF_S4_LI5', langue)}</li>
        <li>{t('CONF_S4_LI4', langue)}</li>
        <li>{t('CONF_S4_LI6', langue)}</li>
      </ul>

      <h2>{t('CONF_S5_T', langue)}</h2>
      <p>
        {t('CONF_S5_A', langue)} <Link href="/foyer/compte">{t('NAV_MON_COMPTE', langue)}</Link>{' '}
        {t('CONF_S5_B', langue)}
      </p>
      <p>{t('CONF_S5_C', langue)}</p>
      <p>{t('CONF_S5_D', langue)}</p>
      <ul>
        <li>{t('CONF_S5_LI1', langue)}</li>
        <li>{t('CONF_S5_LI2', langue)}</li>
        <li>{t('CONF_S5_LI3', langue)}</li>
      </ul>

      <h2>{t('CONF_S6_T', langue)}</h2>
      <p>{t('CONF_S6_P', langue)}</p>
      {/*
        ⚠ LISTE EXHAUSTIVE, ET ELLE DOIT LE RESTER (28/08/2026). Ce paragraphe
        annonçait « deux préférences (thème, langue) » alors que six témoins
        étaient réellement posés. Aucun n'est publicitaire et aucun n'exige de
        consentement — l'inexactitude ne portait donc pas sur le droit applicable,
        mais sur une mention obligatoire (art. 13 du RGPD), ce qui suffit.
        ⚠ TOUT NOUVEAU `localStorage` OU COOKIE SE DÉCLARE ICI. C'est la vue
        agenda (`hub-agenda-vue`), ajoutée sans repasser par ce texte, qui a
        révélé l'écart.
      */}
      <ul>
        {TEMOINS.map(([cle, role, duree]) => (
          <li key={cle}>
            <code>{cle}</code> — {role} <em>({duree})</em>
          </li>
        ))}
      </ul>
      <p>{t('CONF_S6_P3', langue)}</p>
      <p>{t('CONF_S6_P2', langue)}</p>

      <h2>{t('CONF_S7_T', langue)}</h2>
      <p>
        {t('CONF_S7_A', langue)} <Link href="/foyer/compte">{t('NAV_MON_COMPTE', langue)}</Link> :
      </p>
      <ul>
        <li>{t('CONF_S7_LI1', langue)}</li>
        <li>{t('CONF_S7_LI2', langue)}</li>
      </ul>
      <p>{t('CONF_S7_P2', langue)}</p>

      <h2>{t('CONF_S8_T', langue)}</h2>
      <p>{t('CONF_S8_P', langue)}</p>

      {/* Section exigée par Google pour la vérification des scopes sensibles
          (Google API Services User Data Policy — Limited Use). */}
      <h2>{t('CONF_S9_T', langue)}</h2>
      <p>{t('CONF_S9_INTRO', langue)}</p>
      <ul>
        <li>{t('CONF_S9_SCOPE1', langue)}</li>
        <li>{t('CONF_S9_SCOPE2', langue)}</li>
      </ul>
      <p>{t('CONF_S9_MINIMAL', langue)}</p>
      <p>{t('CONF_S9_USAGE', langue)}</p>
      <p>
        <strong>{t('CONF_S9_LIMITED', langue)}</strong>{' '}
        <a
          href="https://developers.google.com/terms/api-services-user-data-policy"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google API Services User Data Policy ↗
        </a>
      </p>
      <p>{t('CONF_S9_STOCKAGE', langue)}</p>
      <p>{t('CONF_S9_REVOQUER', langue)}</p>
    </CadreSite>
  );
}
