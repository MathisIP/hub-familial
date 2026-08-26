import CadreSite from '@/components/vitrine-ds/CadreSite';
import { Etapes, Etape, Encart, Ecran, Chemin, Phase } from '@/components/vitrine-ds/Guide';

/**
 * `/test` — INVITATION AU PROGRAMME DE TEST, pour des personnes qu'on ne
 * connaît pas. Page PUBLIQUE (exclue de l'authentification dans middleware.ts).
 *
 * ⚠ AUCUN NOM DE PERSONNE ICI. Le contact passe par /aide, page publique elle
 * aussi : c'est ce qui permet d'envoyer ce lien à un inconnu sans lui livrer une
 * adresse personnelle, et ce qui fait atterrir sa demande dans
 * `messages_contact` plutôt que dans une conversation privée.
 *
 * ⚠ LE PENDANT POUR LES PROCHES EST /test-proche, et les deux textes sont
 * SÉPARÉS À DESSEIN (voir components/vitrine-ds/Guide.tsx). Une correction de
 * fond — un prix, une étape qui change — est à reporter dans les deux.
 *
 * ⚠ NON INDEXABLE. Une page « programme de test » qui remonte dans les
 * résultats de recherche attirerait des inscriptions non choisies, et elle
 * deviendra caduque à l'ouverture des abonnements. Le lien reste parfaitement
 * fonctionnel pour qui le reçoit — `noindex` n'est pas une protection, c'est
 * une politesse envers les moteurs. Doublé d'une ligne dans app/robots.ts.
 */
export const metadata = {
  title: 'Nestync avant l’ouverture',
  description:
    'Utilisez Nestync gratuitement et sans limite de durée, en échange de vos retours.',
  robots: { index: false, follow: false },
};

export default function PageTest() {
  return (
    <CadreSite
      surtitre="Programme de test"
      titre="Nestync avant l’ouverture"
      chapeau="L’application n’est pas encore ouverte au public. Vous pouvez l’utiliser dès maintenant, gratuitement et sans limite de durée, en échange de vos retours."
    >
      <div className="nsy-guide-corps">
        <section>
          <Phase>De quoi s’agit-il</Phase>
          <h2>Une seule application pour tenir un foyer</h2>
          <p>
            Comptes, agenda, repas, courses, tâches, papiers, réceptions, cadeaux. Huit
            usages réunis, au lieu de huit applications qui ne se parlent pas et d’un
            groupe de messages qui sert d’aide-mémoire.
          </p>
          <p>
            Tout se partage entre les membres du foyer — avec, pour chaque chose, la
            possibilité de choisir qui la voit. Un compte bancaire, un agenda
            professionnel ou un dossier de papiers peuvent rester privés à l’intérieur
            même du foyer.
          </p>
        </section>

        <section>
          <Phase>Les conditions, sans détour</Phase>
          <h2>Ce que vous donnez, ce que vous recevez</h2>
          <Encart ton="bon" etiquette="Vous recevez">
            <p>
              L’accès complet, <strong>gratuit à vie</strong>. Pas seulement le temps du
              test : le jour où Nestync deviendra payant pour tout le monde, votre accès
              restera gratuit. Tous les modules, sans option payante, autant de membres
              que vous voulez dans votre foyer. Aucune carte bancaire ne sera demandée,
              ni maintenant ni jamais.
            </p>
            <p>
              « À vie » veut dire : aussi longtemps que le service existera. Si Nestync
              devait un jour s’arrêter, il s’arrêterait pour tout le monde — vous seriez
              prévenu et vous repartiriez avec vos données.
            </p>
          </Encart>
          <Encart etiquette="Vous donnez">
            <p>
              Vos retours, honnêtement. Ce qui vous a bloqué, ce que vous n’avez pas
              compris, ce qui manque. Un « c’est bien » ne sert à rien ; un « j’ai
              cherché dix minutes où ajouter une dépense » sert énormément.
            </p>
          </Encart>
          <p>
            C’est tout. Pas d’engagement, pas de durée minimale : vous arrêtez quand vous
            voulez, et vous emportez ou effacez vos données d’un clic. Si vous décidez
            d’arrêter les retours, l’accès vous reste quand même — il récompense un
            travail déjà fait, il ne l’achète pas d’avance.
          </p>
        </section>

        <section>
          <Phase>À savoir avant de commencer</Phase>
          <h2>Ce n’est pas une démonstration</h2>
          <p>
            Le compte que vous créez est un vrai compte, avec vos vraies données. C’est la
            seule façon de tester utilement une application de foyer — un budget vide ne
            se juge pas.
          </p>
          <ul>
            <li>
              Les données sont <strong>hébergées dans l’Union européenne</strong>.
            </li>
            <li>
              Les documents que vous déposez sont <strong>chiffrés</strong> : l’hébergeur
              ne peut ni les lire, ni même connaître leur nom.
            </li>
            <li>
              Vous pouvez <strong>tout exporter</strong> dans une archive contenant vos
              fichiers, ou <strong>tout supprimer</strong> définitivement, à tout moment
              et sans le demander à personne.
            </li>
          </ul>
          <p>
            L’application est en cours de développement : vous rencontrerez des
            maladresses, et c’est précisément ce qu’on vous demande de signaler.
          </p>
        </section>

        <section>
          <Phase>À faire, dans cet ordre</Phase>
          <h2>Les cinq étapes</h2>
          <Etapes>
            <Etape titre="Créer votre compte">
              <p>
                Ouvrez <strong>nestync.app</strong> depuis votre téléphone et
                connectez-vous avec votre compte Google. L’application vous propose
                ensuite de nommer votre foyer.
              </p>
              <p>
                Vous disposez immédiatement de trente jours d’essai : rien ne vous bloque
                pendant que la suite se met en place.
              </p>
            </Etape>

            <Etape titre="Signaler que vous rejoignez le programme">
              <p>
                Depuis la page <Chemin>Aide et contact</Chemin>, envoyez un message avec
                pour objet <strong>« programme de test »</strong>, en indiquant l’adresse
                e-mail exacte utilisée pour vous connecter.
              </p>
              <Encart ton="attention" etiquette="L’adresse doit être la bonne">
                <p>
                  C’est elle qui identifie votre foyer. Une variante — un point en trop,
                  une autre boîte — désignerait un compte qui n’existe pas.
                </p>
              </Encart>
            </Etape>

            <Etape titre="Vérifier que l’accès est en place">
              <p>
                Sous quelques jours, ouvrez <Chemin>Réglages › Abonnement</Chemin>. Vous
                devez y lire :
              </p>
              <Ecran
                statut="Accès offert ✓"
                detail="Ton accès est offert, sans limite de durée et sans rien à payer."
              />
              <p>
                Tant que vous lisez « Période d’essai », la demande n’a pas encore été
                traitée. Vos trente jours continuent de courir : rien n’est perdu.
              </p>
            </Etape>

            <Etape titre="Installer l’application sur l’écran d’accueil">
              <p>Nestync s’installe sans passer par un magasin d’applications.</p>
              <ul>
                <li>
                  <strong>iPhone</strong> : bouton Partager, puis « Sur l’écran d’accueil ».
                  iOS ne le propose jamais de lui-même.
                </li>
                <li>
                  <strong>Android</strong> : une bannière d’installation apparaît d’elle-même.
                </li>
              </ul>
              <p>
                Testez-la ainsi, en plein écran depuis l’accueil : c’est la façon dont elle
                sera réellement utilisée.
              </p>
            </Etape>

            <Etape titre="Inviter les autres membres du foyer">
              <p>
                <Chemin>Mon foyer › Inviter</Chemin>. L’intérêt d’une application de foyer
                ne se révèle qu’à plusieurs : la liste de courses que l’autre coche depuis
                le magasin, l’agenda commun, les dépenses partagées.
              </p>
              <p>
                L’invitation n’est acceptable que par l’adresse précise à laquelle elle a
                été envoyée.
              </p>
            </Etape>
          </Etapes>
        </section>

        <section>
          <Phase>Facultatif</Phase>
          <h2>Brancher votre Google Agenda</h2>
          <p>
            Depuis <Chemin>Agenda</Chemin>, vous pouvez rattacher vos calendriers Google
            et choisir lesquels partager avec le foyer. Google affichera son propre écran
            d’autorisation : c’est une demande distincte de votre connexion, et vous
            pouvez la refuser sans rien perdre du reste.
          </p>
        </section>

        <section>
          <Phase>Ce qui aide le plus</Phase>
          <h2>Comment faire un retour utile</h2>
          <p>
            Utilisez l’application normalement pendant deux ou trois semaines, puis
            racontez :
          </p>
          <ul>
            <li>
              Ce que vous n’avez <strong>pas compris du premier coup</strong>. C’est le
              retour le plus précieux et il ne se donne qu’une fois : dans un mois, vous
              aurez pris l’habitude et vous ne le verrez plus.
            </li>
            <li>
              Ce qui vous a fait <strong>abandonner</strong> une action en cours.
            </li>
            <li>
              Ce qui <strong>manque</strong> pour remplacer ce que vous utilisez
              aujourd’hui.
            </li>
            <li>
              Tout ce qui s’affiche mal <strong>sur votre téléphone</strong> — le modèle et
              le navigateur sont très utiles à préciser.
            </li>
          </ul>
          <p>
            Tout passe par la page <Chemin>Aide et contact</Chemin>, accessible même sans
            être connecté. Les réponses arrivent sous trente jours au plus.
          </p>
        </section>

        <p className="doc-maj">
          Merci d’accepter d’essayer un produit qui n’est pas encore fini. C’est ce qui le
          rendra utilisable par d’autres.
        </p>
      </div>
    </CadreSite>
  );
}
