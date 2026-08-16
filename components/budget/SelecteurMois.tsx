'use client';

import { useRouter } from 'next/navigation';
import Liste from '@/components/Liste';
import { useT, useLangue } from '@/components/I18nProvider';
import { locale } from '@/lib/i18n';
import { type SelectionMois } from '@/lib/budget/schema';

/**
 * Sélecteur de mois du Budget. Le mois n'est plus un état partagé du classeur :
 * c'est un simple filtre d'affichage, porté par l'URL (`/budget?annee=&mois=`).
 * Changer de mois navigue → la page serveur recalcule le dashboard pour ce mois.
 */
export default function SelecteurMois({
  selection,
  annees,
}: {
  selection: SelectionMois;
  annees: number[];
}) {
  const router = useRouter();
  const tr = useT();
  const langue = useLangue();
  const fmtMois = new Intl.DateTimeFormat(locale(langue), { month: 'long' });
  const moisNoms = Array.from({ length: 12 }, (_, i) => fmtMois.format(new Date(2000, i, 1)));

  function aller(annee: number, mois: number) {
    router.push(`/budget?annee=${annee}&mois=${mois}`);
  }

  function decaler(sens: -1 | 1) {
    let m = selection.mois + sens;
    let a = selection.annee;
    if (m < 1) { m = 12; a -= 1; }
    else if (m > 12) { m = 1; a += 1; }
    if (!annees.includes(a)) return; // hors plage : on ne fait rien
    aller(a, m);
  }

  const premierMois = selection.annee === annees[0] && selection.mois === 1;
  const dernierMois =
    selection.annee === annees[annees.length - 1] && selection.mois === 12;

  return (
    <div className="mois-selecteur">
      <button className="mois-fleche" onClick={() => decaler(-1)} disabled={premierMois} aria-label={tr('MOIS_PRECEDENT')}>
        ‹
      </button>

      <Liste
        valeur={String(selection.mois)}
        onChange={(v) => aller(selection.annee, Number(v))}
        options={moisNoms.map((nom, i) => ({ valeur: String(i + 1), libelle: nom }))}
        ariaLabel={tr('A_MOIS')}
        className="sm-mois"
      />

      <Liste
        valeur={String(selection.annee)}
        onChange={(v) => aller(Number(v), selection.mois)}
        options={annees.map((a) => ({ valeur: String(a), libelle: String(a) }))}
        ariaLabel={tr('A_ANNEE')}
      />

      <button className="mois-fleche" onClick={() => decaler(1)} disabled={dernierMois} aria-label={tr('MOIS_SUIVANT')}>
        ›
      </button>
    </div>
  );
}
