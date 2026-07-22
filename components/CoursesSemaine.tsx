'use client';

import { useEffect, useState } from 'react';
import { formatQuantite, type ArticleCourse } from '@/lib/repas/schema';

/**
 * Section d'accueil « Courses de la semaine » : agrège les dîners planifiés
 * (quantités mises à l'échelle et fusionnées côté serveur), chargée automatiquement
 * comme les autres sections de l'accueil. Design repris de la maquette validée :
 * en-tête avec compteur de dîners, articles groupés par rayon avec pastilles de
 * quantité, actions primaire/secondaire.
 *
 * Deux actions :
 *   · Envoyer par MESSAGE (partage natif du téléphone → SMS/WhatsApp/… , ou repli
 *     sur un lien sms:) — l'ancien « bouton SMS courses » du Site QG ;
 *   · Ajouter à la liste de courses partagée (onglet Courses de ToDo).
 */
export default function CoursesSemaine() {
  const [articles, setArticles] = useState<ArticleCourse[] | null>(null);
  const [diners, setDiners] = useState(0);
  const [etat, setEtat] = useState<'charge' | 'ok' | 'erreur'>('charge');
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);

  async function charger() {
    setEtat('charge');
    setErreur(null);
    try {
      const r = await fetch('/api/courses/semaine', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? 'Erreur de chargement.');
      setArticles(data.articles);
      setDiners(data.diners ?? 0);
      setEtat('ok');
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
      setEtat('erreur');
    }
  }

  useEffect(() => {
    void charger();
  }, []);

  const texte = articles ? construireTexte(articles) : '';

  async function envoyerMessage() {
    setMessage(null);
    setErreur(null);
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({ title: 'Courses de la semaine', text: texte });
        return;
      } catch {
        // partage annulé ou indisponible → on tente le lien SMS
      }
    }
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
  const vide = etat === 'ok' && articles && articles.length === 0;

  return (
    <section className="courses-semaine" aria-label="Courses de la semaine">
      <div className="cs-tete">
        <h2>🛒 Courses de la semaine</h2>
        {etat === 'ok' && !vide && (
          <span className="cs-compteur">{diners} dîner{diners > 1 ? 's' : ''} planifié{diners > 1 ? 's' : ''}</span>
        )}
      </div>

      {etat === 'charge' && <p className="cs-vide">Préparation de la liste…</p>}

      {etat === 'erreur' && (
        <p className="message erreur">
          {erreur} <button className="bouton discret cs-reessayer" onClick={charger}>Réessayer</button>
        </p>
      )}

      {etat === 'ok' && articles && (
        <>
          {message && <p className="message info">{message}</p>}
          {erreur && <p className="message erreur">{erreur}</p>}

          {vide ? (
            <p className="cs-vide">
              Aucun ingrédient : planifie des dîners (avec des recettes qui ont des quantités) dans le module Repas.
            </p>
          ) : (
            parRayon.map(({ rayon, items }) => (
              <div className="cs-rayon-groupe" key={rayon}>
                <p className="cs-rayon">{rayon}</p>
                <ul className="cs-arts">
                  {items.map((a, k) => (
                    <li key={k}>
                      {a.article}
                      {a.quantite != null && (
                        <span className="cs-q">{formatQuantite(a.quantite)} {a.unite}</span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))
          )}

          {/* Actions toujours disponibles dès que la liste est chargée (seul un envoi
              en cours les désactive). */}
          <div className="cs-actions">
            <button className="bouton bouton-primaire" onClick={envoyerMessage} disabled={occupe}>💬 Envoyer par message</button>
            <button className="bouton" onClick={ajouterAuxCourses} disabled={occupe}>📋 Ajouter à ma liste</button>
            <button className="bouton discret" onClick={copier} disabled={occupe}>Copier</button>
          </div>
        </>
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
