'use client';

import { useMemo, useRef, useState } from 'react';
import Liste from '@/components/Liste';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/I18nProvider';
import {
  DOSSIER_DEFAUT,
  chercherDocuments,
  formatTaille,
  grouperParDossier,
  iconeDocument,
  type Document,
  type DonneesDocuments,
} from '@/lib/documents/schema';
import Astuce from '@/components/Astuce';

/**
 * Gestionnaire de documents (onglet dédié) : créer des dossiers (même vides),
 * y déposer des fichiers, les DÉPLACER d'un dossier à l'autre, les renommer,
 * les supprimer, et rechercher par nom.
 *
 * Les données initiales viennent du serveur ; après chaque écriture on relance
 * le rendu serveur (`router.refresh()`) plutôt que de dupliquer l'état.
 */
export default function VueDocuments({ initial }: { initial: DonneesDocuments }) {
  const tr = useT();
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);

  const [recherche, setRecherche] = useState('');
  const [nouveauDossier, setNouveauDossier] = useState('');
  const [dossierCible, setDossierCible] = useState(DOSSIER_DEFAUT);
  const [edite, setEdite] = useState<string | null>(null);
  const [dossierEdite, setDossierEdite] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const groupes = useMemo(
    () => grouperParDossier(initial.documents, initial.dossiers),
    [initial],
  );
  const resultats = useMemo(
    () => chercherDocuments(initial.documents, recherche),
    [initial.documents, recherche],
  );

  /** Appel API + rafraîchissement, avec remontée d'erreur unifiée. */
  async function appeler(url: string, methode: string, corps?: unknown): Promise<boolean> {
    setMessage(null);
    try {
      const r = await fetch(url, {
        method: methode,
        headers: corps ? { 'Content-Type': 'application/json' } : undefined,
        body: corps ? JSON.stringify(corps) : undefined,
      });
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Action refusée.');
      router.refresh();
      return true;
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
      return false;
    }
  }

  async function televerser(fichiers: FileList) {
    setOccupe(true);
    setMessage(null);
    try {
      const form = new FormData();
      Array.from(fichiers).forEach((f) => form.append('fichiers', f));
      form.append('dossier', dossierCible);
      const r = await fetch('/api/documents', { method: 'POST', body: form });
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Téléversement refusé.');
      router.refresh();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  async function creerDossier(e: React.FormEvent) {
    e.preventDefault();
    const nom = nouveauDossier.trim();
    if (!nom) return;
    if (await appeler('/api/documents/dossiers', 'POST', { nom })) {
      setNouveauDossier('');
      setDossierCible(nom); // on enchaîne naturellement sur un dépôt dans ce dossier
    }
  }

  return (
    <div className="vue-docs">
      {/* ---- Barre d'outils : recherche, nouveau dossier, dépôt ---- */}
      <div className="vd-outils">
        <input
          type="search"
          className="champ vd-recherche"
          value={recherche}
          onChange={(e) => setRecherche(e.target.value)}
          placeholder={tr('DOC_RECHERCHE_PH')}
          aria-label={tr('DOC_RECHERCHE_PH')}
        />

        <form className="vd-nouveau" onSubmit={creerDossier}>
          <input
            className="champ"
            value={nouveauDossier}
            onChange={(e) => setNouveauDossier(e.target.value)}
            placeholder={tr('DOC_NOUVEAU_DOSSIER_PH')}
            aria-label={tr('DOC_NOUVEAU_DOSSIER_PH')}
          />
          <button type="submit" className="bouton" disabled={!nouveauDossier.trim()}>
            {tr('DOC_CREER_DOSSIER')}
          </button>
        </form>

        <div className="vd-depot">
          <label className="vd-lbl" htmlFor="vd-cible">{tr('DOC_DEPOSER_DANS')}</label>
          <Astuce texte={tr('AIDE_DOSSIER')} />
          <Liste
            valeur={dossierCible}
            onChange={setDossierCible}
            options={[...new Set([...initial.dossiers, DOSSIER_DEFAUT])]
              .sort((a, b) => (a === DOSSIER_DEFAUT ? 1 : b === DOSSIER_DEFAUT ? -1 : a.localeCompare(b, 'fr')))
              .map((x) => ({ valeur: x, libelle: x }))}
            ariaLabel={tr('DOC_DEPLACER_VERS')}
          />
          <input
            ref={inputRef}
            type="file"
            multiple
            hidden
            onChange={(e) => e.target.files?.length && televerser(e.target.files)}
          />
          <button
            type="button"
            className="bouton bouton-primaire"
            onClick={() => inputRef.current?.click()}
            disabled={occupe}
          >
            {occupe ? tr('DOC_ENVOI') : tr('DOC_TELEVERSER')}
          </button>
        </div>
      </div>

      {message && <p className="message erreur">{message}</p>}

      {/* ---- Résultats de recherche (remplacent l'arborescence) ---- */}
      {recherche.trim() ? (
        <section className="vd-groupe">
          <h2 className="vd-gtitre">
            {tr('DOC_RESULTATS')}
            <span className="vd-gcount">{resultats.length}</span>
          </h2>
          {resultats.length === 0 ? (
            <p className="doc-info">{tr('DOC_AUCUN_RESULTAT')}</p>
          ) : (
            <ul className="doc-liste">
              {resultats.map((doc) => (
                <li key={doc.id}>
                  <LigneDocument
                    doc={doc}
                    dossiers={initial.dossiers}
                    montrerDossier
                    enEdition={edite === doc.id}
                    onEditer={() => setEdite(doc.id)}
                    onFermer={() => setEdite(null)}
                    onAppel={appeler}
                  />
                </li>
              ))}
            </ul>
          )}
        </section>
      ) : (
        /* ---- Arborescence par dossier ---- */
        <div className="vd-groupes">
          {groupes.map((g) => (
            <section className="vd-groupe" key={g.dossier}>
              {dossierEdite === g.dossier ? (
                <EditionDossier
                  nom={g.dossier}
                  nbDocuments={g.documents.length}
                  onFermer={() => setDossierEdite(null)}
                  onAppel={appeler}
                />
              ) : (
                <h2 className="vd-gtitre">
                  <span className="vd-gnom">
                    📁 {g.dossier}
                    {/* Cadenas : savoir qu'un dossier est restreint évite d'y
                        déposer un fichier que les autres devaient voir. */}
                    {initial.dossiersRestreints.includes(g.dossier) && (
                      <span className="vd-cadenas" title={tr('DOC_DOSSIER_PRIVE')}> 🔒</span>
                    )}
                  </span>
                  <span className="vd-gcount">{g.documents.length}</span>
                  {g.dossier !== DOSSIER_DEFAUT && (
                    <button
                      type="button"
                      className="doc-menu vd-gmenu"
                      onClick={() => setDossierEdite(g.dossier)}
                      aria-label={tr('DOC_GERER_DOSSIER')}
                      title={tr('DOC_GERER_DOSSIER')}
                    >
                      ⋯
                    </button>
                  )}
                </h2>
              )}

              {g.documents.length === 0 ? (
                <p className="doc-info vd-vide">{tr('DOC_DOSSIER_VIDE')}</p>
              ) : (
                <ul className="doc-liste">
                  {g.documents.map((doc) => (
                    <li key={doc.id}>
                      <LigneDocument
                        doc={doc}
                        dossiers={initial.dossiers}
                        enEdition={edite === doc.id}
                        onEditer={() => setEdite(doc.id)}
                        onFermer={() => setEdite(null)}
                        onAppel={appeler}
                      />
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

/** Une ligne de document : consultation, ou édition (renommer + déplacer + supprimer). */
function LigneDocument({
  doc,
  dossiers,
  montrerDossier = false,
  enEdition,
  onEditer,
  onFermer,
  onAppel,
}: {
  doc: Document;
  dossiers: string[];
  montrerDossier?: boolean;
  enEdition: boolean;
  onEditer: () => void;
  onFermer: () => void;
  onAppel: (url: string, methode: string, corps?: unknown) => Promise<boolean>;
}) {
  const tr = useT();
  const [nom, setNom] = useState(doc.nom);
  const [dossier, setDossier] = useState(doc.dossier);

  if (!enEdition) {
    return (
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
          {montrerDossier && <span className="doc-badge">📁 {doc.dossier}</span>}
          <span className="doc-taille">{formatTaille(doc.taille)}</span>
        </a>
        <button
          type="button"
          className="doc-menu"
          onClick={onEditer}
          aria-label={tr('G_MODIFIER')}
          title={tr('G_MODIFIER')}
        >
          ⋯
        </button>
      </div>
    );
  }

  const choix = [...new Set([...dossiers, DOSSIER_DEFAUT, doc.dossier])].sort((a, b) =>
    a === DOSSIER_DEFAUT ? 1 : b === DOSSIER_DEFAUT ? -1 : a.localeCompare(b, 'fr'),
  );

  return (
    <div className="doc-edit">
      <input
        className="champ"
        value={nom}
        onChange={(e) => setNom(e.target.value)}
        aria-label={tr('DOC_NOM')}
      />
      <Liste
        valeur={dossier}
        onChange={setDossier}
        options={choix.map((x) => ({ valeur: x, libelle: x }))}
        ariaLabel={tr('DOC_DEPLACER_VERS')}
      />
      <div className="doc-edit-actions">
        <button
          type="button"
          className="bouton bouton-primaire"
          onClick={async () => {
            if (await onAppel('/api/documents', 'PATCH', { id: doc.id, nom, dossier })) onFermer();
          }}
        >
          {tr('G_ENREGISTRER')}
        </button>
        <button type="button" className="bouton" onClick={onFermer}>{tr('G_ANNULER')}</button>
        <button
          type="button"
          className="bouton doc-suppr"
          onClick={async () => {
            if (await onAppel('/api/documents', 'DELETE', { id: doc.id })) onFermer();
          }}
        >
          {tr('G_SUPPRIMER')}
        </button>
      </div>
    </div>
  );
}

/** Renommer ou supprimer un dossier (ses fichiers repartent dans la boîte d'arrivée). */
function EditionDossier({
  nom,
  nbDocuments,
  onFermer,
  onAppel,
}: {
  nom: string;
  nbDocuments: number;
  onFermer: () => void;
  onAppel: (url: string, methode: string, corps?: unknown) => Promise<boolean>;
}) {
  const tr = useT();
  const [valeur, setValeur] = useState(nom);

  return (
    <div className="doc-edit vd-gedit">
      <input
        className="champ"
        value={valeur}
        onChange={(e) => setValeur(e.target.value)}
        aria-label={tr('DOC_NOM_DOSSIER')}
      />
      <div className="doc-edit-actions">
        <button
          type="button"
          className="bouton bouton-primaire"
          onClick={async () => {
            if (await onAppel('/api/documents/dossiers', 'PATCH', { ancien: nom, nouveau: valeur })) onFermer();
          }}
        >
          {tr('G_ENREGISTRER')}
        </button>
        <button type="button" className="bouton" onClick={onFermer}>{tr('G_ANNULER')}</button>
        <button
          type="button"
          className="bouton doc-suppr"
          title={nbDocuments > 0 ? tr('DOC_SUPPR_DOSSIER_AIDE') : undefined}
          onClick={async () => {
            if (await onAppel('/api/documents/dossiers', 'DELETE', { nom })) onFermer();
          }}
        >
          {tr('DOC_SUPPR_DOSSIER')}
        </button>
      </div>
      {nbDocuments > 0 && <p className="vd-aide">{tr('DOC_SUPPR_DOSSIER_AIDE')}</p>}
    </div>
  );
}
