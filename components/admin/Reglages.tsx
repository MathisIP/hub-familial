'use client';

import { useEffect, useMemo, useRef, useState, useTransition } from 'react';
import { REGLAGES, type Reglage } from '@/lib/admin/parametres';
import { calculerEconomie, partsCanaux, type ParametresEco } from '@/lib/admin/modele';
import { actionEnregistrerParams } from '@/app/admin/actions';

/**
 * RÉGLAGES DU MODÈLE — tout est visible, tout ce qui peut l'être est modifiable.
 *
 * ⚠ **ENREGISTREMENT EN BASE, PAS DANS LE NAVIGATEUR.** Une hypothèse sur
 * laquelle on bâtit une stratégie ne peut pas disparaître avec un vidage de
 * cache ou un changement de machine. Elle vit dans `admin_scenarios`.
 *
 * ⚠ **ENREGISTREMENT DIFFÉRÉ (900 ms), PAS À CHAQUE FRAPPE.** Écrire à chaque
 * touche produirait une écriture par caractère : taper « 1250 » en ferait
 * quatre, dont trois valeurs intermédiaires absurdes (1, 12, 125) qu'un
 * rechargement mal placé figerait. Le report laisse finir la saisie.
 *
 * ⚠ **AFFICHER MÊME CE QUI NE SE MODIFIE PAS.** Les prix viennent de
 * `lib/offres.ts` et les charges fixes de `comptes.json` : ils sont montrés avec
 * leur source. Un paramètre invisible est un paramètre auquel on ne pense plus —
 * c'est ainsi que l'ancien calculateur a gardé 47,90 € plus de quinze jours
 * après le passage à 49,90 €.
 */

type Props = {
  scenarioId: string;
  params: ParametresEco;
  /** Clés dont la valeur est imposée ailleurs : affichées, non modifiables. */
  figees: (keyof ParametresEco)[];
};

const GROUPES = ['Offre', 'Fidélité', 'Fiscalité', 'Frais', 'Magasins', 'Croissance'] as const;

const fmtEuro = (centimes: number) => (centimes / 100).toFixed(2);
const euros = (c: number) =>
  (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

export default function Reglages({ scenarioId, params, figees }: Props) {
  const [p, setP] = useState<ParametresEco>(params);
  const [, demarrer] = useTransition();
  const [etat, setEtat] = useState<'a-jour' | 'en-cours'>('a-jour');
  const minuteur = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ⚠ Le scénario peut changer sous nos pieds (bascule vers un autre onglet de
  // scénario) : on resynchronise, sinon l'écran garde les valeurs du précédent.
  useEffect(() => setP(params), [params]);

  const maj = (v: Partial<ParametresEco>) => {
    const suivant = { ...p, ...v };
    setP(suivant);
    setEtat('en-cours');
    if (minuteur.current) clearTimeout(minuteur.current);
    minuteur.current = setTimeout(() => {
      demarrer(async () => {
        await actionEnregistrerParams(scenarioId, suivant);
        setEtat('a-jour');
      });
    }, 900);
  };

  const eco = useMemo(() => calculerEconomie(p), [p]);
  const canaux = partsCanaux(p);

  /*
   * ⚠ EN SOCIÉTÉ, LA TVA N'EST PAS UN CHOIX et l'URSSAF ne s'applique pas. Le
   * modèle l'impose déjà ; l'écran doit le montrer, sinon on croit régler
   * quelque chose qui n'a aucun effet — le pire des deux mondes.
   */
  const societe = p.regime === 'societe';
  const sansEffet = (cle: keyof ParametresEco): boolean =>
    (societe && (cle === 'assujettiTva' || cle === 'urssafPct' || cle === 'acre' || cle === 'irPct')) ||
    (!societe && cle === 'isPct') ||
    (!p.assujettiTva && !societe && cle === 'tvaTauxPct');

  return (
    <>
      <div className="nsa-panneau">
        <div className="nsa-tete">
          <h2>Réglages du modèle</h2>
          <span className="nsa-quand">
            {etat === 'en-cours' ? 'enregistrement…' : 'enregistré'}
          </span>
        </div>
        <div className="nsa-corps">
          <p className="nsa-note">
            Tout est enregistré en base, dans le scénario ouvert : tes hypothèses te retrouvent à la
            prochaine session, même sur une autre machine.
          </p>

          {GROUPES.map((g) => (
            <div key={g}>
              <p className="nsa-groupe-titre">{g}</p>
              <div className="nsa-reglages">
                {REGLAGES.filter((r) => r.groupe === g).map((r) => (
                  <Ligne
                    key={r.cle}
                    r={r}
                    p={p}
                    maj={maj}
                    fige={figees.includes(r.cle)}
                    inerte={sansEffet(r.cle)}
                  />
                ))}
              </div>
            </div>
          ))}

          {/*
            ⚠ La part du site est CALCULÉE, jamais saisie : trois curseurs libres
            autoriseraient un total de 130 %, et le modèle facturerait des
            commissions sur des abonnements qui n'existent pas. On l'affiche
            quand même — c'est une donnée, et Mathis veut voir toutes les données.
          */}
          <p className="nsa-groupe-titre">Répartition effective</p>
          <div className="nsa-reglages">
            <div className="nsa-reglage">
              <div>
                <div className="nsa-reglage-nom">
                  Part souscrite sur le site
                  <span className="nsa-source">calculée</span>
                </div>
                <div className="nsa-reglage-aide">
                  Le reste, une fois les deux magasins servis. Seule voie qui passe par Stripe.
                </div>
              </div>
              <div className="nsa-fige">{Math.round(canaux.site * 100)} %</div>
            </div>
          </div>
        </div>
      </div>

      {/*
        ⚠ LA MARGE, POSTE PAR POSTE. Un total net ne dit pas sur quoi agir : c'est
        la décomposition qui montre que la part fixe de Stripe pèse plus que son
        pourcentage, ou que la TVA coûte plus que la commission d'un magasin.
      */}
      <div className="nsa-panneau">
        <div className="nsa-tete">
          <h2>Ce que devient un abonnement</h2>
          <span className="nsa-quand">du prix affiché à la marge</span>
        </div>
        <div className="nsa-corps">
          <div className="nsa-grille">
            <Cascade titre="Abonné mensuel" m={eco.mensuel} periode="par mois" />
            <Cascade titre="Abonné annuel" m={eco.annuel} periode="par an" />
          </div>

          <div className="nsa-trio" style={{ marginTop: '1.4rem' }}>
            <Chiffre v={euros(eco.margeMoyenneCentimes)} l="marge moyenne / mois" />
            <Chiffre v={euros(eco.valeurVieMoyenneCentimes)} l="valeur sur toute la vie" />
            <Chiffre
              v={eco.ratioValeurCout === null ? '—' : `× ${eco.ratioValeurCout}`}
              l="valeur / coût d’acquisition"
              ok={(eco.ratioValeurCout ?? 0) >= 3}
              mal={eco.ratioValeurCout !== null && eco.ratioValeurCout < 1}
            />
          </div>
          <p className="nsa-note">
            Un abonné mensuel vit <strong>{eco.mensuel.dureeVieMois} mois</strong>, un annuel{' '}
            <strong>{eco.annuel.dureeVieMois} mois</strong>. C’est pourquoi l’annuel vaut davantage
            malgré ses deux mois offerts — et pourquoi il n’encaisse qu’une seule part fixe Stripe au
            lieu de douze.
          </p>
        </div>
      </div>
    </>
  );
}

function Ligne({
  r,
  p,
  maj,
  fige,
  inerte,
}: {
  r: Reglage;
  p: ParametresEco;
  maj: (v: Partial<ParametresEco>) => void;
  fige: boolean;
  inerte: boolean;
}) {
  const v = p[r.cle];

  const controle = () => {
    if (fige) {
      // Valeur imposée ailleurs : affichée, jamais saisissable ici.
      return (
        <div className="nsa-fige">
          {r.unite === 'euro' ? euros(v as number) : String(v)}
        </div>
      );
    }
    if (r.unite === 'booleen') {
      return (
        <div className="nsa-bascule">
          <input
            type="checkbox"
            checked={Boolean(v)}
            disabled={inerte}
            onChange={(e) => maj({ [r.cle]: e.target.checked } as Partial<ParametresEco>)}
            aria-label={r.libelle}
          />
        </div>
      );
    }
    if (r.unite === 'choix') {
      return (
        <select
          className="nsa-champ"
          value={String(v)}
          onChange={(e) => maj({ regime: e.target.value as 'micro' | 'societe' })}
          aria-label={r.libelle}
        >
          <option value="micro">Micro-entreprise</option>
          <option value="societe">Société</option>
        </select>
      );
    }
    // ⚠ Les euros se saisissent en euros et se stockent en centimes. Laisser
    // saisir des centimes serait exact et illisible.
    const enEuros = r.unite === 'euro';
    return (
      <input
        className="nsa-champ"
        type="number"
        step={enEuros ? '0.01' : r.unite === 'pct' ? '0.1' : '0.1'}
        min={0}
        disabled={inerte}
        value={enEuros ? fmtEuro(v as number) : (v as number)}
        onChange={(e) => {
          const n = Number(e.target.value);
          const propre = Number.isFinite(n) ? Math.max(0, n) : 0;
          maj({ [r.cle]: enEuros ? Math.round(propre * 100) : propre } as Partial<ParametresEco>);
        }}
        aria-label={r.libelle}
      />
    );
  };

  return (
    <div className="nsa-reglage" style={inerte ? { opacity: 0.45 } : undefined}>
      <div>
        <div className="nsa-reglage-nom">
          {r.libelle}
          {r.unite === 'pct' && ' (%)'}
          {r.source && <span className="nsa-source">{r.source}</span>}
        </div>
        <div className="nsa-reglage-aide">
          {inerte ? 'Sans effet dans le régime choisi.' : r.aide}
        </div>
      </div>
      {controle()}
    </div>
  );
}

function Cascade({
  titre,
  m,
  periode,
}: {
  titre: string;
  m: ReturnType<typeof calculerEconomie>['mensuel'];
  periode: string;
}) {
  const l = (nom: string, c: number, sous?: string) =>
    c > 0 ? (
      <div key={nom}>
        <span>
          {nom} {sous && <span className="nsa-sous">{sous}</span>}
        </span>
        <span className="nsa-mal">− {euros(c)}</span>
      </div>
    ) : null;

  return (
    <div>
      <p className="nsa-groupe-titre">
        {titre} — {periode}
      </p>
      <div className="nsa-cascade">
        <div>
          <span>Prix affiché</span>
          <span>{euros(m.prixTtcCentimes)}</span>
        </div>
        {l('TVA collectée', m.tvaCentimes)}
        {l('Commission magasin', m.commissionCentimes)}
        {l('Frais Stripe', m.stripeCentimes, 'part fixe comprise')}
        {l('Cotisations URSSAF', m.urssafCentimes)}
        {l('Versement libératoire', m.irCentimes)}
        {l('Infrastructure', m.infraCentimes, 'base, hébergement, stockage')}
        <div className="nsa-final">
          <span>Marge</span>
          <span className={m.margePeriodeCentimes >= 0 ? 'nsa-ok' : 'nsa-mal'}>
            {euros(m.margePeriodeCentimes)}
          </span>
        </div>
      </div>
    </div>
  );
}

function Chiffre({ v, l, ok, mal }: { v: string; l: string; ok?: boolean; mal?: boolean }) {
  return (
    <div>
      <div className={`nsa-val ${ok ? 'nsa-ok' : ''} ${mal ? 'nsa-mal' : ''}`}>{v}</div>
      <div className="nsa-lbl">{l}</div>
    </div>
  );
}
