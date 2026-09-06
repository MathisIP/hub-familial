import Link from 'next/link';
import { notFound } from 'next/navigation';
import { foyerCourantOuBienvenue, utilisateurCourant } from '@/lib/foyer';
import { membreParId, nomAffiche, MODULES_VISIBILITE, roleDe } from '@/lib/membres';
import { modifierSurnomAction, modifierVisibiliteAction } from '../actions';
import { t, type CleUI } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Réglages du membre — Nestync' };

/** Libellé d'un module dans la fiche membre (une entrée par module de MODULES_VISIBILITE). */
const LIBELLE_MODULE: Record<string, CleUI> = {
  todo: 'FOY_MODULE_TODO',
  cadeaux: 'FOY_MODULE_CADEAUX',
};

/**
 * Fiche de réglages d'UN membre du foyer : nom affiché + présence dans les
 * menus « Qui » module par module.
 *
 * ⚠ RÉSERVÉE AU PROPRIÉTAIRE, comme le reste de la gestion des membres
 * (inviter/retirer/renommer) — `modifierSurnomMembre`/`definirModulesMasques`
 * l'exigent déjà côté service, mais la page vérifie aussi pour renvoyer un
 * message clair plutôt qu'un formulaire qui échouerait silencieusement.
 *
 * ⚠ PENSÉE COMME LE POINT D'ENTRÉE DE TOUS LES RÉGLAGES PAR MEMBRE À VENIR
 * (06/09/2026) : la navigation « Membres → [Nom] → réglages » reste la même
 * quelle que soit la liste de réglages qu'elle affiche un jour.
 */
export default async function PageMembre({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [foyer, user, langue] = [
    await foyerCourantOuBienvenue(),
    await utilisateurCourant(),
    await langueCourante(),
  ];
  const proprio = (await roleDe(foyer.id, user.id)) === 'proprietaire';
  if (!proprio) notFound();

  const membre = await membreParId(foyer.id, id);
  if (!membre) notFound();

  const nom = nomAffiche(membre);

  return (
    <>
      <header className="entete">
        <div>
          <Link href="/foyer/membres" className="rc-lien">{t('FOY_RETOUR_MEMBRES', langue)}</Link>
          <h1>{nom}</h1>
          <p>{membre.email}</p>
        </div>
      </header>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('FOY_SURNOM_TITRE', langue)}</h2>
        <p className="compte-note">{t('FOY_SURNOM_NOTE', langue)}</p>
        <form action={modifierSurnomAction} className="foyer-inline">
          <input type="hidden" name="membreId" value={membre.membreId} />
          <input
            className="champ"
            name="surnom"
            defaultValue={membre.surnom}
            placeholder={t('FOY_SURNOM_PH', langue)}
            aria-label={t('FOY_SURNOM_TITRE', langue)}
          />
          <button className="bouton" type="submit">{t('FOY_ENREGISTRER', langue)}</button>
        </form>
      </section>

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('FOY_VISIBILITE_TITRE', langue)}</h2>
        <p className="compte-note">{t('FOY_VISIBILITE_NOTE', langue)}</p>
        <form action={modifierVisibiliteAction} className="fm-visibilite">
          <input type="hidden" name="membreId" value={membre.membreId} />
          {MODULES_VISIBILITE.map((mod) => (
            <label className="fm-visibilite-ligne" key={mod}>
              <input
                type="checkbox"
                name="visible"
                value={mod}
                defaultChecked={!membre.modulesMasques.includes(mod)}
              />
              {t(LIBELLE_MODULE[mod] ?? 'FOY_MODULE_TODO', langue)}
            </label>
          ))}
          <button className="bouton" type="submit">{t('FOY_ENREGISTRER', langue)}</button>
        </form>
      </section>
    </>
  );
}
