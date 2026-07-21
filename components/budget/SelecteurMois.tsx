'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { MOIS_FR, type SelectionMois } from '@/lib/budget/schema';

/**
 * Sélecteur de mois du Budget. Écrit les cellules moteur (via PATCH /api/budget)
 * puis `router.refresh()` recharge le dashboard recalculé par le tableur.
 *
 * ⚠ Change un état PARTAGÉ : sélectionner un mois ici le change pour tout le
 * classeur (comme le sélecteur natif du Sheet).
 */
export default function SelecteurMois({
  selection,
  annees,
}: {
  selection: SelectionMois;
  annees: number[];
}) {
  const router = useRouter();
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);

  async function appliquer(annee: number, mois: number) {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch('/api/budget', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annee, mois }),
      });
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Changement refusé.');
      router.refresh();
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  /** Décale de ±1 mois, avec passage d'année. */
  function decaler(sens: -1 | 1) {
    let m = selection.mois + sens;
    let a = selection.annee;
    if (m < 1) { m = 12; a -= 1; }
    else if (m > 12) { m = 1; a += 1; }
    if (!annees.includes(a)) return; // hors plage : on ne fait rien
    appliquer(a, m);
  }

  const premierMois = selection.annee === annees[0] && selection.mois === 1;
  const dernierMois =
    selection.annee === annees[annees.length - 1] && selection.mois === 12;

  return (
    <div className="mois-selecteur">
      <button
        className="mois-fleche"
        onClick={() => decaler(-1)}
        disabled={occupe || premierMois}
        aria-label="Mois précédent"
      >
        ‹
      </button>

      <select
        className="champ"
        value={selection.mois}
        disabled={occupe}
        onChange={(e) => appliquer(selection.annee, Number(e.target.value))}
        aria-label="Mois"
      >
        {MOIS_FR.map((nom, i) => (
          <option key={nom} value={i + 1}>{nom}</option>
        ))}
      </select>

      <select
        className="champ"
        value={selection.annee}
        disabled={occupe}
        onChange={(e) => appliquer(Number(e.target.value), selection.mois)}
        aria-label="Année"
      >
        {annees.map((a) => (
          <option key={a} value={a}>{a}</option>
        ))}
      </select>

      <button
        className="mois-fleche"
        onClick={() => decaler(1)}
        disabled={occupe || dernierMois}
        aria-label="Mois suivant"
      >
        ›
      </button>

      {occupe && <span className="mois-etat">…</span>}
      {erreur && <span className="message erreur">{erreur}</span>}
    </div>
  );
}
