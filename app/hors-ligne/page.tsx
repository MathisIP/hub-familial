import type { Metadata } from 'next';

/**
 * Page de repli affichée par le service worker quand une page non encore mise en
 * cache est demandée sans réseau. Statique et publique (hors authentification),
 * pour rester servable hors ligne.
 */
export const metadata: Metadata = { title: 'Hors ligne — Hub familial' };

export default function HorsLigne() {
  return (
    <div className="connexion">
      <div className="connexion-carte">
        <div className="connexion-logo">📴</div>
        <h1>Hors ligne</h1>
        <p>
          Pas de connexion pour le moment. Le Hub se rechargera dès que le réseau
          reviendra. Les pages déjà consultées restent accessibles.
        </p>
        {/* Rechargement complet volontaire (retente le réseau), pas de nav client. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a className="bouton connexion-bouton" href="/">Réessayer</a>
      </div>
    </div>
  );
}
