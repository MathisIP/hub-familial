import Link from 'next/link';
import { formatEuro, parseEuro, type Solde } from '@/lib/budget/schema';

/** Couleurs de pastille des comptes (corail + secondaires chaudes), cyclées. */
const DOTS = ['#FF5C7A', '#FF9E6B', '#6FBEEA', '#E7B740', '#9A8CE6'];

/**
 * Carte « Mes comptes » de l'accueil (hors épargne) : dégradé corail, une ligne
 * par compte avec pastille, total, et l'action rapide (children) intégrée.
 * Composant serveur. Solde négatif en rouge, chaque ligne cliquable vers /budget.
 */
export default function ResumeComptes({
  soldes,
  children,
}: {
  soldes: Solde[];
  children?: React.ReactNode;
}) {
  if (soldes.length === 0) {
    return children ? <section className="money-card">{children}</section> : null;
  }
  const total = soldes.reduce((s, c) => s + parseEuro(c.solde), 0);

  return (
    <section className="money-card" aria-label="Mes comptes">
      <div className="mc-head">
        <h2 className="mc-titre">Mes comptes</h2>
        <span className="mc-total">Total&nbsp;<b>{formatEuro(total)}</b></span>
      </div>
      <div className="mc-comptes">
        {soldes.map((s, i) => (
          <Link href="/budget" className="mc-compte" key={s.compte}>
            <span className="mc-dot" style={{ background: DOTS[i % DOTS.length] }} />
            <span className="mc-nom">{s.compte}</span>
            <span className={`mc-val ${parseEuro(s.solde) < 0 ? 'neg' : ''}`}>{s.solde}</span>
          </Link>
        ))}
      </div>
      {children && <div className="mc-actions">{children}</div>}
    </section>
  );
}
