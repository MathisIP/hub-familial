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
        {/*
          ⚠ ÉCHÉANCE AFFICHÉE EN PERMANENCE — ce n'est pas décoratif.
          Pour un abonnement MENSUEL, c'est l'unique information sur la
          reconduction : la fenêtre de l'article L. 215-1 (3 mois à 1 mois avant
          le terme) est impraticable sur un contrat d'un mois, et les annuels
          reçoivent en plus l'avis par courriel. Retirer ce bloc reviendrait à
          laisser les mensuels sans aucune information — voir la clause 7 des
          conditions, qui l'annonce.
        */}
        {etat.statut === 'actif' && !etat.annulationProgrammee && fin && (
          <p className="compte-note">
            {t('ABO_RECOND_A', langue)} {fin.toLocaleDateString(locale(langue))}
            {etat.offre === 'annuel'
              ? ` ${t('ABO_RECOND_AN', langue)}`
              : etat.offre === 'mensuel'
                ? ` ${t('ABO_RECOND_MENS', langue)}`
                : ''}
            . {t('ABO_RECOND_LIBRE', langue)}
          </p>
        )}

        {/* Résilié mais encore actif : sans ce message, la personne verrait
            « Abonnement actif » sans savoir que l'accès s'arrête, ni quand. */}
        {etat.annulationProgrammee && (
          <p className="message info">
            {t('ABO_RESILIE_A', langue)}
            {fin ? ` ${fin.toLocaleDateString(locale(langue))}. ` : '. '}
            {t('ABO_RESILIE_B', langue)}
          </p>
        )}
        {!etat.autorise && <p className="message erreur">{t('ABO_SUSPENDU', langue)}</p>}
        <BoutonsAbonnement etat={etat} />
      </section>
    </>
  );
}
