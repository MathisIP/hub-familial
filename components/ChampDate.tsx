'use client';

import { useLayoutEffect, useRef, useState } from 'react';
import { saisirDate } from '@/lib/date-saisie';

/**
 * CHAMP DE SAISIE D'UNE DATE « jj/mm/aaaa », séparateurs posés automatiquement.
 *
 * ⚠ POURQUOI PAS `type="date"`. Le sélecteur natif renverrait « aaaa-mm-jj »,
 * alors que l'échéance est stockée en texte « jj/mm/aaaa » : les tâches se
 * trieraient de travers sans que rien ne le signale. Le format vient du
 * classeur d'origine (cf. lib/todo/schema.ts) et n'est pas le sujet ici.
 *
 * ⚠ CE QUE ÇA CORRIGE. Les champs de date gardent `inputMode="numeric"`, qui est
 * le bon réglage — il fait apparaître le pavé numérique sur mobile. Mais une
 * partie des pavés numériques d'Android et d'iOS **n'offrent pas le « / »** : il
 * fallait basculer sur le clavier alphabétique au milieu de sa date. Signalé par
 * un testeur le 27/08/2026. On tape désormais huit chiffres, rien d'autre.
 *
 * Fonctionne en contrôlé (`value` + `onChange`) comme en non contrôlé
 * (`defaultValue` + `name`, pour les formulaires à action serveur).
 */
export default function ChampDate({
  value,
  onChange,
  defaultValue = '',
  name,
  className = 'champ',
  placeholder = 'jj/mm/aaaa',
  disabled,
  required,
  autoFocus,
  ariaLabel,
}: {
  value?: string;
  onChange?: (v: string) => void;
  defaultValue?: string;
  name?: string;
  className?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  autoFocus?: boolean;
  ariaLabel?: string;
}) {
  const [interne, setInterne] = useState(defaultValue);
  const controle = value !== undefined;
  const affiche = controle ? value : interne;

  const ref = useRef<HTMLInputElement>(null);
  /** Position à restaurer après le rendu ; `null` = ne pas y toucher. */
  const caretVoulu = useRef<number | null>(null);

  /*
   * ⚠ `useLayoutEffect` ET PAS `useEffect`. Le curseur doit être replacé avant
   * que le navigateur ne peigne : avec `useEffect`, on le voit sauter à la fin
   * puis revenir, ce qui donne l'impression que le champ se bat contre la
   * frappe — exactement la sensation qu'on cherche à supprimer.
   */
  useLayoutEffect(() => {
    const el = ref.current;
    if (el && caretVoulu.current !== null) {
      el.setSelectionRange(caretVoulu.current, caretVoulu.current);
      caretVoulu.current = null;
    }
  });

  return (
    <input
      ref={ref}
      className={className}
      name={name}
      value={affiche}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      autoFocus={autoFocus}
      aria-label={ariaLabel}
      inputMode="numeric"
      autoComplete="off"
      // 10 = « jj/mm/aaaa » au complet. Le formatage tronque déjà à huit
      // chiffres ; cet attribut évite en plus que le champ accepte visuellement
      // une frappe qui serait aussitôt jetée.
      maxLength={10}
      onChange={(e) => {
        const brut = e.target.value;
        const { texte, caret } = saisirDate(brut, e.target.selectionStart ?? brut.length, affiche);
        caretVoulu.current = caret;
        if (!controle) setInterne(texte);
        onChange?.(texte);
      }}
    />
  );
}
