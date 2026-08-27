import type { Metadata } from 'next';
import Link from 'next/link';
import { t } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/**
 * PAGE 404 — adresse inconnue.
 *
 * ⚠ CE FICHIER N'EXISTAIT PAS, et son absence se voyait. Next servait sa page
 * par défaut : « This page could not be found », **en anglais**, avec ses propres
 * styles en ligne — donc un fond blanc quel que soit le thème. Le tout rendu à
 * l'intérieur du gabarit de l'application, si bien que le rail de navigation
 * flottait sur une page qui n'était visiblement pas la nôtre. On y lisait un
 * plantage, là où il n'y a qu'une adresse mal tapée.
 *
 * ⚠ PLEIN ÉCRAN, ET C'EST CE QUI RÈGLE LE RAIL. `not-found.tsx` est rendu DANS
 * le gabarit racine : la barre de navigation s'affiche donc autour, et aucune
 * liste de chemins ne peut l'en empêcher — un 404 n'a pas d'adresse propre à
 * exclure, il prend celle qu'on a tapée. Une couche `fixed` couvrant l'écran
 * résout le problème par construction plutôt que par énumération. Rien n'est
 * perdu : il n'y a rien d'autre sur cette page, et le lien de retour suffit.
 *
 * ⚠ EN CHAUX, SANS SUIVRE LE THÈME DE L'APPLICATION. Même choix que `CadreSite`
 * pour les pages publiques : celles qu'on lit une fois restent claires. Un 404
 * s'adresse aussi bien à un visiteur qu'à un membre, et n'appartient à aucun des
 * deux intérieurs.
 *
 * ⚠ Le lien de sortie pointe vers `/`, qui sert la vitrine à un visiteur et
 * redirige un membre vers son foyer. Une seule sortie, juste dans les deux cas.
 */
export const metadata: Metadata = { title: 'Page introuvable — Nestync' };

export default async function Introuvable() {
  const langue = await langueCourante();
  return (
    <div className="err404">
      <p className="err404-code" aria-hidden="true">
        404
      </p>
      <h1 className="err404-titre">{t('NF_TITRE', langue)}</h1>
      <p className="err404-txt">{t('NF_TXT', langue)}</p>
      <Link className="err404-lien" href="/">
        {t('NF_ACCUEIL', langue)}
      </Link>
    </div>
  );
}
