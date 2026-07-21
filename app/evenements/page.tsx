import Link from 'next/link';
import VueEvenements from '@/components/evenements/VueEvenements';
import SelecteurTheme from '@/components/SelecteurTheme';
import { chargerEvenements } from '@/lib/evenements/service';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Événements — Hub familial' };

export default async function PageEvenements() {
  let contenu;
  try {
    const initial = await chargerEvenements();
    contenu = <VueEvenements initial={initial} />;
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">Impossible de charger les événements : {(e as Error).message}</p>
      );
  }

  return (
    <>
      <Link className="lien-retour" href="/">← {t('APP_TITRE')}</Link>
      <header className="entete">
        <div>
          <h1>{t('MOD_EVENEMENTS')}</h1>
          <p>Réceptions, invités, checklist et menu</p>
        </div>
        <SelecteurTheme />
      </header>
      {contenu}
    </>
  );
}
