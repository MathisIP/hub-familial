import Link from 'next/link';

export const metadata = { title: 'Politique de confidentialité — Hub familial' };

/**
 * Politique de confidentialité (RGPD). Page PUBLIQUE (exclue de l'authentification
 * dans middleware.ts). ⚠ GABARIT : les champs `[À COMPLÉTER]` doivent être
 * renseignés et le texte relu (idéalement par un juriste) avant mise en service
 * commerciale. Décrit les traitements réels de l'app.
 */
export default function PageConfidentialite() {
  return (
    <article className="doc-legal">
      <Link className="lien-retour" href="/">
        <span aria-hidden="true">←</span> <span>Retour</span>
      </Link>

      <h1>Politique de confidentialité</h1>
      <p className="doc-maj">Dernière mise à jour : [À COMPLÉTER : date]</p>

      <p className="doc-avertissement">
        ⚠ Modèle à finaliser : renseigne les champs entre crochets et fais relire ce document avant
        toute mise à disposition à d’autres foyers.
      </p>

      <h2>1. Responsable du traitement</h2>
      <p>
        Le responsable du traitement des données est [À COMPLÉTER : nom / raison sociale], joignable à
        l’adresse [À COMPLÉTER : email de contact]. Le service « Hub familial » (ci-après « le
        Service ») est une application d’organisation familiale.
      </p>

      <h2>2. Données collectées</h2>
      <ul>
        <li>
          <b>Identité de connexion</b> (via Google) : adresse e-mail, nom et photo de profil, pour
          l’authentification et l’accès restreint au Service.
        </li>
        <li>
          <b>Données saisies dans le foyer</b> : budget (comptes, transactions, catégories,
          échéances), tâches et listes de courses, recettes et planning des repas, événements,
          cadeaux et occasions.
        </li>
        <li>
          <b>Jetons d’accès Google</b> : lorsque tu autorises l’accès à Google Drive et Google
          Agenda, un jeton d’accès est conservé le temps de la session pour lire/écrire tes fichiers
          et événements <b>en ton nom</b>. Le Service ne stocke pas le contenu de ton Drive.
        </li>
      </ul>

      <h2>3. Finalités et base légale</h2>
      <p>
        Ces données sont traitées uniquement pour fournir le Service (organiser la vie du foyer). La
        base légale est l’<b>exécution du contrat</b> qui te lie au Service, et ton <b>consentement</b>
        pour les accès optionnels à Google Drive et Google Agenda (révocable à tout moment).
      </p>

      <h2>4. Hébergement et sous-traitants</h2>
      <ul>
        <li><b>Base de données</b> : Neon, région Union européenne.</li>
        <li><b>Hébergement de l’application</b> : [À COMPLÉTER : Vercel / autre].</li>
        <li><b>Google</b> (authentification, Drive, Agenda) : selon les scopes que tu autorises.</li>
        <li>[À COMPLÉTER si applicable : Stripe pour le paiement, une fois l’abonnement en place].</li>
      </ul>

      <h2>5. Durée de conservation</h2>
      <p>
        Tes données sont conservées tant que ton compte est actif. Tu peux les supprimer à tout moment
        depuis <Link href="/compte">Mon compte</Link> : la suppression efface définitivement ton
        foyer et toutes ses données.
      </p>

      <h2>6. Cookies</h2>
      <p>
        Le Service n’utilise <b>qu’un cookie de session strictement nécessaire</b> à
        l’authentification. Aucun traceur publicitaire ni outil de mesure d’audience tiers n’est
        déposé — aucun bandeau de consentement n’est donc requis à ce titre.
      </p>

      <h2>7. Tes droits</h2>
      <p>
        Conformément au RGPD, tu disposes des droits d’accès, de rectification, d’effacement, de
        portabilité, de limitation et d’opposition. Deux de ces droits sont directement exerçables
        dans <Link href="/compte">Mon compte</Link> :
      </p>
      <ul>
        <li><b>Portabilité / accès</b> : « Exporter mes données » (fichier JSON complet).</li>
        <li><b>Effacement</b> : « Supprimer mon compte » (suppression définitive).</li>
      </ul>
      <p>
        Pour les autres demandes, écris à [À COMPLÉTER : email de contact]. Tu peux aussi introduire
        une réclamation auprès de la CNIL (www.cnil.fr).
      </p>

      <h2>8. Sécurité</h2>
      <p>
        L’accès au Service est protégé par authentification Google et restreint aux comptes
        autorisés. Les échanges sont chiffrés (HTTPS) et la base est hébergée dans l’Union européenne.
      </p>
    </article>
  );
}
