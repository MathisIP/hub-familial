import CadreSite from '@/components/vitrine-ds/CadreSite';
import { Etapes, Etape, Encart, Ecran, Chemin, Phase } from '@/components/vitrine-ds/Guide';

/**
 * `/test-proche` — INVITATION AU PROGRAMME DE TEST, pour les proches. Page
 * PUBLIQUE (exclue de l'authentification dans middleware.ts).
 *
 * ⚠ CE QUI CHANGE PAR RAPPORT À /test, et pourquoi. Un proche a déjà décidé : il
 * fait confiance et veut savoir quoi faire. Ce qui lui manque, ce n'est pas
 * l'argumentaire, c'est de savoir QUOI EN FAIRE une fois entré — d'où les huit
 * modules détaillés un par un plutôt que résumés. Il prévient directement, sans
 * passer par le formulaire d'aide.
 *
 * ⚠ LES DEUX TEXTES SONT SÉPARÉS À DESSEIN (voir components/vitrine-ds/Guide.tsx).
 * Une correction de fond — un prix, une étape qui change — est à reporter dans
 * les deux.
 *
 * ⚠ NON INDEXABLE, comme /test : cf. le commentaire de app/test/page.tsx.
 */
export const metadata = {
  title: 'Nestync en avant-première',
  description: 'Ce que fait Nestync, et les six étapes pour démarrer.',
  robots: { index: false, follow: false },
};

export default function PageTestProche() {
  return (
    <CadreSite
      surtitre="Programme de test"
      titre="Nestync en avant-première"
      chapeau="Vous faites partie des toutes premières personnes à utiliser Nestync. Voici ce que fait l’application, puis les six étapes pour démarrer — comptez dix minutes, une seule fois."
    >
      <div className="nsy-guide-corps">
        <section>
          <Phase>De quoi s’agit-il</Phase>
          <h2>Une seule application pour tenir un foyer</h2>
          <p>
            Huit usages réunis, au lieu de huit applications qui ne se parlent pas et d’un
            groupe de messages qui sert d’aide-mémoire :
          </p>
          <ul>
            <li>
              <strong>Comptes</strong> — les soldes de chacun et du commun, les dépenses du
              mois par catégorie, les échéances à venir.
            </li>
            <li>
              <strong>Agenda</strong> — vos calendriers Google réunis, et ceux du foyer.
            </li>
            <li>
              <strong>Repas</strong> — le menu de la semaine, entrée, plat, dessert, avec
              les quantités qui s’ajustent au nombre de personnes.
            </li>
            <li>
              <strong>Courses</strong> — la liste rangée par rayon, que l’autre coche depuis
              le magasin.
            </li>
            <li>
              <strong>Tâches</strong> — à faire, assignées, récurrentes.
            </li>
            <li>
              <strong>Documents</strong> — les papiers du foyer, chiffrés, rangés par dossier.
            </li>
            <li>
              <strong>Réceptions</strong> — invités, à-faire, menu et budget d’un événement.
            </li>
            <li>
              <strong>Cadeaux</strong> — les idées par occasion, avec leur budget.
            </li>
          </ul>
          <p>
            Le tout se partage entre les membres du foyer — avec, pour chaque chose, la
            possibilité de choisir qui la voit. Un compte bancaire, un agenda
            professionnel ou un dossier de papiers peuvent rester privés à l’intérieur
            même du foyer.
          </p>
          <p>
            Et un cadeau peut être masqué à la personne qu’il concerne, même si elle
            partage le foyer : c’est la seule chose que l’application protège d’un proche
            plutôt que d’un inconnu.
          </p>
        </section>

        <section>
          <Phase>Ce qu’il faut savoir d’abord</Phase>
          <h2>Ce n’est pas une démonstration</h2>
          <p>
            Le compte que vous allez créer est un vrai compte, avec vos vraies données :
            votre budget, votre agenda, vos papiers. Elles sont hébergées dans l’Union
            européenne et vous pouvez les exporter ou tout effacer quand vous voulez.
          </p>
          <Encart ton="bon" etiquette="Gratuit à vie">
            <p>
              Pas « gratuit pendant le test » : <strong>gratuit à vie</strong>. Vous aidez
              à construire l’application avant qu’elle existe vraiment, et c’est la façon
              de vous en remercier. Aucune carte bancaire ne vous sera demandée, ni
              maintenant ni jamais — même le jour où Nestync deviendra payant pour tout le
              monde.
            </p>
            <p>
              « À vie » veut dire : aussi longtemps que Nestync existera. Si l’application
              devait un jour s’arrêter, elle s’arrêterait pour tout le monde — vous seriez
              prévenu et vous repartiriez avec vos données.
            </p>
          </Encart>
        </section>

        <section>
          <Phase>À faire, dans cet ordre</Phase>
          <h2>Les six étapes</h2>
          <Etapes>
            <Etape titre="Se connecter une première fois">
              <p>
                Ouvrez <strong>nestync.app</strong> sur votre téléphone et connectez-vous
                avec votre compte Google.
              </p>
              <p>
                Se connecter ne vous donne accès à rien en soi : cela crée seulement votre
                identité. C’est l’étape suivante qui ouvre l’application.
              </p>
            </Etape>

            <Etape titre="Créer votre foyer">
              <p>
                L’application vous propose alors de nommer votre foyer et d’inviter vos
                proches. Vous pouvez sauter l’invitation : elle se fait très bien plus
                tard.
              </p>
              <p>
                Vous disposez aussitôt de trente jours d’essai — de quoi ne rien attendre
                pour commencer.
              </p>
            </Etape>

            <Etape titre="Prévenir que c’est fait">
              <p>
                Un simple message suffit, avec <strong>l’adresse e-mail exacte</strong>{' '}
                utilisée pour vous connecter. Votre foyer bascule alors en accès offert.
              </p>
              <p>
                Rien ne presse : en attendant, vous avez trente jours d’essai.
                L’application fonctionne déjà entièrement.
              </p>
            </Etape>

            <Etape titre="Vérifier que c’est bien en place">
              <p>
                Ouvrez <Chemin>Réglages › Abonnement</Chemin>. Vous devez lire :
              </p>
              <Ecran
                statut="Accès offert ✓"
                detail="Ton accès est offert, sans limite de durée et sans rien à payer."
              />
              <p>
                Si vous lisez encore « Période d’essai », c’est que l’étape 3 n’est pas
                encore traitée. Aucune urgence.
              </p>
            </Etape>

            <Etape titre="Installer l’application sur l’écran d’accueil">
              <p>Nestync s’installe comme une application, sans passer par un magasin.</p>
              <ul>
                <li>
                  <strong>iPhone</strong> : bouton Partager, puis « Sur l’écran d’accueil ».
                  iOS ne le propose jamais tout seul, il faut le faire à la main.
                </li>
                <li>
                  <strong>Android</strong> : une bannière d’installation apparaît d’elle-même.
                </li>
              </ul>
              <p>
                C’est la vraie façon de la tester : en plein écran, lancée depuis
                l’accueil, comme vous le feriez au quotidien.
              </p>
            </Etape>

            <Etape titre="Inviter les autres membres du foyer">
              <p>
                <Chemin>Mon foyer › Inviter</Chemin>. Nestync ne montre son intérêt qu’à
                plusieurs : la liste de courses que l’autre coche, l’agenda partagé, le
                budget commun.
              </p>
              <Encart ton="attention" etiquette="L’adresse doit être exacte">
                <p>
                  L’invitation n’est acceptable que par l’adresse précise à laquelle elle
                  a été envoyée. Une variante ne fonctionnera pas.
                </p>
              </Encart>
            </Etape>
          </Etapes>
        </section>

        <section>
          <Phase>Facultatif</Phase>
          <h2>Brancher votre Google Agenda</h2>
          <p>
            Depuis <Chemin>Agenda</Chemin>, vous pouvez rattacher vos calendriers Google
            et choisir lesquels partager avec le foyer. Google affichera son propre écran
            d’autorisation — c’est normal, c’est une demande distincte de votre connexion.
          </p>
          <p>
            Vous n’êtes pas obligé : tout le reste de l’application fonctionne sans.
          </p>
        </section>

        <section>
          <Phase>Ce qui aide le plus</Phase>
          <h2>Vos retours</h2>
          <p>Utilisez-la normalement, pendant deux ou trois semaines. Ce qui intéresse :</p>
          <ul>
            <li>
              Ce que vous n’avez <strong>pas compris</strong> du premier coup — c’est le
              retour le plus précieux, et il ne se donne qu’une fois : dans un mois, vous
              aurez pris l’habitude.
            </li>
            <li>
              Ce qui vous a fait <strong>abandonner</strong> une action en cours.
            </li>
            <li>
              Ce qui <strong>manque</strong> pour remplacer ce que vous utilisez aujourd’hui.
            </li>
            <li>
              Tout ce qui s’affiche mal <strong>sur votre téléphone</strong> — modèle et
              navigateur aident beaucoup.
            </li>
          </ul>
          <p>
            Pour signaler quelque chose : la page <Chemin>Aide et contact</Chemin>,
            accessible même déconnecté. Ou directement par message, comme vous préférez.
          </p>
        </section>

        <section>
          <Phase>Vos droits</Phase>
          <h2>Vos données vous appartiennent</h2>
          <p>
            Dans <Chemin>Mon compte</Chemin>, à tout moment et sans rien demander à
            personne :
          </p>
          <ul>
            <li>
              <strong>Exporter</strong> l’intégralité des données de votre foyer, dans une
              archive qui contient aussi vos fichiers.
            </li>
            <li>
              <strong>Supprimer</strong> votre compte et votre foyer, définitivement.
            </li>
          </ul>
          <p>
            Les documents que vous déposez sont chiffrés : l’hébergeur ne peut ni les lire,
            ni même connaître leur nom.
          </p>
        </section>

        <p className="doc-maj">
          Merci — tester un produit qui n’est pas encore fini demande de la patience, et
          c’est ce qui le rend meilleur.
        </p>
      </div>
    </CadreSite>
  );
}
