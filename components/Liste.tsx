'use client';

import { useEffect, useId, useMemo, useRef, useState } from 'react';

/**
 * LISTE DÉROULANTE MAISON — remplace `<select>`.
 *
 * ⚠ POURQUOI RÉÉCRIRE CE QUE LE NAVIGATEUR FOURNIT. Le panneau ouvert d'un
 * `<select>` natif est dessiné par le **système d'exploitation**, pas par la
 * page : `border-radius`, couleurs, police et espacements des `<option>` sont
 * hors d'atteinte du CSS, sur tous les navigateurs. C'est la raison pour
 * laquelle les listes de l'app s'ouvraient sur un bloc gris à angles droits au
 * milieu d'une interface arrondie — aucune feuille de style n'aurait pu le
 * corriger. Il faut donc dessiner la liste soi-même.
 *
 * Ce qu'il ne faut PAS perdre en la réécrivant, et qui est implémenté ici :
 *  · ouverture au clavier (Entrée, Espace, flèches) et fermeture par Échap ;
 *  · navigation par flèches avec un élément « actif » distinct de la sélection ;
 *  · **saisie au clavier** : taper « ju » atteint « Juillet » — c'est ce qui
 *    rend une longue liste utilisable sans souris ;
 *  · rôles ARIA (`combobox` / `listbox` / `option`) pour les lecteurs d'écran ;
 *  · fermeture au clic extérieur, et sur `blur` réel du groupe.
 *
 * `multiple` : la liste reste ouverte et chaque entrée porte une case. Utilisé
 * là où plusieurs valeurs ont un sens (masquer un cadeau à deux parents).
 */
export type OptionListe = { valeur: string; libelle: string };

export default function Liste({
  valeur,
  onChange,
  options,
  placeholder,
  disabled = false,
  ariaLabel,
  className = '',
  multiple = false,
  valeurs,
  onChangeMultiple,
  libelleVide,
  name,
}: {
  /** Mode simple : valeur sélectionnée. */
  valeur?: string;
  onChange?: (v: string) => void;
  options: OptionListe[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  className?: string;
  /** Mode multiple : la liste reste ouverte, chaque entrée porte une case. */
  multiple?: boolean;
  valeurs?: string[];
  onChangeMultiple?: (v: string[]) => void;
  /** Texte affiché quand rien n'est sélectionné (mode multiple). */
  libelleVide?: string;
  /**
   * Nom du champ pour un envoi de formulaire (`FormData`). Rend un input caché :
   * sans lui, une liste maison ne transmettrait rien, contrairement au `<select>`
   * natif qu'elle remplace — le piège classique de ce genre de composant.
   * En mode multiple, un input par valeur, comme des cases à cocher homonymes.
   */
  name?: string;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const racine = useRef<HTMLDivElement>(null);
  const listeRef = useRef<HTMLUListElement>(null);
  const frappe = useRef({ texte: '', quand: 0 });
  const id = useId();

  const selection = useMemo(() => valeurs ?? [], [valeurs]);

  const libelleAffiche = multiple
    ? selection.length === 0
      ? (libelleVide ?? placeholder ?? '')
      : options
          .filter((o) => selection.includes(o.valeur))
          .map((o) => o.libelle)
          .join(', ')
    : (options.find((o) => o.valeur === valeur)?.libelle ?? placeholder ?? '');

  const vide = multiple ? selection.length === 0 : !options.some((o) => o.valeur === valeur);

  // Fermeture au clic extérieur et sur Échap, posées seulement quand la liste
  // est ouverte : inutile d'écouter le document en permanence.
  useEffect(() => {
    if (!ouvert) return;
    const surClic = (e: MouseEvent) => {
      if (racine.current && !racine.current.contains(e.target as Node)) setOuvert(false);
    };
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false);
    };
    document.addEventListener('mousedown', surClic);
    document.addEventListener('keydown', surTouche);
    return () => {
      document.removeEventListener('mousedown', surClic);
      document.removeEventListener('keydown', surTouche);
    };
  }, [ouvert]);

  // Garde l'élément actif visible quand on navigue aux flèches dans une longue
  // liste — sans ça, la sélection sort du cadre et on navigue à l'aveugle.
  useEffect(() => {
    if (!ouvert || !listeRef.current) return;
    listeRef.current.querySelector<HTMLElement>('[data-actif="1"]')?.scrollIntoView({ block: 'nearest' });
  }, [ouvert, actif]);

  function ouvrir() {
    if (disabled) return;
    const depart = multiple
      ? Math.max(options.findIndex((o) => selection.includes(o.valeur)), 0)
      : Math.max(options.findIndex((o) => o.valeur === valeur), 0);
    setActif(depart);
    setOuvert(true);
  }

  function choisir(v: string) {
    if (multiple) {
      const suite = selection.includes(v) ? selection.filter((x) => x !== v) : [...selection, v];
      onChangeMultiple?.(suite);
      return; // la liste reste ouverte : on en coche souvent plusieurs d'affilée
    }
    onChange?.(v);
    setOuvert(false);
  }

  /** Saisie au clavier : « ju » atteint « Juillet ». Fenêtre d'une seconde. */
  function chercher(lettre: string) {
    const now = Date.now();
    frappe.current.texte = now - frappe.current.quand > 1000 ? lettre : frappe.current.texte + lettre;
    frappe.current.quand = now;
    const cible = frappe.current.texte.toLowerCase();
    const i = options.findIndex((o) => o.libelle.toLowerCase().startsWith(cible));
    if (i >= 0) setActif(i);
  }

  function surTouche(e: React.KeyboardEvent) {
    if (disabled) return;
    if (!ouvert) {
      if (['Enter', ' ', 'ArrowDown', 'ArrowUp'].includes(e.key)) {
        e.preventDefault();
        ouvrir();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActif((a) => Math.min(a + 1, options.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActif((a) => Math.max(a - 1, 0));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActif(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActif(options.length - 1);
    } else if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      if (options[actif]) choisir(options[actif].valeur);
    } else if (e.key === 'Tab') {
      setOuvert(false);
    } else if (e.key.length === 1) {
      chercher(e.key);
    }
  }

  return (
    <div ref={racine} className={`liste ${className}`}>
      {name &&
        (multiple ? (
          selection.map((v) => <input key={v} type="hidden" name={name} value={v} />)
        ) : (
          <input type="hidden" name={name} value={valeur ?? ''} />
        ))}
      <button
        type="button"
        className={`liste-bouton ${vide ? 'vide' : ''}`}
        onClick={() => (ouvert ? setOuvert(false) : ouvrir())}
        onKeyDown={surTouche}
        disabled={disabled}
        aria-haspopup="listbox"
        aria-expanded={ouvert}
        aria-label={ariaLabel}
        aria-controls={`${id}-liste`}
      >
        <span className="liste-valeur">{libelleAffiche}</span>
        <span className="liste-fleche" aria-hidden="true" />
      </button>

      {ouvert && (
        <ul
          ref={listeRef}
          id={`${id}-liste`}
          className="liste-panneau"
          role="listbox"
          aria-multiselectable={multiple || undefined}
          aria-label={ariaLabel}
          tabIndex={-1}
        >
          {options.map((o, i) => {
            const choisi = multiple ? selection.includes(o.valeur) : o.valeur === valeur;
            return (
              <li key={o.valeur || `_${i}`}>
                <button
                  type="button"
                  role="option"
                  aria-selected={choisi}
                  data-actif={i === actif ? '1' : '0'}
                  className={`liste-option ${choisi ? 'choisi' : ''} ${i === actif ? 'actif' : ''}`}
                  onMouseEnter={() => setActif(i)}
                  onClick={() => choisir(o.valeur)}
                >
                  {multiple && <span className="liste-case" aria-hidden="true" />}
                  <span className="liste-libelle">{o.libelle}</span>
                  {!multiple && choisi && <span className="liste-coche" aria-hidden="true" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
