'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import ImportDrive from '@/components/ImportDrive';
import type { ContenuDossier, ElementDrive } from '@/lib/google/driveBrowse';

/**
 * Explorateur du Drive « Hub Familial » sur l'accueil : navigation dans les
 * dossiers (fil d'Ariane) et ouverture des fichiers (nouvel onglet Google Drive).
 * Le bouton « Importer » (dans « À classer ») vit dans cette section.
 * Lecture côté client via le jeton Drive de l'utilisateur (/api/drive/liste).
 */

type Etat = 'charge' | 'ok' | 'erreur' | 'config' | 'reconnexion';
type Crumb = { id: string; nom: string };

/** Emoji selon le type MIME (pas d'appel réseau, cohérent avec le style de l'app). */
function icone(el: ElementDrive): string {
  if (el.estDossier) return '📁';
  const t = el.mimeType;
  if (t.includes('spreadsheet') || t.includes('excel') || t.includes('csv')) return '📊';
  if (t.includes('presentation') || t.includes('powerpoint')) return '📽️';
  if (t.includes('document') || t.includes('word')) return '📄';
  if (t === 'application/pdf') return '📕';
  if (t.startsWith('image/')) return '🖼️';
  if (t.startsWith('video/')) return '🎬';
  if (t.startsWith('audio/')) return '🎵';
  if (t.includes('zip') || t.includes('compressed') || t.includes('tar')) return '🗜️';
  return '📎';
}

export default function DriveExplorer() {
  const [etat, setEtat] = useState<Etat>('charge');
  const [message, setMessage] = useState<string | null>(null);
  const [contenu, setContenu] = useState<ContenuDossier | null>(null);
  // Fil d'Ariane : racine en [0]. `undefined` id = racine (DRIVE_HUB_URL).
  const [chemin, setChemin] = useState<Crumb[]>([]);

  const charger = useCallback(async (dossierId?: string) => {
    setEtat('charge');
    setMessage(null);
    try {
      const url = dossierId ? `/api/drive/liste?dossier=${encodeURIComponent(dossierId)}` : '/api/drive/liste';
      const r = await fetch(url, { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) {
        if (data.config) { setEtat('config'); setMessage(data.erreur); return; }
        if (data.reconnexion) { setEtat('reconnexion'); setMessage(data.erreur); return; }
        setEtat('erreur'); setMessage(data.erreur ?? 'Erreur de chargement.'); return;
      }
      setContenu(data as ContenuDossier);
      setEtat('ok');
    } catch (e) {
      setEtat('erreur');
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }, []);

  // Chargement initial (racine).
  useEffect(() => { void charger(); }, [charger]);

  // Synchronise le fil d'Ariane quand un dossier a été chargé.
  useEffect(() => {
    if (etat !== 'ok' || !contenu) return;
    setChemin((prev) => {
      const i = prev.findIndex((c) => c.id === contenu.dossier.id);
      if (i >= 0) return prev.slice(0, i + 1); // remontée
      if (prev.length === 0) return [contenu.dossier]; // racine
      return [...prev, contenu.dossier]; // descente
    });
  }, [contenu, etat]);

  function ouvrir(el: ElementDrive) {
    if (el.estDossier) return void charger(el.id);
    if (el.lien) window.open(el.lien, '_blank', 'noopener,noreferrer');
  }

  function allerA(crumb: Crumb) {
    if (contenu && crumb.id === contenu.dossier.id) return;
    void charger(crumb.id);
  }

  const rafraichir = () => charger(contenu?.dossier.id);

  return (
    <section className="drive-explorer" aria-label="Documents Drive">
      <div className="de-tete">
        <h2>🗂️ Drive familial</h2>
        <ImportDrive onImporte={rafraichir} />
      </div>

      {chemin.length > 0 && (
        <nav className="de-fil" aria-label="Fil d’Ariane">
          {chemin.map((c, i) => (
            <span key={c.id}>
              {i > 0 && <span className="de-sep">›</span>}
              <button
                type="button"
                className="de-crumb"
                onClick={() => allerA(c)}
                disabled={i === chemin.length - 1}
              >
                {i === 0 ? '🏠 ' : ''}{c.nom}
              </button>
            </span>
          ))}
        </nav>
      )}

      {etat === 'charge' && <p className="de-info">Chargement du Drive…</p>}

      {etat === 'config' && <p className="de-info">{message} Ajoute <code>DRIVE_HUB_URL</code> dans <code>.env</code> (URL du dossier « Hub Familial »).</p>}

      {etat === 'reconnexion' && (
        <p className="message erreur de-msg">
          {message} <Link href="/connexion" className="import-reco">Autoriser Google Drive →</Link>
        </p>
      )}

      {etat === 'erreur' && <p className="message erreur de-msg">{message}</p>}

      {etat === 'ok' && contenu && (
        contenu.elements.length === 0 ? (
          <p className="de-info">Ce dossier est vide.</p>
        ) : (
          <ul className="de-liste">
            {contenu.elements.map((el) => (
              <li key={el.id}>
                <button
                  type="button"
                  className={`de-item${el.estDossier ? ' dossier' : ''}`}
                  onClick={() => ouvrir(el)}
                  disabled={!el.estDossier && !el.lien}
                  title={el.estDossier ? 'Ouvrir le dossier' : 'Ouvrir dans Google Drive'}
                >
                  <span className="de-ic" aria-hidden="true">{icone(el)}</span>
                  <span className="de-nom">{el.nom}</span>
                  <span className="de-fleche" aria-hidden="true">{el.estDossier ? '›' : '↗'}</span>
                </button>
              </li>
            ))}
          </ul>
        )
      )}
    </section>
  );
}
