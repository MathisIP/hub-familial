import { notFound } from 'next/navigation';
import { chargerComptes } from '@/lib/comptes/service';
import {
  euros,
  dateCourte,
  libelleRecurrence,
  ancienneteJours,
  type Bilan,
} from '@/lib/comptes/schema';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Comptes du projet — Nestync' };

/**
 * COMPTES DU PROJET — page privée d'une seule personne.
 *
 * ⚠ **N'appelle PAS `exigerAcces()`.** Cette page n'est pas un module du
 * produit : c'est la comptabilité du porteur de projet. La lier à l'abonnement
 * du foyer reviendrait à se fermer la porte le jour où l'essai expire — c'est-à-dire
 * exactement le moment où l'on a besoin de regarder ses comptes.
 *
 * ⚠ `notFound()` plutôt qu'une redirection ou un « accès refusé » : pour toute
 * autre personne, y compris un membre du même foyer, cette page n'existe pas.
 * Un message d'erreur explicite révélerait qu'il y a quelque chose à trouver.
 */
export default async function PageComptes() {
  const b = await chargerComptes();
  if (!b) notFound();

  const jours = ancienneteJours(b.lignes);
  const incomplet = b.aCompleter > 0;

  return (
    <>
      <header className="entete">
        <div>
          <h1>Comptes du projet</h1>
          <p>
            Ce que Nestync a coûté et rapporté depuis le premier euro engagé
            {jours > 0 ? `, il y a ${jours} jours` : ''}.
          </p>
        </div>
      </header>

      {incomplet && (
        <p className="message">
          {b.aCompleter} ligne{b.aCompleter > 1 ? 's' : ''} sans montant : les totaux ci-dessous
          sont donc <strong>plancher</strong>, pas définitifs. Complète-les dans
          <code> comptes.json</code>, puis lance <code>npm run comptes</code>.
        </p>
      )}

      <section className="cp-tuiles">
        <Tuile
          titre="Total investi"
          valeur={euros(b.depensesCentimes)}
          detail="depuis le début, récurrents cumulés"
        />
        <Tuile
          titre="Coût par mois"
          valeur={euros(b.chargeMensuelleCentimes)}
          detail="abonnements actifs, l'annuel ramené au mois"
        />
        <Tuile
          titre="Recettes"
          valeur={euros(b.recettesCentimes)}
          detail={b.recettesCentimes === 0 ? 'aucune pour l’instant' : 'encaissé à ce jour'}
        />
        <Tuile
          titre="Solde"
          valeur={euros(b.soldeCentimes)}
          detail={b.soldeCentimes < 0 ? 'reste à rattraper' : 'le projet est rentré dans ses frais'}
          alerte={b.soldeCentimes < 0}
        />
      </section>

      <PointMort b={b} />

      {b.parCategorie.length > 0 && (
        <section className="cp-bloc">
          <h2 className="cp-titre">Où part l’argent</h2>
          <ul className="cp-cats">
            {b.parCategorie.map((c) => {
              const part = b.depensesCentimes > 0 ? (c.totalCentimes / b.depensesCentimes) * 100 : 0;
              return (
                <li key={c.categorie} className="cp-cat">
                  <span className="cp-cat-nom">{c.categorie}</span>
                  <span className="cp-jauge" aria-hidden="true">
                    <span className="cp-jauge-part" style={{ width: `${Math.max(2, part)}%` }} />
                  </span>
                  <span className="cp-cat-val">
                    {euros(c.totalCentimes)} <small>{Math.round(part)} %</small>
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="cp-bloc">
        <h2 className="cp-titre">Le détail</h2>
        <div className="cp-table-cadre">
          <table className="cp-table">
            <thead>
              <tr>
                <th>Poste</th>
                <th>Depuis</th>
                <th className="cp-num">Montant</th>
                <th>Rythme</th>
                <th className="cp-num">Fois</th>
                <th className="cp-num">Total</th>
              </tr>
            </thead>
            <tbody>
              {b.lignes.map((l) => (
                <tr key={l.id} className={l.sens === 'recette' ? 'cp-recette' : undefined}>
                  <td>
                    <span className="cp-libelle">{l.libelle}</span>
                    {l.categorie && <span className="cp-etiquette">{l.categorie}</span>}
                    {l.note && <span className="cp-note">{l.note}</span>}
                  </td>
                  <td className="cp-date">{dateCourte(l.date)}</td>
                  <td className="cp-num">
                    {l.montantCentimes == null ? (
                      <em className="cp-manque">à compléter</em>
                    ) : (
                      euros(l.montantCentimes)
                    )}
                  </td>
                  <td>
                    {libelleRecurrence(l.recurrence)}
                    {l.recurrence && !l.actif && <span className="cp-arrete">arrêté</span>}
                  </td>
                  <td className="cp-num">{l.occurrences}</td>
                  <td className="cp-num cp-total">
                    {l.montantCentimes == null ? '—' : euros(l.totalCentimes)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <p className="cp-pied">
        Source de vérité : <code>comptes.json</code> (hors dépôt). Cette page n’est qu’un
        affichage — pour la mettre à jour, modifie le fichier puis lance{' '}
        <code>npm run comptes</code>.
      </p>
    </>
  );
}

function Tuile({
  titre,
  valeur,
  detail,
  alerte,
}: {
  titre: string;
  valeur: string;
  detail: string;
  alerte?: boolean;
}) {
  return (
    <div className={`cp-tuile${alerte ? ' cp-tuile-alerte' : ''}`}>
      <span className="cp-tuile-titre">{titre}</span>
      <strong className="cp-tuile-valeur">{valeur}</strong>
      <span className="cp-tuile-detail">{detail}</span>
    </div>
  );
}

/**
 * Combien d'abonnés pour couvrir la charge mensuelle ?
 *
 * Le prix n'étant pas arrêté (voir PLAN_LANCEMENT §7), on montre le résultat
 * pour trois hypothèses plutôt que d'en figer une — c'est justement l'arbitrage
 * que ce chiffre doit éclairer.
 */
function PointMort({ b }: { b: Bilan }) {
  if (b.chargeMensuelleCentimes <= 0) return null;
  const prix = [299, 499, 799];
  return (
    <section className="cp-bloc">
      <h2 className="cp-titre">Point mort</h2>
      <p className="cp-sous">
        Nombre d’abonnés nécessaires pour couvrir les {euros(b.chargeMensuelleCentimes)} de charge
        mensuelle, selon le prix retenu.
      </p>
      <ul className="cp-pm">
        {prix.map((p) => (
          <li key={p} className="cp-pm-item">
            <span className="cp-pm-prix">{euros(p)} / mois</span>
            <strong className="cp-pm-nb">{Math.ceil(b.chargeMensuelleCentimes / p)}</strong>
            <span className="cp-pm-lib">abonnés</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
