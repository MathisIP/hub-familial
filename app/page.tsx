import MenuPrincipal from '@/components/MenuPrincipal';
import ResumeComptes from '@/components/ResumeComptes';
import SaisieTransaction from '@/components/budget/SaisieTransaction';
import DriveExplorer from '@/components/DriveExplorer';
import SemaineAgenda from '@/components/agenda/SemaineAgenda';
import CoursesSemaine from '@/components/CoursesSemaine';
import { chargerAccueilBudget, type AccueilBudget } from '@/lib/budget/service';
import { t } from '@/lib/i18n';

/**
 * Accueil = tableau de bord du foyer : résumé des comptes, actions rapides,
 * agenda de la semaine (tous agendas) et courses. Les modules sont accessibles
 * via le menu (coin haut-droite). Server component ; les parties interactives
 * sont des îlots client.
 */
export const dynamic = 'force-dynamic';

export default async function Accueil() {
  let accueil: AccueilBudget | null = null;
  try {
    accueil = await chargerAccueilBudget();
  } catch {
    accueil = null; // budget indisponible : l'accueil reste utilisable
  }

  return (
    <>
      <header className="entete">
        <div className="brand">
          {/* Logo de l'app (icône « maison familiale »), pour la cohérence visuelle */}
          <img className="brand-logo" src="/icon-192.png" alt="" width={40} height={40} />
          <div>
            <h1 className="brand-titre">{t('APP_TITRE').replace(/^🏡\s*/, '')}</h1>
            <p>{t('APP_SOUS_TITRE')}</p>
          </div>
        </div>
        <MenuPrincipal />
      </header>

      {accueil ? (
        <ResumeComptes soldes={accueil.soldesHorsEpargne} />
      ) : (
        <p className="message erreur comptes-indispo">
          Comptes momentanément indisponibles (données Budget non chargées).
        </p>
      )}

      <div className="actions-rapides">
        <SaisieTransaction params={accueil?.parametres} />
      </div>

      <DriveExplorer />

      <SemaineAgenda />

      <CoursesSemaine />
    </>
  );
}
