'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useT } from '@/components/I18nProvider';
import { useSignalPret } from '@/components/accueil/SplashAccueil';
import {
  formatTaille,
  iconeDocument,
  grouperParDossier,
  type Document,
  type DonneesDocuments,
} from '@/lib/documents/schema';

/**
 * Section « Documents » de l'accueil — fichiers du foyer, stockage propre
 * (remplace l'ancien explorateur Google Drive).
 * Téléversement, rangement par dossier (un niveau), renommage, suppression.
 * Les fichiers sont servis par `/api/documents/<id>` (stockage privé).
 */
export default function SectionDocuments() {
  const tr = useT();
  const inputRef = useRef<HTMLInputElement>(null);
  const [d, setD] = useState<DonneesDocuments | null>(null);
  const [etat, setEtat] = useState<'charge' | 'ok' | 'erreur'>('charge');
  const [message, setMessage] = useState<string | null>(null);
  const [dossierCible, setDossierCible] = useState('');
  const [occupe, setOccupe] = useState(false);
  const [edite, setEdite] = useState<string | null>(null);

  // Écran de chargement de l'accueil : prêt dès la fin du 1er chargement.
  useSignalPret('documents', etat !== 'charge');

  const charger = useCallback(async () => {
    try {
      const r = await fetch('/api/documents', { cache: 'no-store' });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? 'Erreur');
      setD(data as DonneesDocuments);
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
    try {
      const form = new FormData();
      Array.from(fichiers).forEach((f) => form.append('fichiers', f));
      form.append('dossier', dossierCible);
      const r = await fetch('/api/documents', { method: 'POST', body: form });
      const data = await r.json();
      if (!r.ok) throw new Error(data.erreur ?? 'Téléversement refusé.');
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function enregistrer(id: string, nom: string, dossier: string) {
    setMessage(null);
    try {
      const r = await fetch('/api/documents', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, nom, dossier }),
      });
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Modification refusée.');
      setEdite(null);
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  async function supprimer(id: string) {
    setMessage(null);
    try {
      const r = await fetch('/api/documents', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Suppression refusée.');
      setEdite(null);
      await charger();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    }
  }

  const groupes = d ? grouperParDossier(d.documents) : [];

  return (
    <section className="documents" aria-label={tr('DOC_TITRE')}>
      <div className="doc-tete">
        <h2>{tr('DOC_TITRE')}</h2>
        <div className="doc-actions">
          <input
            className="champ doc-dossier"
            list="doc-dossiers"
            value={dossierCible}
            onChange={(e) => setDossierCible(e.target.value)}
            placeholder={tr('DOC_DOSSIER_PH')}
            aria-label={tr('DOC_DOSSIER_PH')}
          />
          <datalist id="doc-dossiers">
            {d?.dossiers.map((x) => <option key={x} value={x} />)}
          </datalist>
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
            disabled={occupe}
          >
            {occupe ? tr('DOC_ENVOI') : tr('DOC_TELEVERSER')}
          </button>
        </div>
      </div>

      {etat === 'charge' && <p className="doc-info">{tr('DOC_CHARGEMENT')}</p>}
      {message && <p className="message erreur doc-msg">{message}</p>}

      {etat === 'ok' && d && (
        d.documents.length === 0 ? (
          <p className="doc-info">{tr('DOC_VIDE')}</p>
        ) : (
          <div className="doc-groupes">
            {groupes.map((g) => (
              <div className="doc-groupe" key={g.dossier || '_'}>
                <h3 className="doc-gtitre">
                  {g.dossier ? `📁 ${g.dossier}` : tr('DOC_SANS_DOSSIER')}
                  <span className="doc-gcount">{g.documents.length}</span>
                </h3>
                <ul className="doc-liste">
                  {g.documents.map((doc) => (
                    <li key={doc.id}>
                      {edite === doc.id ? (
                        <LigneEdition
                          doc={doc}
                          dossiers={d.dossiers}
                          onAnnuler={() => setEdite(null)}
                          onEnregistrer={enregistrer}
                          onSupprimer={supprimer}
                        />
                      ) : (
                        <div className="doc-item">
                          <a
                            className="doc-lien"
                            href={`/api/documents/${doc.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            title={tr('DOC_OUVRIR')}
                          >
                            <span className="doc-ic" aria-hidden="true">{iconeDocument(doc)}</span>
                            <span className="doc-nom">{doc.nom}</span>
                            <span className="doc-taille">{formatTaille(doc.taille)}</span>
                          </a>
                          <button
                            type="button"
                            className="doc-menu"
                            onClick={() => setEdite(doc.id)}
                            aria-label={tr('G_MODIFIER')}
                            title={tr('G_MODIFIER')}
                          >
                            ⋯
                          </button>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )
      )}
    </section>
  );
}

/** Édition inline d'un document : renommer, ranger, supprimer. */
function LigneEdition({
  doc,
  dossiers,
  onAnnuler,
  onEnregistrer,
  onSupprimer,
}: {
  doc: Document;
  dossiers: string[];
  onAnnuler: () => void;
  onEnregistrer: (id: string, nom: string, dossier: string) => void;
  onSupprimer: (id: string) => void;
}) {
  const tr = useT();
  const [nom, setNom] = useState(doc.nom);
  const [dossier, setDossier] = useState(doc.dossier);

  return (
    <div className="doc-edit">
      <input
        className="champ"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        aria-label={tr('DOC_NOM')}
      />
      <input
        className="champ"
        list="doc-dossiers-edit"
        value={dossier}
        onChange={(e) => setDossier(e.target.value)}
        placeholder={tr('DOC_DOSSIER_PH')}
        aria-label={tr('DOC_DOSSIER_PH')}
      />
      <datalist id="doc-dossiers-edit">
        {dossiers.map((x) => <option key={x} value={x} />)}
      </datalist>
      <div className="doc-edit-actions">
        <button type="button" className="bouton bouton-primaire" onClick={() => onEnregistrer(doc.id, nom, dossier)}>
          {tr('G_ENREGISTRER')}
        </button>
        <button type="button" className="bouton" onClick={onAnnuler}>{tr('G_ANNULER')}</button>
        <button type="button" className="bouton doc-suppr" onClick={() => onSupprimer(doc.id)}>
          {tr('G_SUPPRIMER')}
        </button>
      </div>
    </div>
  );
}
