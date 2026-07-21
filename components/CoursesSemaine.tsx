'use client';

import { useState } from 'react';
import { formatQuantite, type ArticleCourse } from '@/lib/repas/schema';

/**
 * Bouton d'accueil : prépare la liste de courses de la semaine (dîners planifiés,
 * quantités mises à l'échelle et agrégées côté serveur), puis permet de :
 *   · l'envoyer par MESSAGE (partage natif du téléphone → SMS/WhatsApp/… , ou
 *     repli sur un lien sms:) — c'est l'ancien « bouton SMS courses » du Site QG ;
 *   · l'ajouter à la liste de courses partagée (onglet Courses de ToDo).
 */
export default function CoursesSemaine() {
  const [articles, setArticles] = useState<ArticleCourse[] | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function preparer() {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      const r = await fetch('/api/courses/semaine', { cache: 'no-store' });
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Erreur de chargement.');
      setArticles((await r.json()).articles);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  const texte = articles ? construireTexte(articles) : '';

  async function envoyerMessage() {
    setMessage(null);
    setErreur(null);
    // 1) Partage natif (mobile) : l'utilisateur choisit SMS / WhatsApp / …
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Courses de la semaine', text: texte });
        return;
      } catch {
        // partage annulé ou indisponible → on tente le lien SMS
      }
    }
    // 2) Repli : ouvre l'app Messages pré-remplie.
    window.location.href = `sms:?body=${encodeURIComponent(texte)}`;
  }

  async function copier() {
    try {
      await navigator.clipboard.writeText(texte);
      setMessage('Liste copiée dans le presse-papier.');
    } catch {
      setErreur('Copie impossible sur cet appareil.');
    }
  }

  async function ajouterAuxCourses() {
    setOccupe(true);
    setMessage(null);
    setErreur(null);
    try {
      const r = await fetch('/api/courses/semaine', { method: 'POST' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? 'Ajout refusé.');
      setMessage(
        `${data.ajoutes} article(s) ajouté(s) à ta liste de courses` +
          (data.ignores ? `, ${data.ignores} déjà présent(s).` : '.'),
      );
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  const parRayon = articles ? grouper(articles) : [];

  return (
    <section className="courses-semaine">
      <div className="cs-tete">
        <h2>🛒 Courses de la semaine</h2>
        <button className="bouton" onClick={preparer} disabled={occupe}>
          {occupe && !articles ? 'Préparation…' : articles ? 'Actualiser' : 'Préparer la liste'}
        </button>
      </div>

      {erreur && <p className="message erreur">{erreur}</p>}
      {message && <p className="message info">{message}</p>}

      {articles && (
        articles.length === 0 ? (
          <p className="cs-vide">
            Aucun ingrédient : planifie des dîners (avec des recettes qui ont des quantités) dans le module Repas.
          </p>
        ) : (
          <>
            <div className="cs-actions">
              <button className="bouton" onClick={envoyerMessage} disabled={occupe}>💬 Envoyer par message</button>
              <button className="bouton discret" onClick={ajouterAuxCourses} disabled={occupe}>📋 Ajouter à ma liste de courses</button>
              <button className="bouton discret" onClick={copier} disabled={occupe}>Copier</button>
            </div>
            {parRayon.map(({ rayon, items }) => (
              <div className="rayon-groupe" key={rayon}>
                <p className="rayon-titre">{rayon}</p>
                <ul className="courses-apercu">
                  {items.map((a, k) => (
                    <li key={k}>
                      <span className="i-art">{a.article}</span>
                      {a.quantite != null && (
                        <span className="i-qte">{formatQuantite(a.quantite)} {a.unite}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        )
      )}
    </section>
  );
}

function grouper(articles: ArticleCourse[]): { rayon: string; items: ArticleCourse[] }[] {
  const map = new Map<string, ArticleCourse[]>();
  for (const a of articles) {
    const cle = a.rayon || 'Autre';
    if (!map.has(cle)) map.set(cle, []);
    map.get(cle)!.push(a);
  }
  return [...map.entries()].map(([rayon, items]) => ({ rayon, items }));
}

function construireTexte(articles: ArticleCourse[]): string {
  const lignes = ['🛒 Courses de la semaine', ''];
  for (const { rayon, items } of grouper(articles)) {
    lignes.push(`— ${rayon} —`);
    for (const a of items) {
      const q = a.quantite != null ? ` (${formatQuantite(a.quantite)}${a.unite ? ' ' + a.unite : ''})` : '';
      lignes.push(`- ${a.article}${q}`);
    }
    lignes.push('');
  }
  return lignes.join('\n').trim();
}
