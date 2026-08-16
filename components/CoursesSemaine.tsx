'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';

/** Ce que renvoie GET /api/todo/courses/valider avant l'envoi. */
type Apercu = {
  articles: number;
  membres: { utilisateurId: string; nom: string }[];
  pushDisponible: boolean;
};

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
  const [validation, setValidation] = useState<Apercu | null>(null);
  const [destinataires, setDestinataires] = useState<string[]>([]);

  /** Ouvre le choix des destinataires, en les cochant tous par défaut. */
  async function ouvrirValidation() {
    setMessage(null);
    setErreur(null);
    setOccupe(true);
    try {
      const r = await fetch('/api/todo/courses/valider', { cache: 'no-store' });
      const data = (await r.json()) as Apercu & { erreur?: string };
      if (!r.ok) throw new Error(data.erreur ?? tr('G_ERR_CHARGEMENT'));
      if (data.articles === 0) {
        setErreur(tr('CS_VIDE'));
        return;
      }
      setValidation(data);
      setDestinataires(data.membres.map((m) => m.utilisateurId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  async function envoyerValidation() {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch('/api/todo/courses/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilisateurs: destinataires }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? tr('G_ERR_ACTION'));
      // `envoyes` compte les APPAREILS joints, pas les personnes : le dire
      // éviterait de croire que quelqu'un a été prévenu alors qu'il n'a jamais
      // activé les notifications.
      setMessage(data.envoyes > 0 ? tr('CS_VALIDER_OK') : tr('CS_VALIDER_AUCUN_ABO'));
      setValidation(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

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
        <button className="bouton" onClick={ouvrirValidation} disabled={occupe}>
          {tr('CS_VALIDER')}
        </button>
        <a className="bouton discret" href="/todo?onglet=courses">
          {tr('CS_VOIR_LISTE')}
        </a>
      </div>

      {validation && (
        <div className="cs-validation">
          <h3>{tr('CS_VALIDER_TITRE')}</h3>
          <p className="cs-validation-sous">{tr('CS_VALIDER_SOUS')}</p>
          <ul className="cs-destinataires">
            {validation.membres.map((m) => (
              <li key={m.utilisateurId}>
                <label className="cs-case">
                  <input
                    type="checkbox"
                    checked={destinataires.includes(m.utilisateurId)}
                    onChange={(e) =>
                      setDestinataires((p) =>
                        e.target.checked
                          ? [...p, m.utilisateurId]
                          : p.filter((x) => x !== m.utilisateurId),
                      )
                    }
                  />
                  <span>{m.nom}</span>
                </label>
              </li>
            ))}
          </ul>
          {!validation.pushDisponible && <p className="message erreur">{tr('NOTIF_INDISPO')}</p>}
          <div className="cs-validation-actions">
            <button
              className="bouton bouton-primaire"
              onClick={envoyerValidation}
              disabled={occupe || destinataires.length === 0}
            >
              {tr('CS_VALIDER_ENVOYER')}
            </button>
            <button className="bouton discret" onClick={() => setValidation(null)} disabled={occupe}>
              {tr('G_ANNULER')}
            </button>
          </div>
        </div>
      )}

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
