import ResumeComptes from '@/components/ResumeComptes';
import SaisieTransaction from '@/components/budget/SaisieTransaction';
import SectionDocuments from '@/components/documents/SectionDocuments';
import SemaineAgenda from '@/components/agenda/SemaineAgenda';
import CoursesSemaine from '@/components/CoursesSemaine';
import SplashAccueil from '@/components/accueil/SplashAccueil';
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
 * TABLEAU DE BORD DU FOYER — `/foyer`, la racine de l'application.
 *
 * ⚠ Déplacé de `/` vers `/foyer` le 25/08/2026. Le site vitrine et
 * l'application se partageaient la racine, ce qui obligeait chaque page à
 * savoir laquelle des deux elle servait. Elles vivent désormais sur des
 * chemins distincts.
 *
 * Tableau de bord du foyer : résumé des comptes, actions rapides,
 * agenda de la semaine (tous agendas) et courses. Les modules sont accessibles
 * via le menu (coin haut-droite). Server component ; les parties interactives
 * sont des îlots client.
 */
export const dynamic = 'force-dynamic';

export default async function TableauDeBord() {
  /*
   * ⚠ ROUTE PROTÉGÉE PAR LE MIDDLEWARE : arriver ici suppose déjà une session.
   * L'arbitrage « vitrine ou tableau de bord » qui vivait sur `/` a disparu —
   * c'est tout l'objet du déplacement : le site et l'application ne partagent
   * plus d'adresse, donc plus de branche à maintenir.
   */
  const session = await auth();
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
