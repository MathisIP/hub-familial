import VueDocuments from '@/components/documents/VueDocuments';
import { chargerDocuments } from '@/lib/documents/service';
import { ConfigManquante } from '@/lib/config';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documents — Nestync' };

export default async function PageDocuments() {
  await exigerAcces();
  const langue = await langueCourante();
  let contenu;
  try {
    const initial = await chargerDocuments();
    contenu = <VueDocuments initial={initial} />;
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
          <h1>{t('MOD_DOCUMENTS', langue)}</h1>
          <p>{t('SUB_DOCUMENTS', langue)}</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
