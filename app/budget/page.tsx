import LienAccueil from '@/components/LienAccueil';
import VueBudget from '@/components/budget/VueBudget';
import SelecteurMois from '@/components/budget/SelecteurMois';
import SelecteurTheme from '@/components/SelecteurTheme';
import { chargerBudget } from '@/lib/budget/service';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';

/** Rendu à chaque requête : le tableau de bord reflète l'état courant du Sheet. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Budget — Hub familial' };

export default async function PageBudget() {
  let contenu;
  try {
    const d = await chargerBudget();
    contenu = (
      <>
        <SelecteurMois selection={d.selection} annees={d.anneesDisponibles} />
        <VueBudget d={d} />
      </>
    );
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">Impossible de charger le budget : {(e as Error).message}</p>
      );
  }

  return (
    <>
      <LienAccueil />
      <header className="entete">
        <div>
          <h1>{t('MOD_BUDGET')}</h1>
          <p>Comptes, dépenses et objectifs du foyer</p>
        </div>
        <SelecteurTheme />
      </header>
      {contenu}
    </>
  );
}
