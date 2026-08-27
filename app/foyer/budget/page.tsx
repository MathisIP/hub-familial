import VueBudget from '@/components/budget/VueBudget';
import SelecteurMois from '@/components/budget/SelecteurMois';
import InitComptes from '@/components/budget/InitComptes';
import GestionComptes from '@/components/budget/GestionComptes';
import GestionEcheances from '@/components/budget/GestionEcheances';
import Historique from '@/components/budget/Historique';
import PartageComptes, { type MembrePartage } from '@/components/budget/PartageComptes';
import {
  chargerBudget,
  chargerComptesGestion,
  chargerPartageComptes,
  comptesExistants,
  type ComptePartage,
} from '@/lib/budget/service';
import { chargerFoyerMembres } from '@/lib/membres';
import { foyerCourant, utilisateurCourant } from '@/lib/foyer';
import { exigerAcces } from '@/lib/abonnement';
import { ConfigManquante } from '@/lib/config';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/**
 * Réglages de partage, pour le propriétaire seulement.
 *
 * Renvoie `null` (au lieu de propager) quand la personne n'est pas
 * propriétaire : ce n'est pas une erreur, juste une section qui ne la concerne
 * pas — la faire échouer ferait tomber toute la page Budget.
 */
async function chargerPartageSiProprietaire(): Promise<{
  comptes: ComptePartage[];
  membres: MembrePartage[];
} | null> {
  try {
    const [foyer, user] = await Promise.all([foyerCourant(), utilisateurCourant()]);
    const d = await chargerFoyerMembres(foyer.id, user.id);
    if (d.monRole !== 'proprietaire') return null;
    return {
      comptes: await chargerPartageComptes(),
      membres: d.membres.map((m) => ({ utilisateurId: m.utilisateurId, nom: m.nom || m.email })),
    };
  } catch {
    return null;
  }
}

/** Rendu à chaque requête : le tableau de bord reflète l'état courant de la base. */
export const dynamic = 'force-dynamic';

export const metadata = { title: 'Budget — Nestync' };

export default async function PageBudget({
  searchParams,
}: {
  searchParams: Promise<{ annee?: string; mois?: string }>;
}) {
  await exigerAcces();
  const langue = await langueCourante();
  const sp = await searchParams;
  const annee = Number(sp.annee);
  const mois = Number(sp.mois);
  const selection =
    Number.isFinite(annee) && Number.isFinite(mois) && mois >= 1 && mois <= 12
      ? { annee, mois }
      : undefined;

  let contenu;
  try {
    // Aucun compte déclaré : le tableau de bord n'aurait rien à calculer. On
    // propose l'initialisation plutôt qu'un écran vide et incompréhensible.
    if ((await comptesExistants()) === 0) {
      contenu = <InitComptes />;
    } else {
      // En parallèle : les deux lisent les mêmes tables, les enchaîner doublerait
      // l'attente pour rien (cf. section « Performance » de CLAUDE.md).
      // `partage` n'est chargé que pour le propriétaire — pour les autres, la
      // requête serait refusée et la section n'a pas lieu d'être.
      const [d, comptes, partage] = await Promise.all([
        chargerBudget(selection),
        chargerComptesGestion(),
        chargerPartageSiProprietaire(),
      ]);
      contenu = (
        <>
          <SelecteurMois selection={d.selection} annees={d.anneesDisponibles} />
          <VueBudget d={d} langue={langue} />
          {/*
            ⚠ CES TROIS SECTIONS SONT REGROUPÉES POUR LES GRANDS ÉCRANS. Elles
            étaient restées hors du système de grille posé le 25/08/2026 :
            chacune plafonnait à 44 rem et s'empilait dans une colonne étroite,
            laissant les deux tiers de l'écran vides — exactement le défaut que
            ce système avait corrigé partout ailleurs. Le regroupement n'a aucun
            effet en dessous de 75 rem, où l'empilement reste le bon rendu.
          */}
          <div className="bg-gestion">
            <GestionComptes comptes={comptes} />
            {/* Les échéances ne proposent que les comptes VISIBLES : on ne peut
                pas rattacher une échéance à un compte qu'on ne voit pas. */}
            <GestionEcheances
              echeances={d.echeances}
              comptes={comptes.map((c) => ({ id: c.id, nom: c.nom }))}
            />
            {partage && <PartageComptes comptes={partage.comptes} membres={partage.membres} />}
          </div>
          <Historique selection={d.selection} periodeLibelle={d.periode} />
        </>
      );
    }
  } catch (e) {
    contenu =
      e instanceof ConfigManquante ? (
        <p className="message erreur">{e.message}</p>
      ) : (
        <p className="message erreur">{t('G_ERR_PAGE', langue)} {(e as Error).message}</p>
      );
  }

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('MOD_BUDGET', langue)}</h1>
          <p>{t('SUB_BUDGET', langue)}</p>
        </div>
      </header>
      {contenu}
    </>
  );
}
