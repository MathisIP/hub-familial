import VueRepas from '@/components/repas/VueRepas';
import { chargerRepas } from '@/lib/repas/service';
import { ConfigManquante } from '@/lib/config';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Repas — Hub familial' };

export default async function PageRepas() {
  await exigerAcces();
  const langue = await langueCourante();
  let contenu;
  try {
    const initial = await chargerRepas();
    contenu = <VueRepas initial={initial} />;
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
          <h1>{t('MOD_REPAS', langue)}</h1>
          <p>{t('SUB_REPAS', langue)}</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
