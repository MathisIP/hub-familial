import VueAgenda from '@/components/agenda/VueAgenda';
import ConfigAgendas from '@/components/agenda/ConfigAgendas';
import { chargerAgenda } from '@/lib/agenda/service';
import {
  calendriersDisponibles,
  calendriersDuFoyer,
  monAgendaConnecte,
} from '@/lib/agenda/calendriers';
import { ConfigManquante } from '@/lib/config';
import { ErreurValidation } from '@/lib/erreurs';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agenda — Nestync' };

/** Message affiché au retour de l'autorisation Google (`?agenda=…`). */
const RETOURS: Record<string, { texte: string; erreur: boolean }> = {
  ok: { texte: 'Google Agenda connecté. Choisis les calendriers à partager.', erreur: false },
  refus: { texte: 'Autorisation annulée : aucun agenda n’a été connecté.', erreur: true },
  etat: { texte: 'Lien d’autorisation invalide ou expiré. Réessaie.', erreur: true },
  echec: { texte: 'La connexion à Google Agenda a échoué. Réessaie.', erreur: true },
};

export default async function PageAgenda({
  searchParams,
}: {
  searchParams: Promise<{ agenda?: string }>;
}) {
  await exigerAcces();
  const langue = await langueCourante();
  const retour = RETOURS[(await searchParams).agenda ?? ''];

  // La configuration ne doit jamais empêcher l'affichage : si Google répond mal,
  // on montre au moins l'écran de connexion.
  const [connecte, disponibles, rattaches] = await Promise.all([
    monAgendaConnecte().catch(() => false),
    calendriersDisponibles().catch(() => []),
    calendriersDuFoyer().catch(() => []),
  ]);

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
      contenu = (
        <div className="message erreur">
          <p>{t('AGD_INACCESSIBLE', langue)}</p>
          {apiDesactivee && <p>{t('AGD_ERR_API', langue)} <code>hub-familial-app</code>.</p>}
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

      {retour && (
        <p className={`message ${retour.erreur ? 'erreur' : 'info'}`}>{retour.texte}</p>
      )}

      <ConfigAgendas connecte={connecte} disponibles={disponibles} rattaches={rattaches} />

      {contenu}
    </>
  );
}
