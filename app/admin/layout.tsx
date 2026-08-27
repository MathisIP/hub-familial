import { notFound } from 'next/navigation';
import Link from 'next/link';
import { estAdminComptes } from '@/lib/comptes/service';
import './admin.css';

/**
 * ENVELOPPE DE LA CONSOLE — garde d'accès et navigation.
 *
 * ⚠ **LA GARDE EST ICI *ET* DANS CHAQUE PAGE.** Une page ne doit jamais faire
 * reposer sa protection sur son enveloppe : il suffirait qu'un jour une route
 * soit déplacée hors de ce dossier pour qu'elle devienne publique sans que rien
 * ne le signale. La redondance ne coûte qu'un appel, déjà mis en cache par la
 * requête en cours.
 *
 * ⚠ `notFound()` et non « accès refusé » : pour toute autre personne, y compris
 * un membre du même foyer, cette adresse n'existe pas. Un refus explicite
 * révélerait qu'il y a quelque chose à trouver.
 *
 * ⚠ **N'appelle PAS `exigerAcces()`.** Lier la console à l'abonnement du foyer
 * la fermerait le jour de l'expiration de l'essai — précisément le moment où
 * l'on veut regarder ses chiffres.
 */
export default async function LayoutAdmin({ children }: { children: React.ReactNode }) {
  if (!(await estAdminComptes())) notFound();

  return (
    <div className="nsa">
      <nav className="nsa-nav" aria-label="Sections de l’administration">
        <Link href="/admin">Où j’en suis</Link>
        <Link href="/admin/modele">Modèle économique</Link>
        <Link href="/admin/paliers">Paliers &amp; leviers</Link>
        <Link href="/comptes">Comptes du projet</Link>
      </nav>
      {children}
    </div>
  );
}
