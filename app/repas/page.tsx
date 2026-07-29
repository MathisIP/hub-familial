import VueRepas from '@/components/repas/VueRepas';
import { chargerRepas } from '@/lib/repas/service';
import { ConfigManquante } from '@/lib/config';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Repas — Hub familial' };

export default async function PageRepas() {
  await exigerAcces();
  let contenu;
  try {
    const initial = await chargerRepas();
    contenu = <VueRepas initial={initial} />;
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">Impossible de charger les repas : {(e as Error).message}</p>
      );
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('MOD_REPAS')}</h1>
          <p>Planning des dîners, recettes et quantités par personne</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
