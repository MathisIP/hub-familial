import { notFound } from 'next/navigation';
import Link from 'next/link';
import { chargerAdmin, type Repartition, type FoyerAsuivre } from '@/lib/admin/service';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Administration — Nestync' };

/**
 * CONSOLE D'ADMINISTRATION — page privée d'une seule personne.
 *
 * ⚠ **N'appelle PAS `exigerAcces()`**, comme les comptes du projet. La lier à
 * l'abonnement du foyer se fermerait la porte le jour où l'essai expire —
 * c'est-à-dire exactement le moment où l'on veut regarder ses chiffres.
 *
 * ⚠ `notFound()` : pour toute autre personne, y compris un membre du même foyer,
 * cette adresse n'existe pas. Un « accès refusé » révélerait qu'il y a quelque
 * chose à trouver.
 *
 * ⚠ CONÇUE POUR UN ÉCRAN LARGE, à dessein. C'est un outil d'exploitation utilisé
 * par une seule personne, assise : la densité y vaut mieux que le confort du
 * pouce. Rien n'est bridé sur téléphone pour autant — un filtre par navigateur
 * se contourne en trois secondes et ne protégerait rien ; ce qui protège cette
 * page, c'est `EMAIL_ADMIN`.
 */
export default async function PageAdmin() {
  const a = await chargerAdmin();
  if (!a) notFound();

  const euros = (c: number) =>
    (c / 100).toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' });

  const aFaire =
    a.essaisQuiExpirent.length + a.impayes.length + a.messagesNonTraites + a.demandesEnAttente;

  return (
    <>
      <header className="entete">
        <div>
          <h1>Administration</h1>
          <p>L’état du produit, en agrégats. Aucun contenu de foyer n’est lu ici.</p>
        </div>
      </header>

      {/*
        ⚠ CE QU'IL Y A À FAIRE VIENT EN PREMIER. Un tableau de bord qui ouvre sur
        des totaux flatteurs se consulte ; un tableau de bord qui ouvre sur ce
        qui attend se traite. Les chiffres ne bougeront pas, les délais si — le
        plus ancien message non traité court contre les trente jours promis par
        les mentions légales.
      */}
      <section className="adm-bloc">
        <h2 className="bloc-titre">À traiter {aFaire > 0 && <span className="adm-pastille">{aFaire}</span>}</h2>
        {aFaire === 0 ? (
          <p className="adm-rien">Rien n’attend. Tout est à jour.</p>
        ) : (
          <div className="adm-afaire">
            {a.messagesNonTraites > 0 && (
              <p className={a.messagePlusAncienJours !== null && a.messagePlusAncienJours > 20 ? 'adm-urgent' : ''}>
                <strong>{a.messagesNonTraites}</strong> message
                {a.messagesNonTraites > 1 ? 's' : ''} de contact non traité
                {a.messagesNonTraites > 1 ? 's' : ''}
                {a.messagePlusAncienJours !== null && (
                  <> — le plus ancien remonte à <strong>{a.messagePlusAncienJours} j</strong> (délai annoncé : 30 j)</>
                )}
              </p>
            )}
            {a.demandesEnAttente > 0 && (
              <p>
                <strong>{a.demandesEnAttente}</strong> demande
                {a.demandesEnAttente > 1 ? 's' : ''} d’adhésion en attente — à accepter depuis le foyer concerné.
              </p>
            )}
            <ListeFoyers titre="Essais qui se terminent" lignes={a.essaisQuiExpirent} />
            <ListeFoyers titre="Paiements en échec" lignes={a.impayes} urgent />
          </div>
        )}
      </section>

      <div className="adm-grille">
        <section className="adm-bloc">
          <h2 className="bloc-titre">Foyers</h2>
          <div className="adm-chiffres">
            <Chiffre v={String(a.foyers)} l="foyers au total" />
            <Chiffre v={String(a.essaisEnCours)} l="en essai" />
            <Chiffre v={String(a.abonnesPayants)} l="abonnés payants" />
            <Chiffre v={String(a.offerts)} l="accès offerts" />
          </div>
          <Barres titre="Par statut" lignes={a.parStatut} total={a.foyers} />
          <p className="adm-note">
            Abonnés : <strong>{a.abonnesMensuels}</strong> au mois ·{' '}
            <strong>{a.abonnesAnnuels}</strong> à l’année.
          </p>
          {/*
            ⚠ Le détail peut ne pas égaler le total, et il faut le DIRE. La
            colonne `offre` a été ajoutée après coup et n'est remplie que par le
            webhook Stripe : un abonnement activé avant, ou dont le webhook n'est
            jamais arrivé, n'a pas de périodicité. Sans cette phrase, on lirait
            une soustraction impossible et on douterait de toute la page — alors
            que le MRR, lui, sous-évalue vraiment.
          */}
          {a.actifsSansOffre > 0 && (
            <p className="adm-note adm-urgent">
              {a.actifsSansOffre} abonnement{a.actifsSansOffre > 1 ? 's' : ''} actif
              {a.actifsSansOffre > 1 ? 's' : ''} sans périodicité enregistrée : le détail
              ci-dessus ne fait donc pas le total, et le revenu récurrent est sous-évalué
              d’autant. À vérifier dans Stripe.
            </p>
          )}
        </section>

        <section className="adm-bloc">
          <h2 className="bloc-titre">Revenus récurrents</h2>
          <div className="adm-chiffres">
            <Chiffre v={euros(a.mrrCentimes)} l="par mois (MRR)" />
            <Chiffre v={euros(a.arrCentimes)} l="par an (ARR)" />
          </div>
          {/*
            ⚠ L'ANNUEL EST RAMENÉ AU MOIS dans ce chiffre. Un abonné à 49,90 €
            rapporte 4,16 € par mois : l'inscrire à son prix entier
            multiplierait le revenu récurrent par douze et rendrait le point
            mort ci-dessous faux d'autant.
          */}
          <p className="adm-note">
            Les abonnements annuels sont comptés au douzième. Les accès offerts ne comptent pas.
          </p>
        </section>

        <section className="adm-bloc">
          <h2 className="bloc-titre">Rentabilité</h2>
          <div className="adm-chiffres">
            <Chiffre v={euros(a.chargeMensuelleCentimes)} l="de charges par mois" />
            <Chiffre
              v={String(a.pointMort)}
              l="abonnés pour les couvrir"
              accent={a.resteAvantPointMort === 0}
            />
          </div>
          <p className={`adm-note ${a.resteAvantPointMort === 0 ? 'adm-ok' : ''}`}>
            {a.resteAvantPointMort === 0 ? (
              <>Point mort atteint : les abonnements couvrent les charges récurrentes.</>
            ) : (
              <>
                Il manque <strong>{a.resteAvantPointMort}</strong> abonné
                {a.resteAvantPointMort > 1 ? 's' : ''} mensuel
                {a.resteAvantPointMort > 1 ? 's' : ''} (ou l’équivalent en annuels) pour couvrir
                les charges.
              </>
            )}
          </p>
          <p className="adm-note">
            Solde du projet depuis le premier euro engagé :{' '}
            <strong className={a.soldeProjetCentimes < 0 ? 'adm-neg' : 'adm-ok'}>
              {euros(a.soldeProjetCentimes)}
            </strong>
            .{' '}
            <Link href="/comptes">Voir le détail</Link>
          </p>
          {a.chargeMensuelleCentimes === 0 && (
            <p className="adm-note adm-urgent">
              Aucune charge récurrente connue : lance <code>npm run comptes</code> pour synchroniser
              le registre, sinon ce calcul ne veut rien dire.
            </p>
          )}
        </section>

        <section className="adm-bloc">
          <h2 className="bloc-titre">Personnes</h2>
          <div className="adm-chiffres">
            <Chiffre v={String(a.utilisateurs)} l="comptes créés" />
            <Chiffre v={String(a.moyenneMembres)} l="membres par foyer" />
            <Chiffre v={String(a.sansFoyer)} l="sans aucun foyer" />
          </div>
          <Barres titre="Taille des foyers" lignes={a.membresParFoyer} total={a.foyers} />
          {/*
            ⚠ « Sans aucun foyer » est le chiffre le plus révélateur de ce bloc :
            ce sont des gens qui se sont connectés une fois et se sont arrêtés
            là. C'est la fuite du parcours d'arrivée, invisible partout ailleurs.
          */}
          <p className="adm-note">
            Un compte sans foyer s’est connecté puis s’est arrêté là — c’est la fuite du parcours
            d’arrivée.
          </p>
        </section>

        <section className="adm-bloc">
          <h2 className="bloc-titre">Usage réel</h2>
          <div className="adm-chiffres">
            <Chiffre v={String(a.foyersActifs30j)} l="foyers venus sous 30 j" />
            <Chiffre v={String(a.foyersJamaisVenus)} l="foyers jamais utilisés" />
          </div>
          <p className="adm-note">
            Un foyer où personne ne vient n’est pas un client, quel que soit son abonnement.
          </p>
        </section>

        <section className="adm-bloc">
          <h2 className="bloc-titre">Ce que contient le produit</h2>
          <table className="adm-table">
            <tbody>
              {a.volumes.map((v) => (
                <tr key={v.libelle} className={v.n === 0 ? 'adm-zero' : ''}>
                  <td>{v.libelle}</td>
                  <td className="adm-num">{v.n.toLocaleString('fr-FR')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/*
            ⚠ Un module à zéro après plusieurs semaines dit quelque chose qu'aucun
            autre chiffre ne dit : il n'est pas trouvé, pas compris, ou pas utile.
          */}
          <p className="adm-note">
            Un module resté à zéro n’est pas forcément inutile : il est peut-être introuvable.
          </p>
        </section>
      </div>
    </>
  );
}

function Chiffre({ v, l, accent }: { v: string; l: string; accent?: boolean }) {
  return (
    <div className="adm-chiffre">
      <span className={`adm-v ${accent ? 'adm-ok' : ''}`}>{v}</span>
      <span className="adm-l">{l}</span>
    </div>
  );
}

/** Répartition en barres proportionnelles — lisible d'un coup d'œil. */
function Barres({ titre, lignes, total }: { titre: string; lignes: Repartition[]; total: number }) {
  if (lignes.length === 0) return null;
  return (
    <div className="adm-barres">
      <p className="adm-soustitre">{titre}</p>
      {lignes.map((l) => (
        <div className="adm-barre" key={l.libelle}>
          <span className="adm-barre-lbl">{l.libelle}</span>
          <span className="adm-barre-piste">
            <span
              className="adm-barre-remplissage"
              style={{ width: `${total > 0 ? (l.n / total) * 100 : 0}%` }}
            />
          </span>
          <span className="adm-num">{l.n}</span>
        </div>
      ))}
    </div>
  );
}

/**
 * Liste de foyers sur lesquels agir.
 *
 * ⚠ LE NOM DU FOYER, ET RIEN D'AUTRE. Pas d'adresse, pas de nom de membre : le
 * nom suffit à savoir de qui l'on parle quand on ouvre Stripe ou qu'on écrit.
 * Tout le reste serait de la donnée personnelle affichée sans nécessité.
 */
function ListeFoyers({
  titre,
  lignes,
  urgent,
}: {
  titre: string;
  lignes: FoyerAsuivre[];
  urgent?: boolean;
}) {
  if (lignes.length === 0) return null;
  return (
    <div className="adm-suivi">
      <p className={`adm-soustitre ${urgent ? 'adm-urgent' : ''}`}>
        {titre} ({lignes.length})
      </p>
      <ul>
        {lignes.map((f) => (
          <li key={f.id}>
            <span className="adm-foyer">{f.nom}</span>
            <span className="adm-quand">
              {f.quand}
              {f.jours !== null && (
                <> · {f.jours < 0 ? `dépassé de ${-f.jours} j` : `dans ${f.jours} j`}</>
              )}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
