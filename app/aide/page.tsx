import Link from 'next/link';
import { auth } from '@/auth';
import FormulaireContact from '@/components/aide/FormulaireContact';

export const metadata = {
  title: 'Aide et contact — Nestync',
  description: 'Questions fréquentes sur Nestync et formulaire de contact.',
};

/**
 * AIDE ET CONTACT — page **PUBLIQUE** (cf. middleware).
 *
 * ⚠ Publique à dessein : quelqu'un qui n'arrive pas à se connecter, ou qui n'a
 * pas encore de compte, est précisément celui qui a besoin d'écrire. Une page
 * d'aide derrière un mur d'authentification ne sert que ceux qui n'en ont pas
 * besoin.
 *
 * Elle honore aussi une promesse : les mentions légales et la politique de
 * confidentialité publient une adresse de contact et un délai de réponse de
 * 30 jours pour les demandes relatives aux données. Le formulaire enregistre
 * chaque message en base — un courriel égaré ne fait plus courir le délai en
 * silence.
 */
export const dynamic = 'force-dynamic';

const QUESTIONS: { q: string; r: React.ReactNode }[] = [
  {
    q: 'Comment rejoindre le foyer de mon conjoint ou de ma famille ?',
    r: (
      <>
        Deux chemins. Si on t’a envoyé un <strong>lien d’invitation</strong>, ouvre-le
        et connecte-toi : tu rejoins le foyer directement. Sinon, va sur{' '}
        <Link href="/rejoindre-foyer">Rejoindre un foyer</Link> et indique l’adresse
        e-mail de la personne qui gère le foyer — elle recevra ta demande et pourra
        l’accepter. Dans les deux cas, tu dois te connecter avec la <em>même</em>{' '}
        adresse que celle à laquelle l’invitation a été envoyée.
      </>
    ),
  },
  {
    q: 'Qui peut voir mes données ?',
    r: (
      <>
        Les <strong>membres de ton foyer</strong>, et personne d’autre. Chaque donnée
        est rattachée à un foyer et filtrée à chaque requête : aucune information
        d’un foyer ne peut apparaître chez un autre. Tes documents vont plus loin —
        leur contenu est <strong>chiffré</strong> avant d’être stocké, et leur nom
        n’est jamais transmis à l’hébergeur.
      </>
    ),
  },
  {
    q: 'Où sont hébergées mes données ?',
    r: (
      <>
        <strong>En Europe.</strong> La base de données est à Francfort, les
        traitements s’exécutent en Allemagne, et tes documents sont stockés{' '}
        <strong>en France</strong>, chez un hébergeur certifié pour les données de
        santé. Le détail figure dans la{' '}
        <Link href="/confidentialite">politique de confidentialité</Link>.
      </>
    ),
  },
  {
    q: 'Comment récupérer ou supprimer mes données ?',
    r: (
      <>
        Depuis <strong>Mon compte</strong>, sans nous écrire : « Exporter mes
        données » te renvoie un fichier complet, « Supprimer mon compte » efface
        définitivement ton foyer et tout ce qu’il contient. Si tu as été abonné, les
        factures déjà émises sont conservées 10 ans, comme la loi comptable l’exige.
      </>
    ),
  },
  {
    q: 'Nestync peut-il lire mon Google Agenda ?',
    r: (
      <>
        Uniquement les calendriers <strong>que tu choisis</strong>, et seulement si
        tu connectes ton agenda — c’est facultatif. Nous demandons le minimum : lire
        le <em>nom</em> de tes calendriers pour te les proposer, puis lire et écrire
        les événements de ceux que tu as sélectionnés. Ni tes e-mails, ni tes
        fichiers. Tu peux retirer cet accès à tout moment depuis la page Agenda.
      </>
    ),
  },
  {
    q: 'Comment résilier mon abonnement ?',
    r: (
      <>
        Depuis la page <strong>Abonnement</strong>, bouton « Résilier mon
        abonnement » : trois clics, sans avoir à écrire à qui que ce soit. Ton accès
        reste ouvert jusqu’à la fin de la période déjà payée, et tu peux reprendre
        ton abonnement avant cette date sans rien repayer.
      </>
    ),
  },
  {
    q: 'J’ai perdu l’accès à mon compte Google',
    r: (
      <>
        La connexion à Nestync passe par Google : il faut donc d’abord récupérer ton
        compte Google. Si tu as changé d’adresse, écris-nous ci-dessous depuis la
        nouvelle — un autre membre de ton foyer pourra t’y réinviter.
      </>
    ),
  },
  {
    q: 'Comment installer Nestync sur mon téléphone ?',
    r: (
      <>
        Sur <strong>Android</strong>, ton navigateur te propose l’installation
        automatiquement. Sur <strong>iPhone</strong>, ouvre le site dans Safari,
        touche le bouton Partager puis « Sur l’écran d’accueil ». L’application
        s’ouvre alors en plein écran, comme une application installée.
      </>
    ),
  },
];

export default async function PageAide() {
  const session = await auth();

  return (
    <article className="doc-legal aide">
      <Link className="lien-retour" href="/">← Retour</Link>
      <h1>Aide et contact</h1>
      <p className="doc-maj">
        Une question ? La réponse est peut-être ci-dessous. Sinon, écris-nous — on
        lit tout.
      </p>

      <h2>Questions fréquentes</h2>
      <div className="aide-faq">
        {QUESTIONS.map((item) => (
          <details className="aide-item" key={item.q}>
            <summary>{item.q}</summary>
            <div className="aide-reponse">{item.r}</div>
          </details>
        ))}
      </div>

      <h2>Nous écrire</h2>
      <p>
        Réponse en général sous quelques jours, et au plus tard sous 30 jours pour
        une demande concernant tes données personnelles. Tu peux aussi écrire
        directement à <a href="mailto:contact@nestync.app">contact@nestync.app</a>.
      </p>
      <FormulaireContact
        defautEmail={session?.user?.email ?? ''}
        defautNom={session?.user?.name ?? ''}
      />

      <h2>Autres pages utiles</h2>
      <ul>
        <li><Link href="/confidentialite">Politique de confidentialité</Link> — ce que nous faisons de tes données</li>
        <li><Link href="/conditions">Conditions générales</Link> — abonnement, rétractation, résiliation</li>
        <li><Link href="/mentions-legales">Mentions légales</Link> — qui édite le service</li>
      </ul>
    </article>
  );
}
