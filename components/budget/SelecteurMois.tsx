'use client';

import { useRouter } from 'next/navigation';
import { MOIS_FR, type SelectionMois } from '@/lib/budget/schema';

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
      <button className="mois-fleche" onClick={() => decaler(-1)} disabled={premierMois} aria-label="Mois précédent">
        ‹
      </button>

      <select
        className="champ"
        value={selection.mois}
        onChange={(e) => aller(selection.annee, Number(e.target.value))}
        aria-label="Mois"
      >
        {MOIS_FR.map((nom, i) => (
          <option key={nom} value={i + 1}>{nom}</option>
        ))}
      </select>

      <select
        className="champ"
        value={selection.annee}
        onChange={(e) => aller(Number(e.target.value), selection.mois)}
        aria-label="Année"
      >
        {annees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <button className="mois-fleche" onClick={() => decaler(1)} disabled={dernierMois} aria-label="Mois suivant">
        ›
      </button>
    </div>
  );
}
