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
 * ⚠ MÉDIATEUR DÉSIGNÉ LE 29/08/2026 (article 15) — MCP MEDIATION, texte recopié
 * mot pour mot du courrier de confirmation d'adhésion (voir le commentaire à
 * l'article 15). Faire relire l'ensemble par un professionnel avant d'ouvrir les
 * abonnements reste recommandé, mais le dernier point bloquant identifié en
 * interne est levé.
 *
 * ⚠ RELECTURE COMPLÈTE DU 26/08/2026 — sept points corrigés, chacun documenté
 * par un commentaire à l'endroit concerné. QUATRE articles sont ADOSSÉS À DU
 * CODE et ne peuvent pas être retouchés seuls : l'avis de reconduction
 * (article 7 ↔ `envoyerAvisReconductions`), la rétractation (article 8 ↔ la case
 * `ABO_RENONCIATION`), l'effet de la suppression sur les autres membres
 * (article 12 ↔ `DELAI_SUPPRESSION_FOYER`), et la cessation du Service
 * (article 16 ↔ `construireArchive`, qui doit continuer de livrer les fichiers
 * eux-mêmes et non des liens). Modifier le texte sans le code transformerait une
 * clause en engagement non tenu.
 *
 * ⚠ ARTICLE 16 AJOUTÉ LE 27/08/2026. Il manquait : l'article 9 ne traitait que
 * l'indisponibilité TEMPORAIRE, si bien qu'aucune clause ne disait ce qu'il
 * advient d'un abonnement payé d'avance ni des données si le Service s'arrête
 * pour de bon. Le trou pesait sur les abonnés, pas sur les testeurs — quelqu'un
 * qui règle un an en janvier et voit fermer en mars.
 */
export default function PageConditions() {
  const mensuel = OFFRES[0];
  const annuel = OFFRES[1];

  return (
    <CadreSite surtitre="Le contrat" titre="Conditions générales de vente et d’utilisation">
      <p className="doc-maj">Dernière mise à jour : 30 août 2026</p>
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
        <li>Hébergement de la base de données : Neon Inc., région Union européenne</li>
        {/*
          ⚠ AJOUTÉE LE 28/08/2026. Cette liste omettait l'hébergeur des fichiers,
          et les mentions légales en désignaient un autre (Vercel) que celui
          réellement utilisé depuis le 08/08 (OVHcloud). Deux documents
          contractuels qui se contredisent sur le lieu de stockage des documents
          d'un foyer, c'est pire qu'un seul qui se tait.
        */}
        <li>Hébergement des fichiers du module Documents : OVH SAS, Paris, France</li>
      </ul>

      <h2>2. Objet</h2>
      {/*
        ⚠ « Majeure » qualifie le SOUSCRIPTEUR, pas les membres du foyer —
        distinction ajoutée le 26/08/2026. Le texte précédent réservait le Service
        aux majeurs sans nuance : inviter son enfant de quinze ans était donc
        contraire aux conditions, alors que le produit est fait pour ça (la
        visibilité par personne existe précisément pour que les parents partagent
        entre eux sans partager avec les enfants). Le détail est à l'article 4.
      */}
      <p>
        Les présentes conditions régissent l’accès au Service et sa souscription par toute
        personne physique majeure agissant à des fins non professionnelles (ci-après
        « l’Utilisateur »). Toute création de compte vaut acceptation pleine et entière
        des présentes. Un mineur peut être <strong>membre</strong> d’un foyer dans les
        conditions de l’article 4, sans pouvoir souscrire d’abonnement.
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
        {/*
          ⚠ LA DEUXIÈME PHRASE EST CELLE QUI COMPTE. Le RGPD traite le
          consentement d'un mineur de moins de quinze ans comme relevant des
          titulaires de l'autorité parentale ; le produit, lui, n'en garde aucune
          trace — la connexion passe par un compte Google, qui a ses propres
          règles d'âge. Recueillir la déclaration dans le contrat est ce qui
          rattache le traitement à une base légale identifiable.

          ⚠ Aucun âge plancher n'est posé, à dessein : rien dans le code n'empêche
          un enfant plus jeune d'être membre, et une clause qui l'interdirait
          serait à nouveau décalée du produit — l'erreur qu'on vient de corriger.
          ⚠ Point signalé pour la relecture juridique.
        */}
        <li>
          Seule une personne <strong>majeure</strong> peut souscrire un abonnement et créer
          un foyer. Un <strong>mineur</strong> peut être invité comme membre d’un foyer, sous
          la responsabilité du titulaire du compte qui l’invite. En invitant un mineur de
          moins de quinze ans, ce dernier déclare exercer l’autorité parentale à son égard
          et consentir, en son nom, au traitement de ses données décrit dans la{' '}
          <Link href="/confidentialite">politique de confidentialité</Link>.
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
      {/*
        ⚠ NE PAS ÉCRIRE « TOUTES TAXES COMPRISES » — c'est l'erreur corrigée le
        26/08/2026. L'article 1 indique, à juste titre, que la TVA n'est pas
        applicable (franchise en base, art. 293 B du CGI). Annoncer des prix TTC
        deux articles plus loin n'est pas trompeur au détriment du client — le
        prix affiché est bien celui payé — mais l'incohérence saute aux yeux de
        qui lit les deux articles à la suite.

        ⚠ ÉCHÉANCE À VENIR : le jour où le chiffre d'affaires dépasse le seuil de
        la franchise, la TVA devient exigible et ces prix deviennent des prix TTC
        incluant 20 % — soit une baisse de revenu net, soit une hausse à annoncer
        trente jours à l'avance. Cet article devra être réécrit ce jour-là.
      */}
      <p>
        Les prix sont indiqués en euros et correspondent au{' '}
        <strong>montant total dû par l’Utilisateur</strong>. La TVA n’étant pas applicable
        (article 293 B du Code général des impôts), aucun montant de taxe ne s’y ajoute.
      </p>
      <ul>
        <li><strong>Formule mensuelle</strong> : {formatPrix(mensuel.prix)} {mensuel.periode}.</li>
        <li><strong>Formule annuelle</strong> : {formatPrix(annuel.prix)} {annuel.periode}, soit {formatPrix(annuel.parMois)} par mois.</li>
      </ul>
      <p>
        Le paiement s’effectue par carte bancaire via notre prestataire <strong>Stripe</strong>.
        Aucune coordonnée bancaire n’est conservée par l’éditeur. La facture est disponible
        depuis l’espace « Mon abonnement ».
      </p>
      {/*
        ⚠ La faculté de résilier sans frais en cas de hausse était absente : sans
        elle, « l'éditeur se réserve le droit de modifier ses tarifs » se lit comme
        un droit unilatéral sans contrepartie. L'article 14 accorde déjà cette
        faculté pour les conditions ; le prix mérite exactement la même.
      */}
      <p>
        L’éditeur peut modifier ses tarifs. Toute hausse est notifiée à l’Utilisateur au
        moins <strong>30 jours</strong> avant son entrée en vigueur et ne s’applique qu’à
        compter de la période d’abonnement suivante. L’Utilisateur qui la refuse peut{' '}
        <strong>résilier sans frais</strong> avant cette date, dans les conditions de
        l’article 7.
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
        <li>
          La résiliation prend effet au terme de la période en cours. L’accès reste ouvert
          jusqu’à cette date, et la période déjà payée n’est pas remboursée au prorata —{' '}
          <strong>sauf dans les trois cas suivants</strong>, où elle l’est :
        </li>
        {/*
          ⚠ CETTE LISTE A ÉTÉ ÉCRITE LE 28/08/2026 PARCE QUE LA CLAUSE ÉTAIT
          FAUSSE. Elle disait « aucune somme n'est remboursée au prorata […]
          sauf disposition légale contraire » : la réserve finale est exacte mais
          creuse, et elle faisait porter au consommateur la charge de connaître
          l'exception. Une clause qui énonce la règle défavorable en toutes
          lettres et cache la favorable derrière une formule générale s'expose
          à la qualification de clause abusive.

          ⚠ Le premier cas est imposé par l'article L. 215-1 du code de la
          consommation, alinéas 2 et 3 : à défaut d'avis de reconduction envoyé
          dans la fenêtre légale, le consommateur « peut mettre GRATUITEMENT un
          terme au contrat, à tout moment à compter de la date de reconduction »,
          et les avances versées après la dernière reconduction « sont
          remboursées dans un délai de trente jours à compter de la date de
          résiliation, déduction faite des sommes correspondant, jusqu'à
          celle-ci, à l'exécution du contrat » — c'est-à-dire au prorata.
          Nestync envoie cet avis (voir ci-dessus, trace en base) : ce cas ne
          devrait pas se produire. Il doit tout de même être écrit.

          ⚠ Le troisième cas rend le contrat COHÉRENT AVEC LUI-MÊME : l'article 16
          promet déjà le remboursement du non-couru en cas de fermeture du
          Service. Un contrat qui se contredit d'un article à l'autre s'interprète
          contre celui qui l'a rédigé (art. 1190 du code civil).
        */}
        <li>
          <strong>Défaut d’information avant reconduction</strong> : si l’avis prévu à l’alinéa
          précédent n’a pas été adressé dans les conditions de l’article L. 215-1 du Code de
          la consommation, l’Utilisateur peut mettre fin au contrat gratuitement, à tout moment
          à compter de la date de reconduction. Les sommes versées d’avance depuis cette
          reconduction lui sont remboursées dans les <strong>trente jours</strong> suivant la
          résiliation, déduction faite de ce qui correspond au service effectivement fourni.
        </li>
        <li>
          <strong>Rétractation</strong> : dans le cadre du droit de rétractation de quatorze
          jours (article 8), selon les modalités qui y sont décrites.
        </li>
        <li>
          <strong>Cessation du Service</strong> : si l’éditeur met fin au Service, la fraction
          de la période payée et non courue est remboursée sans démarche de l’Utilisateur
          (article 16).
        </li>
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
        d’authentification).
      </p>
      {/*
        ⚠ « Geste commercial ou remboursement au prorata » laissait la réparation
        à la discrétion de l'éditeur, alors que la garantie légale de conformité
        OUVRE UN DROIT. Une clause qui présente comme une faveur ce que la loi
        accorde est de celles qu'un contrôle relève. Corrigé le 26/08/2026.
      */}
      <p>
        Une indisponibilité prolongée imputable à l’éditeur constitue un défaut de conformité.
        L’Utilisateur peut alors obtenir la <strong>remise en conformité</strong> du Service et,
        si elle n’intervient pas dans un délai raisonnable, une{' '}
        <strong>réduction du prix</strong> proportionnelle à la durée de l’interruption ou la
        résolution du contrat, dans les conditions des articles L. 224-25-17 et suivants du
        Code de la consommation.
      </p>

      <h2>10. Garanties légales et responsabilité</h2>
      <p>
        L’Utilisateur bénéficie de la <strong>garantie légale de conformité</strong> des contenus
        et services numériques (articles L. 224-25-1 et suivants du Code de la consommation).
        {/* ⚠ La DURÉE manquait. Pour une fourniture continue, la garantie ne dure pas
            deux ans à compter d'une livraison : elle court pendant TOUTE la durée
            de fourniture. Sans cette précision, un client pouvait croire sa
            garantie éteinte alors qu'elle courait encore. */}
        {' '}Le Service étant fourni de manière continue, cette garantie s’applique{' '}
        <strong>pendant toute la durée de l’abonnement</strong>.
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
      {/*
        ⚠ CETTE CLAUSE DÉCRIT UNE CONSÉQUENCE IRRÉVERSIBLE SUR LES DONNÉES DE
        TIERS — elle ne peut pas rester tacite. Ajoutée le 26/08/2026 en même
        temps que le mécanisme qui la rend supportable.

        ⚠ Le délai de sept jours et l'avertissement sont ADOSSÉS À DU CODE
        (`supprimerFoyerEtUtilisateur`, `envoyerFoyerEnSuppression`,
        `supprimerFoyersEchus`, `BandeauSuppression`). Les écrire ici sans les
        tenir serait un engagement non tenu. Toute retouche du délai doit changer
        `DELAI_SUPPRESSION_FOYER` et ce paragraphe ensemble.
      */}
      <p>
        <strong>Effet de la suppression sur les autres membres.</strong> La suppression du
        compte du propriétaire d’un foyer entraîne la suppression définitive de ce foyer et
        de l’ensemble des données qu’il contient, <strong>y compris celles saisies par les
        autres membres</strong>. Lorsque le foyer compte d’autres membres, ceux-ci en sont
        informés par courrier électronique et disposent d’un délai de <strong>sept (7)
        jours</strong> pour exporter les données avant leur effacement ; le compte du
        propriétaire, lui, est supprimé immédiatement. Un membre non propriétaire qui
        supprime son compte quitte le foyer sans affecter les données de celui-ci.
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
        {/*
          ⚠ TEXTE CONTRACTUEL, RECOPIÉ MOT POUR MOT (29/08/2026). Ce paragraphe
          provient du courrier de confirmation d'adhésion envoyé par MCP MEDIATION
          après signature de la convention de médiation — ce n'est pas une clause
          rédigée par nous mais le texte que le médiateur impose à ses adhérents.
          Les références L. 611-1 / R. 612-1 viennent telles quelles de ce courrier :
          NE PAS LES « CORRIGER » vers L. 616-1 / R. 616-1 même si ces derniers
          semblent plus exacts au regard du Code de la consommation — c'est au
          site de s'aligner sur le texte du médiateur, pas l'inverse. Fichier
          source : « Texte de cgv pour la médiation.txt ».
        */}
        Conformément aux dispositions des articles L. 611-1 et R. 612-1 et suivants du Code de
        la consommation concernant le règlement amiable des litiges : lorsque le consommateur a
        adressé une réclamation écrite au professionnel et qu’il n’a pas obtenu satisfaction ou
        de réponse dans un délai de deux mois, il peut soumettre gratuitement sa réclamation au
        médiateur de la consommation. Le médiateur doit être saisi dans le délai maximal d’un an
        à compter de la réclamation initiale.
      </p>
      <p>
        Le médiateur <strong>MCP MEDIATION</strong> peut être saisi directement en ligne à
        l’adresse suivante : <a href="https://www.mcpmediation.org">www.mcpmediation.org</a>, ou
        par courrier à : Médiation de la Consommation et Patrimoine — 12 Square Desnouettes —
        75015 Paris.
        {/*
          ⚠ NE PAS REMETTRE LA PLATEFORME EUROPÉENNE DE RÈGLEMENT EN LIGNE DES
          LITIGES. Elle est FERMÉE : le règlement (UE) 2024/3228 du 19 décembre
          2024 a abrogé le règlement (UE) n° 524/2013 — dépôt des plaintes clos le
          20 mars 2025, plateforme éteinte le 20 juillet 2025, données effacées.
          L'obligation d'en afficher le lien a disparu avec elle. La mention
          figurait ici par habitude, recopiée de CGV plus anciennes ; elle
          renvoyait le client vers un site qui n'existe plus, au moment précis où
          il cherche un recours. Vérifié le 26/08/2026.
        */}
      </p>
      <p>
        Les présentes sont soumises au <strong>droit français</strong> ;
        à défaut de résolution amiable, les tribunaux compétents sont ceux du domicile du
        défendeur ou du lieu de livraison du service, au choix de l’Utilisateur.
      </p>

      {/*
        ⚠ ARTICLE ADOSSÉ À DU CODE — le quatrième. Ce qui est promis ici doit
        rester vrai dans l'application :
          · « pleinement fonctionnel, fonction d'export comprise » ↔ la route
            `/api/compte/export` et `construireArchive` (lib/rgpd-archive.ts),
            qui produit une archive contenant les VRAIS documents. Si cet export
            redevenait un simple JSON de liens, la clause promettrait la
            récupération d'un bail que le client ne pourrait plus ouvrir ;
          · le préavis et les rappels supposent des envois qui n'existent pas
            encore dans lib/email/messages.ts — ils sont à écrire le jour venu,
            et la clause fixe leur cadence.

        ⚠ POURQUOI PAS D'ENVOI DES DONNÉES PAR COURRIEL. La question s'est posée
        le 26/08/2026 : joindre l'archive au message d'adieu. Écarté pour trois
        raisons qui se cumulent. La taille d'abord — l'offre annonce 2 Go quand
        les boîtes de réception plafonnent autour de 25 Mo, si bien que la clause
        échouerait précisément pour les foyers ayant le plus déposé. La sécurité
        ensuite : ce serait recopier en clair, chez un tiers, des documents que
        `DOCUMENTS_SECRET` chiffre justement pour que l'hébergeur ne les lise
        pas — c'est exactement la raison pour laquelle l'envoi de la liste de
        courses par message a été retiré le 16/08/2026. Les adresses mortes
        enfin : un envoi qui rebondit est une obligation non tenue, et
        obligerait à conserver les données alors qu'il faut les effacer.
        Un lien de téléchargement authentifié resterait envisageable ; le
        fichier lui-même, non.
      */}
      <h2>16. Cessation du Service</h2>
      <p>
        L’éditeur peut décider de mettre fin au Service. Il en informe alors chaque
        Utilisateur par courrier électronique et par un avis affiché dans l’application,
        au moins <strong>trois mois</strong> avant la date d’arrêt. Si la cessation
        résulte d’une circonstance échappant à son contrôle — défaillance d’un
        prestataire essentiel, force majeure — le préavis est le plus long que les
        circonstances permettent, sans pouvoir être inférieur à <strong>trente jours</strong>.
      </p>
      <p>
        Pendant toute la durée du préavis, le Service demeure accessible et{' '}
        <strong>pleinement fonctionnel</strong>, la fonction d’export des données comprise.
        Au moins deux rappels sont adressés par courrier électronique, dont un dans les
        sept derniers jours.
      </p>
      <p>
        {/* ⚠ L'archive, pas le JSON : c'est ce qui rend la clause tenable. */}
        L’Utilisateur récupère l’intégralité de ses données depuis son compte, sous la
        forme d’une archive contenant ses données structurées et{' '}
        <strong>les fichiers qu’il a déposés</strong>. À compter de la date d’arrêt, les
        comptes sont fermés et les données définitivement effacées dans un délai maximal
        de trente jours ; pendant ce seul délai, une demande adressée à
        contact@nestync.app permet encore d’en obtenir une copie.
      </p>
      <p>
        Les abonnements en cours sont <strong>résiliés de plein droit</strong> à la date
        d’arrêt. La fraction de la période payée et non courue est{' '}
        <strong>remboursée</strong>, sans démarche de l’Utilisateur, dans les quatorze
        jours suivant cette date.
      </p>
      <p>
        {/*
          ⚠ Cette phrase ferme la boucle avec la promesse faite aux premiers
          testeurs : « gratuit à vie » y signifie « aussi longtemps que le
          Service existera », et les fiches qui leur sont remises le disent dans
          ces termes. Sans elle, le contrat resterait muet là où l'engagement
          commercial est explicite — et c'est le silence qui s'interprète contre
          le professionnel.
        */}
        Les accès accordés à titre gratuit, y compris ceux consentis sans limite de
        durée, prennent fin à la même date et dans les mêmes conditions, sans indemnité :
        la gratuité porte sur le prix, non sur la pérennité du Service.
      </p>
      <p>
        En cas de <strong>transfert du Service</strong> à un autre exploitant, l’Utilisateur
        en est informé au moins trente jours à l’avance et peut s’y opposer ; il obtient
        alors l’export de ses données et la fermeture de son compte, sans frais.
      </p>

      <p className="doc-maj">
        <Link href="/">← Revenir à l’accueil</Link> · <Link href="/confidentialite">Politique de confidentialité</Link>
      </p>
    </CadreSite>
  );
}
