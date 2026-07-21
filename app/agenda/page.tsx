import Link from 'next/link';
import VueAgenda from '@/components/agenda/VueAgenda';
import SelecteurTheme from '@/components/SelecteurTheme';
import { chargerAgenda } from '@/lib/agenda/service';
import { ConfigManquante } from '@/lib/config';
import { ErreurValidation } from '@/lib/erreurs';
import { t } from '@/lib/i18n';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agenda — Hub familial' };

export default async function PageAgenda() {
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
          <p>Agenda inaccessible.</p>
          {apiDesactivee && <p>➡ Active l’API Google Calendar dans le projet GCP <code>hub-familial-app</code>.</p>}
          {partageManquant && <p>➡ Partage l’agenda avec <code>claude-sheet-access@hub-familial-app.iam.gserviceaccount.com</code> (droit « modifier les événements »).</p>}
          <p className="ag-erreur-detail">{msg}</p>
        </div>
      );
    }
  }

  return (
    <>
      <Link className="lien-retour" href="/">← {t('APP_TITRE')}</Link>
      <header className="entete">
        <div>
          <h1>{t('MOD_AGENDA')}</h1>
          <p>Agenda familial partagé</p>
        </div>
        <SelecteurTheme />
      </header>
      {contenu}
    </>
  );
}
