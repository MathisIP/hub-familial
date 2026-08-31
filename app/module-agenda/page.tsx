import Link from 'next/link';
import Image from 'next/image';
import CadreSite from '@/components/vitrine-ds/CadreSite';
import ListeQuestions from '@/components/vitrine-ds/ListeQuestions';

export const metadata = {
  title: 'Agenda — Nestync',
  description:
    'Le module Agenda de Nestync : les calendriers de chaque membre du foyer réunis en un seul, en vue jour, semaine ou mois — sans jamais recopier de rendez-vous.',
};

/**
 * `/module-agenda` — page dédiée au module Agenda.
 *
 * ⚠ **CRÉÉE LE 29/08/2026**, même famille que `/module-documents`, `/tarifs` et
 * `/questions` : une page autonome pour un lien à donner sur une publication
 * externe, plutôt qu'une ancre qui ne fonctionne que depuis l'accueil.
 *
 * ⚠ **PAS `/agenda` : CE CHEMIN EST DÉJÀ PRIS**, pour la même raison que
 * `/module-documents` — voir sa note. `next.config.mjs` redirige en 308
 * permanent vers `/foyer/agenda`.
 *
 * ⚠ **CE QUE LE MODULE FAIT RÉELLEMENT, vérifié dans `lib/module-agenda/schema.ts`
 * avant d'écrire cette page** : trois vues (jour, semaine, mois —
 * `VUES_AGENDA`), une couleur par calendrier connecté. Chaque membre relie SON
 * Google Agenda ; Nestync ne crée pas de calendrier propre et ne stocke pas les
 * événements — il les lit et les affiche réunis.
 */
export default function PageAgenda() {
  return (
    <CadreSite
      surtitre="Le module Agenda"
      titre="Les calendriers du foyer, réunis en un seul."
      chapeau="Chacun garde son agenda Google. Nestync les affiche ensemble, une couleur par personne, sans jamais rien recopier à la main."
    >
      <div style={{ margin: '0 0 32px' }}>
        <Image
          src="/captures/chaux/module-agenda.webp?v=2"
          alt="Le module Agenda : la semaine du foyer, une couleur par personne"
          width={300}
          height={620}
          style={{ width: '100%', maxWidth: 320, height: 'auto', margin: '0 auto', display: 'block' }}
        />
      </div>

      <h2>Le vôtre, pas un nouveau</h2>
      {/*
        ⚠ LA PHRASE LA PLUS IMPORTANTE DE CETTE PAGE. Nestync ne demande PAS de
        recréer ses rendez-vous : il connecte le Google Agenda que la personne
        utilise déjà. C'est ce qui évite la double saisie — le vrai problème que
        « réunir les délais » doit résoudre.
      */}
      <p>
        Chaque membre du foyer connecte son propre Google Agenda, en quelques secondes. Nestync
        ne crée pas de calendrier séparé à tenir à jour en plus des autres : il lit ceux qui
        existent déjà et les réunit dans un seul écran, avec une couleur par personne pour
        savoir en un regard qui a quoi.
      </p>

      <h2>Trois façons de regarder la semaine</h2>
      <p>
        Vue jour pour ce qui arrive tout de suite, semaine pour organiser les prochains jours,
        mois pour repérer de loin une période chargée — un déménagement, une rentrée. La vue
        choisie est mémorisée : Nestync s’ouvre la fois suivante exactement là où vous l’avez
        laissé.
      </p>

      <h2>Créer un rendez-vous, depuis n’importe où</h2>
      <p>
        Un rendez-vous ajouté depuis Nestync part directement dans le vrai Google Agenda de la
        personne concernée — il apparaît aussi sur son téléphone, dans l’application Google
        qu’elle utilise déjà. Rien ne vit uniquement dans Nestync : ce que vous y voyez est ce
        qui existe réellement.
      </p>

      <h2>Ce que ce module ne fait pas</h2>
      <p>
        Agenda affiche des rendez-vous datés, il ne suit pas une échéance administrative (une
        cotisation, une facture à régler). Pour ce type de délai, c’est le module{' '}
        <Link href="/decouvrir">Budget</Link> qui s’en charge.
      </p>

      <h2>Questions fréquentes</h2>
      <ListeQuestions
        questions={[
          {
            q: 'Dois-je créer un nouveau calendrier pour utiliser Nestync ?',
            r: 'Non. Vous connectez votre Google Agenda existant — celui que vous utilisez déjà sur votre téléphone. Rien à recréer, rien à dupliquer.',
          },
          {
            q: 'Les autres membres du foyer voient-ils tous mes rendez-vous ?',
            r: 'Vous choisissez, calendrier par calendrier, ce qui est partagé avec le foyer au moment de le connecter.',
          },
          {
            q: 'Nestync a-t-il accès à l’ensemble de mon compte Google ?',
            r: 'Non. Le périmètre demandé est le plus étroit possible : le nom de vos calendriers, pour que vous choisissiez ceux à partager, puis les événements des seuls calendriers que vous avez sélectionnés. Rien d’autre — ni vos e-mails, ni vos fichiers, ni vos contacts.',
          },
        ]}
      />

      <p>
        <Link href="/connexion">Essayer gratuitement</Link> ·{' '}
        <Link href="/decouvrir">Découvrir Nestync</Link> ·{' '}
        <Link href="/questions">Toutes les questions</Link>
      </p>
    </CadreSite>
  );
}
