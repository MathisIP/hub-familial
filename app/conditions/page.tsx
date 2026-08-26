import Link from 'next/link';
import { ESSAI_JOURS, OFFRES, formatPrix } from '@/lib/offres';
import CadreSite from '@/components/vitrine-ds/CadreSite';

export const metadata = {
  title: 'Conditions générales — Nestync',
  description: 'Conditions générales de vente et d’utilisation du service Nestync.',
};

/**
 * CONDITIONS GÉNÉRALES (vente + utilisation) — page PUBLIQUE (cf. middleware).
 *
 * Couvre les obligations B2C françaises : information précontractuelle, droit de
 * rétractation (et sa renonciation pour un service à exécution immédiate),
 * reconduction et résiliation « en trois clics », garanties légales, médiation.
 *
 * ⚠ DEUX ÉLÉMENTS RESTENT À PUBLIER, tous deux annoncés dans le texte plutôt que
 * laissés en champ à compléter (le document doit se lire comme un vrai document
 * juridique, pas comme un brouillon — il est public et lu par les évaluateurs
 * Google) :
 *   · article 1 : numéro SIREN + adresse, dès l'immatriculation ;
 *   · article 15 : médiateur de la consommation, à désigner (obligatoire en B2C).
 * Faire relire l'ensemble par un professionnel avant d'ouvrir les abonnements.
 */
export default function PageConditions() {
  const mensuel = OFFRES[0];
  const annuel = OFFRES[1];

  return (
    <CadreSite surtitre="Le contrat" titre="Conditions générales de vente et d’utilisation">
      <p className="doc-maj">Dernière mise à jour : 13 août 2026</p>
      <p className="doc-langue">Nestync est proposé en France, aux consommateurs résidant en France. Ce document n’existe qu’en français : seule cette version fait foi.</p>

      <p className="doc-avertissement">
        ℹ Le Service est actuellement en <strong>phase de lancement</strong> : l’accès se
        fait sur invitation et aucun abonnement payant n’est encore commercialisé. Les
        présentes conditions s’appliqueront dans leur intégralité dès l’ouverture des
        abonnements.
      </p>

      <h2>1. Identification de l’éditeur</h2>
      <p>
        Le service <strong>Nestync</strong> (ci-après « le Service ») est édité par
        <strong> Mathis INGRAND-PERIGNE</strong>, personne physique agissant à titre
        individuel, immatriculé au Registre du commerce et des sociétés de Tours sous le
        numéro <strong>108 793 514 R.C.S. Tours</strong> depuis le 25 août 2026.
        Établissement : <strong>25 rue du Maréchal Ney, 37100 Tours</strong>, France.
      </p>
      <p>
        {/* ⚠ Mention OBLIGATOIRE tant que la franchise en base s’applique — sur les
            CGV comme sur chaque facture. Elle doit rester cohérente avec les
            mentions légales, qui portent la même information. */}
        <strong>TVA non applicable, article 293 B du Code général des impôts.</strong>
      </p>
      <ul>
        <li>Contact : contact@nestync.app</li>
        <li>Directeur de la publication : Mathis INGRAND-PERIGNE</li>
        <li>Hébergement de l’application : Vercel Inc.</li>
        <li>Hébergement des données : Neon, région Union européenne</li>
      </ul>

      <h2>2. Objet</h2>
      <p>
        Les présentes conditions régissent l’accès au Service et sa souscription par toute
        personne physique majeure agissant à des fins non professionnelles (ci-après
        « l’Utilisateur »). Toute création de compte vaut acceptation pleine et entière
        des présentes.
      </p>

      <h2>3. Description du Service</h2>
      <p>
        Nestync est une application d’organisation familiale accessible par navigateur et
        installable sur mobile. Elle regroupe des modules de gestion du foyer : budget,
        tâches et courses, repas, événements, cadeaux, agenda et documents. Un abonnement
        couvre <strong>un foyer</strong> et l’ensemble de ses membres invités.
      </p>

      <h2>4. Compte et accès</h2>
      <ul>
        <li>La création d’un compte s’effectue via une authentification Google. L’Utilisateur est responsable de la confidentialité de son accès.</li>
        <li>L’Utilisateur qui crée le foyer en est le propriétaire : il peut inviter, retirer des membres et gérer l’abonnement.</li>
        {/*
          ⚠ CETTE CLAUSE DÉCRIT CE QU'ON ACHÈTE — elle doit suivre le produit.
          Elle affirmait « chaque membre accède à l'intégralité des données du
          foyer », ce qui est faux depuis le chantier de visibilité par personne
          (26/08/2026) — et faux dans le mauvais sens, puisque la confidentialité
          entre membres est un argument de vente.

          ⚠ LES CINQ MÉCANISMES SONT NOMMÉS, choix assumé le 26/08/2026 : un
          contrat qui décrit précisément ce qu'on achète vaut mieux qu'un contrat
          prudent. Contrepartie acceptée — si la restriction s'étend un jour à
          d'autres objets (les tâches, par exemple), CETTE LIGNE DOIT SUIVRE, et
          la modification sera notifiée aux clients (cf. article 14).
        */}
        <li>
          Chaque membre accède par défaut aux données du foyer. Le propriétaire et les
          membres peuvent restreindre la visibilité de certains éléments — comptes
          bancaires, dossiers de documents, agendas — et masquer un cadeau à son
          destinataire. L’Utilisateur s’engage à n’inviter que des personnes de confiance.
        </li>
        <li>L’Utilisateur s’engage à ne pas détourner le Service de son objet, ni à y héberger de contenu illicite.</li>
      </ul>

      <h2>5. Essai gratuit</h2>
      <p>
        Le Service est proposé avec un essai gratuit de <strong>{ESSAI_JOURS} jours</strong>,
        sans saisie de carte bancaire et sans reconduction automatique en offre payante.
        À l’issue de l’essai, l’accès aux modules est suspendu tant qu’aucun abonnement n’est
        souscrit ; les données restent conservées et exportables.
      </p>

      <h2>6. Prix et modalités de paiement</h2>
      <p>Les prix sont indiqués en euros, toutes taxes comprises :</p>
      <ul>
        <li><strong>Formule mensuelle</strong> : {formatPrix(mensuel.prix)} {mensuel.periode}.</li>
        <li><strong>Formule annuelle</strong> : {formatPrix(annuel.prix)} {annuel.periode}, soit {formatPrix(annuel.parMois)} par mois.</li>
      </ul>
      <p>
        Le paiement s’effectue par carte bancaire via notre prestataire <strong>Stripe</strong>.
        Aucune coordonnée bancaire n’est conservée par l’éditeur. La facture est disponible
        depuis l’espace « Mon abonnement ». L’éditeur se réserve le droit de modifier ses
        tarifs ; tout changement est notifié au moins 30 jours à l’avance et ne s’applique
        qu’à compter de la période suivante.
      </p>

      <h2>7. Durée, reconduction et résiliation</h2>
      <ul>
        <li>L’abonnement est souscrit pour la période choisie (mensuelle ou annuelle) et se reconduit tacitement pour une durée identique.</li>
        <li>
          <strong>Résiliation en trois clics</strong> : l’Utilisateur peut résilier à tout moment
          depuis « Mon abonnement », par un procédé aussi simple que la souscription, sans avoir
          à motiver sa demande ni à contacter le service client.
        </li>
        {/*
          ⚠ CETTE CLAUSE EST ADOSSÉE À DU CODE, pas seulement à du texte.
          `envoyerAvisReconductions()` (lib/maintenance.ts) expédie l'avis à
          45 jours et un rappel à 7 jours, avec trace en base. L'écrire ici sans
          l'envoyer serait pire que le silence : un engagement non tenu.

          ⚠ Seuls les ANNUELS sont visés, volontairement. Pour un abonnement
          mensuel la fenêtre légale (3 mois à 1 mois avant le terme) est
          impraticable — trois mois avant, le contrat n'existait pas. L'article
          annonce donc pour eux ce qui est réellement fait : l'information à la
          souscription et l'affichage permanent de l'échéance.
        */}
        <li>
          <strong>Information avant reconduction</strong> : pour les abonnements annuels,
          l’éditeur informe l’Utilisateur par courrier électronique, au plus tôt trois mois
          et au plus tard un mois avant le terme de la période en cours, de sa faculté de ne
          pas reconduire l’abonnement, conformément à l’article L. 215-1 du Code de la
          consommation. Pour les abonnements mensuels, la date de reconduction et le montant
          dû sont communiqués lors de la souscription et affichés en permanence dans l’espace
          « Mon abonnement ».
        </li>
        <li>La résiliation prend effet au terme de la période en cours. L’accès reste ouvert jusqu’à cette date ; aucune somme n’est remboursée au prorata pour la période entamée, sauf disposition légale contraire.</li>
        <li>L’éditeur peut suspendre un compte en cas de défaut de paiement ou de manquement grave aux présentes, après information de l’Utilisateur.</li>
      </ul>

      <h2>8. Droit de rétractation</h2>
      {/*
        ⚠ RÉÉCRIT LE 26/08/2026 — l'article précédent était juridiquement inopérant.
        Il faisait renoncer l'Utilisateur à sa rétractation « une fois le service
        pleinement exécuté ». Ce mécanisme (L. 221-25) suppose une exécution
        COMPLÈTE pendant les quatorze jours ; un abonnement ne l'est jamais en
        deux semaines. La renonciation ne jouait donc pas : le client conservait
        son droit pendant que le contrat lui affirmait le contraire.

        ⚠ CHOIX ASSUMÉ — remboursement INTÉGRAL, au-delà de ce qu'impose la loi.
        Le droit permettrait de retenir un prorata des jours consommés. On y
        renonce : l'essai dure trente jours sans carte, donc celui qui paie a déjà
        utilisé le produit un mois, et le cas d'une rétractation au douzième jour
        sera rarissime. L'écart se compterait en euros, contre une formule de
        prorata à écrire, à expliquer et à maintenir.

        ⚠ CE TEXTE ET LA CASE DU PAIEMENT (`ABO_RENONCIATION`, lib/i18n.ts) SE
        LISENT ENSEMBLE. Ils se contredisaient — la case annonçait une perte de
        droit que cet article accordait. Toute retouche de l'un impose de relire
        l'autre.
      */}
      <p>
        Conformément aux articles L. 221-18 et suivants du Code de la consommation,
        l’Utilisateur dispose d’un délai de <strong>quatorze (14) jours</strong> à compter
        de la souscription pour se rétracter, sans avoir à motiver sa décision ni à
        supporter de pénalité.
      </p>
      <p>
        Au moment du paiement, l’Utilisateur demande expressément que l’exécution du Service
        commence immédiatement, afin d’y accéder sans attendre la fin de ce délai.{' '}
        <strong>Cette demande ne lui fait perdre aucun droit</strong> : s’il se rétracte dans
        les quatorze jours, l’éditeur lui rembourse <strong>l’intégralité</strong> des sommes
        versées, sans retenue au prorata des jours d’utilisation, alors même que la loi
        autoriserait une telle retenue.
      </p>
      <p>
        Pour exercer ce droit : écrire à contact@nestync.app avec les nom, prénom et
        adresse e-mail du compte concerné, ou utiliser le formulaire de la page{' '}
        <Link href="/aide">Aide et contact</Link>. Le remboursement intervient au plus tard
        quatorze jours après réception de la demande, par le même moyen de paiement.
      </p>
      <p>
        Au-delà de ce délai, l’abonnement suit les règles de résiliation de l’article 7.
      </p>

      <h2>9. Disponibilité et maintenance</h2>
      <p>
        L’éditeur s’engage à mettre en œuvre les moyens raisonnables pour assurer la
        disponibilité du Service, sans obligation de résultat. Des interruptions peuvent
        survenir pour maintenance ou du fait de prestataires tiers (hébergeur, fournisseur
        d’authentification). Une interruption prolongée et imputable à l’éditeur peut donner
        lieu à un geste commercial ou à un remboursement au prorata.
      </p>

      <h2>10. Garanties légales et responsabilité</h2>
      <p>
        L’Utilisateur bénéficie de la <strong>garantie légale de conformité</strong> des contenus
        et services numériques (articles L. 224-25-1 et suivants du Code de la consommation).
        La responsabilité de l’éditeur ne saurait être engagée pour les dommages indirects, ni
        pour une perte de données résultant d’une suppression volontaire par l’Utilisateur ou
        un membre de son foyer. Il appartient à l’Utilisateur d’exporter régulièrement ses
        données s’il souhaite en conserver une copie.
      </p>

      <h2>11. Contenus déposés par l’Utilisateur</h2>
      <p>
        L’Utilisateur reste propriétaire des contenus qu’il dépose (documents, textes, données).
        Il concède à l’éditeur la seule licence technique nécessaire à l’hébergement et à
        l’affichage de ces contenus dans le cadre du Service. L’éditeur n’exploite ces contenus
        à aucune autre fin.
      </p>

      <h2>12. Données personnelles</h2>
      <p>
        Le traitement des données est décrit dans la{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>. L’Utilisateur dispose
        des droits d’accès, de rectification, d’effacement, de portabilité, de limitation et
        d’opposition, dont deux sont exerçables directement depuis « Mon compte » (export et
        suppression définitive).
      </p>

      <h2>13. Propriété intellectuelle</h2>
      <p>
        La marque, le nom de domaine, les interfaces et le code du Service demeurent la
        propriété exclusive de l’éditeur. Aucune reproduction ou réutilisation n’est autorisée
        sans accord écrit préalable.
      </p>

      <h2>14. Modification des conditions</h2>
      <p>
        L’éditeur peut modifier les présentes conditions. Toute modification substantielle est
        notifiée au moins 30 jours avant son entrée en vigueur ; l’Utilisateur qui la refuse
        peut résilier sans frais avant cette date.
      </p>

      <h2>15. Médiation et droit applicable</h2>
      <p>
        En cas de litige, l’Utilisateur s’adresse d’abord à contact@nestync.app.
        À défaut d’accord amiable, il peut recourir gratuitement à un médiateur de la
        consommation. Conformément à l’article L. 612-1 du Code de la consommation, un
        médiateur sera désigné et ses coordonnées publiées ici avant l’ouverture des
        abonnements payants ; l’Utilisateur peut également saisir la plateforme européenne
        de règlement en ligne des litiges (ec.europa.eu/consumers/odr). Les présentes sont
        soumises au <strong>droit français</strong> ;
        à défaut de résolution amiable, les tribunaux compétents sont ceux du domicile du
        défendeur ou du lieu de livraison du service, au choix de l’Utilisateur.
      </p>

      <p className="doc-maj">
        <Link href="/">← Revenir à l’accueil</Link> · <Link href="/confidentialite">Politique de confidentialité</Link>
      </p>
    </CadreSite>
  );
}
