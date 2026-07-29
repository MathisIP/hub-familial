'use client';

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/**
 * Écran de chargement de l'accueil : logo centré + spinner, affiché tant que les
 * composants asynchrones (agenda + Drive) ne se sont pas chargés. Une fois les
 * deux « prêts » (succès OU erreur — on ne bloque jamais indéfiniment), le splash
 * disparaît en fondu et l'accueil apparaît d'un coup.
 *
 * Les composants concernés appellent `useSignalPret(cle, pret)`.
 */
const ATTENDUS = ['agenda', 'drive'] as const;
const DELAI_SECURITE = 8000; // ms : masque le splash même si un composant ne répond pas

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

  const tousPrets = ATTENDUS.every((c) => prets.has(c));

  // Sécurité : au bout de quelques secondes, on considère tout prêt.
  useEffect(() => {
    const t = setTimeout(() => setPrets(new Set(ATTENDUS)), DELAI_SECURITE);
    return () => clearTimeout(t);
  }, []);

  // Retire complètement le splash du DOM une fois le fondu terminé.
  useEffect(() => {
    if (!tousPrets) return;
    const t = setTimeout(() => setCache(true), 450);
    return () => clearTimeout(t);
  }, [tousPrets]);

  return (
    <Ctx.Provider value={signaler}>
      {children}
      {!cache && (
        <div className={`splash${tousPrets ? ' splash-parti' : ''}`} role="status" aria-live="polite" aria-hidden={tousPrets}>
          <img className="splash-logo" src="/icon-192.png" alt="Hub familial" width={96} height={96} />
          <span className="splash-spinner" aria-hidden="true" />
        </div>
      )}
    </Ctx.Provider>
  );
}
