'use client';

import { createContext, useContext, type ReactNode } from 'react';
import { t as tBase, type CleUI, type IdLangue } from '@/lib/i18n';

/**
 * Fournit la langue courante (lue du cookie côté serveur, passée par le layout)
 * aux composants CLIENT. `useT()` renvoie une fonction `t` déjà liée à la langue.
 * SSR-cohérent : le serveur rend dans la même langue → pas de flash ni de mismatch.
 */
const LangueContext = createContext<IdLangue>('fr');

export function I18nProvider({ langue, children }: { langue: IdLangue; children: ReactNode }) {
  return <LangueContext.Provider value={langue}>{children}</LangueContext.Provider>;
}

export function useLangue(): IdLangue {
  return useContext(LangueContext);
}

export function useT(): (cle: CleUI) => string {
  const langue = useContext(LangueContext);
  return (cle: CleUI) => tBase(cle, langue);
}
