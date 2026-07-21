import {
  parseEuro,
  TYPE_DEPENSE,
  TYPE_REVENU,
  type DonneesBudget,
  type LigneCategorie,
} from '@/lib/budget/schema';

/**
 * Dashboard Budget (composant serveur, lecture seule). Affiche les valeurs
 * telles que le tableur les calcule : KPIs, comptes, jauges Réel/Budget,
 * transactions récentes, échéances à venir.
 */
export default function VueBudget({ d }: { d: DonneesBudget }) {
  const resteNum = parseEuro(d.kpis.reste);
  return (
    <>
      <section aria-label="Chiffres du mois">
        <div className="kpis">
          <Kpi label="Revenus" valeur={d.kpis.revenus} note="salaires du foyer" />
          <Kpi label="Dépenses" valeur={d.kpis.depenses} note="toutes catégories" />
          <div className="kpi k-reste">
            <div className="k-label">Reste ce mois</div>
            <div className={`k-valeur ${resteNum < 0 ? 'negatif' : 'positif'}`}>{d.kpis.reste}</div>
            <div className="k-note">revenus − dépenses</div>
          </div>
          <Kpi label="Patrimoine" valeur={d.kpis.patrimoine} note="comptes cumulés" />
        </div>
      </section>

      {d.soldes.length > 0 && (
        <section aria-label="Soldes des comptes">
          <h2 className="bloc-titre">Soldes des comptes</h2>
          <div className="comptes">
            {d.soldes.map((s) => (
              <div className="compte" key={s.compte}>
                <div className="c-nom">{s.compte}</div>
                <div className={`c-solde ${parseEuro(s.solde) < 0 ? 'negatif' : ''}`}>{s.solde}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {d.categories.length > 0 && (
        <section aria-label="Dépenses par catégorie">
          <h2 className="bloc-titre">Dépenses par catégorie — {d.periode || 'mois en cours'}</h2>
          <div className="jauges">
            {d.categories.map((c) => (
              <Jauge key={c.categorie} c={c} />
            ))}
          </div>
        </section>
      )}

      {d.transactions.length > 0 && (
        <section aria-label="Transactions récentes">
          <h2 className="bloc-titre">Dernières transactions</h2>
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
        <section aria-label="Échéances à venir">
          <h2 className="bloc-titre">Échéances à venir</h2>
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

function Kpi({ label, valeur, note }: { label: string; valeur: string; note: string }) {
  return (
    <div className="kpi">
      <div className="k-label">{label}</div>
      <div className="k-valeur">{valeur}</div>
      <div className="k-note">{note}</div>
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
        {c.reel} / {c.budget}
        {c.depasse && <span className="depasse"> ⚠ {c.ecart}</span>}
      </span>
      <span className="j-piste" role="img" aria-label={`${c.categorie} : ${c.reel} dépensés sur ${c.budget}${c.depasse ? ', budget dépassé' : ''}`}>
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
