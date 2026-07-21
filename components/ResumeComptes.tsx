import Link from 'next/link';
import { parseEuro, type Solde } from '@/lib/budget/schema';

/**
 * Résumé des comptes sur l'accueil (hors épargne) : une tuile par compte, solde
 * négatif en rouge. Cliquable vers le module Budget. Composant serveur.
 */
export default function ResumeComptes({ soldes }: { soldes: Solde[] }) {
  if (soldes.length === 0) return null;
  return (
    <section aria-label="Soldes des comptes" className="resume-comptes">
      <div className="rc-entete">
        <h2 className="bloc-titre">Mes comptes</h2>
        <Link href="/budget" className="rc-lien">Voir le budget →</Link>
      </div>
      <div className="comptes">
        {soldes.map((s) => (
          <Link href="/budget" className="compte compte-lien" key={s.compte}>
            <span className="c-nom">{s.compte}</span>
            <span className={`c-solde ${parseEuro(s.solde) < 0 ? 'negatif' : ''}`}>{s.solde}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
