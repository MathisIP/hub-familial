'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ESSAI_JOURS, INCLUS, OFFRES, formatPrix } from '@/lib/offres';

/**
 * Bloc tarifs de la vitrine : bascule mensuel ↔ annuel. Un seul prix affiché à
 * la fois, pour éviter la comparaison laborieuse de deux colonnes quasi identiques
 * (le contenu de l'offre est le même — seule la période change).
 */
export default function Tarifs() {
  const [annuel, setAnnuel] = useState(true);
  const offre = OFFRES[annuel ? 1 : 0];

  return (
    <section className="vt-section vt-tarifs" id="tarifs">
      <h2 className="vt-h2">Un prix simple, pour tout le foyer</h2>
      <p className="vt-sous">
        Une seule formule, tout est inclus. Pas de palier, pas d’option cachée.
      </p>

      <div className="vt-bascule" role="group" aria-label="Choisir la périodicité">
        <button
          type="button"
          className={`vt-bascule-b${!annuel ? ' actif' : ''}`}
          onClick={() => setAnnuel(false)}
          aria-pressed={!annuel}
        >
          Mensuel
        </button>
        <button
          type="button"
          className={`vt-bascule-b${annuel ? ' actif' : ''}`}
          onClick={() => setAnnuel(true)}
          aria-pressed={annuel}
        >
          Annuel <span className="vt-eco">−20 %</span>
        </button>
      </div>

      <div className="vt-prix-carte">
        <p className="vt-prix-nom">Formule {offre.nom}</p>
        <p className="vt-prix">
          <span className="vt-prix-n">{formatPrix(offre.prix)}</span>
          <span className="vt-prix-p">{offre.periode}</span>
        </p>
        <p className="vt-prix-detail">
          {annuel
            ? `soit ${formatPrix(offre.parMois)} par mois — ${offre.economie}`
            : 'sans engagement, résiliable à tout moment'}
        </p>

        <Link href="/connexion" className="bouton bouton-primaire vt-prix-cta">
          Essayer {ESSAI_JOURS} jours gratuitement
        </Link>
        <p className="vt-prix-note">Sans carte bancaire · Résiliation en 3 clics</p>

        <ul className="vt-inclus">
          {INCLUS.map((x) => (
            <li key={x}><span className="vt-check" aria-hidden="true">✓</span>{x}</li>
          ))}
        </ul>
      </div>

      <p className="vt-tva">
        Prix TTC en euros. Voir les <Link href="/conditions">conditions générales</Link>.
      </p>
    </section>
  );
}
