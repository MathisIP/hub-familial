'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useT } from '@/components/I18nProvider';
import { useSignalPret } from '@/components/accueil/SplashAccueil';
import {
  chercherDocuments,
  formatTaille,
  iconeDocument,
  type Document,
  type DonneesDocuments,
} from '@/lib/documents/schema';
import { envoyerFichiers, resumeReductions } from '@/lib/documents/envoi';
import { jsonOuErreur } from '@/lib/api-client';
import VisionneuseDocument, { clicSimple } from '@/components/documents/VisionneuseDocument';

/**
 * Section « Documents » de l'accueil — volontairement réduite à DEUX gestes :
 *   1. ajouter un fichier (il part dans la boîte d'arrivée « Fichiers non classés ») ;
 *   2. retrouver un document par son nom.
 * Le rangement (dossiers, déplacement, renommage) se fait dans l'onglet dédié.
 */
export default function SectionDocuments() {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<DonneesDocuments | null>(null);
  const [etat, setEtat] = useState<'charge' | 'ok' | 'erreur'>('charge');
  const [message, setMessage] = useState<string | null>(null);
  const [succes, setSucces] = useState<string | null>(null);
  const [recherche, setRecherche] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [apercu, setApercu] = useState<Document | null>(null);

  /** Ouvre le document DANS l'app plutôt que de naviguer vers son contenu. */
  function ouvrirApercu(e: React.MouseEvent, doc: Document) {
    if (!clicSimple(e)) return;
    e.preventDefault();
    setApercu(doc);
  }

  useSignalPret('documents', etat !== 'charge');

  const charger = useCallback(async () => {
    try {
      const r = await fetch('/api/documents', { cache: 'no-store' });
      const data = await jsonOuErreur<DonneesDocuments>(r, 'Chargement impossible.');
      setD(data);
      setEtat('ok');
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      setEtat('erreur');
    }
  }, []);

  useEffect(() => {
    void charger();
  }, [charger]);

  async function televerser(fichiers: FileList) {
    setOccupe(true);
    setMessage(null);
    setSucces(null);
    try {
      // Pas de dossier → le service range dans « Fichiers non classés ».
      const res = await envoyerFichiers(Array.from(fichiers));
      if (res.erreurs.length > 0) setMessage(res.erreurs.join(' '));
      if (res.ajoutes > 0) {
        const reduction = resumeReductions(res.reduites);
        setSucces(
          `${res.ajoutes} ${tr('DOC_AJOUTE_SUFFIXE')}${reduction ? ` ${reduction}` : ''}`,
        );
        await charger();
      }
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const resultats = useMemo(
    () => (d ? chercherDocuments(d.documents, recherche) : []),
    [d, recherche],
  );

  return (
    <section className="documents" aria-label={tr('DOC_TITRE')}>
      <div className="doc-tete">
        <h2>{tr('DOC_TITRE')}</h2>
        <Link href="/foyer/documents" className="semaine-lien">{tr('DOC_LIEN_ONGLET')}</Link>
      </div>

      <div className="doc-accueil">
        <input
          ref={inputRef}
          type="file"
          multiple
          hidden
          onChange={(e) => e.target.files?.length && televerser(e.target.files)}
        />
        <button
          type="button"
          className="bouton bouton-primaire doc-btn"
          onClick={() => inputRef.current?.click()}
          disabled={occupe || etat === 'charge'}
        >
          {occupe ? tr('DOC_ENVOI') : tr('DOC_AJOUTER')}
        </button>
        <input
          type="search"
          className="champ doc-recherche"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={tr('DOC_RECHERCHE_PH')}
          aria-label={tr('DOC_RECHERCHE_PH')}
          disabled={etat !== 'ok'}
        />
      </div>

      {etat === 'charge' && <p className="doc-info">{tr('DOC_CHARGEMENT')}</p>}
      {succes && <p className="message info doc-msg">{succes}</p>}
      {message && <p className="message erreur doc-msg">{message}</p>}

      {etat === 'ok' && recherche.trim() && (
        resultats.length === 0 ? (
          <p className="doc-info">{tr('DOC_AUCUN_RESULTAT')}</p>
        ) : (
          <ul className="doc-liste doc-resultats">
            {resultats.map((doc) => (
              <li key={doc.id}>
                <div className="doc-item">
                  <a
                    className="doc-lien"
                    href={`/api/documents/${doc.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title={tr('DOC_OUVRIR')}
                    onClick={(e) => ouvrirApercu(e, doc)}
                  >
                    <span className="doc-ic" aria-hidden="true">{iconeDocument(doc)}</span>
                    <span className="doc-nom">{doc.nom}</span>
                    <span className="doc-badge">📁 {doc.dossier}</span>
                    <span className="doc-taille">{formatTaille(doc.taille)}</span>
                  </a>
                </div>
              </li>
            ))}
          </ul>
        )
      )}

      {apercu && <VisionneuseDocument doc={apercu} onFermer={() => setApercu(null)} />}
    </section>
  );
}
