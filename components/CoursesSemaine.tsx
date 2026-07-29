'use client';

import { useState } from 'react';
import type { Course } from '@/lib/todo/schema';

/**
 * Carte d'accueil « Liste de courses » : deux actions.
 *   · « Ajouter à ma liste » révèle un champ pour ajouter un produit ponctuel
 *     (ex. gel douche), indépendant des repas → POST /api/todo/courses.
 *   · « Envoyer par message » envoie la liste de courses ENTIÈRE (articles non
 *     cochés, groupés par rayon) via le partage natif du téléphone, ou un lien sms:.
 */
export default function CoursesSemaine() {
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
      if (!r.ok) throw new Error(data.erreur ?? 'Ajout refusé.');
      setMessage(`« ${art} » ajouté à ta liste de courses.`);
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
      if (!r.ok) throw new Error(data.erreur ?? 'Erreur de chargement.');
      const texte = construireTexteListe(data.courses ?? []);
      if (!texte) {
        setErreur('Ta liste de courses est vide.');
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
        <h2>🛒 Liste de courses</h2>
      </div>

      {message && <p className="message info">{message}</p>}
      {erreur && <p className="message erreur">{erreur}</p>}

      <div className="cs-actions">
        <button
          className="bouton bouton-primaire"
          onClick={() => setAjoutOuvert((v) => !v)}
          aria-expanded={ajoutOuvert}
        >
          ＋ Ajouter à ma liste
        </button>
        <button className="bouton" onClick={envoyerMessage} disabled={occupe}>
          💬 Envoyer par message
        </button>
      </div>

      {ajoutOuvert && (
        <form className="cs-ajout" onSubmit={ajouterProduit}>
          <input
            className="champ"
            placeholder="Produit (ex. gel douche)…"
            value={produit}
            onChange={(e) => setProduit(e.target.value)}
            aria-label="Produit à ajouter"
            autoFocus
          />
          <input
            className="champ cs-ajout-qte"
            placeholder="Qté"
            value={qteProduit}
            onChange={(e) => setQteProduit(e.target.value)}
            aria-label="Quantité"
          />
          <button className="bouton" type="submit" disabled={occupe || !produit.trim()}>
            Ajouter
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
function construireTexteListe(courses: Course[]): string {
  const groupes = grouperListe(courses);
  if (groupes.length === 0) return '';
  const lignes = ['🛒 Liste de courses', ''];
  for (const [rayon, items] of groupes) {
    lignes.push(`— ${rayon} —`);
    for (const c of items) lignes.push(`- ${c.article}${c.quantite ? ` (${c.quantite})` : ''}`);
    lignes.push('');
  }
  return lignes.join('\n').trim();
}
