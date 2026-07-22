'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';

/** Logo Google Drive (tricolore). */
function LogoDrive() {
  return (
    <svg viewBox="0 0 87.3 78" width="18" height="16" aria-hidden="true" focusable="false">
      <path d="m6.6 66.85 3.85 6.65c.8 1.4 1.95 2.5 3.3 3.3l13.75-23.8h-27.5c0 1.55.4 3.1 1.2 4.5z" fill="#0066da" />
      <path d="m43.65 25-13.75-23.8c-1.35.8-2.5 1.9-3.3 3.3l-25.4 44c-.8 1.4-1.2 2.95-1.2 4.5h27.5z" fill="#00ac47" />
      <path d="m73.55 76.8c1.35-.8 2.5-1.9 3.3-3.3l1.6-2.75 7.65-13.25c.8-1.4 1.2-2.95 1.2-4.5h-27.502l5.852 11.5z" fill="#ea4335" />
      <path d="m43.65 25 13.75-23.8c-1.35-.8-2.9-1.2-4.5-1.2h-18.5c-1.6 0-3.15.45-4.5 1.2z" fill="#00832d" />
      <path d="m59.8 53h-32.3l-13.75 23.8c1.35.8 2.9 1.2 4.5 1.2h50.8c1.6 0 3.15-.45 4.5-1.2z" fill="#2684fc" />
      <path d="m73.4 26.5-12.7-22c-.8-1.4-1.95-2.5-3.3-3.3l-13.75 23.8 16.15 28h27.45c0-1.55-.4-3.1-1.2-4.5z" fill="#ffba00" />
    </svg>
  );
}

type Resultat = { nom: string; ok: boolean; erreur?: string };

/**
 * Bouton « Importer » : téléverse des documents dans le dossier Drive « À classer »
 * AU NOM de l'utilisateur (jeton OAuth Drive obtenu à la connexion).
 * `onImporte` est appelé après un import réussi (ex. rafraîchir l'explorateur).
 */
export default function ImportDrive({ onImporte }: { onImporte?: () => void } = {}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [occupe, setOccupe] = useState(false);
  const [succes, setSucces] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [reconnexion, setReconnexion] = useState(false);

  async function envoyer(fichiers: FileList) {
    setOccupe(true);
    setSucces(null);
    setErreur(null);
    setReconnexion(false);
    try {
      const form = new FormData();
      Array.from(fichiers).forEach((f) => form.append('fichiers', f));
      const r = await fetch('/api/drive/import', { method: 'POST', body: form });
      const data = await r.json();

      if (!r.ok) {
        if (data.reconnexion) setReconnexion(true);
        throw new Error(data.erreur ?? 'Import refusé.');
      }

      const reussis: number = data.reussis ?? 0;
      const total: number = data.total ?? 0;
      if (reussis === total) {
        setSucces(`${reussis} document(s) importé(s) dans « À classer ».`);
        onImporte?.();
      } else {
        // Au moins un échec → on montre la vraie raison du premier échec.
        const echecs = (data.resultats as Resultat[] | undefined)?.filter((x) => !x.ok) ?? [];
        const raison = echecs[0]?.erreur ?? 'raison inconnue';
        throw new Error(
          reussis > 0
            ? `${reussis}/${total} importé(s). Échec des autres : ${friendly(raison)}`
            : `Échec de l'import : ${friendly(raison)}`,
        );
      }
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="import-drive">
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={(e) => e.target.files && e.target.files.length > 0 && envoyer(e.target.files)}
      />
      <button
        className="bouton bouton-action bouton-drive"
        onClick={() => inputRef.current?.click()}
        disabled={occupe}
      >
        <LogoDrive />
        {occupe ? 'Import en cours…' : 'Importer'}
      </button>

      {succes && <p className="message info import-msg">{succes}</p>}
      {erreur && (
        <p className="message erreur import-msg">
          {erreur}
          {reconnexion && (
            <> <Link href="/connexion" className="import-reco">Autoriser Google Drive →</Link></>
          )}
        </p>
      )}
    </div>
  );
}

/** Rend certains messages techniques plus parlants. */
function friendly(msg: string): string {
  if (/has not been used|is disabled|accessNotConfigured/i.test(msg)) {
    return "l'API Google Drive n'est pas activée (ou pas encore propagée — patiente quelques minutes).";
  }
  if (/File not found/i.test(msg)) {
    return "dossier « À classer » introuvable (vérifie DRIVE_A_CLASSER_URL sur Vercel).";
  }
  if (/insufficient|permission|forbidden|403/i.test(msg)) {
    return "autorisation Drive insuffisante — reconnecte-toi pour accorder l'accès à Google Drive.";
  }
  return msg;
}
