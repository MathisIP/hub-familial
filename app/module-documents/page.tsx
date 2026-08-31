import Link from 'next/link';
import Image from 'next/image';
import CadreSite from '@/components/vitrine-ds/CadreSite';
import ListeQuestions from '@/components/vitrine-ds/ListeQuestions';

export const metadata = {
  title: 'Documents — Nestync',
  description:
    'Le module Documents de Nestync : les papiers du foyer rangés par dossier, chiffrés avant d’être stockés — bail, assurances, carnets de santé, attestations.',
};

/**
 * `/module-documents` — page dédiée au module Documents.
 *
 * ⚠ **CRÉÉE LE 29/08/2026**, à la demande d'un lien à donner sur une publication
 * externe consacrée à l'organisation des papiers du foyer. Même famille que
 * `/tarifs` et `/questions` : une page autonome plutôt qu'une ancre qui ne
 * fonctionne que depuis l'accueil.
 *
 * ⚠ **PAS `/documents` : CE CHEMIN EST DÉJÀ PRIS.** `next.config.mjs` y redirige
 * en 308 (permanent) vers `/foyer/documents`, depuis le déménagement de
 * l'application du 25/08/2026 — favoris, historique, PWA déjà installées en
 * dépendent. Le commentaire de ce fichier dit explicitement de ne pas réutiliser
 * ces chemins. D'où `/module-documents` : moins élégant, mais ça ne casse rien
 * de permanent pour gagner un nom plus court.
 *
 * ⚠ **CE MODULE NE SUIT AUCUNE ÉCHÉANCE.** Vérifié dans `lib/module-documents/schema.ts`
 * avant d'écrire cette page : aucun champ de date, aucun rappel. Il range et
 * chiffre, un point c'est tout. Le suivi des délais (échéances à venir) vit
 * dans le module Budget (`lib/db/schema.ts`, table `echeances`). Ne pas prêter
 * à Documents une fonction qu'il n'a pas — c'est exactement le genre d'écart
 * qu'une publication externe rendrait public sans qu'on puisse le corriger.
 */
export default function PageDocuments() {
  return (
    <CadreSite
      surtitre="Le module Documents"
      titre="Les papiers du foyer, rangés et protégés."
      chapeau="Un bail, un carnet de santé, une attestation : déposés une fois, retrouvés en un geste, et illisibles pour quiconque n’est pas du foyer — y compris l’hébergeur."
    >
      <div style={{ margin: '0 0 32px' }}>
        <Image
          src="/captures/chaux/module-documents.webp?v=2"
          alt="Le module Documents : des fichiers rangés par dossier"
          width={300}
          height={620}
          style={{ width: '100%', maxWidth: 320, height: 'auto', margin: '0 auto', display: 'block' }}
        />
      </div>

      <h2>Ranger sans réfléchir</h2>
      <p>
        Chaque document rejoint un dossier — un mot libre, comme « Assurances » ou « Santé
        Léa ». Pas d’arborescence à apprendre : un niveau de dossiers suffit à un foyer, et
        c’est ce que Nestync propose. Un fichier déposé sans choisir de dossier reste visible de
        tous, pour qu’un dépôt rapide n’atterrisse jamais par erreur dans un endroit restreint.
      </p>

      <h2>Chiffrés avant de quitter votre appareil</h2>
      {/*
        ⚠ CE PARAGRAPHE PORTE LA SEULE PROMESSE VÉRIFIABLE DU MODULE. Le
        contenu, le nom d'origine et le type du fichier sont chiffrés
        (AES-256-GCM) avant transmission — l'hébergeur (OVHcloud, Paris) ne
        connaît d'un document que sa taille. Ce n'est PAS du bout-en-bout : le
        serveur déchiffre pour servir le fichier au foyer qui le demande. Le dire
        clairement évite de laisser croire à une garantie plus forte que la
        réalité.
      */}
      <p>
        Un bail, une pièce d’identité, un carnet de santé : ce sont des documents qu’on ne veut
        montrer à personne d’autre que soi. Nestync chiffre le contenu, le nom d’origine et le
        type de chaque fichier avant de le transmettre à l’hébergeur — qui ne peut donc rien
        lire, ni deviner ce qu’il conserve. Ce n’est pas un chiffrement de bout en bout : nos
        serveurs déchiffrent pour vous servir le fichier quand vous le demandez. Mais
        l’hébergeur, lui, ne voit jamais rien.
      </p>

      <h2>Qui voit quoi</h2>
      <p>
        Un dossier peut être réservé à certains membres du foyer — utile pour les papiers d’un
        enfant majeur, ou les vôtres si le foyer est partagé avec des colocataires. Par défaut,
        tout ce qui est déposé reste visible de l’ensemble du foyer.
      </p>

      <h2>Ce que ce module ne fait pas</h2>
      {/*
        ⚠ SECTION AJOUTÉE VOLONTAIREMENT. Une publication sur « les délais » a
        motivé cette page : il faut donc dire tout de suite que ce n'est pas le
        rôle de Documents, avant que quelqu'un ne l'imagine et ne soit déçu au
        premier usage.
      */}
      <p>
        Documents range et protège vos fichiers — il ne surveille aucune date d’expiration ni
        échéance. Pour un rappel avant une date à ne pas manquer (une facture, une cotisation),
        c’est le module <Link href="/decouvrir">Budget</Link> qui s’en charge, avec ses propres
        échéances suivies.
      </p>

      <h2>Questions fréquentes</h2>
      <ListeQuestions
        questions={[
          {
            q: 'Quelle taille de fichier puis-je déposer ?',
            r: 'Jusqu’à 25 Mo par fichier. Depuis un téléphone, une photo trop lourde est réduite automatiquement avant l’envoi, et Nestync vous le signale.',
          },
          {
            q: 'Puis-je organiser mes documents en sous-dossiers ?',
            r: 'Non, volontairement : un seul niveau de rangement, comme pour les rayons de la liste de courses. C’est suffisant pour un foyer, et ça évite de perdre un fichier dans une arborescence à cinq niveaux.',
          },
          {
            q: 'Que se passe-t-il si je résilie mon abonnement ?',
            r: 'Vos documents restent accessibles jusqu’au terme de la période payée, puis l’accès se ferme sans suppression : un export complet reste possible pendant le délai prévu par les conditions générales.',
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
