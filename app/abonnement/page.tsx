import BoutonsAbonnement from '@/components/abonnement/BoutonsAbonnement';
import { etatAbonnement } from '@/lib/abonnement';
import { t, locale, type CleUI } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Abonnement — Nestync' };

const STATUT_CLE: Record<string, CleUI> = {
  libre: 'ABOP_LIBRE',
  actif: 'ABOP_ACTIF',
  essai: 'ABOP_ESSAI',
  impaye: 'ABOP_IMPAYE',
  annule: 'ABOP_ANNULE',
};

/** Page abonnement : statut du foyer + paiement / gestion (Stripe). */
export default async function PageAbonnement() {
  const [etat, langue] = [await etatAbonnement(), await langueCourante()];
  const fin = etat.finEssai ? new Date(etat.finEssai) : null;

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('REG_ABO_TITRE', langue)}</h1>
          <p>{t('ABO_SOUS', langue)}</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('REG_ABO_STATUT', langue)}</h2>
        <p className={`abo-statut abo-${etat.statut}`}>
          {STATUT_CLE[etat.statut] ? t(STATUT_CLE[etat.statut], langue) : etat.statut}
        </p>
        {etat.statut === 'essai' && (
          <p className="compte-note">
            {fin
              ? `${t('ABO_ESSAI_A', langue)} ${fin.toLocaleDateString(locale(langue))}. ${t('ABO_ESSAI_B', langue)}`
              : t('ABO_ESSAI_OUVERT', langue)}
          </p>
        )}
        {!etat.autorise && <p className="message erreur">{t('ABO_SUSPENDU', langue)}</p>}
        <BoutonsAbonnement etat={etat} />
      </section>
    </>
  );
}
