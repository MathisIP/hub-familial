'use client';

import { useEffect, useMemo, useState } from 'react';
import {
  simuler,
  paliers,
  enCentimes,
  ECHELONS,
  type ChargeSimulee,
  type Investissement,
  type ParamsSimulation,
} from '@/lib/admin/simulation';

/**
 * SIMULATEUR — le seul endroit de `/admin` où l'on projette au lieu de constater.
 *
 * ⚠ **LES PARAMÈTRES VIVENT DANS LE NAVIGATEUR, PAS EN BASE.** Une hypothèse
 * n'est pas une écriture comptable : rangée dans `mouvements_projet`, elle
 * rendrait le solde de `/comptes` faux sans que rien ne le signale — or c'est
 * précisément la véracité de ce solde qui fait sa valeur. `localStorage`
 * convient exactement ici : un seul utilisateur, un seul poste.
 *
 * ⚠ **Ne PAS lire `localStorage` à l'initialisation du `useState`.** Le serveur
 * n'y a pas accès : le premier rendu différerait du rendu client et React
 * remplacerait tout l'arbre en signalant une erreur d'hydratation. On amorce
 * donc avec les vraies charges reçues du serveur, puis on relit l'enregistrement
 * dans un effet.
 */

const CLE = 'nsy-simulation-admin';

type Props = {
  chargesReelles: ChargeSimulee[];
  abonnesMensuels: number;
  abonnesAnnuels: number;
};

type Enregistre = {
  abonnesMensuels: number;
  abonnesAnnuels: number;
  charges: ChargeSimulee[];
  investissements: Investissement[];
  commissionPct: number;
  partViaStorePct: number;
  resiliationPct: number;
};

const euros = (c: number) =>
  (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });
const eurosPrecis = (c: number) =>
  (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

const nouvelId = () => Math.random().toString(36).slice(2, 9);

export default function Simulateur({ chargesReelles, abonnesMensuels, abonnesAnnuels }: Props) {
  const [p, setP] = useState<Enregistre>({
    abonnesMensuels,
    abonnesAnnuels,
    charges: chargesReelles,
    investissements: [],
    commissionPct: 15,
    partViaStorePct: 60,
    // 4 %/mois = un abonné qui reste un peu plus de deux ans. Hypothèse de
    // départ prudente pour un produit familial à faible prix ; à ajuster dès
    // qu'on aura des résiliations réelles à observer.
    resiliationPct: 4,
  });
  const [charge, setCharge] = useState(false);

  // ⚠ Relecture APRÈS le premier rendu — voir l'avertissement en tête de fichier.
  useEffect(() => {
    try {
      const brut = window.localStorage.getItem(CLE);
      if (brut) setP((actuel) => ({ ...actuel, ...(JSON.parse(brut) as Enregistre) }));
    } catch {
      // Un enregistrement illisible (format changé, quota) ne doit pas priver de
      // l'outil : on repart des valeurs réelles, silencieusement.
    }
    setCharge(true);
  }, []);

  useEffect(() => {
    if (!charge) return;
    try {
      window.localStorage.setItem(CLE, JSON.stringify(p));
    } catch {
      /* quota plein : la simulation reste utilisable, elle ne survivra pas au rechargement */
    }
  }, [p, charge]);

  const params: ParamsSimulation = p;
  const r = useMemo(() => simuler(params), [params]);
  const grille = useMemo(() => paliers(params, ECHELONS), [params]);

  const maj = (v: Partial<Enregistre>) => setP((a) => ({ ...a, ...v }));

  const majCharge = (id: string, v: Partial<ChargeSimulee>) =>
    maj({ charges: p.charges.map((c) => (c.id === id ? { ...c, ...v } : c)) });

  const majInv = (id: string, v: Partial<Investissement>) =>
    maj({ investissements: p.investissements.map((i) => (i.id === id ? { ...i, ...v } : i)) });

  const reinitialiser = () => {
    setP({
      abonnesMensuels,
      abonnesAnnuels,
      charges: chargesReelles,
      investissements: [],
      commissionPct: 15,
      partViaStorePct: 60,
      resiliationPct: 4,
    });
  };

  const positif = r.resultatCentimes >= 0;

  return (
    <section className="adm-bloc sim">
      <div className="sim-entete">
        <h2 className="bloc-titre">Simulation</h2>
        <button type="button" className="sim-lien" onClick={reinitialiser}>
          Repartir des chiffres réels
        </button>
      </div>

      {/*
        ⚠ Dire d'emblée que rien n'est enregistré côté serveur. Sans cette
        phrase, on hésite à saisir des hypothèses par crainte d'abîmer ses
        comptes — et un outil qu'on n'ose pas manipuler ne sert à rien.
      */}
      <p className="adm-note">
        Hypothèses libres, gardées dans ce navigateur uniquement. Rien n’est écrit en base :
        les comptes réels de <code>/comptes</code> ne bougent pas.
      </p>

      <div className="sim-grille">
        {/* ---------------------------------------------------------------- */}
        <div className="sim-panneau">
          <h3 className="sim-titre">Abonnés</h3>
          <label className="sim-champ">
            <span>Mensuels</span>
            <input
              type="number"
              min={0}
              value={p.abonnesMensuels}
              onChange={(e) => maj({ abonnesMensuels: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <label className="sim-champ">
            <span>Annuels</span>
            <input
              type="number"
              min={0}
              value={p.abonnesAnnuels}
              onChange={(e) => maj({ abonnesAnnuels: Math.max(0, Number(e.target.value) || 0) })}
            />
          </label>
          <p className="sim-aide">
            Un abonné annuel rapporte <strong>4,16 €</strong> par mois contre 4,99 € au mensuel :
            ce sont les deux mois offerts.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        <div className="sim-panneau">
          <h3 className="sim-titre">Résiliations</h3>
          <label className="sim-champ sim-curseur">
            <span>
              Par mois <strong>{p.resiliationPct} %</strong> de la base
            </span>
            <input
              type="range"
              min={0}
              max={20}
              step={0.5}
              value={p.resiliationPct}
              onChange={(e) => maj({ resiliationPct: Number(e.target.value) })}
            />
          </label>
          <div className="sim-repere">
            <button type="button" onClick={() => maj({ resiliationPct: 0 })}>Aucune</button>
            <button type="button" onClick={() => maj({ resiliationPct: 2 })}>2 % (fidèle)</button>
            <button type="button" onClick={() => maj({ resiliationPct: 5 })}>5 % (courant)</button>
            <button type="button" onClick={() => maj({ resiliationPct: 10 })}>10 % (difficile)</button>
          </div>

          <ul className="sim-consequences">
            <li>
              <span>Un abonné reste</span>
              <strong>
                {r.dureeVieMois === null ? (
                  'indéfiniment'
                ) : (
                  <>
                    {r.dureeVieMois} mois
                    {r.dureeVieMois >= 18 && <> ({(r.dureeVieMois / 12).toFixed(1)} ans)</>}
                  </>
                )}
              </strong>
            </li>
            <li>
              <span>Il rapporte en tout</span>
              <strong>{r.valeurVieCentimes === null ? '—' : eurosPrecis(r.valeurVieCentimes)}</strong>
            </li>
            {/*
              ⚠ LE CHIFFRE QUI MANQUE LE PLUS SOUVENT AUX PROJECTIONS. Atteindre
              le point mort ne sert à rien si l'on n'y reste pas : ce nombre dit
              ce qu'il faut recruter chaque mois rien que pour faire du surplace.
            */}
            <li className={r.aRecruterParMois > 0 ? 'sim-souligne' : ''}>
              <span>À recruter pour ne pas reculer</span>
              <strong>{r.aRecruterParMois} / mois</strong>
            </li>
          </ul>

          {/*
            ⚠ Dire pourquoi le résultat du mois n'a pas bougé quand on tire le
            curseur. Sans cette phrase, on croit à un bug — c'est au contraire
            le seul modèle juste : le revenu encaissé ce mois-ci est encaissé.
          */}
          <p className="sim-aide">
            Le résultat mensuel ci-dessous <strong>ne bouge pas</strong> avec ce curseur, et c’est
            normal : le revenu déjà encaissé l’est. Les résiliations décident de la suite, pas du
            mois en cours.
          </p>
          {p.abonnesAnnuels > 0 && (
            <p className="sim-aide">
              ⚠ Tes {p.abonnesAnnuels} abonné{p.abonnesAnnuels > 1 ? 's' : ''} annuel
              {p.abonnesAnnuels > 1 ? 's' : ''} ne peu{p.abonnesAnnuels > 1 ? 'vent' : 't'} partir
              qu’au renouvellement : l’érosion réelle est plus lente que ce taux moyen.
            </p>
          )}
        </div>

        {/* ---------------------------------------------------------------- */}
        <div className="sim-panneau">
          <h3 className="sim-titre">Frais des magasins (2.0)</h3>
          <label className="sim-champ sim-curseur">
            <span>
              Commission <strong>{p.commissionPct} %</strong>
            </span>
            <input
              type="range"
              min={0}
              max={30}
              step={1}
              value={p.commissionPct}
              onChange={(e) => maj({ commissionPct: Number(e.target.value) })}
            />
          </label>
          <div className="sim-repere">
            <button type="button" onClick={() => maj({ commissionPct: 0 })}>Aucune</button>
            <button type="button" onClick={() => maj({ commissionPct: 15 })}>15 % (petit éditeur)</button>
            <button type="button" onClick={() => maj({ commissionPct: 30 })}>30 % (plein tarif)</button>
          </div>

          <label className="sim-champ sim-curseur">
            <span>
              Souscriptions dans l’app <strong>{p.partViaStorePct} %</strong>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={p.partViaStorePct}
              onChange={(e) => maj({ partViaStorePct: Number(e.target.value) })}
            />
          </label>
          {/*
            ⚠ Le message le plus utile de tout l'écran. Le taux affiché n'est pas
            ce qu'on paie : ce qu'on paie, c'est le taux MULTIPLIÉ par la part
            passant par le magasin. Un abonnement pris sur le site n'en paie
            aucune.
          */}
          <p className="sim-aide">
            Ponction réelle : <strong>{((p.commissionPct * p.partViaStorePct) / 100).toFixed(1)} %</strong> du
            revenu. Un abonnement souscrit sur le site passe par Stripe et ne paie aucune commission
            — c’est ce curseur, plus que le taux, qui décide du coût du 2.0.
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        <div className="sim-panneau sim-large">
          <h3 className="sim-titre">
            Charges récurrentes
            <button
              type="button"
              className="sim-ajout"
              onClick={() =>
                maj({
                  charges: [
                    ...p.charges,
                    { id: nouvelId(), libelle: '', montantCentimes: 0, periode: 'mensuel', active: true, reelle: false },
                  ],
                })
              }
            >
              + ajouter
            </button>
          </h3>
          {p.charges.length === 0 && (
            <p className="sim-aide">
              Aucune charge. Si tu en attends, <code>npm run comptes</code> n’a peut-être jamais été
              lancé — le registre est un fichier hors dépôt.
            </p>
          )}
          <ul className="sim-liste">
            {p.charges.map((c) => (
              <li key={c.id} className={c.active ? '' : 'sim-off'}>
                <input
                  type="checkbox"
                  checked={c.active}
                  onChange={(e) => majCharge(c.id, { active: e.target.checked })}
                  aria-label={`Compter ${c.libelle || 'cette charge'}`}
                />
                <input
                  type="text"
                  className="sim-lbl"
                  value={c.libelle}
                  placeholder="Libellé"
                  onChange={(e) => majCharge(c.id, { libelle: e.target.value })}
                />
                <input
                  type="number"
                  className="sim-montant"
                  min={0}
                  step="0.01"
                  value={c.montantCentimes / 100}
                  onChange={(e) => majCharge(c.id, { montantCentimes: enCentimes(Number(e.target.value) || 0) })}
                />
                <select
                  value={c.periode}
                  onChange={(e) => majCharge(c.id, { periode: e.target.value as 'mensuel' | 'annuel' })}
                >
                  <option value="mensuel">/ mois</option>
                  <option value="annuel">/ an</option>
                </select>
                {/* ⚠ Distinguer le relevé de l'hypothèse : sans cette pastille,
                    on ne sait plus, trois jours après, ce qu'on paie vraiment. */}
                <span className={`sim-tag ${c.reelle ? 'sim-tag-reel' : ''}`}>
                  {c.reelle ? 'réelle' : 'hypothèse'}
                </span>
                <button
                  type="button"
                  className="sim-x"
                  onClick={() => maj({ charges: p.charges.filter((x) => x.id !== c.id) })}
                  aria-label="Retirer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <p className="sim-total">
            Total ramené au mois : <strong>{eurosPrecis(r.chargeMensuelleCentimes)}</strong>
            <span className="sim-aide"> — l’annuel compte au douzième.</span>
          </p>
        </div>

        {/* ---------------------------------------------------------------- */}
        <div className="sim-panneau sim-large">
          <h3 className="sim-titre">
            Investissements
            <button
              type="button"
              className="sim-ajout"
              onClick={() =>
                maj({
                  investissements: [
                    ...p.investissements,
                    { id: nouvelId(), libelle: '', montantCentimes: 0, actif: true },
                  ],
                })
              }
            >
              + ajouter
            </button>
          </h3>
          {/*
            ⚠ Un investissement NE DÉPLACE PAS le point mort — il se rembourse.
            Le ranger avec les charges ferait paraître un achat unique
            éternellement pesant, et découragerait une dépense qui se rattrape.
          */}
          <p className="sim-aide">
            Dépense engagée une seule fois. Elle ne déplace pas le point mort : elle se rembourse.
          </p>
          <ul className="sim-liste">
            {p.investissements.map((i) => (
              <li key={i.id} className={i.actif ? '' : 'sim-off'}>
                <input
                  type="checkbox"
                  checked={i.actif}
                  onChange={(e) => majInv(i.id, { actif: e.target.checked })}
                  aria-label={`Compter ${i.libelle || 'cet investissement'}`}
                />
                <input
                  type="text"
                  className="sim-lbl"
                  value={i.libelle}
                  placeholder="Libellé"
                  onChange={(e) => majInv(i.id, { libelle: e.target.value })}
                />
                <input
                  type="number"
                  className="sim-montant"
                  min={0}
                  step="0.01"
                  value={i.montantCentimes / 100}
                  onChange={(e) => majInv(i.id, { montantCentimes: enCentimes(Number(e.target.value) || 0) })}
                />
                <button
                  type="button"
                  className="sim-x"
                  onClick={() => maj({ investissements: p.investissements.filter((x) => x.id !== i.id) })}
                  aria-label="Retirer"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
          <div className="sim-repere">
            <button
              type="button"
              onClick={() =>
                maj({
                  investissements: [
                    ...p.investissements,
                    { id: nouvelId(), libelle: 'Compte développeur Apple (par an)', montantCentimes: 9900, actif: true },
                    { id: nouvelId(), libelle: 'Compte développeur Google (une fois)', montantCentimes: 2500, actif: true },
                  ],
                })
              }
            >
              + les frais connus du 2.0
            </button>
          </div>
        </div>
      </div>

      {/* ------------------------------------------------------------------ */}
      <div className="sim-resultat">
        <div className="adm-chiffres">
          <SimChiffre v={euros(r.revenuBrutCentimes)} l="revenu brut / mois" />
          <SimChiffre v={`− ${euros(r.commissionCentimes)}`} l="commission magasins" negatif={r.commissionCentimes > 0} />
          <SimChiffre v={`− ${euros(r.chargeMensuelleCentimes)}`} l="charges" negatif={r.chargeMensuelleCentimes > 0} />
          <SimChiffre v={euros(r.resultatCentimes)} l="résultat mensuel" fort positif={positif} negatif={!positif} />
        </div>

        <p className={`adm-note ${positif ? 'adm-ok' : 'adm-urgent'}`}>
          {r.pointMort === null ? (
            <>
              À ce niveau de commission, <strong>aucun nombre d’abonnés</strong> ne couvre les
              charges : chaque abonnement coûte plus qu’il ne rapporte.
            </>
          ) : positif ? (
            <>
              Charges couvertes. Point mort à <strong>{r.pointMort}</strong> abonné
              {r.pointMort > 1 ? 's' : ''} mensuel{r.pointMort > 1 ? 's' : ''}.
            </>
          ) : (
            <>
              Il manque <strong>{r.resteAvantPointMort}</strong> abonné
              {(r.resteAvantPointMort ?? 0) > 1 ? 's' : ''} mensuel
              {(r.resteAvantPointMort ?? 0) > 1 ? 's' : ''} — point mort à{' '}
              <strong>{r.pointMort}</strong>. Chaque abonné rapporte{' '}
              {eurosPrecis(r.revenuParAbonneCentimes)} net.
            </>
          )}
        </p>

        {r.investissementCentimes > 0 && (
          <p className="adm-note">
            {eurosPrecis(r.investissementCentimes)} investis —{' '}
            {r.moisDeRemboursement === null ? (
              <strong className="adm-neg">jamais remboursés au rythme actuel</strong>
            ) : (
              <>
                remboursés en <strong>{r.moisDeRemboursement}</strong> mois
                {r.moisDeRemboursement > 12 && <> (soit {(r.moisDeRemboursement / 12).toFixed(1)} ans)</>}
              </>
            )}
            .
          </p>
        )}
      </div>

      {/* ------------------------------------------------------------------ */}
      <div className="sim-paliers">
        <h3 className="sim-titre">Paliers d’abonnés</h3>
        {/*
          ⚠ Le mix mensuel/annuel est CONSERVÉ EN PROPORTION à chaque palier.
          Projeter dix fois plus d'abonnés en les supposant tous mensuels
          flatterait le résultat de 20 %.
        */}
        <p className="sim-aide">
          Mêmes charges et même commission, à volumes croissants. La proportion d’abonnements
          annuels d’aujourd’hui est conservée.
        </p>
        <table className="adm-table sim-table">
          <thead>
            <tr>
              <th>Abonnés</th>
              <th className="adm-num">Revenu net / mois</th>
              <th className="adm-num">Résultat / mois</th>
              <th className="adm-num">Par an</th>
              <th className="adm-num">À recruter / mois</th>
            </tr>
          </thead>
          <tbody>
            {grille.map((x) => (
              <tr key={x.abonnes} className={x.franchit ? 'sim-franchit' : ''}>
                <td>
                  {x.abonnes}
                  {x.franchit && <span className="sim-badge">équilibre atteint</span>}
                </td>
                <td className="adm-num">{euros(x.revenuNetCentimes)}</td>
                <td className={`adm-num ${x.resultatCentimes < 0 ? 'adm-neg' : 'adm-ok'}`}>
                  {euros(x.resultatCentimes)}
                </td>
                <td className={`adm-num ${x.resultatCentimes < 0 ? 'adm-neg' : 'adm-ok'}`}>
                  {euros(x.resultatCentimes * 12)}
                </td>
                {/* ⚠ À lire À CÔTÉ du résultat : c'est ce qui dit si le palier
                    est atteignable ou seulement souhaitable. */}
                <td className="adm-num sim-recrut">{x.aRecruterParMois}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function SimChiffre({
  v,
  l,
  fort,
  positif,
  negatif,
}: {
  v: string;
  l: string;
  fort?: boolean;
  positif?: boolean;
  negatif?: boolean;
}) {
  return (
    <div className={`adm-chiffre ${fort ? 'sim-fort' : ''}`}>
      <span className={`adm-v ${positif ? 'adm-ok' : ''} ${negatif ? 'adm-neg' : ''}`}>{v}</span>
      <span className="adm-l">{l}</span>
    </div>
  );
}
