import VueAgenda from '@/components/agenda/VueAgenda';
import { chargerAgenda } from '@/lib/agenda/service';
import { ConfigManquante } from '@/lib/config';
import { ErreurValidation } from '@/lib/erreurs';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agenda — Nestync' };

export default async function PageAgenda() {
  await exigerAcces();
  const langue = await langueCourante();
  let contenu;
  try {
    const initial = await chargerAgenda();
    contenu = <VueAgenda initial={initial} />;
  } catch (e) {
    if (e instanceof ConfigManquante || e instanceof ErreurValidation) {
      contenu = <p className="message erreur">{e.message}</p>;
    } else {
      const msg = (e as Error).message ?? '';
      const apiDesactivee = /has not been used|is disabled|accessNotConfigured/i.test(msg);
      const partageManquant = /not found|Not Found|403|forbidden/i.test(msg);
      contenu = (
        <div className="message erreur">
          <p>{t('AGD_INACCESSIBLE', langue)}</p>
          {apiDesactivee && <p>{t('AGD_ERR_API', langue)} <code>hub-familial-app</code>.</p>}
          {partageManquant && <p>{t('AGD_ERR_PARTAGE_A', langue)} <code>claude-sheet-access@hub-familial-app.iam.gserviceaccount.com</code> {t('AGD_ERR_PARTAGE_B', langue)}</p>}
          <p className="ag-erreur-detail">{msg}</p>
        </div>
      );
    }
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('MOD_AGENDA', langue)}</h1>
          <p>{t('SUB_AGENDA', langue)}</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
