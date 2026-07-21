import Link from 'next/link';
import SelecteurTheme from '@/components/SelecteurTheme';
import ResumeComptes from '@/components/ResumeComptes';
import SaisieTransaction from '@/components/budget/SaisieTransaction';
import ImportDrive from '@/components/ImportDrive';
import CoursesSemaine from '@/components/CoursesSemaine';
import { chargerAccueilBudget, type AccueilBudget } from '@/lib/budget/service';
import { signOut } from '@/auth';
import { t } from '@/lib/i18n';

/**
 * Accueil : résumé des comptes (hors épargne), actions rapides (ajouter une
 * opération, importer des documents, courses de la semaine) et portail des 5
 * modules. Server component ; les actions interactives sont des îlots client.
 */
export const dynamic = 'force-dynamic';

const MODULES = [
  { cle: 'MOD_BUDGET', note: 'Comptes, dépenses, épargne', href: '/budget' },
  { cle: 'MOD_TODO', note: 'Tâches du foyer et liste de courses', href: '/todo' },
  { cle: 'MOD_REPAS', note: 'Planning des dîners et recettes', href: '/repas' },
  { cle: 'MOD_EVENEMENTS', note: 'Réceptions, invités, logistique', href: '/evenements' },
  { cle: 'MOD_CADEAUX', note: 'Idées, budget, suivi des cadeaux', href: '/cadeaux' },
  { cle: 'MOD_AGENDA', note: 'Agenda familial partagé', href: '/agenda' },
] as const;

export default async function Accueil() {
  let accueil: AccueilBudget | null = null;
  try {
    accueil = await chargerAccueilBudget();
  } catch {
    accueil = null; // budget indisponible : l'accueil reste utilisable pour le reste
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('APP_TITRE')}</h1>
          <p>{t('APP_SOUS_TITRE')}</p>
        </div>
        <div className="entete-actions">
          <SelecteurTheme />
          <form
            action={async () => {
              'use server';
              await signOut({ redirectTo: '/connexion' });
            }}
          >
            <button type="submit" className="bouton discret bouton-deconnexion">Se déconnecter</button>
          </form>
        </div>
      </header>

      {accueil ? (
        <ResumeComptes soldes={accueil.soldesHorsEpargne} />
      ) : (
        <p className="message erreur comptes-indispo">
          Comptes momentanément indisponibles (données Budget non chargées).
        </p>
      )}

      <div className="actions-rapides">
        {/* Toujours affiché : si les listes ne sont pas prêtes, la modale les charge à l'ouverture. */}
        <SaisieTransaction params={accueil?.parametres} />
        <ImportDrive url={process.env.DRIVE_A_CLASSER_URL} />
      </div>

      <h2 className="bloc-titre">Les modules</h2>
      <ul className="modules">
        {MODULES.map((m) => (
          <li key={m.cle} className="module">
            <Link href={m.href} className="module-lien">
              <span className="titre">{t(m.cle)}</span>
              <span className="note">{m.note}</span>
            </Link>
          </li>
        ))}
      </ul>

      <CoursesSemaine />
    </>
  );
}
