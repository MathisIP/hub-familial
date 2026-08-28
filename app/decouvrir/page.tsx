import Link from 'next/link';
import Image from 'next/image';
import CadreSite from '@/components/vitrine-ds/CadreSite';
import { OFFRES, ESSAI_JOURS, formatPrix } from '@/lib/offres';

export const metadata = {
  title: 'Découvrir Nestync',
  description:
    'Ce qu’est Nestync, ce qui le distingue, qui l’édite : présentation du service et ressources pour en parler.',
};

/**
 * `/decouvrir` — la page à donner à quelqu'un qui demande « c'est quoi ? ».
 *
 * ⚠ **CRÉÉE LE 28/08/2026.** Le lien « Découvrir Nestync » du bas de page
 * pointait vers `#demonstration`, une ancre de l'accueil : depuis une page
 * intérieure il ne menait nulle part, et depuis l'accueil il ramenait à une
 * démonstration interactive — utile pour convaincre, inutile pour comprendre.
 *
 * ⚠ **TON DESCRIPTIF, PAS COMMERCIAL.** L'accueil est une page de conversion ;
 * celle-ci doit pouvoir être lue par un journaliste, un partenaire ou un proche
 * qui veut savoir de quoi il s'agit sans se faire vendre quoi que ce soit. Les
 * deux publics ne se servent pas de la même page.
 *
 * ⚠ **RIEN D'INVENTÉ, ET SURTOUT AUCUN CHIFFRE D'USAGE.** Pas de nombre de
 * foyers, pas de note, pas de citation : Nestync sort de période d'essai, et
 * c'est exactement le genre d'affirmation qu'un journaliste vérifie en premier.
 * Les seuls chiffres présents sont des faits vérifiables : les tarifs, la durée
 * d'essai, le nombre de modules.
 */

/** Captures réellement présentes dans `public/captures/chaux/`. */
const CAPTURES: [string, string][] = [
  ['accueil', 'La semaine du foyer, une couleur par personne'],
  ['courses', 'La liste de courses déduite des repas planifiés'],
  ['repas', 'Le planning des repas et ses recettes'],
  ['finances', 'Le suivi du budget, sans connexion bancaire'],
  ['agenda', 'L’agenda partagé du foyer'],
  ['documents', 'Les documents du foyer, chiffrés'],
];

export default function PageDecouvrir() {
  const mensuel = OFFRES.find((o) => o.id === 'mensuel')!;
  const annuel = OFFRES.find((o) => o.id === 'annuel')!;

  return (
    <CadreSite
      surtitre="Présentation"
      titre="Découvrir Nestync"
      chapeau="Ce qu’est le service, ce qui le distingue, et qui l’édite — sans argumentaire."
      large
    >
      <h2>En deux phrases</h2>
      <p>
        Nestync réunit dans une seule application ce qu’un foyer doit tenir à jour au quotidien :
        le budget, les tâches et les courses, les repas de la semaine, l’agenda, les événements,
        les cadeaux et les documents importants. Un abonnement couvre le foyer entier, quel que
        soit le nombre de personnes.
      </p>

      <h2>Ce qui le distingue</h2>
      {/*
        ⚠ TROIS DIFFÉRENCIANTS RÉELS, VÉRIFIABLES DANS LE PRODUIT. Ne pas allonger
        cette liste avec des qualités que tout concurrent revendique aussi
        (« simple », « intuitif ») : elles n'informent personne et affaiblissent
        les trois qui suivent.
      */}
      <p>
        <strong>La liste de courses se déduit des repas.</strong> On place des recettes dans le
        planning de la semaine, on indique le nombre de convives, et les ingrédients arrivent dans
        la liste rangés par rayon, quantités mises à l’échelle et doublons additionnés. C’est le
        seul endroit où deux modules travaillent réellement ensemble, et c’est ce que les
        applications de liste et les applications de menus font séparément.
      </p>
      <p>
        <strong>Aucun accès bancaire.</strong> Le module Budget ne se connecte à aucune banque et
        ne demande aucun identifiant : il n’y a pas d’agrégation de comptes, donc pas de
        délégation d’accès à surveiller. C’est un choix, pas une limite technique — il rend
        inutile toute la chaîne de confiance qu’exige l’agrégation.
      </p>
      <p>
        <strong>Les documents sont chiffrés avant d’être stockés.</strong> Un bail, un carnet de
        santé ou une carte d’identité déposés dans le module Documents sont chiffrés (AES-256-GCM)
        avant transmission : l’hébergeur n’en connaît ni le contenu, ni le nom d’origine, ni le
        type. Ce n’est pas du bout-en-bout — le serveur déchiffre pour servir le fichier au foyer —
        mais l’hébergeur, lui, ne peut rien lire.
      </p>

      <h2>Comment on y accède</h2>
      <p>
        Nestync s’installe depuis le navigateur, sur iPhone, iPad, Android, Mac et PC, et s’ouvre
        ensuite comme une application ordinaire. Il n’y a rien à télécharger sur l’App Store ou le
        Play Store aujourd’hui : aucune validation de mise à jour à attendre, aucune autorisation
        à accorder à un magasin. Des versions publiées sur ces magasins viendront ; elles seront
        annoncées sur la page des <Link href="/mises-a-jour">mises à jour</Link>.
      </p>

      <h2>Modèle économique</h2>
      <p>
        Abonnement payant, sans publicité et sans revente de données :{' '}
        {formatPrix(mensuel.prix)} par mois ou {formatPrix(annuel.prix)} par an, par foyer, après{' '}
        {ESSAI_JOURS} jours d’essai gratuit sans carte bancaire. Il n’existe pas de version
        gratuite financée autrement — c’est ce qui permet de n’avoir ni régie publicitaire, ni
        traceur tiers. Le détail figure sur la page <Link href="/tarifs">Tarifs</Link>.
      </p>

      <h2>L’éditeur</h2>
      <p>
        Nestync est édité en France par un développeur indépendant, sans levée de fonds. Les
        données des foyers sont hébergées dans l’Union européenne (base de données à Francfort,
        fichiers à Paris chez OVHcloud, sur une infrastructure certifiée ISO 27001 et HDS). Les
        informations légales complètes figurent dans les{' '}
        <Link href="/mentions-legales">mentions légales</Link>.
      </p>

      <h2>Captures d’écran</h2>
      {/*
        ⚠ Ces captures sont celles du site, servies telles quelles. Elles sont
        libres d'usage pour parler du produit — mais rien ne permet ici de les
        télécharger en lot : ce serait promettre une archive qui n'existe pas.
        À préparer si une demande presse arrive vraiment.
      */}
      <p>
        Les images ci-dessous peuvent être reprises librement pour parler de Nestync. Elles
        montrent le produit réel, sans retouche.
      </p>
      <div className="nsy-presse-captures">
        {CAPTURES.map(([nom, legende]) => (
          <figure key={nom}>
            <Image
              src={`/captures/chaux/${nom}.webp?v=2`}
              alt={legende}
              width={300}
              height={620}
              style={{ width: '100%', height: 'auto' }}
            />
            <figcaption>{legende}</figcaption>
          </figure>
        ))}
      </div>

      <h2>Nous contacter</h2>
      <p>
        Pour toute demande — presse, partenariat, question sur le produit —{' '}
        <a href="mailto:contact@nestync.app">contact@nestync.app</a>, ou le formulaire de la page{' '}
        <Link href="/aide">Aide et contact</Link>. Les questions les plus posées ont leur réponse
        sur la page <Link href="/questions">Questions fréquentes</Link>.
      </p>

      <p className="doc-maj">Page mise à jour le 28 août 2026.</p>
    </CadreSite>
  );
}
