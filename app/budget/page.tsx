import VueBudget from '@/components/budget/VueBudget';
import SelecteurMois from '@/components/budget/SelecteurMois';
import { chargerBudget } from '@/lib/budget/service';
import { exigerAcces } from '@/lib/abonnement';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/** Rendu à chaque requête : le tableau de bord reflète l'état courant de la base. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Budget — Nestync' };

export default async function PageBudget({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  await exigerAcces();
  const langue = await langueCourante();
  const sp = await searchParams;
  const annee = Number(sp.annee);
  const mois = Number(sp.mois);
  const selection =
    Number.isFinite(annee) && Number.isFinite(mois) && mois >= 1 && mois <= 12
      ? { annee, mois }
      : undefined;

  let contenu;
  try {
    const d = await chargerBudget(selection);
    contenu = (
      <>
        <SelecteurMois selection={d.selection} annees={d.anneesDisponibles} />
        <VueBudget d={d} langue={langue} />
      </>
    );
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">{t('G_ERR_PAGE', langue)} {(e as Error).message}</p>
      );
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('MOD_BUDGET', langue)}</h1>
          <p>{t('SUB_BUDGET', langue)}</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
