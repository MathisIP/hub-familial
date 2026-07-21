import Link from 'next/link';
import VueCadeaux from '@/components/cadeaux/VueCadeaux';
import SelecteurTheme from '@/components/SelecteurTheme';
import { chargerCadeaux } from '@/lib/cadeaux/service';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cadeaux — Hub familial' };

export default async function PageCadeaux() {
  let contenu;
  try {
    const initial = await chargerCadeaux();
    contenu = <VueCadeaux initial={initial} />;
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">Impossible de charger les cadeaux : {(e as Error).message}</p>
      );
  }

  return (
    <>
      <Link className="lien-retour" href="/">← {t('APP_TITRE')}</Link>
      <header className="entete">
        <div>
          <h1>{t('MOD_CADEAUX')}</h1>
          <p>Idées, budget et suivi des cadeaux par occasion</p>
        </div>
        <SelecteurTheme />
      </header>
      {contenu}
    </>
  );
}
