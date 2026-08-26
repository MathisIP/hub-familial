'use client';

import { useState } from 'react';
import { useT } from '@/components/I18nProvider';
import { erreurDeReponse } from '@/lib/api-client';

/**
 * « Valider la liste » — prévenir les membres choisis que les courses sont
 * prêtes.
 *
 * ⚠ EXTRAIT DE LA CARTE D'ACCUEIL LE 25/08/2026, pour être posé aussi dans le
 * module To-Do. Le bouton n'existait que sur l'accueil : on le cherchait
 * naturellement à côté de la liste elle-même, là où on vient de la finir.
 * Dupliquer quarante lignes aurait garanti que les deux versions divergent —
 * l'une corrigée, l'autre oubliée.
 *
 * ⚠ LA NOTIFICATION NE CONTIENT PAS LA LISTE. Elle annonce seulement qu'elle
 * est prête, et le clic ouvre l'application. Une notification s'affiche sur un
 * écran verrouillé, donc devant quiconque tient le téléphone — et le contenu
 * des courses n'a pas à y être lisible. C'est la même raison qui a fait retirer
 * l'envoi par message le 16/08/2026.
 */

type Apercu = {
  articles: number;
  membres: { utilisateurId: string; nom: string }[];
  pushDisponible: boolean;
};

export default function ValiderCourses({ compact = false }: { compact?: boolean }) {
  const tr = useT();
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [apercu, setApercu] = useState<Apercu | null>(null);
  const [destinataires, setDestinataires] = useState<string[]>([]);

  /** Ouvre le choix des destinataires, tous cochés par défaut. */
  async function ouvrir() {
    setMessage(null);
    setErreur(null);
    setOccupe(true);
    try {
      const r = await fetch('/api/todo/courses/valider', { cache: 'no-store' });
      if (!r.ok) throw new Error(await erreurDeReponse(r, tr('G_ERR_CHARGEMENT')));
      const data = (await r.json()) as Apercu;
      if (data.articles === 0) {
        setErreur(tr('CS_VIDE'));
        return;
      }
      setApercu(data);
      setDestinataires(data.membres.map((m) => m.utilisateurId));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  async function envoyer() {
    setOccupe(true);
    setErreur(null);
    try {
      const r = await fetch('/api/todo/courses/valider', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ utilisateurs: destinataires }),
      });
      if (!r.ok) throw new Error(await erreurDeReponse(r, tr('G_ERR_ACTION')));
      const data = await r.json();
      // ⚠ `envoyes` compte les APPAREILS joints, pas les personnes. Le dire
      // évite de croire quelqu'un prévenu alors qu'il n'a jamais activé les
      // notifications.
      setMessage(data.envoyes > 0 ? tr('CS_VALIDER_OK') : tr('CS_VALIDER_AUCUN_ABO'));
      setApercu(null);
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <div className="valider-courses">
      <button
        className={compact ? 'bouton' : 'bouton bouton-primaire'}
        onClick={ouvrir}
        disabled={occupe}
        type="button"
      >
        {tr('CS_VALIDER')}
      </button>

      {message && <p className="message info">{message}</p>}
      {erreur && <p className="message erreur">{erreur}</p>}

      {apercu && (
        <div className="cs-validation">
          <h3>{tr('CS_VALIDER_TITRE')}</h3>
          <p className="cs-validation-sous">{tr('CS_VALIDER_SOUS')}</p>
          <ul className="cs-destinataires">
            {apercu.membres.map((m) => (
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
          {!apercu.pushDisponible && <p className="message erreur">{tr('NOTIF_INDISPO')}</p>}
          <div className="cs-validation-actions">
            <button
              className="bouton bouton-primaire"
              onClick={envoyer}
              disabled={occupe || destinataires.length === 0}
              type="button"
            >
              {tr('CS_VALIDER_ENVOYER')}
            </button>
            <button
              className="bouton discret"
              onClick={() => setApercu(null)}
              disabled={occupe}
              type="button"
            >
              {tr('G_ANNULER')}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
