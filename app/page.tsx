import ResumeComptes from '@/components/ResumeComptes';
import SaisieTransaction from '@/components/budget/SaisieTransaction';
import SectionDocuments from '@/components/documents/SectionDocuments';
import SemaineAgenda from '@/components/agenda/SemaineAgenda';
import CoursesSemaine from '@/components/CoursesSemaine';
import SplashAccueil from '@/components/accueil/SplashAccueil';
import Vitrine from '@/components/vitrine/Vitrine';
import NomAffiche from '@/components/NomAffiche';
import { chargerAccueilBudget, type AccueilBudget } from '@/lib/budget/service';
import { exigerAcces } from '@/lib/abonnement';
import { auth } from '@/auth';
import { t, locale, type IdLangue } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/** Salutation selon l'heure (Europe/Paris) + date du jour + prénom, localisées. */
function contexteAccueil(nomComplet: string, langue: IdLangue) {
  const loc = locale(langue);
  const fmt = (opts: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(loc, { timeZone: 'Europe/Paris', ...opts }).format(new Date());
  const heure = Number(
    new Intl.DateTimeFormat('fr-FR', { timeZone: 'Europe/Paris', hour: 'numeric', hour12: false }).format(new Date()),
  );
  const salut = t(heure >= 18 || heure < 5 ? 'ACC_BONSOIR' : 'ACC_BONJOUR', langue);
  const prenom = nomComplet.trim().split(/\s+/)[0] || t('ACC_MAISON', langue);
  const date = fmt({ weekday: 'long', day: 'numeric', month: 'long' });
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
  // `/` est publique (cf. middleware) : un visiteur non connecté voit la VITRINE,
  // un membre son tableau de bord. Échappatoire dev identique à `auth.ts`.
  const session = await auth();
  const devOuvert = process.env.NODE_ENV !== 'production' && !process.env.AUTH_GOOGLE_ID;
  if (!session?.user && !devOuvert) return <Vitrine />;

  await exigerAcces();
  const [accueil, langue] = await Promise.all([
    chargerAccueilBudget().catch(() => null as AccueilBudget | null),
    langueCourante(),
  ]);
  const { salut, prenom, date } = contexteAccueil(session?.user?.name ?? '', langue);

  return (
    <SplashAccueil>
      <section className="hero-accueil" aria-label="Bienvenue">
        <p className="hero-date">{date}</p>
        <h1 className="hero-h1">{salut},<br /><NomAffiche defaut={prenom} /></h1>
        <p className="hero-sub">{t('ACC_SOUS', langue)}</p>
      </section>

      <div className="grille-accueil">
        <ResumeComptes soldes={accueil?.soldesHorsEpargne ?? []} langue={langue}>
          <SaisieTransaction params={accueil?.parametres} />
        </ResumeComptes>

        <SemaineAgenda />

        <CoursesSemaine />

        <SectionDocuments />
      </div>
    </SplashAccueil>
  );
}
