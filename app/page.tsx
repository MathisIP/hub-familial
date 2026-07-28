import MenuPrincipal from '@/components/MenuPrincipal';
import ResumeComptes from '@/components/ResumeComptes';
import SaisieTransaction from '@/components/budget/SaisieTransaction';
import DriveExplorer from '@/components/DriveExplorer';
import SemaineAgenda from '@/components/agenda/SemaineAgenda';
import CoursesSemaine from '@/components/CoursesSemaine';
import { chargerAccueilBudget, type AccueilBudget } from '@/lib/budget/service';
import { exigerAcces } from '@/lib/abonnement';
import { auth } from '@/auth';
import { t } from '@/lib/i18n';

/** Salutation selon l'heure (Europe/Paris) + date du jour + prénom. */
function contexteAccueil(nomComplet: string) {
  const paris = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', ...opts }).format(new Date());
  const heure = Number(paris({ hour: 'numeric', hour12: false }));
  const salut = heure >= 18 || heure < 5 ? 'Bonsoir' : 'Bonjour';
  const prenom = nomComplet.trim().split(/\s+/)[0] || 'à la maison';
  const date = paris({ weekday: 'long', day: 'numeric', month: 'long' });
  return { salut, prenom, date };
}

/**
 * Accueil = tableau de bord du foyer : résumé des comptes, actions rapides,
 * agenda de la semaine (tous agendas) et courses. Les modules sont accessibles
 * via le menu (coin haut-droite). Server component ; les parties interactives
 * sont des îlots client.
 */
export const dynamic = 'force-dynamic';

export default async function Accueil() {
  await exigerAcces();
  const [session, accueil] = await Promise.all([
    auth(),
    chargerAccueilBudget().catch(() => null as AccueilBudget | null),
  ]);
  const { salut, prenom, date } = contexteAccueil(session?.user?.name ?? '');

  return (
    <>
      <header className="entete">
        <div className="brand">
          {/* Logo de l'app (icône « maison familiale »), pour la cohérence visuelle */}
          <img className="brand-logo" src="/icon-192.png" alt="" width={36} height={36} />
          <span className="brand-nom">{t('APP_TITRE').replace(/^🏡\s*/, '')}</span>
        </div>
        <MenuPrincipal />
      </header>

      <section className="hero-accueil" aria-label="Bienvenue">
        <p className="hero-date">{date}</p>
        <h1 className="hero-h1">{salut},<br /><em>{prenom}</em></h1>
        <p className="hero-sub">Votre foyer en un coup d’œil.</p>
      </section>

      <ResumeComptes soldes={accueil?.soldesHorsEpargne ?? []}>
        <SaisieTransaction params={accueil?.parametres} />
      </ResumeComptes>

      <SemaineAgenda />

      <CoursesSemaine />

      <DriveExplorer />
    </>
  );
}
