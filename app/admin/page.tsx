import { notFound } from 'next/navigation';
import Link from 'next/link';
import { chargerAdmin, type Repartition, type FoyerAsuivre } from '@/lib/admin/service';
import { scenarioActif } from '@/lib/admin/scenarios';
import { calculerEconomie, bilanPour } from '@/lib/admin/modele';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration — Nestync' };

const euros = (c: number) =>
  (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 });

/**
 * OÙ J'EN SUIS — l'état réel du produit au moment du chargement.
 *
 * ⚠ **RIEN N'EST HYPOTHÉTIQUE SUR CETTE PAGE.** Tous les chiffres sont mesurés
 * en base ; les projections vivent sur `/admin/paliers`. Mélanger les deux, c'est
 * finir par lire une prévision comme un relevé.
 *
 * ⚠ **DES AGRÉGATS, JAMAIS DU CONTENU DE FOYER.** Les volumes sont des
 * `count(*)`. Les seules lignes nominatives sont des noms de foyers à relancer :
 * le nom suffit à ouvrir Stripe, l'adresse serait de la donnée personnelle
 * affichée sans nécessité.
 *
 * ⚠ Garde redondante avec l'enveloppe : une page ne fait jamais reposer sa
 * protection sur son layout.
 */
export default async function PageAdmin() {
  const [a, scenario] = await Promise.all([chargerAdmin(), scenarioActif()]);
  if (!a) notFound();

  // ⚠ La marge réelle vient du MODÈLE, pas d'une règle de trois sur le prix.
  // L'ancienne console affichait le prix entier comme s'il tombait dans la
  // poche : elle surestimait de 93 %.
  const p = scenario ? { ...scenario.params, chargesFixesCentimes: a.chargeMensuelleCentimes } : null;
  const eco = p ? calculerEconomie(p) : null;
  const bilan = p && eco ? bilanPour(a.abonnesPayants, p, eco) : null;

  const aFaire =
    a.essaisQuiExpirent.length + a.impayes.length + a.messagesNonTraites + a.demandesEnAttente;

  return (
    <>
      <header className="nsa-barre">
        <div>
          <h1>Où j’en suis</h1>
          <p>L’état du produit à cet instant. Aucun contenu de foyer n’est lu ici.</p>
        </div>
        <span className="nsa-etiquette">
          <span className="nsa-pouls" />
          relevé à{' '}
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </header>

      {/*
        ⚠ CE QU'IL Y A À FAIRE VIENT EN PREMIER. Un tableau de bord qui ouvre sur
        des totaux flatteurs se consulte ; un tableau de bord qui ouvre sur ce
        qui attend se traite. Les chiffres ne bougeront pas, les délais si.
      */}
      <section className={`nsa-afaire ${aFaire === 0 ? 'nsa-calme' : ''}`}>
        <div className="nsa-afaire-tete">
          <h2>À traiter</h2>
          {aFaire > 0 && <span className="nsa-compteur">{aFaire}</span>}
        </div>
        {aFaire === 0 ? (
          <p style={{ margin: 0, fontSize: '.88rem' }} className="nsa-ok">
            Rien n’attend. Tout est à jour.
          </p>
        ) : (
          <ul>
            {a.messagesNonTraites > 0 && (
              <li>
                <span
                  className={`nsa-point ${a.messagePlusAncienJours !== null && a.messagePlusAncienJours > 20 ? 'chaud' : ''}`}
                />
                <span>
                  <strong>
                    {a.messagesNonTraites} message{a.messagesNonTraites > 1 ? 's' : ''}
                  </strong>{' '}
                  de contact sans réponse
                </span>
                <span className="nsa-quand">
                  {a.messagePlusAncienJours !== null
                    ? `le plus ancien : ${a.messagePlusAncienJours} j · délai annoncé 30 j`
                    : ''}
                </span>
              </li>
            )}
            {a.demandesEnAttente > 0 && (
              <li>
                <span className="nsa-point" />
                <span>
                  <strong>{a.demandesEnAttente}</strong> demande
                  {a.demandesEnAttente > 1 ? 's' : ''} d’adhésion en attente
                </span>
                <span className="nsa-quand">à accepter depuis le foyer</span>
              </li>
            )}
            <Suivi lignes={a.impayes} libelle="Paiement en échec" chaud />
            <Suivi lignes={a.essaisQuiExpirent} libelle="Essai qui se termine" />
          </ul>
        )}
      </section>

      {/* ---------- Rail de chiffres clés ---------- */}
      <div className="nsa-rail">
        <div>
          <div className="nsa-lbl">Foyers</div>
          <div className="nsa-val">{a.foyers}</div>
          <div className="nsa-ctx">{a.essaisEnCours} en essai · {a.offerts} offerts</div>
        </div>
        <div>
          <div className="nsa-lbl">Abonnés</div>
          <div className="nsa-val">{a.abonnesPayants}</div>
          <div className="nsa-ctx">
            {a.abonnesMensuels} mensuels · {a.abonnesAnnuels} annuels
          </div>
        </div>
        <div>
          <div className="nsa-lbl">Encaissé</div>
          <div className="nsa-val">{euros(a.mrrCentimes)}</div>
          <div className="nsa-ctx">par mois · {euros(a.arrCentimes)} par an</div>
        </div>
        <div>
          <div className="nsa-lbl">Charges</div>
          <div className="nsa-val">{euros(a.chargeMensuelleCentimes)}</div>
          <div className="nsa-ctx">récurrentes, par mois</div>
        </div>
        <div>
          <div className="nsa-lbl">Résultat</div>
          {/* ⚠ Le VRAI résultat, marge du modèle et non prix affiché. */}
          <div
            className={`nsa-val ${bilan && bilan.resultatMensuelCentimes >= 0 ? 'nsa-ok' : 'nsa-mal'}`}
          >
            {bilan ? euros(bilan.resultatMensuelCentimes) : '—'}
          </div>
          <div className="nsa-ctx">
            {eco && eco.pointMortAvecPub !== null && eco.pointMortAvecPub > a.abonnesPayants
              ? `${eco.pointMortAvecPub - a.abonnesPayants} abonnés manquants`
              : 'charges couvertes'}
          </div>
        </div>
        <div>
          <div className="nsa-lbl">Actifs 30 j</div>
          <div className="nsa-val">{a.foyersActifs30j}</div>
          <div className="nsa-ctx">sur {a.foyers} foyers</div>
        </div>
      </div>

      <div className="nsa-grille">
        <section className="nsa-panneau">
          <div className="nsa-tete">
            <h2>Foyers</h2>
            <span className="nsa-quand">{a.foyers} au total</span>
          </div>
          <div className="nsa-corps">
            <Barres lignes={a.parStatut} total={a.foyers} />
            {/*
              ⚠ Le total des abonnés suit le STATUT, pas la périodicité : la
              colonne `offre` n'est remplie que par le webhook Stripe. Sans cette
              phrase, on lirait une soustraction impossible.
            */}
            {a.actifsSansOffre > 0 && (
              <p className="nsa-note nsa-mal">
                {a.actifsSansOffre} abonnement{a.actifsSansOffre > 1 ? 's' : ''} actif
                {a.actifsSansOffre > 1 ? 's' : ''} sans périodicité enregistrée : le détail
                mensuels / annuels ne fait donc pas le total, et l’encaissé est sous-évalué.
              </p>
            )}
          </div>
        </section>

        <section className="nsa-panneau">
          <div className="nsa-tete">
            <h2>Rentabilité</h2>
            <Link className="nsa-action" href="/admin/paliers">
              Voir les paliers →
            </Link>
          </div>
          <div className="nsa-corps">
            <div className="nsa-trio">
              <div>
                <div className="nsa-val">{eco ? euros(eco.margeMoyenneCentimes) : '—'}</div>
                <div className="nsa-lbl">marge par abonné</div>
              </div>
              <div>
                <div className="nsa-val">{eco?.pointMortAvecPub ?? '—'}</div>
                <div className="nsa-lbl">abonnés pour l’équilibre</div>
              </div>
              <div>
                <div className={`nsa-val ${a.soldeProjetCentimes < 0 ? 'nsa-mal' : 'nsa-ok'}`}>
                  {euros(a.soldeProjetCentimes)}
                </div>
                <div className="nsa-lbl">solde du projet</div>
              </div>
            </div>
            <p className="nsa-note">
              La marge n’est pas le prix : sur {euros(eco?.prixMoyenParMoisCentimes ?? 0)} encaissés,
              TVA, cotisations, frais de paiement et infrastructure prélèvent leur part.{' '}
              <Link href="/admin/modele">Voir le détail</Link>.
            </p>
            {a.chargeMensuelleCentimes === 0 && (
              <p className="nsa-note nsa-mal">
                Aucune charge récurrente connue : lance <code>npm run comptes</code>, sinon ce calcul
                ne veut rien dire.
              </p>
            )}
          </div>
        </section>

        <section className="nsa-panneau">
          <div className="nsa-tete">
            <h2>Personnes</h2>
            <span className="nsa-quand">{a.moyenneMembres} par foyer</span>
          </div>
          <div className="nsa-corps">
            <div className="nsa-duo">
              <div>
                <div className="nsa-val">{a.utilisateurs}</div>
                <div className="nsa-lbl">comptes créés</div>
              </div>
              <div>
                <div className="nsa-val">{a.sansFoyer}</div>
                <div className="nsa-lbl">sans aucun foyer</div>
              </div>
            </div>
            <div style={{ marginTop: '1.1rem' }}>
              <Barres lignes={a.membresParFoyer} total={a.foyers} />
            </div>
            {/*
              ⚠ « Sans aucun foyer » est le chiffre le plus révélateur : ce sont
              des gens venus une fois qui se sont arrêtés là. La fuite du parcours
              d'arrivée, invisible partout ailleurs.
            */}
            <p className="nsa-note">
              Un compte sans foyer s’est connecté puis s’est arrêté là — c’est la fuite du parcours
              d’arrivée, et la moins chère à colmater.
            </p>
          </div>
        </section>

        <section className="nsa-panneau">
          <div className="nsa-tete">
            <h2>Ce que contient le produit</h2>
            <span className="nsa-quand">{a.foyersJamaisVenus} foyer(s) jamais utilisé(s)</span>
          </div>
          <div className="nsa-corps">
            <table className="nsa-table">
              <tbody>
                {a.volumes.map((v) => (
                  <tr key={v.libelle} className={v.n === 0 ? 'nsa-zero' : ''}>
                    <td>{v.libelle}</td>
                    <td className="nsa-num">{v.n.toLocaleString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="nsa-note">
              Un module resté à zéro n’est pas forcément inutile : il est peut-être introuvable.
            </p>
          </div>
        </section>
      </div>

      <p className="nsa-pied">
        Scénario ouvert : <strong>{scenario?.nom ?? '—'}</strong>. Les projections se règlent dans{' '}
        <Link href="/admin/modele">le modèle économique</Link>.
      </p>
    </>
  );
}

function Barres({ lignes, total }: { lignes: Repartition[]; total: number }) {
  if (lignes.length === 0) return null;
  const max = Math.max(...lignes.map((l) => l.n), 1);
  return (
    <div className="nsa-barres">
      {lignes.map((l) => (
        <div className="nsa-b" key={l.libelle}>
          <span>{l.libelle}</span>
          <span className="nsa-piste">
            <span
              className={`nsa-plein ${l.n < max ? 'doux' : ''}`}
              style={{ width: `${total > 0 ? (l.n / max) * 100 : 0}%` }}
            />
          </span>
          <span className="nsa-num">{l.n}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Foyers sur lesquels agir.
 * ⚠ LE NOM DU FOYER, ET RIEN D'AUTRE. Il suffit à ouvrir Stripe ; l'adresse
 * serait de la donnée personnelle affichée sans nécessité.
 */
function Suivi({
  lignes,
  libelle,
  chaud,
}: {
  lignes: FoyerAsuivre[];
  libelle: string;
  chaud?: boolean;
}) {
  return (
    <>
      {lignes.map((f) => (
        <li key={f.id}>
          <span className={`nsa-point ${chaud ? 'chaud' : ''}`} />
          <span>
            {libelle} — <strong>{f.nom}</strong>
          </span>
          <span className="nsa-quand">
            {f.jours !== null
              ? f.jours < 0
                ? `dépassé de ${-f.jours} j`
                : `dans ${f.jours} j`
              : f.quand}
          </span>
        </li>
      ))}
    </>
  );
}
