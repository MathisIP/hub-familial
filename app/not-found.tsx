import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/**
 * PAGE 404 — adresse inconnue.
 *
 * ⚠ CE FICHIER N'EXISTAIT PAS, et son absence se voyait. Next servait alors sa
 * page par défaut : « This page could not be found », **en anglais**, avec ses
 * propres styles en ligne — donc un fond blanc quel que soit le thème choisi.
 * Le tout rendu à l'intérieur du gabarit de l'application, si bien que le rail
 * de navigation flottait sur une page qui n'était visiblement pas la nôtre. On y
 * lisait un plantage, là où il n'y a qu'une adresse mal tapée.
 *
 * ⚠ ELLE DOIT SERVIR DEUX PUBLICS. Un membre connecté qui se trompe d'adresse
 * voit le rail autour — c'est cohérent, il est chez lui. Un visiteur non
 * connecté n'arrive ici que sur une route publique inexistante ; le lien
 * d'accueil est donc écrit en dur vers `/`, qui sert la vitrine à l'un et
 * redirige l'autre vers son foyer. Une seule sortie, juste dans les deux cas.
 *
 * ⚠ Pas de `dynamic = 'force-dynamic'` : cette page ne lit aucune donnée de
 * foyer. `langueCourante()` lit le cookie, ce qui suffit à la rendre dynamique
 * sans que rien d'autre ne soit calculé à chaque appel.
 */
export const metadata: Metadata = { title: 'Page introuvable — Nestync' };

export default async function Introuvable() {
  const langue = await langueCourante();
  return (
    <div className="connexion">
      <div className="connexion-carte">
        <div className="connexion-logo">🧭</div>
        <h1>{t('NF_TITRE', langue)}</h1>
        <p>{t('NF_TXT', langue)}</p>
        <Link className="bouton connexion-bouton" href="/">
          {t('NF_ACCUEIL', langue)}
        </Link>
      </div>
    </div>
  );
}
