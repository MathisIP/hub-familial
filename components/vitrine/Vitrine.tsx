import Link from 'next/link';
import Image from 'next/image';
import Tarifs from '@/components/vitrine/Tarifs';
import DemoThemes from '@/components/vitrine/DemoThemes';
import { ESSAI_JOURS } from '@/lib/offres';

/**
 * VITRINE PUBLIQUE (nestync.app) — affichée à la racine pour un visiteur non
 * connecté ; les membres voient le tableau de bord à la même adresse.
 * Server component : aucun JS envoyé au navigateur hors du sélecteur de tarif.
 */

const MODULES = [
  { emoji: '💶', nom: 'Budget', texte: 'Comptes, dépenses par catégorie, échéances à venir. Les soldes se recalculent tout seuls.' },
  { emoji: '✅', nom: 'To-Do & Courses', texte: 'Les tâches du foyer et une liste de courses partagée, groupée par rayon.' },
  { emoji: '🍽️', nom: 'Repas', texte: 'Le menu de la semaine (entrée, plat, dessert) et vos recettes, quantités ajustées au nombre de convives.' },
  { emoji: '🎉', nom: 'Événements', texte: 'Anniversaires, réceptions : budget, invités et checklist au même endroit.' },
  { emoji: '🎁', nom: 'Cadeaux', texte: 'Vos idées par occasion, le budget prévu et ce qui est déjà offert.' },
  { emoji: '📅', nom: 'Agenda', texte: 'La semaine de toute la famille en un coup d’œil, synchronisée avec Google Agenda.' },
  { emoji: '🗂️', nom: 'Documents', texte: 'Bail, carnet de santé, assurances : rangés par dossier et totalement privés.' },
];

const ETAPES = [
  { n: '1', titre: 'Créez votre foyer', texte: 'Connexion avec Google, sans mot de passe à retenir. Votre foyer est prêt en quelques secondes.' },
  { n: '2', titre: 'Invitez vos proches', texte: 'Un lien à partager. Chacun retrouve les mêmes listes, le même budget, le même agenda.' },
  { n: '3', titre: 'Installez l’application', texte: 'Sur l’écran d’accueil de votre téléphone, comme une vraie app. Elle s’ouvre même sans réseau.' },
];

export default function Vitrine() {
  return (
    <div className="vitrine">
      {/* ---------------- En-tête ---------------- */}
      <header className="vt-nav">
        <span className="vt-marque">
          <Image src="/icon-192.png" alt="" width={34} height={34} className="vt-logo" priority />
          Nestync
        </span>
        <nav className="vt-nav-liens">
          <a href="#fonctions">Fonctionnalités</a>
          <a href="#apparence">Apparence</a>
          <a href="#tarifs">Tarifs</a>
          <Link href="/connexion" className="bouton bouton-primaire vt-nav-cta">Se connecter</Link>
        </nav>
      </header>

      {/* ---------------- Hero ---------------- */}
      <section className="vt-hero">
        <p className="vt-pastille">✨ Essai gratuit de {ESSAI_JOURS} jours — sans carte bancaire</p>
        <h1 className="vt-h1">
          Toute la vie du foyer,<br />au même endroit.
        </h1>
        <p className="vt-lede">
          Budget, courses, repas, agenda, documents… Nestync réunit ce qui est aujourd’hui
          éparpillé entre les carnets, les groupes de messages et les tableurs. Une seule
          application, partagée par toute la famille.
        </p>
        <div className="vt-hero-actions">
          <Link href="/connexion" className="bouton bouton-primaire vt-cta">Commencer gratuitement</Link>
          <a href="#fonctions" className="bouton vt-cta">Découvrir</a>
        </div>
        <p className="vt-hero-note">
          Fonctionne sur iPhone, Android et ordinateur · Données hébergées en Europe
        </p>

        {/* Second parcours, à égalité de visibilité : rejoindre un foyer existant. */}
        <p className="vt-rejoindre">
          Quelqu’un de ta famille utilise déjà Nestync ?{' '}
          <Link href="/rejoindre-foyer" className="vt-rejoindre-lien">
            Rejoindre son foyer →
          </Link>
        </p>
      </section>

      {/* ---------------- Problème → promesse ---------------- */}
      <section className="vt-bande">
        <div className="vt-bande-item">
          <strong>Fini les « c’est toi qui as la liste ? »</strong>
          <span>Tout le foyer voit la même chose, en temps réel.</span>
        </div>
        <div className="vt-bande-item">
          <strong>Fini les tableurs qui cassent</strong>
          <span>Une vraie application, pensée pour le téléphone.</span>
        </div>
        <div className="vt-bande-item">
          <strong>Fini l’éparpillement</strong>
          <span>Sept modules qui se parlent, au lieu de sept applis.</span>
        </div>
      </section>

      {/* ---------------- Modules ---------------- */}
      <section className="vt-section" id="fonctions">
        <h2 className="vt-h2">Sept modules, une seule application</h2>
        <p className="vt-sous">Chacun résout un vrai problème du quotidien. Ensemble, ils remplacent une dizaine d’outils.</p>
        <div className="vt-grille">
          {MODULES.map((m) => (
            <article className="vt-carte" key={m.nom}>
              <span className="vt-carte-ic" aria-hidden="true">{m.emoji}</span>
              <h3>{m.nom}</h3>
              <p>{m.texte}</p>
            </article>
          ))}
        </div>
      </section>

      {/* ---------------- Démo interactive des thèmes ---------------- */}
      <DemoThemes />

      {/* ---------------- Confiance / vie privée ---------------- */}
      <section className="vt-section vt-prive">
        <div className="vt-prive-txt">
          <h2 className="vt-h2">Vos documents importants méritent mieux qu’une clé USB</h2>
          <p>
            Un bail, un carnet de santé, un relevé : ce sont des documents intimes. Chez Nestync,
            ils sont stockés dans un espace <strong>privé</strong>, propre à votre foyer, sans
            aucun lien public — même si quelqu’un devinait une adresse, il n’y aurait rien à voir.
          </p>
          <ul className="vt-liste">
            <li>Hébergement dans l’<strong>Union européenne</strong> (RGPD)</li>
            <li>La connexion Google sert <strong>uniquement</strong> à vous identifier : aucun accès à vos fichiers ni à vos e-mails</li>
            <li>Aucun traceur publicitaire, aucune revente de données</li>
            <li><strong>Export</strong> complet et <strong>suppression</strong> définitive en un clic</li>
          </ul>
        </div>
        <div className="vt-prive-badge" aria-hidden="true">
          <span className="vt-cadenas">🔒</span>
          <span className="vt-prive-lbl">Privé par conception</span>
        </div>
      </section>

      {/* ---------------- Démarrage ---------------- */}
      <section className="vt-section">
        <h2 className="vt-h2">Commencer prend trois minutes</h2>
        <div className="vt-etapes">
          {ETAPES.map((e) => (
            <div className="vt-etape" key={e.n}>
              <span className="vt-etape-n">{e.n}</span>
              <h3>{e.titre}</h3>
              <p>{e.texte}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ---------------- Tarifs ---------------- */}
      <Tarifs />

      {/* ---------------- FAQ ---------------- */}
      <section className="vt-section">
        <h2 className="vt-h2">Questions fréquentes</h2>
        <div className="vt-faq">
          <details><summary>L’abonnement couvre-t-il toute la famille ?</summary>
            <p>Oui. Un abonnement = un foyer, avec autant de membres que vous voulez. Chacun se connecte avec son propre compte et partage les mêmes données.</p></details>
          <details><summary>Que se passe-t-il à la fin de l’essai ?</summary>
            <p>Rien n’est prélevé automatiquement : l’essai de {ESSAI_JOURS} jours ne demande pas de carte bancaire. À son terme, vous choisissez de vous abonner ou non. Vos données restent les vôtres, et exportables.</p></details>
          <details><summary>Puis-je résilier facilement ?</summary>
            <p>Oui, en ligne et en trois clics depuis « Mon abonnement », sans avoir à écrire à qui que ce soit. L’accès reste ouvert jusqu’à la fin de la période déjà payée.</p></details>
          <details><summary>Faut-il un compte Google ?</summary>
            <p>Pour l’instant, oui : c’est ce qui permet une connexion sans mot de passe. Nestync ne demande que votre identité — aucun accès à vos fichiers ou à vos e-mails.</p></details>
          <details><summary>Ça marche sans connexion ?</summary>
            <p>L’application s’ouvre et affiche les pages déjà consultées même hors réseau. La mise à jour des données reprend dès que la connexion revient.</p></details>
        </div>
      </section>

      {/* ---------------- Appel final ---------------- */}
      <section className="vt-final">
        <h2>Reprenez la main sur l’organisation du foyer</h2>
        <p>{ESSAI_JOURS} jours pour essayer, sans carte bancaire.</p>
        <Link href="/connexion" className="bouton bouton-primaire vt-cta">Créer mon foyer</Link>
      </section>

      {/* ---------------- Pied de page ---------------- */}
      <footer className="vt-pied">
        <div className="vt-pied-marque">
          <Image src="/icon-192.png" alt="" width={26} height={26} className="vt-logo" />
          <span>Nestync</span>
        </div>
        <nav className="vt-pied-liens">
          <Link href="/mentions-legales">Mentions légales</Link>
          <Link href="/conditions">Conditions générales</Link>
          <Link href="/confidentialite">Confidentialité</Link>
          <Link href="/rejoindre-foyer">Rejoindre un foyer</Link>
          <Link href="/connexion">Se connecter</Link>
        </nav>
        <p className="vt-pied-legal">© {new Date().getFullYear()} Nestync — L’organisation du foyer, en un seul endroit.</p>
      </footer>
    </div>
  );
}
