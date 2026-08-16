'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';
import type { Course } from '@/lib/todo/schema';

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
 * ⚠ LA VALIDATION REMPLACE L'ENVOI PAR SMS. Le partage natif marchait pour deux
 * numéros connus d'avance ; il ne tient pas dès qu'il y a des clients. La liste
 * ne QUITTE PLUS l'app : la notification dit seulement qu'elle est prête, et le
 * clic ouvre la liste à cocher. Un SMS, lui, laissait le contenu des courses en
 * clair dans l'historique de deux téléphones.
 *
 * Le bouton d'envoi par message est conservé : il dépanne quand le destinataire
 * n'a pas l'app (un proche qui passe au supermarché).
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

  async function envoyerMessage() {
    setMessage(null);
    setErreur(null);
    setOccupe(true);
    try {
      const r = await fetch('/api/todo', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? tr('G_ERR_CHARGEMENT'));
      const texte = construireTexteListe(data.courses ?? [], tr('CS_TITRE'));
      if (!texte) {
        setErreur(tr('CS_VIDE'));
        return;
      }
      if (typeof navigator !== 'undefined' && navigator.share) {
        try {
          await navigator.share({ title: 'Liste de courses', text: texte });
          return;
        } catch {
          // partage annulé ou indisponible → repli sur le lien SMS
        }
      }
      window.location.href = `sms:?body=${encodeURIComponent(texte)}`;
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
        {/* Conservé : dépanne quand le destinataire n'a pas l'app (un proche
            qui passe au supermarché). Ce n'est plus le chemin principal. */}
        <button className="bouton discret" onClick={envoyerMessage} disabled={occupe}>
          💬 {tr('CS_ENVOYER')}
        </button>
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

/** Groupe les articles NON cochés par rayon (pour l'envoi de la liste). */
function grouperListe(courses: Course[]): [string, Course[]][] {
  const map = new Map<string, Course[]>();
  for (const c of courses) {
    if (c.fait) continue;
    const cle = c.rayon || 'Autre';
    if (!map.has(cle)) map.set(cle, []);
    map.get(cle)!.push(c);
  }
  return [...map.entries()];
}

/** Texte de la liste de courses entière, groupée par rayon, pour un message. */
function construireTexteListe(courses: Course[], titre: string): string {
  const groupes = grouperListe(courses);
  if (groupes.length === 0) return '';
  const lignes = [`🛒 ${titre}`, ''];
  for (const [rayon, items] of groupes) {
    lignes.push(`— ${rayon} —`);
    for (const c of items) lignes.push(`- ${c.article}${c.quantite ? ` (${c.quantite})` : ''}`);
    lignes.push('');
  }
  return lignes.join('\n').trim();
}
