'use client';

import { useEffect, useState } from 'react';
import { FAMILLES, THEMES, themeDeFamille, type IdFamille } from '@/lib/themes';

/**
 * Démonstration INTERACTIVE des thèmes et options d'apparence, sur la vitrine.
 * Le visiteur choisit une gamme, le mode clair/sombre et l'effet néon : le
 * changement s'applique **à toute la page**, exactement comme dans l'application
 * (mêmes attributs `data-theme` / `data-neon`). Il essaie donc le vrai réglage,
 * pas une image.
 *
 * ⚠ On restaure les réglages d'origine en quittant la section (démontage) pour
 * ne pas imposer au visiteur un thème qu'il n'a pas choisi de garder.
 */
/** Prénoms de l'aperçu : un visiteur ne doit pas croire que « Lou », c'est nous. */
const PRENOMS = ['Lou', 'Camille', 'Sacha', 'Inès', 'Noah', 'Léa', 'Gabriel', 'Jade', 'Louis', 'Manon'];

export default function DemoThemes() {
  /*
   * ⚠ Le catalogue est réduit à une seule gamme depuis le 25/08/2026 : on part
   * de la première famille plutôt que d'un identifiant écrit en dur, qui
   * casserait à chaque changement de nom.
   */
  const [famille, setFamille] = useState<IdFamille>(FAMILLES[0].id);
  const [sombre, setSombre] = useState(false);
  const [neon, setNeon] = useState(true);
  const [prenom, setPrenom] = useState(PRENOMS[0]);

  // Tiré au sort APRÈS le montage : un tirage au rendu donnerait une valeur
  // différente côté serveur et côté client — erreur d'hydratation garantie.
  useEffect(() => {
    setPrenom(PRENOMS[Math.floor(Math.random() * PRENOMS.length)]);
  }, []);

  // Applique le thème choisi au document (comme le fait l'app).
  useEffect(() => {
    const html = document.documentElement;
    const avantTheme = html.getAttribute('data-theme');
    const avantNeon = html.getAttribute('data-neon');

    html.setAttribute('data-theme', themeDeFamille(famille, sombre));
    html.setAttribute('data-neon', neon ? 'on' : 'off');

    return () => {
      // Restauration à la sortie : on ne touche pas aux préférences du visiteur.
      if (avantTheme) html.setAttribute('data-theme', avantTheme);
      if (avantNeon) html.setAttribute('data-neon', avantNeon);
    };
  }, [famille, sombre, neon]);

  return (
    <section className="vt-section vt-demo" id="apparence">
      <h2 className="vt-h2">Une application qui vous ressemble</h2>
      <p className="vt-sous">
        Six gammes de couleurs, un mode clair et un mode sombre, un effet néon
        optionnel. Essayez : <strong>toute la page change en direct</strong>.
      </p>

      <div className="vt-demo-panneau">
        {/* --- Contrôles --- */}
        <div className="vt-demo-ctrl">
          <p className="vt-demo-lbl">Couleur</p>
          <div className="vt-demo-pastilles" role="group" aria-label="Gamme de couleurs">
            {FAMILLES.map((f) => {
              const t = THEMES[themeDeFamille(f.id, sombre)];
              return (
                <button
                  key={f.id}
                  type="button"
                  className={`vt-pastille-c${famille === f.id ? ' actif' : ''}`}
                  style={{ background: `linear-gradient(150deg, ${t.ACC}, ${t.ACC_DEEP})` }}
                  onClick={() => setFamille(f.id)}
                  aria-pressed={famille === f.id}
                  aria-label={f.nom}
                  title={f.nom}
                />
              );
            })}
          </div>
          <p className="vt-demo-nom">{FAMILLES.find((f) => f.id === famille)?.nom}</p>

          <div className="vt-demo-bascules">
            <button
              type="button"
              className={`vt-demo-b${sombre ? ' actif' : ''}`}
              onClick={() => setSombre((v) => !v)}
              aria-pressed={sombre}
            >
              {sombre ? '🌙 Mode sombre' : '☀️ Mode clair'}
            </button>
            <button
              type="button"
              className={`vt-demo-b${neon ? ' actif' : ''}`}
              onClick={() => setNeon((v) => !v)}
              aria-pressed={neon}
            >
              ⚡ Effet néon {neon ? 'activé' : 'désactivé'}
            </button>
          </div>
        </div>

        {/* --- Aperçu : une mini-interface qui réagit au thème --- */}
        <div className="vt-demo-apercu" aria-label="Aperçu de l’application">
          <div className="vt-demo-carte">
            <p className="vt-demo-jour">Mercredi 12 novembre</p>
            <p className="vt-demo-titre">Bonsoir, {prenom}</p>

            <div className="vt-demo-soldes">
              <div><span>Compte commun</span><strong>1 240,50 €</strong></div>
              <div><span>Épargne</span><strong>5 200,39 €</strong></div>
            </div>

            <button type="button" className="bouton bouton-primaire vt-demo-cta" tabIndex={-1}>
              Ajouter une opération
            </button>

            <p className="vt-demo-section">Liste de courses</p>
            <ul className="vt-demo-liste">
              <li><span className="vt-demo-q">400 g</span> Pâtes complètes</li>
              <li><span className="vt-demo-q">×2</span> Yaourts nature</li>
              <li><span className="vt-demo-q">1 L</span> Lait</li>
            </ul>
          </div>
        </div>
      </div>
    </section>
  );
}
