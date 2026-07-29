'use client';

import { usePathname } from 'next/navigation';
import ReglagesApparence from '@/components/ReglagesApparence';

/** Pages publiques (sans session) : pas de barre ni de pied de page. */
const PUBLIQUES = ['/connexion', '/confidentialite', '/hors-ligne', '/rejoindre'];
export function estPublique(path: string | null): boolean {
  return !!path && PUBLIQUES.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Pied de page partagé (toutes les pages authentifiées) : choix de la couleur du
 * thème, bascule clair/sombre et accès aux réglages. Centralisé ici pour être
 * identique partout.
 */
export default function PiedDePage() {
  const path = usePathname();
  if (estPublique(path)) return null;

  return (
    <footer className="pied">
      <div className="pied-inner">
        <ReglagesApparence />
      </div>
    </footer>
  );
}
