import VueDocuments from '@/components/documents/VueDocuments';
import PartageDossiers from '@/components/documents/PartageDossiers';
import {
  chargerDocuments,
  chargerPartageDossiers,
  membresPourPartageDossiers,
  type DossierPartage,
} from '@/lib/documents/service';
import { ConfigManquante } from '@/lib/config';
import { exigerAcces } from '@/lib/abonnement';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Documents — Nestync' };

export default async function PageDocuments() {
  await exigerAcces();
  const langue = await langueCourante();
  // Réglages de partage : propriétaire seulement. `null` (au lieu d'une erreur)
  // quand la personne ne l'est pas — ce n'est pas un échec, juste une section
  // qui ne la concerne pas ; la faire échouer ferait tomber toute la page.
  const partage = await (async (): Promise<{
    dossiers: DossierPartage[];
    membres: { utilisateurId: string; nom: string }[];
  } | null> => {
    try {
      const [dossiers, membres] = await Promise.all([
        chargerPartageDossiers(),
        membresPourPartageDossiers(),
      ]);
      return { dossiers, membres };
    } catch {
      return null;
    }
  })();

  let contenu;
  try {
    const initial = await chargerDocuments();
    contenu = (
      <>
        <VueDocuments initial={initial} />
        {partage && partage.membres.length > 1 && (
          <PartageDossiers dossiers={partage.dossiers} membres={partage.membres} />
        )}
      </>
    );
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
