'use client';

import { useCallback, useEffect, useState } from 'react';
import { useT } from '@/components/I18nProvider';

/**
 * Réglages des notifications : autoriser l'appareil, puis choisir ce qu'on veut
 * recevoir.
 *
 * ⚠ LA DEMANDE DE PERMISSION DOIT PARTIR D'UN CLIC. iOS refuse
 * `Notification.requestPermission()` hors d'un geste de l'utilisateur — et
 * accepte le push **uniquement pour une PWA ajoutée à l'écran d'accueil**
 * (iOS 16.4+). Dans un onglet Safari, `PushManager` n'existe même pas : d'où le
 * message d'explication plutôt qu'un bouton qui ne ferait rien.
 *
 * ⚠ Les textes des notifications restent volontairement pauvres (« La liste de
 * courses est prête ») : ils s'affichent sur un écran verrouillé. Le détail
 * n'arrive qu'après le clic, dans l'app.
 */
type Etat = {
  disponible: boolean;
  clePublique: string;
  abonne: boolean;
  courses: boolean;
  evenements: boolean;
  echeances: boolean;
};

/**
 * base64url → octets, format attendu par `applicationServerKey`.
 * Le `ArrayBuffer` explicite évite le type `ArrayBufferLike` que TypeScript
 * refuse ici (il n'exclut pas `SharedArrayBuffer`, interdit par l'API).
 */
function versOctets(base64: string): ArrayBuffer {
  const bourrage = '='.repeat((4 - (base64.length % 4)) % 4);
  const brut = atob((base64 + bourrage).replace(/-/g, '+').replace(/_/g, '/'));
  const tampon = new ArrayBuffer(brut.length);
  const vue = new Uint8Array(tampon);
  for (let i = 0; i < brut.length; i++) vue[i] = brut.charCodeAt(i);
  return tampon;
}

export default function ReglagesNotifications() {
  const tr = useT();
  const [etat, setEtat] = useState<Etat | null>(null);
  const [occupe, setOccupe] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [erreur, setErreur] = useState<string | null>(null);
  const [supporte, setSupporte] = useState(true);

  useEffect(() => {
    setSupporte(
      typeof window !== 'undefined' &&
        'serviceWorker' in navigator &&
        'PushManager' in window &&
        'Notification' in window,
    );
    fetch('/api/notifications', { cache: 'no-store' })
      .then((r) => r.json())
      .then(setEtat)
      .catch(() => setErreur(tr('G_ERR_CHARGEMENT')));
  }, [tr]);

  const activer = useCallback(async () => {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') {
        setErreur(tr('NOTIF_REFUSEE'));
        return;
      }
      const sw = await navigator.serviceWorker.ready;
      const abo = await sw.pushManager.subscribe({
        userVisibleOnly: true, // exigé par les navigateurs : pas de push silencieux
        applicationServerKey: versOctets(etat!.clePublique),
      });
      const j = abo.toJSON() as { endpoint?: string; keys?: { p256dh: string; auth: string } };
      const r = await fetch('/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          endpoint: j.endpoint,
          p256dh: j.keys?.p256dh,
          auth: j.keys?.auth,
          appareil: navigator.userAgent.slice(0, 80),
        }),
      });
      if (!r.ok) throw new Error((await r.json()).erreur ?? tr('G_ERR_ACTION'));
      setEtat((e) => (e ? { ...e, abonne: true } : e));
      setMessage(tr('NOTIF_ACTIVEE'));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }, [etat, tr]);

  const desactiver = useCallback(async () => {
    setOccupe(true);
    setErreur(null);
    setMessage(null);
    try {
      const sw = await navigator.serviceWorker.ready;
      const abo = await sw.pushManager.getSubscription();
      if (abo) {
        await fetch('/api/notifications', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: abo.endpoint }),
        });
        await abo.unsubscribe();
      }
      setEtat((e) => (e ? { ...e, abonne: false } : e));
      setMessage(tr('NOTIF_DESACTIVEE'));
    } catch (e) {
      setErreur(e instanceof Error ? e.message : String(e));
    } finally {
      setOccupe(false);
    }
  }, [tr]);

  async function basculer(cle: 'courses' | 'evenements' | 'echeances', valeur: boolean) {
    setEtat((e) => (e ? { ...e, [cle]: valeur } : e));
    await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [cle]: valeur }),
    });
  }

  if (!etat) return null;

  if (!etat.disponible) {
    return (
      <section className="compte-bloc">
        <h2 className="bloc-titre">{tr('NOTIF_TITRE')}</h2>
        <p className="compte-note">{tr('NOTIF_INDISPO')}</p>
      </section>
    );
  }

  return (
    <section className="compte-bloc">
      <h2 className="bloc-titre">{tr('NOTIF_TITRE')}</h2>
      <p className="compte-note">{tr('NOTIF_SOUS')}</p>

      {!supporte ? (
        // iOS en onglet Safari : `PushManager` n'existe pas. Un bouton qui ne
        // ferait rien serait pire qu'une explication.
        <p className="compte-note notif-ios">{tr('NOTIF_INSTALLER')}</p>
      ) : etat.abonne ? (
        <>
          <ul className="notif-choix">
            <Choix
              actif={etat.courses}
              onChangeAction={(v) => basculer('courses', v)}
              titre={tr('NOTIF_COURSES')}
              detail={tr('NOTIF_COURSES_D')}
              occupe={occupe}
            />
            <Choix
              actif={etat.evenements}
              onChangeAction={(v) => basculer('evenements', v)}
              titre={tr('NOTIF_EVENEMENTS')}
              detail={tr('NOTIF_EVENEMENTS_D')}
              occupe={occupe}
            />
            <Choix
              actif={etat.echeances}
              onChangeAction={(v) => basculer('echeances', v)}
              titre={tr('NOTIF_ECHEANCES')}
              detail={tr('NOTIF_ECHEANCES_D')}
              occupe={occupe}
            />
          </ul>
          <button type="button" className="bouton discret" onClick={desactiver} disabled={occupe}>
            {tr('NOTIF_DESACTIVER')}
          </button>
        </>
      ) : (
        <button type="button" className="bouton bouton-action" onClick={activer} disabled={occupe}>
          {tr('NOTIF_ACTIVER')}
        </button>
      )}

      {message && <p className="message info">{message}</p>}
      {erreur && <p className="message erreur">{erreur}</p>}
    </section>
  );
}

function Choix({
  actif,
  onChangeAction,
  titre,
  detail,
  occupe,
}: {
  actif: boolean;
  onChangeAction: (v: boolean) => void;
  titre: string;
  detail: string;
  occupe: boolean;
}) {
  return (
    <li className="notif-ligne">
      <label className="notif-case">
        <input
          type="checkbox"
          checked={actif}
          disabled={occupe}
          onChange={(e) => onChangeAction(e.target.checked)}
        />
        <span>
          <span className="notif-titre">{titre}</span>
          <span className="notif-detail">{detail}</span>
        </span>
      </label>
    </li>
  );
}
