import {
  parseEuro,
  TYPE_DEPENSE,
  TYPE_REVENU,
  type DonneesBudget,
  type LigneCategorie,
} from '@/lib/budget/schema';
import { t, type IdLangue } from '@/lib/i18n';

/** Couleurs de pastille des comptes (corail + secondaires chaudes), cyclées. */
const DOTS = ['#FF5C7A', '#FF9E6B', '#6FBEEA', '#E7B740', '#9A8CE6', '#5FBE9E'];

/**
 * Dashboard Budget (composant serveur, lecture seule) — direction Corail.
 * KPIs (Reste en tuile héro), soldes des comptes en liste à pastilles, jauges
 * Réel/Budget (dépassement en rouge), transactions et échéances en cartes.
 */
export default function VueBudget({ d, langue = 'fr' }: { d: DonneesBudget; langue?: IdLangue }) {
  const resteNum = parseEuro(d.kpis.reste);
  return (
    <>
      {/* ⚠ Vue partielle : dire d'emblée que ces chiffres ne couvrent pas tout le
          foyer. Sans cette phrase, un membre lirait « Patrimoine » comme le
          patrimoine du foyer alors que c'est le total de SES comptes. */}
      {d.vuePartielle && <p className="bg-partielle">{t('PART_VUE_PARTIELLE', langue)}</p>}

      <div className="bg-kpis">
        <div className="bg-kpi hero">
          <div className="k-l">{t('BUD_RESTE', langue)}</div>
          <div className={`k-v ${resteNum < 0 ? 'neg' : 'pos'}`}>{d.kpis.reste}</div>
          <div className="k-n">{t('BUD_RESTE_N', langue)}</div>
        </div>
        <Kpi l={t('BUD_REVENUS', langue)} v={d.kpis.revenus} n={t('BUD_REVENUS_N', langue)} />
        <Kpi l={t('BUD_DEPENSES', langue)} v={d.kpis.depenses} n={t('BUD_DEPENSES_N', langue)} />
        <Kpi l={t('BUD_PATRIMOINE', langue)} v={d.kpis.patrimoine} n={t('BUD_PATRIMOINE_N', langue)} />
      </div>

      {d.soldes.length > 0 && (
        <section className="card-bloc">
          <h2 className="section-titre">{t('BUD_SOLDES', langue)}</h2>
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
        <section className="card-bloc">
          <h2 className="section-titre">{t('BUD_PAR_CAT', langue)} — {d.periode || t('BUD_MOIS_COURANT', langue)}</h2>
          <div className="jauges">
            {d.categories.map((c) => (
              <Jauge key={c.categorie} c={c} partielle={d.vuePartielle} />
            ))}
          </div>
        </section>
      )}

      {d.transactions.length > 0 && (
        <section className="card-bloc">
          <h2 className="section-titre">{t('BUD_DERNIERES_TX', langue)}</h2>
          <ul className="tx-liste">
            {d.transactions.map((tx, i) => {
              const classe =
                tx.type === TYPE_DEPENSE ? 'depense' : tx.type === TYPE_REVENU ? 'revenu' : 'virement';
              const signe = tx.type === TYPE_DEPENSE ? '−' : tx.type === TYPE_REVENU ? '+' : '';
              return (
                <li className="tx" key={`${tx.date}-${tx.libelle}-${i}`}>
                  <span className="tx-date">{tx.date}</span>
                  <span className="tx-lib">{tx.libelle || t('BUD_SANS_LIBELLE', langue)}</span>
                  <span className="tx-meta">
                    {tx.compte}
                    {tx.dest ? ` → ${tx.dest}` : ''}
                    {tx.categorie ? ` · ${tx.categorie}` : ''}
                  </span>
                  <span className={`tx-montant ${classe}`}>
                    {signe}
                    {tx.montant}
                  </span>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {/* Les échéances vivent désormais dans GestionEcheances (éditable), juste
          en dessous : les répéter ici en lecture seule ferait deux listes
          identiques sur le même écran. */}
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

/**
 * Jauge Réel/Budget d'une catégorie.
 *
 * ⚠ `partielle` supprime la comparaison au budget. Quand des comptes sont
 * masqués, le réel ne compte QUE les dépenses visibles alors que le budget
 * mensuel reste celui du FOYER : la jauge annoncerait « 50 € sur 400 € » à
 * quelqu'un dont le foyer a déjà dépensé 380 €. Mieux vaut ne rien comparer que
 * comparer deux grandeurs qui n'ont pas le même périmètre.
 */
function Jauge({ c, partielle = false }: { c: LigneCategorie; partielle?: boolean }) {
  if (partielle) {
    return (
      <div className="jauge">
        <span className="j-cat">{c.categorie}</span>
        <span className="j-chiffres">{c.reel}</span>
      </div>
    );
  }
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

