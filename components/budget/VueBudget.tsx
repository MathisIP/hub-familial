import {
  parseEuro,
  TYPE_DEPENSE,
  TYPE_REVENU,
  type DonneesBudget,
  type LigneCategorie,
} from '@/lib/budget/schema';

/** Couleurs de pastille des comptes (corail + secondaires chaudes), cyclées. */
const DOTS = ['#FF5C7A', '#FF9E6B', '#6FBEEA', '#E7B740', '#9A8CE6', '#5FBE9E'];

/**
 * Dashboard Budget (composant serveur, lecture seule) — direction Corail.
 * KPIs (Reste en tuile héro), soldes des comptes en liste à pastilles, jauges
 * Réel/Budget (dépassement en rouge), transactions et échéances en cartes.
 */
export default function VueBudget({ d }: { d: DonneesBudget }) {
  const resteNum = parseEuro(d.kpis.reste);
  return (
    <>
      <div className="bg-kpis" aria-label="Chiffres du mois">
        <div className="bg-kpi hero">
          <div className="k-l">Reste ce mois</div>
          <div className={`k-v ${resteNum < 0 ? 'neg' : 'pos'}`}>{d.kpis.reste}</div>
          <div className="k-n">revenus − dépenses</div>
        </div>
        <Kpi l="Revenus" v={d.kpis.revenus} n="salaires du foyer" />
        <Kpi l="Dépenses" v={d.kpis.depenses} n="toutes catégories" />
        <Kpi l="Patrimoine" v={d.kpis.patrimoine} n="comptes cumulés" />
      </div>

      {d.soldes.length > 0 && (
        <section className="card-bloc" aria-label="Soldes des comptes">
          <h2 className="section-titre">Soldes des comptes</h2>
          <div className="bg-comptes">
            {d.soldes.map((s, i) => (
              <div className="bg-compte" key={s.compte}>
                <span className="bg-dot" style={{ background: DOTS[i % DOTS.length] }} />
                <span className="bg-nom">{s.compte}</span>
                <span className={`bg-val ${parseEuro(s.solde) < 0 ? 'neg' : ''}`}>{s.solde}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {d.categories.length > 0 && (
        <section className="card-bloc" aria-label="Dépenses par catégorie">
          <h2 className="section-titre">Dépenses par catégorie — {d.periode || 'mois en cours'}</h2>
          <div className="jauges">
            {d.categories.map((c) => (
              <Jauge key={c.categorie} c={c} />
            ))}
          </div>
        </section>
      )}

      {d.transactions.length > 0 && (
        <section className="card-bloc" aria-label="Transactions récentes">
          <h2 className="section-titre">Dernières transactions</h2>
          <ul className="tx-liste">
            {d.transactions.map((t, i) => {
              const classe =
                t.type === TYPE_DEPENSE ? 'depense' : t.type === TYPE_REVENU ? 'revenu' : 'virement';
              const signe = t.type === TYPE_DEPENSE ? '−' : t.type === TYPE_REVENU ? '+' : '';
              return (
                <li className="tx" key={`${t.date}-${t.libelle}-${i}`}>
                  <span className="tx-date">{t.date}</span>
                  <span className="tx-lib">{t.libelle || '(sans libellé)'}</span>
                  <span className="tx-meta">
                    {t.compte}
                    {t.dest ? ` → ${t.dest}` : ''}
                    {t.categorie ? ` · ${t.categorie}` : ''}
                  </span>
                  <span className={`tx-montant ${classe}`}>
                    {signe}
                    {t.montant}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {d.echeances.length > 0 && (
        <section className="card-bloc" aria-label="Échéances à venir">
          <h2 className="section-titre">Échéances à venir</h2>
          <ul className="ech-liste">
            {d.echeances.map((e, i) => (
              <li className="ech" key={`${e.libelle}-${i}`}>
                <span className="e-lib">{e.libelle}</span>
                {e.recurrence !== 'Aucune' && <span className="e-date">↻ {e.recurrence}</span>}
                <span className="e-date">{e.date}</span>
                {e.joursRestants !== null && (
                  <span className={`e-quand ${e.joursRestants <= 30 ? 'proche' : ''}`}>
                    {libelleJours(e.joursRestants)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </>
  );
}

function Kpi({ l, v, n }: { l: string; v: string; n: string }) {
  return (
    <div className="bg-kpi">
      <div className="k-l">{l}</div>
      <div className="k-v">{v}</div>
      <div className="k-n">{n}</div>
    </div>
  );
}

function Jauge({ c }: { c: LigneCategorie }) {
  const base = Math.max(c.budgetNum, c.reelNum, 0);
  const dansBudget = Math.min(c.reelNum, c.budgetNum > 0 ? c.budgetNum : c.reelNum);
  const depassement = Math.max(c.reelNum - c.budgetNum, 0);
  const pctRempli = base > 0 ? (Math.max(dansBudget, 0) / base) * 100 : 0;
  const pctDepasse = base > 0 ? (depassement / base) * 100 : 0;
  return (
    <div className="jauge">
      <span className="j-cat">{c.categorie}</span>
      <span className="j-chiffres">
        {c.depasse && <span className="depasse">⚠ </span>}
        {c.reel} / {c.budget}
      </span>
      <span
        className="j-piste"
        role="img"
        aria-label={`${c.categorie} : ${c.reel} dépensés sur ${c.budget}${c.depasse ? ', budget dépassé' : ''}`}
      >
        {pctRempli > 0 && <span className="j-remplissage" style={{ width: `${pctRempli}%` }} />}
        {pctDepasse > 0 && <span className="j-depassement" style={{ width: `${pctDepasse}%` }} />}
      </span>
    </div>
  );
}

function libelleJours(j: number): string {
  if (j === 0) return "aujourd'hui";
  if (j === 1) return 'demain';
  return `dans ${j} j`;
}
