'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';
import ValiderCourses from '@/components/todo/ValiderCourses';



/**
 * Carte d'accueil « Liste de courses » : trois actions.
 *   · « Ajouter à ma liste » révèle un champ pour un produit ponctuel
 *     (ex. gel douche), indépendant des repas → POST /api/todo/courses.
 *   · « Valider la liste » prévient les membres choisis qu'elle est prête.
 *   · « Voir la liste » ouvre la liste à cocher.
 *
 * ⚠ L'ENVOI PAR MESSAGE A ÉTÉ RETIRÉ (16/08/2026). Il ouvrait le partage natif du
 * téléphone, ou un lien `sms:` — donc la liste partait en clair et restait dans
 * l'historique de messages de deux appareils, hors de toute règle de visibilité
 * et hors du chiffrement que le reste du produit s'impose. La notification la
 * remplace : elle annonce seulement que la liste est prête, et le contenu ne
 * quitte jamais l'app.
 */
export default function CoursesSemaine() {
  const tr = useT();
  const [ajoutOuvert, setAjoutOuvert] = useState(false);
  const [produit, setProduit] = useState('');
  const [qteProduit, setQteProduit] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function ajouterProduit(e: React.FormEvent) {
    e.preventDefault();
    const art = produit.trim();
    if (!art) return;
    setOccupe(true);
    setMessage(null);
    setErreur(null);
    try {
      const r = await fetch('/api/todo/courses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ article: art, quantite: qteProduit.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? tr('G_ERR_ACTION'));
      setMessage(`« ${art} » ${tr('CS_AJOUTE_SUFFIXE')}`);
      setProduit('');
      setQteProduit('');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <section className="courses-semaine" aria-label="Liste de courses">
      <div className="cs-tete">
        <h2>🛒 {tr('CS_TITRE')}</h2>
      </div>

      {message && <p className="message info">{message}</p>}
      {erreur && <p className="message erreur">{erreur}</p>}

      <div className="cs-actions">
        <button
          className="bouton bouton-primaire"
          onClick={() => setAjoutOuvert((v) => !v)}
          aria-expanded={ajoutOuvert}
        >
          ＋ {tr('CS_AJOUT_LISTE')}
        </button>
        {/* ⚠ Composant PARTAGÉ avec le module To-Do depuis le 25/08/2026.
            Cette carte portait sa propre copie des quarante lignes ; deux
            copies du même mécanisme finissent toujours par diverger — l'une
            corrigée, l'autre oubliée. */}
        <ValiderCourses compact />
        <a className="bouton discret" href="/foyer/todo?onglet=courses">
          {tr('CS_VOIR_LISTE')}
        </a>
      </div>

      {ajoutOuvert && (
        <form className="cs-ajout" onSubmit={ajouterProduit}>
          <input
            className="champ"
            placeholder={tr('CS_PRODUIT_PH')}
            value={produit}
            onChange={(e) => setProduit(e.target.value)}
            aria-label={tr('CS_PRODUIT_PH')}
            autoFocus
          />
          <input
            className="champ cs-ajout-qte"
            placeholder={tr('CS_QTE')}
            value={qteProduit}
            onChange={(e) => setQteProduit(e.target.value)}
            aria-label={tr('CS_QTE')}
          />
          <button className="bouton" type="submit" disabled={occupe || !produit.trim()}>
            {tr('G_AJOUTER')}
          </button>
        </form>
      )}
    </section>
  );
}
