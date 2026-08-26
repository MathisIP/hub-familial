'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import Image from 'next/image';

/**
 * Écran de lancement de l'app : logo centré + spinner, le temps que l'accueil
 * soit complet. Une fois les composants asynchrones « prêts » (succès OU erreur
 * — on ne bloque jamais indéfiniment), il disparaît en fondu.
 *
 * Les composants concernés appellent `useSignalPret(cle, pret)`.
 *
 * ⚠ UNIQUEMENT AU LANCEMENT DE L'APP — pas à chaque retour sur l'accueil.
 * Il masquait la page entière à chaque navigation vers `/`, donc : (1) l'app
 * semblait redémarrer à froid alors qu'on ne faisait que changer d'onglet,
 * (2) on cachait derrière un logo du contenu DÉJÀ prêt (salutation, soldes)
 * pour attendre l'agenda, qui dépend d'une API Google, et (3) on enchaînait
 * deux attentes de suite, le squelette d'`app/loading.tsx` puis ce logo.
 * Les sections affichent chacune leur propre « Chargement… » dans leur carte :
 * l'accueil reste parfaitement lisible sans ce voile.
 */
/**
 * Ce que le lancement attend. ⚠ **Volontairement PAS l'agenda** : il interroge
 * Google (une lecture de jeton en base puis un appel externe par calendrier,
 * parfois un renouvellement de jeton). Tenir le logo en otage d'une API tierce
 * revient à afficher un écran figé dès que Google traîne — pour une carte qui
 * sait très bien afficher son propre « Chargement… ». On n'attend donc que nos
 * propres données. `useSignalPret('agenda', …)` continue de fonctionner sans
 * effet : ajouter la clé ici suffirait à réactiver l'attente.
 */
const ATTENDUS = ['documents'] as const;
const DELAI_SECURITE = 8000; // ms : masque le splash même si un composant ne répond pas

/**
 * Distingue « lancement de l'app » de « navigation interne ».
 * Portée module : réinitialisé quand le navigateur (re)charge vraiment la page —
 * ouverture de la PWA, saisie d'URL, rafraîchissement — mais conservé pendant
 * toute la navigation côté client. Exactement la frontière qu'on veut, sans
 * toucher au stockage ni risquer une divergence d'hydratation (au premier rendu
 * client, le module vient d'être évalué : la valeur est la même qu'au serveur).
 *
 * Précision : le drapeau se pose au premier rendu de L'ACCUEIL, pas au démarrage
 * de l'app. Arriver directement sur `/foyer/budget` puis revenir à l'accueil affiche
 * donc le logo cette fois-là — c'est bien la première fois qu'on l'assemble.
 * Les fois suivantes, non.
 */
let dejaLance = false;

const Ctx = createContext<(cle: string) => void>(() => {});

/** À appeler dans un composant : signale « prêt » (une fois) quand `pret` passe à true. */
export function useSignalPret(cle: string, pret: boolean) {
  const signaler = useContext(Ctx);
  useEffect(() => {
    if (pret) signaler(cle);
  }, [pret, cle, signaler]);
}

export default function SplashAccueil({ children }: { children: ReactNode }) {
  const [prets, setPrets] = useState<Set<string>>(new Set());
  const [cache, setCache] = useState(false);
  const signaler = useRef((cle: string) => setPrets((s) => (s.has(cle) ? s : new Set(s).add(cle)))).current;

  // Figé au premier rendu : un simple retour sur l'accueil ne rejoue pas le
  // lancement. `useState` avec initialiseur, et non une lecture directe, pour
  // que la valeur reste stable si React re-rend le composant.
  const [auLancement] = useState(() => !dejaLance);
  useEffect(() => {
    dejaLance = true;
  }, []);

  const tousPrets = ATTENDUS.every((c) => prets.has(c));

  // Sécurité : au bout de quelques secondes, on considère tout prêt.
  useEffect(() => {
    if (!auLancement) return;
    const t = setTimeout(() => setPrets(new Set(ATTENDUS)), DELAI_SECURITE);
    return () => clearTimeout(t);
  }, [auLancement]);

  // Retire complètement le splash du DOM une fois le fondu terminé.
  useEffect(() => {
    if (!tousPrets) return;
    const t = setTimeout(() => setCache(true), 450);
    return () => clearTimeout(t);
  }, [tousPrets]);

  return (
    <Ctx.Provider value={signaler}>
      {children}
      {auLancement && !cache && (
        <div className={`splash${tousPrets ? ' splash-parti' : ''}`} role="status" aria-live="polite" aria-hidden={tousPrets}>
          {/* `priority` : ce logo est le premier élément visible de l'app — le
              charger en différé retarderait précisément ce qu'on veut montrer. */}
          <Image className="splash-logo" src="/icon-192.png" alt="Nestync" width={96} height={96} priority />
          <span className="splash-spinner" aria-hidden="true" />
        </div>
      )}
    </Ctx.Provider>
  );
}
