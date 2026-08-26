import Link from 'next/link';
import { formatEuro, parseEuro, type Solde } from '@/lib/budget/schema';
import { t, type IdLangue } from '@/lib/i18n';

/** Couleurs de pastille des comptes (corail + secondaires chaudes), cyclées. */
const DOTS = ['#FF5C7A', '#FF9E6B', '#6FBEEA', '#E7B740', '#9A8CE6'];

/**
 * Carte « Mes comptes » de l'accueil (hors épargne) : dégradé corail, une ligne
 * par compte avec pastille, total, et l'action rapide (children) intégrée.
 * Composant serveur. Solde négatif en rouge, chaque ligne cliquable vers /budget.
 */
export default function ResumeComptes({
  soldes,
  langue = 'fr',
  children,
}: {
  soldes: Solde[];
  langue?: IdLangue;
  children?: React.ReactNode;
}) {
  if (soldes.length === 0) {
    return children ? <section className="money-card">{children}</section> : null;
  }
  const total = soldes.reduce((s, c) => s + parseEuro(c.solde), 0);

  return (
    <section className="money-card" aria-label={t('CARD_COMPTES', langue)}>
      <div className="mc-head">
        <h2 className="mc-titre">{t('CARD_COMPTES', langue)}</h2>
        <span className="mc-total">{t('CARD_TOTAL', langue)}&nbsp;<b>{formatEuro(total)}</b></span>
      </div>
      <div className="mc-comptes">
        {soldes.map((s, i) => (
          <Link href="/foyer/budget" className="mc-compte" key={s.compte}>
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
