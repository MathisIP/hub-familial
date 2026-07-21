'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  TYPE_DEPENSE,
  TYPE_REVENU,
  TYPE_VIREMENT,
  type ParametresSaisie,
} from '@/lib/budget/schema';

/**
 * Bouton « ＋ Ajouter une opération » → ouvre une modale avec le formulaire
 * (dépense / revenu / virement interne). Après écriture, `router.refresh()`
 * relance le rendu serveur : soldes/KPIs recalculés par le tableur. Reproduit la
 * logique du formulaire Google (catégorie ↔ virement).
 */
export default function SaisieTransaction({ params }: { params: ParametresSaisie }) {
  const router = useRouter();
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

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
    if (!Number.isFinite(valeur) || valeur <= 0) { setErreur('Montant : un nombre positif est attendu.'); return; }
    if (!compte) { setErreur('Choisis un compte.'); return; }
    if (estVirement && !dest) { setErreur('Un virement interne exige un compte de destination.'); return; }

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
      if (!r.ok) throw new Error((await r.json()).erreur ?? 'Enregistrement refusé.');
      reset();
      setInfo('Opération enregistrée ✓');
      router.refresh(); // met à jour les soldes de l'accueil / le dashboard
    } catch (e2) {
      setErreur(e2 instanceof Error ? e2.message : String(e2));
    } finally {
      setOccupe(false);
    }
  }

  return (
    <>
      <button className="bouton bouton-action" onClick={() => { setOuvert(true); setInfo(null); setErreur(null); }}>
        ＋ Ajouter une opération
      </button>

      {ouvert && (
        <div className="modale-fond" onClick={() => setOuvert(false)} role="presentation">
          <div className="modale" role="dialog" aria-modal="true" aria-label="Ajouter une opération" onClick={(e) => e.stopPropagation()}>
            <div className="modale-tete">
              <h2>Ajouter une opération</h2>
              <button className="modale-fermer" onClick={() => setOuvert(false)} aria-label="Fermer">✕</button>
            </div>

            <div className="type-choix" role="tablist" aria-label="Type d'opération">
              {typesDispo.map((ty) => (
                <button key={ty} role="tab" aria-selected={type === ty}
                  className={`type-btn${type === ty ? ' actif' : ''}`} onClick={() => setType(ty)}>
                  {ty}
                </button>
              ))}
            </div>

            {erreur && <p className="message erreur">{erreur}</p>}
            {info && <p className="message info">{info}</p>}

            <form className="saisie-form" onSubmit={soumettre}>
              <label className="saisie-champ">
                <span>Montant (€)</span>
                <input className="champ" inputMode="decimal" placeholder="0,00" value={montant} onChange={(e) => setMontant(e.target.value)} autoFocus />
              </label>

              <label className="saisie-champ">
                <span>{estVirement ? 'Compte de départ' : 'Compte'}</span>
                <select className="champ" value={compte} onChange={(e) => setCompte(e.target.value)}>
                  <option value="">—</option>
                  {params.comptes.map((c) => <option key={c} value={c}>{c}</option>)}
                </select>
              </label>

              {estVirement ? (
                <label className="saisie-champ">
                  <span>Compte de destination</span>
                  <select className="champ" value={dest} onChange={(e) => setDest(e.target.value)}>
                    <option value="">—</option>
                    {params.comptes.filter((c) => c !== compte).map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              ) : (
                <label className="saisie-champ">
                  <span>Catégorie</span>
                  <select className="champ" value={categorie} onChange={(e) => setCategorie(e.target.value)}>
                    <option value="">—</option>
                    {categories.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </label>
              )}

              <label className="saisie-champ">
                <span>Libellé</span>
                <input className="champ" placeholder="ex. Courses" value={libelle} onChange={(e) => setLibelle(e.target.value)} />
              </label>

              <label className="saisie-champ">
                <span>Date</span>
                <input className="champ" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>

              <div className="saisie-actions">
                <button className="bouton discret" type="button" onClick={() => setOuvert(false)} disabled={occupe}>Fermer</button>
                <button className="bouton" type="submit" disabled={occupe}>{occupe ? 'Enregistrement…' : 'Enregistrer'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
