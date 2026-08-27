import { notFound } from 'next/navigation';
import { chargerAdmin } from '@/lib/admin/service';
import { listerScenarios, scenarioActif } from '@/lib/admin/scenarios';
import {
  calculerEconomie,
  bilanPour,
  abonnesPourCaHt,
  ECHELONS,
  SEUIL_TVA_CENTIMES,
  SEUIL_MICRO_CENTIMES,
} from '@/lib/admin/modele';
import { analyserLeviers, type EtatReel } from '@/lib/admin/leviers';
import BarreScenarios from '@/components/admin/BarreScenarios';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Paliers & leviers — Nestync' };

const euros = (c: number) =>
  (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/**
 * PALIERS & LEVIERS — les prochains seuils, et quoi faire pour les atteindre.
 *
 * ⚠ Garde redondante avec l'enveloppe, à dessein.
 */
export default async function PagePaliers() {
  const [admin, scenario, scenarios] = await Promise.all([
    chargerAdmin(),
    scenarioActif(),
    listerScenarios(),
  ]);
  if (!admin || !scenario) notFound();

  const p = { ...scenario.params, chargesFixesCentimes: admin.chargeMensuelleCentimes };
  const eco = calculerEconomie(p);

  const abonnesActuels = admin.abonnesPayants;
  const aujourdhui = bilanPour(abonnesActuels, p, eco);

  const etat: EtatReel = {
    abonnes: abonnesActuels,
    foyers: admin.foyers,
    foyersEnEssai: admin.essaisEnCours,
    essaisQuiExpirent: admin.essaisQuiExpirent.length,
    comptesSansFoyer: admin.sansFoyer,
    foyersJamaisVenus: admin.foyersJamaisVenus,
    foyersActifs30j: admin.foyersActifs30j,
    impayes: admin.impayes.length,
    messagesNonTraites: admin.messagesNonTraites,
  };
  const leviers = analyserLeviers(p, eco, etat);

  /*
   * ⚠ LES SEUILS SONT DES JALONS, PAS DES PALIERS COMME LES AUTRES. Franchir
   * 37 500 € de chiffre d'affaires impose la TVA et ampute chaque abonnement de
   * 16,7 % : c'est une marche descendante au milieu d'une courbe qui monte. La
   * découvrir après coup, c'est la découvrir sur un avis d'imposition.
   */
  const nTva = abonnesPourCaHt(SEUIL_TVA_CENTIMES, eco);
  const nMicro = abonnesPourCaHt(SEUIL_MICRO_CENTIMES, eco);

  // Le point mort s'insère dans l'échelle même s'il ne tombe pas sur un échelon.
  const echelle = [...new Set([...ECHELONS, eco.pointMortAvecPub ?? 0, abonnesActuels].filter((n) => n > 0))].sort(
    (a, b) => a - b,
  );

  let dejaFranchi = false;
  const lignes = echelle.map((n) => {
    const b = bilanPour(n, p, eco);
    const franchit = !dejaFranchi && b.resultatMensuelCentimes >= 0;
    if (franchit) dejaFranchi = true;
    return {
      b,
      franchit,
      // ⚠ Hors d'atteinte à budget publicitaire constant : la base plafonne.
      hors: eco.plafondAbonnes !== null && n > eco.plafondAbonnes,
      jalonTva: nTva !== null && n >= nTva && echelle[echelle.indexOf(n) - 1] < nTva,
      jalonMicro: nMicro !== null && n >= nMicro && echelle[echelle.indexOf(n) - 1] < nMicro,
    };
  });

  return (
    <>
      <header className="nsa-barre">
        <div>
          <h1>Paliers &amp; leviers</h1>
          <p>Les prochains seuils à franchir, et ce qui les rapproche le plus vite.</p>
        </div>
        <span className="nsa-etiquette">
          {abonnesActuels} abonné{abonnesActuels > 1 ? 's' : ''} aujourd’hui
        </span>
      </header>

      <BarreScenarios scenarios={scenarios} actifId={scenario.id} />

      {/* ---------- Là où j'en suis, dans ce scénario ---------- */}
      <div className="nsa-rail">
        <div>
          <div className="nsa-lbl">Résultat</div>
          <div className={`nsa-val ${aujourdhui.resultatMensuelCentimes >= 0 ? 'nsa-ok' : 'nsa-mal'}`}>
            {euros(aujourdhui.resultatMensuelCentimes)}
          </div>
          <div className="nsa-ctx">par mois, tout déduit</div>
        </div>
        <div>
          <div className="nsa-lbl">Marge / abonné</div>
          <div className="nsa-val">{euros(eco.margeMoyenneCentimes)}</div>
          <div className="nsa-ctx">sur {euros(eco.prixMoyenParMoisCentimes)} encaissés</div>
        </div>
        <div>
          <div className="nsa-lbl">Point mort</div>
          <div className="nsa-val">{eco.pointMortAvecPub ?? '∞'}</div>
          <div className="nsa-ctx">
            {eco.pointMortAvecPub === null
              ? 'inatteignable'
              : eco.pointMortAvecPub <= abonnesActuels
                ? 'atteint'
                : `il en manque ${eco.pointMortAvecPub - abonnesActuels}`}
          </div>
        </div>
        <div>
          <div className="nsa-lbl">Valeur / coût</div>
          <div
            className={`nsa-val ${(eco.ratioValeurCout ?? 0) >= 3 ? 'nsa-ok' : eco.ratioValeurCout !== null && eco.ratioValeurCout < 1 ? 'nsa-mal' : ''}`}
          >
            {eco.ratioValeurCout === null ? '—' : `× ${eco.ratioValeurCout}`}
          </div>
          <div className="nsa-ctx">3 est le seuil de confort</div>
        </div>
        <div>
          <div className="nsa-lbl">Croissance</div>
          <div className={`nsa-val ${aujourdhui.croissanceNetteParMois >= 0 ? 'nsa-ok' : 'nsa-mal'}`}>
            {aujourdhui.croissanceNetteParMois >= 0 ? '+' : ''}
            {aujourdhui.croissanceNetteParMois}
          </div>
          <div className="nsa-ctx">
            {eco.nouveauxParMois} gagnés − {aujourdhui.aRecruterParMois} perdus
          </div>
        </div>
        <div>
          <div className="nsa-lbl">Plafond</div>
          <div className="nsa-val">{eco.plafondAbonnes ?? '∞'}</div>
          <div className="nsa-ctx">à budget publicitaire constant</div>
        </div>
      </div>

      {/* ---------- Ce qu'il y a de mieux à faire ---------- */}
      <div className="nsa-panneau">
        <div className="nsa-tete">
          <h2>Ce qui fera grandir le produit</h2>
          <span className="nsa-quand">classé par effet mensuel</span>
        </div>
        <div className="nsa-corps">
          {/*
            ⚠ AUCUN CONSEIL GÉNÉRIQUE. Chaque levier est chiffré sur les données
            réelles ou n'est pas affiché. « Améliorez votre rétention » ne dit pas
            quoi faire lundi matin ; « un point de rétention vaut 14 € par mois »
            se compare à tout le reste.
          */}
          {leviers.length === 0 ? (
            <p className="nsa-note">Rien à signaler : le modèle est sain et rien n’attend.</p>
          ) : (
            <div className="nsa-leviers">
              {leviers.map((l) => (
                <article key={l.id} className={`nsa-levier ${l.urgence}`}>
                  <div className="nsa-levier-tete">
                    <h3>
                      <span className="nsa-rang">
                        {l.urgence === 'blocage' ? 'à débloquer' : l.urgence === 'action' ? 'à faire' : 'à surveiller'}
                      </span>
                      {l.titre}
                    </h3>
                    {l.gainMensuelCentimes !== null && (
                      <span className="nsa-gain">+{euros(l.gainMensuelCentimes)} / mois</span>
                    )}
                  </div>
                  <p className="nsa-constat">{l.constat}</p>
                  <p>{l.action}</p>
                </article>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ---------- Les paliers ---------- */}
      <div className="nsa-panneau">
        <div className="nsa-tete">
          <h2>Paliers d’abonnés</h2>
          <span className="nsa-quand">
            mix conservé : {p.partAnnuellePct} % d’annuels
          </span>
        </div>
        <div className="nsa-corps">
          <div className="nsa-defile">
            <table className="nsa-table">
              <thead>
                <tr>
                  <th>Abonnés</th>
                  <th className="nsa-num">CA HT / an</th>
                  <th className="nsa-num">Marge / mois</th>
                  <th className="nsa-num">Résultat / mois</th>
                  <th className="nsa-num">Résultat / an</th>
                  <th className="nsa-num">À recruter / mois</th>
                </tr>
              </thead>
              <tbody>
                {lignes.map(({ b, franchit, hors, jalonTva, jalonMicro }) => (
                  <tr
                    key={b.abonnes}
                    className={`${franchit ? 'nsa-seuil' : ''} ${hors ? 'nsa-hors' : ''} ${jalonTva || jalonMicro ? 'nsa-jalon' : ''}`}
                  >
                    <td>
                      {b.abonnes}
                      {b.abonnes === abonnesActuels && <span className="nsa-badge">aujourd’hui</span>}
                      {franchit && <span className="nsa-badge">équilibre</span>}
                      {jalonTva && <span className="nsa-badge">TVA obligatoire</span>}
                      {jalonMicro && <span className="nsa-badge">plafond micro</span>}
                    </td>
                    <td className="nsa-num">{euros(b.caHtAnnuelCentimes)}</td>
                    <td className="nsa-num">{euros(b.margeBruteMensuelleCentimes)}</td>
                    <td className={`nsa-num ${b.resultatMensuelCentimes < 0 ? 'nsa-mal' : 'nsa-ok'}`}>
                      {euros(b.resultatMensuelCentimes)}
                    </td>
                    <td className={`nsa-num ${b.resultatAnnuelCentimes < 0 ? 'nsa-mal' : 'nsa-ok'}`}>
                      {euros(b.resultatAnnuelCentimes)}
                    </td>
                    <td className="nsa-num">{b.aRecruterParMois}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <p className="nsa-note">
            {eco.plafondAbonnes !== null && (
              <>
                Les paliers estompés sont <strong>hors d’atteinte</strong> à budget publicitaire
                constant : au-delà de {eco.plafondAbonnes} abonnés, les résiliations absorbent tout
                ce que la publicité apporte. Il faut augmenter le budget ou faire baisser la
                résiliation.{' '}
              </>
            )}
            La colonne « à recruter » se lit à côté du résultat : c’est elle qui dit si un palier est
            atteignable ou seulement souhaitable.
          </p>
          {nTva !== null && (
            <p className="nsa-note">
              ⚠ À partir de <strong>{nTva} abonnés</strong>, la TVA devient obligatoire et chaque
              abonnement perd 16,7 % de sa valeur — une marche descendante au milieu d’une courbe qui
              monte. Coche « assujetti à la TVA » dans le modèle pour voir le résultat après ce
              franchissement.
            </p>
          )}
        </div>
      </div>
    </>
  );
}
