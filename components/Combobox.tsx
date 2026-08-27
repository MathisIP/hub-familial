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
  note,
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
  /**
   * Phrase affichée en bas du menu, pour dire qu'on peut saisir autre chose.
   *
   * ⚠ La saisie libre a TOUJOURS été possible, mais rien ne le disait : on voit
   * une liste, on en conclut qu'elle est fermée. Signalé en test sur le champ
   * « Qui » des tâches, où il faut pouvoir assigner quelqu'un d'extérieur au
   * foyer — la nounou, une grand-mère.
   */
  note?: string;
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
      {ouvert && (filtres.length > 0 || !!note) && (
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
          {/* ⚠ Ni bouton ni option : c'est une indication, pas un choix. En
              faire une entrée sélectionnable écrirait « Autre » dans le champ,
              là où on veut justement que la personne tape un nom. */}
          {note && (
            <li className="combo-note" aria-hidden="true">
              {note}
            </li>
          )}
        </ul>
      )}
    </div>
  );
}
