'use client';

import { useEffect, useState } from 'react';
import Liste from '@/components/Liste';
import { useRouter } from 'next/navigation';
import { useT } from '@/components/I18nProvider';
import type { CleUI } from '@/lib/i18n';
import {
  TYPE_DEPENSE,
  TYPE_REVENU,
  TYPE_VIREMENT,
  type ParametresSaisie,
} from '@/lib/budget/schema';

/** Libellé traduit d'un type d'opération (repli sur la valeur brute). */
const CLE_TYPE: Record<string, CleUI> = {
  [TYPE_DEPENSE]: 'TX_DEPENSE',
  [TYPE_REVENU]: 'TX_REVENU',
  [TYPE_VIREMENT]: 'TX_VIREMENT',
};

/**
 * Bouton « ＋ Ajouter une opération » → ouvre une modale avec le formulaire
 * (dépense / revenu / virement interne). Après écriture, `router.refresh()`
 * relance le rendu serveur : soldes/KPIs recalculés par le tableur. Reproduit la
 * logique du formulaire Google (catégorie ↔ virement).
 */
const PARAMS_VIDE: ParametresSaisie = { comptes: [], types: [], categoriesDepense: [], categoriesRevenu: [] };

export default function SaisieTransaction({ params: paramsInitiaux }: { params?: ParametresSaisie }) {
  const router = useRouter();
  const tr = useT();
  const libType = (ty: string) => (CLE_TYPE[ty] ? tr(CLE_TYPE[ty]) : ty);
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  // Les listes déroulantes : reçues du serveur si dispo, sinon chargées à l'ouverture.
  const [params, setParams] = useState<ParametresSaisie>(paramsInitiaux ?? PARAMS_VIDE);
  const [chargeParams, setChargeParams] = useState(false);

  const typesDispo = params.types.length ? params.types : [TYPE_DEPENSE, TYPE_REVENU, TYPE_VIREMENT];
  const [type, setType] = useState(typesDispo[0] ?? TYPE_DEPENSE);
  const [montant, setMontant] = useState('');
  const [compte, setCompte] = useState('');
  const [dest, setDest] = useState('');
  const [categorie, setCategorie] = useState('');
  const [libelle, setLibelle] = useState('');
  const [date, setDate] = useState(''); // yyyy-mm-dd ; vide = aujourd'hui

  const estVirement = type === TYPE_VIREMENT;
  const categories = type === TYPE_REVENU ? params.categoriesRevenu : params.categoriesDepense;

  // Fermeture à la touche Échap.
  useEffect(() => {
    if (!ouvert) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [ouvert]);

  // Si les listes n'ont pas été fournies par le serveur, les charger à l'ouverture.
  useEffect(() => {
    if (!ouvert || params.comptes.length > 0 || chargeParams) return;
    setChargeParams(true);
    fetch('/api/budget/parametres', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error('Chargement des comptes impossible.'))))
      .then((p: ParametresSaisie) => setParams(p))
      .catch((e) => setErreur(e instanceof Error ? e.message : String(e)));
  }, [ouvert, params.comptes.length, chargeParams]);

  function reset() {
    setMontant('');
    setCompte('');
    setDest('');
    setCategorie('');
    setLibelle('');
    setDate('');
  }

  async function soumettre(e: React.FormEvent) {
    e.preventDefault();
    setErreur(null);
    setInfo(null);

    const valeur = parseFloat(montant.replace(',', '.'));
    if (!Number.isFinite(valeur) || valeur <= 0) { setErreur(tr('SAISIE_ERR_MONTANT')); return; }
    if (!compte) { setErreur(tr('SAISIE_ERR_COMPTE')); return; }
    if (estVirement && !dest) { setErreur(tr('SAISIE_ERR_VIREMENT')); return; }

    const dateLabel = date ? `${date.slice(8, 10)}/${date.slice(5, 7)}/${date.slice(0, 4)}` : '';
    setOccupe(true);
    try {
      const r = await fetch('/api/budget', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type, montant: valeur, compte,
          dest: estVirement ? dest : '',
          categorie: estVirement ? '' : categorie,
          libelle, dateLabel,
        }),
      });
      if (!r.ok) throw new Error((await r.json()).erreur ?? tr('G_ERR_ACTION'));
      reset();
      setInfo(tr('SAISIE_OK'));
      router.refresh(); // met à jour les soldes de l'accueil / le dashboard
    } catch (e2) {
      setErreur(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      <button className="bouton bouton-primaire saisie-cta" onClick={() => { setOuvert(true); setInfo(null); setErreur(null); }}>
        ＋ {tr('SAISIE_CTA')}
      </button>

      {ouvert && (
        <div className="modale-fond" onClick={() => setOuvert(false)} role="presentation">
          <div className="modale" role="dialog" aria-modal="true" aria-label={tr('SAISIE_CTA')} onClick={(e) => e.stopPropagation()}>
            <div className="modale-tete">
              <h2>{tr('SAISIE_CTA')}</h2>
              <button className="modale-fermer" onClick={() => setOuvert(false)} aria-label={tr('G_FERMER')}>✕</button>
            </div>

            <div className="type-choix" role="tablist">
              {typesDispo.map((ty) => (
                <button key={ty} role="tab" aria-selected={type === ty}
                  className={`type-btn${type === ty ? ' actif' : ''}`} onClick={() => setType(ty)}>
                  {libType(ty)}
                </button>
              ))}
            </div>

            {erreur && <p className="message erreur">{erreur}</p>}
            {info && <p className="message info">{info}</p>}

            <form className="saisie-form" onSubmit={soumettre}>
              <label className="saisie-champ">
                <span>{tr('SAISIE_MONTANT')}</span>
                <input className="champ" inputMode="decimal" placeholder="0,00" value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus />
              </label>

              <label className="saisie-champ">
                <span>{estVirement ? tr('SAISIE_COMPTE_DEP') : tr('SAISIE_COMPTE')}</span>
                <Liste
                  valeur={compte}
                  onChange={setCompte}
                  options={params.comptes.map((c) => ({ valeur: c, libelle: c }))}
                  placeholder="—"
                  ariaLabel={tr('SAISIE_COMPTE')}
                />
              </label>

              {estVirement ? (
                <label className="saisie-champ">
                  <span>{tr('SAISIE_COMPTE_DEST')}</span>
                  <Liste
                    valeur={dest}
                    onChange={setDest}
                    options={params.comptes
                      .filter((c) => c !== compte)
                      .map((c) => ({ valeur: c, libelle: c }))}
                    placeholder="—"
                    ariaLabel={tr('SAISIE_COMPTE_DEST')}
                  />
                </label>
              ) : (
                <label className="saisie-champ">
                  <span>{tr('SAISIE_CATEGORIE')}</span>
                  <Liste
                    valeur={categorie}
                    onChange={setCategorie}
                    options={categories.map((c) => ({ valeur: c, libelle: c }))}
                    placeholder="—"
                    ariaLabel={tr('SAISIE_CATEGORIE')}
                  />
                </label>
              )}

              <label className="saisie-champ">
                <span>{tr('SAISIE_LIBELLE')}</span>
                <input className="champ" placeholder={tr('SAISIE_LIBELLE_PH')} value={libelle} onChange={(e) => setLibelle(e.target.value)} />
              </label>

              <label className="saisie-champ">
                <span>{tr('SAISIE_DATE')}</span>
                <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>

              <div className="saisie-actions">
                <button className="bouton discret" type="button" onClick={() => setOuvert(false)} disabled={occupe}>{tr('G_FERMER')}</button>
                <button className="bouton" type="submit" disabled={occupe}>{occupe ? tr('SAISIE_ENREG_EN_COURS') : tr('G_ENREGISTRER')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
