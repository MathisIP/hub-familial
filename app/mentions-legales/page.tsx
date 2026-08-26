import Link from 'next/link';
import CadreSite from '@/components/vitrine-ds/CadreSite';

export const metadata = {
  title: 'Mentions légales — Nestync',
  description: 'Éditeur, directeur de la publication et hébergeurs du service Nestync.',
};

/**
 * MENTIONS LÉGALES — page PUBLIQUE (cf. middleware).
 *
 * Obligation distincte des CGV : la loi pour la confiance dans l'économie
 * numérique (art. 6-III) impose d'identifier l'éditeur d'un service en ligne et
 * de nommer ses hébergeurs. Un lecteur doit pouvoir savoir à qui il a affaire
 * sans lire un contrat.
 *
 * ⚠ IMMATRICULATION POSÉE LE 26/08/2026 (Kbis du 25/08). Elle figure ici ET à
 * l'article 1 des CGV (les deux
 * pages portent la même information, elles doivent rester cohérentes) :
 * numéro SIREN et adresse de l'établissement. Le texte l'annonce plutôt que de
 * laisser un blanc — la page est publique et lue par les évaluateurs Google.
 */
export default function PageMentionsLegales() {
  return (
    <CadreSite surtitre="Informations légales" titre="Mentions légales">
      <p className="doc-maj">Dernière mise à jour : 13 août 2026</p>
      <p className="doc-langue">Nestync est proposé en France, aux consommateurs résidant en France. Ce document n’existe qu’en français : seule cette version fait foi.</p>

      <h2>1. Éditeur du service</h2>
      <p>
        Le service <strong>Nestync</strong>, accessible à l’adresse{' '}
        <a href="https://www.nestync.app">www.nestync.app</a>, est édité par{' '}
        <strong>Mathis INGRAND-PERIGNE</strong>, personne physique agissant à titre
        individuel.
      </p>
      <p>
        Entrepreneur individuel immatriculé au <strong>Registre du commerce et des
        sociétés de Tours</strong> sous le numéro <strong>108 793 514 R.C.S. Tours</strong>
        (SIREN <strong>108 793 514</strong>), depuis le 25 août 2026.
      </p>
      <p>
        <strong>Adresse de l’établissement</strong> : 25 rue du Maréchal Ney, 37100 Tours,
        France.
      </p>
      <p>
        Activité déclarée : édition de logiciels applicatifs — application Web
        d’organisation familiale exploitée en ligne (SaaS) et vendue par abonnement.
      </p>
      <p>
        {/* ⚠ Franchise en base de TVA de l’entrepreneur individuel : la mention est
            OBLIGATOIRE sur les factures et les conditions tant qu’elle s’applique. */}
        <strong>TVA non applicable, article 293 B du CGI.</strong> Aucun numéro de TVA
        intracommunautaire n’est donc applicable à ce jour.
      </p>
      <ul>
        <li>Contact : <a href="mailto:contact@nestync.app">contact@nestync.app</a></li>
        <li>Directeur de la publication : Mathis INGRAND-PERIGNE</li>
      </ul>

      <h2>2. Hébergement</h2>
      <p>
        L’application est hébergée par <strong>Vercel Inc.</strong>, 340 S Lemon Ave #4133,
        Walnut, CA 91789, États-Unis — <a href="https://vercel.com">vercel.com</a>.
      </p>
      <p>
        Les <strong>données des foyers</strong> (base de données) sont hébergées par{' '}
        <strong>Neon Inc.</strong> dans une région située dans l’
        <strong>Union européenne</strong> (Francfort, Allemagne) —{' '}
        <a href="https://neon.tech">neon.tech</a>. Les <strong>fichiers</strong> déposés dans
        le module Documents sont stockés sur l’infrastructure de Vercel, en accès privé.
      </p>
      <p>
        Le traitement des paiements est assuré par <strong>Stripe Payments Europe, Ltd.</strong>,
        1 Grand Canal Street Lower, Dublin 2, Irlande. Nestync ne conserve aucune donnée de
        carte bancaire.
      </p>

      <h2>3. Propriété intellectuelle</h2>
      <p>
        La marque Nestync, le nom de domaine, la charte graphique, les textes et le code du
        Service sont la propriété de l’éditeur. Toute reproduction ou représentation, totale
        ou partielle, sans autorisation écrite préalable est interdite.
      </p>
      <p>
        Les contenus que vous déposez dans le Service (documents, notes, données de vos
        modules) <strong>restent votre propriété</strong>. L’éditeur n’en acquiert aucun
        droit et ne les exploite pas à d’autres fins que le fonctionnement du Service.
      </p>

      <h2>4. Données personnelles</h2>
      <p>
        Le traitement des données personnelles est décrit dans la{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>, qui précise les
        finalités, les durées de conservation, les sous-traitants et la manière d’exercer vos
        droits (accès, rectification, effacement, portabilité). L’export et la suppression de
        vos données sont accessibles directement depuis la page « Mon compte ».
      </p>

      <h2>5. Conditions d’utilisation et de vente</h2>
      <p>
        Les règles applicables à l’usage du Service et à l’abonnement figurent dans les{' '}
        <Link href="/conditions">conditions générales de vente et d’utilisation</Link>, qui
        traitent notamment du droit de rétractation, de la reconduction et de la résiliation.
      </p>

      <h2>6. Signaler un contenu ou nous écrire</h2>
      <p>
        Toute question, réclamation ou signalement peut être adressé à{' '}
        <a href="mailto:contact@nestync.app">contact@nestync.app</a>. Nous nous engageons à
        répondre dans un délai raisonnable, et au plus tard sous trente jours pour les
        demandes relatives aux données personnelles.
      </p>
    </CadreSite>
  );
}
