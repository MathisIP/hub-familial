import LienAccueil from '@/components/LienAccueil';
import VueRepas from '@/components/repas/VueRepas';
import SelecteurTheme from '@/components/SelecteurTheme';
import { chargerRepas } from '@/lib/repas/service';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Repas — Hub familial' };

export default async function PageRepas() {
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
      <LienAccueil />
      <header className="entete">
        <div>
          <h1>{t('MOD_REPAS')}</h1>
          <p>Planning des dîners, recettes et quantités par personne</p>
        </div>
        <SelecteurTheme />
      </header>
      {contenu}
    </>
  );
}
