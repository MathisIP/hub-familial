'use client';

import { usePathname } from 'next/navigation';
import ReglagesApparence from '@/components/ReglagesApparence';
import BasculeNeon from '@/components/BasculeNeon';

/**
 * Pages affichées SANS la navigation de l'app (ni rail, ni bandeau, ni pied) :
 *  · les pages publiques, consultables sans session ;
 *  · les parcours « en tunnel » — prise en main et arrivée sans foyer : y montrer
 *    les onglets inviterait à s'en échapper, alors que ces étapes doivent être
 *    menées à leur terme (les modules renverraient de toute façon ici).
 */
const SANS_NAVIGATION = [
  '/connexion',
  '/conditions',
  '/confidentialite',
  '/mentions-legales',
  '/aide',
  '/hors-ligne',
  '/rejoindre',
  '/rejoindre-foyer',
  '/bienvenue',
  '/demarrage',
];
export function sansNavigation(path: string | null): boolean {
  return !!path && SANS_NAVIGATION.some((p) => path === p || path.startsWith(p + '/'));
}

/**
 * Pied de page partagé (toutes les pages authentifiées) : choix de la couleur du
 * thème, bascule clair/sombre et accès aux réglages. Centralisé ici pour être
 * identique partout.
 */
export default function PiedDePage() {
  const path = usePathname();
  if (sansNavigation(path)) return null;

  return (
    <footer className="pied">
      <div className="pied-inner">
        <ReglagesApparence />
        <BasculeNeon variante="icone" />
      </div>
    </footer>
  );
}
