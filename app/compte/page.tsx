import Link from 'next/link';
import LienAccueil from '@/components/LienAccueil';
import ZoneSuppression from '@/components/compte/ZoneSuppression';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon compte — Hub familial' };

/**
 * Page « Mon compte » : droits RGPD de la personne — export (portabilité) et
 * suppression (effacement). Protégée par le middleware (session requise).
 */
export default function PageCompte() {
  return (
    <>
      <LienAccueil />
      <header className="entete">
        <div>
          <h1>Mon compte</h1>
          <p>Tes données et ta confidentialité</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">Exporter mes données</h2>
        <p className="compte-note">
          Télécharge l’intégralité des données de ton foyer (comptes et transactions, tâches et
          courses, recettes, cadeaux, événements…) dans un fichier JSON. C’est ton droit à la
          portabilité.
        </p>
        <a className="bouton bouton-action" href="/api/compte/export">⬇ Exporter mes données (JSON)</a>
      </section>

      <section className="compte-bloc compte-danger">
        <h2 className="bloc-titre">Supprimer mon compte</h2>
        <p className="compte-note">
          Efface <b>définitivement</b> ton compte et <b>toutes</b> les données de ton foyer. Cette
          action est irréversible (droit à l’effacement). Pense à <b>exporter tes données</b> avant si
          tu veux en garder une copie.
        </p>
        <ZoneSuppression />
      </section>

      <p className="compte-lien-conf">
        <Link href="/confidentialite">Politique de confidentialité →</Link>
      </p>
    </>
  );
}
