import { notFound } from 'next/navigation';
import { chargerAdmin } from '@/lib/admin/service';
import { listerScenarios, scenarioActif } from '@/lib/admin/scenarios';
import Reglages from '@/components/admin/Reglages';
import BarreScenarios from '@/components/admin/BarreScenarios';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Modèle économique — Nestync' };

/**
 * MODÈLE ÉCONOMIQUE — tous les paramètres, et ce qu'ils produisent.
 *
 * ⚠ Garde redondante avec celle de l'enveloppe : une page ne fait jamais
 * reposer sa protection sur son layout.
 *
 * ⚠ **LES CHARGES FIXES VIENNENT DU RÉEL**, pas d'une saisie. Elles sont lues
 * dans `comptes.json` via `chargerAdmin()` et injectées dans le scénario à
 * l'affichage : ressaisir à la main des chiffres qu'on connaît déjà, c'est les
 * ressaisir de mémoire, et bâtir une projection sur des charges approximatives.
 */
export default async function PageModele() {
  const [admin, scenario, scenarios] = await Promise.all([
    chargerAdmin(),
    scenarioActif(),
    listerScenarios(),
  ]);
  if (!admin || !scenario) notFound();

  const chargesReellesCentimes = admin.chargeMensuelleCentimes;
  const params = { ...scenario.params, chargesFixesCentimes: chargesReellesCentimes };

  return (
    <>
      <header className="nsa-barre">
        <div>
          <h1>Modèle économique</h1>
          <p>
            Ce que devient réellement un abonnement, une fois tous les prélèvements passés.
          </p>
        </div>
        <span className="nsa-etiquette">
          charges lues dans comptes.json
        </span>
      </header>

      <BarreScenarios scenarios={scenarios} actifId={scenario.id} />

      {chargesReellesCentimes === 0 && (
        <div className="nsa-afaire">
          <div className="nsa-afaire-tete">
            <h2>Charges fixes inconnues</h2>
          </div>
          <p style={{ margin: 0, fontSize: '.88rem' }}>
            Aucune charge récurrente n’est enregistrée. Lance <code>npm run comptes</code> pour
            synchroniser le registre — sans elles, le point mort ne veut rien dire.
          </p>
        </div>
      )}

      <Reglages
        scenarioId={scenario.id}
        params={params}
        // ⚠ Prix et charges fixes ont une source qui fait autorité ailleurs.
        // Les rendre modifiables ici créerait deux vérités concurrentes, et
        // c'est exactement comme cela que l'ancien calculateur a gardé un prix
        // annuel périmé pendant quinze jours.
        figees={['prixMensuelCentimes', 'prixAnnuelCentimes', 'chargesFixesCentimes']}
      />
    </>
  );
}
