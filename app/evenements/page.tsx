import VueEvenements from '@/components/evenements/VueEvenements';
import { chargerEvenements } from '@/lib/evenements/service';
import { ConfigManquante } from '@/lib/config';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Événements — Hub familial' };

export default async function PageEvenements() {
  await exigerAcces();
  const langue = await langueCourante();
  let contenu;
  try {
    const initial = await chargerEvenements();
    contenu = <VueEvenements initial={initial} />;
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
          <h1>{t('MOD_EVENEMENTS', langue)}</h1>
          <p>{t('SUB_EVENEMENTS', langue)}</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
