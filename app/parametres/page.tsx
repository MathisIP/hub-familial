import Link from 'next/link';
import ReglagesForm from '@/components/ReglagesForm';
import ReglagesNotifications from '@/components/ReglagesNotifications';
import { auth } from '@/auth';
import { etatAbonnement } from '@/lib/abonnement';
import { t, type CleUI } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Réglages — Nestync' };

const ABO_CLE: Record<string, CleUI> = {
  libre: 'ABO_LIBRE',
  actif: 'ABO_ACTIF',
  essai: 'ABO_ESSAI',
  impaye: 'ABO_IMPAYE',
  annule: 'ABO_ANNULE',
};

/**
 * Page « Réglages » = hub des préférences et du compte : personnalisation
 * (nom + langue), foyer, abonnement, compte (RGPD) et confidentialité.
 */
export default async function PageParametres() {
  const [session, abo, langue] = await Promise.all([
    auth(),
    etatAbonnement().catch(() => null),
    langueCourante(),
  ]);

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('REG_TITRE', langue)}</h1>
          <p>{t('REG_SOUS', langue)}</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('REG_PERSO', langue)}</h2>
        <ReglagesForm nomCompte={session?.user?.name ?? ''} />
      </section>

      {/* Section à part, et haut placée : le réglage vaut pour CET appareil, pas
          pour le foyer — un téléphone peut être autorisé et pas le PC. C'est
          donc la première chose qu'on vient y faire depuis un nouvel appareil. */}
      <ReglagesNotifications />

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('NAV_MON_FOYER', langue)}</h2>
        <p className="compte-note">{t('REG_FOYER_DESC', langue)}</p>
        <Link className="bouton reglage-lien" href="/foyer">{t('REG_FOYER_BTN', langue)}</Link>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('REG_ABO_TITRE', langue)}</h2>
        <p className="compte-note">
          {abo
            ? `${t('REG_ABO_STATUT', langue)} : ${t(ABO_CLE[abo.statut] ?? 'ABO_LIBRE', langue)}.`
            : t('REG_ABO_DESC', langue)}
        </p>
        <Link className="bouton reglage-lien" href="/abonnement">{t('REG_ABO_BTN', langue)}</Link>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('REG_COMPTE_TITRE', langue)}</h2>
        <p className="compte-note">{t('REG_COMPTE_DESC', langue)}</p>
        <Link className="bouton reglage-lien" href="/compte">{t('REG_COMPTE_BTN', langue)}</Link>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('REG_CONF_TITRE', langue)}</h2>
        <p className="compte-note">{t('REG_CONF_DESC', langue)}</p>
        <Link className="bouton reglage-lien" href="/confidentialite">{t('REG_CONF_BTN', langue)}</Link>
      </section>
    </>
  );
}
