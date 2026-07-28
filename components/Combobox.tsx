'use client';

import { useState } from 'react';

/**
 * Menu déroulant maison (remplace `<datalist>`) : saisie LIBRE + suggestions
 * filtrées, entièrement thémé (contrairement au datalist natif, non stylable et
 * mal positionné). On peut taper n'importe quelle valeur OU cliquer une suggestion.
 */
export default function Combobox({
  value,
  onChange,
  options,
  placeholder,
  disabled,
  ariaLabel,
  onCommit,
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  ariaLabel?: string;
  /** Appelé quand la saisie est « validée » (perte de focus ou choix d'une suggestion). */
  onCommit?: (v: string) => void;
  className?: string;
}) {
  const [ouvert, setOuvert] = useState(false);

  const q = value.trim().toLowerCase();
  const filtres = options
    .filter((o) => o && o.toLowerCase().includes(q))
    .filter((o, i, arr) => arr.indexOf(o) === i)
    .slice(0, 8);

  function choisir(o: string) {
    onChange(o);
    setOuvert(false);
    onCommit?.(o);
  }

  return (
    <div className={`combo${className ? ` ${className}` : ''}`}>
      <input
        className="champ combo-input"
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        aria-label={ariaLabel}
        onChange={(e) => {
          onChange(e.target.value);
          setOuvert(true);
        }}
        onFocus={() => setOuvert(true)}
        onBlur={() => {
          setOuvert(false);
          onCommit?.(value);
        }}
      />
      {ouvert && filtres.length > 0 && (
        <ul className="combo-liste" role="listbox">
          {filtres.map((o) => (
            <li key={o}>
              {/* onMouseDown + preventDefault : sélectionne AVANT le blur de l'input. */}
              <button
                type="button"
                className="combo-item"
                onMouseDown={(e) => {
                  e.preventDefault();
                  choisir(o);
                }}
              >
                {o}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
