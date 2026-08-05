'use client';

import { useEffect, useId, useRef, useState } from 'react';

/**
 * Info-bulle d'aide contextuelle : un petit « ? » qui explique un champ ou une
 * notion, sans alourdir l'écran.
 *
 * Accessible à dessein : c'est un vrai `<button>` (donc atteignable au clavier),
 * l'aide s'ouvre au survol ET au clic — indispensable sur mobile, où le survol
 * n'existe pas — et se ferme avec Échap ou en cliquant ailleurs.
 */
export default function Astuce({ texte, coin }: { texte: string; coin?: 'gauche' | 'droite' }) {
  const [ouvert, setOuvert] = useState(false);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    const surClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    document.addEventListener('keydown', surTouche);
    document.addEventListener('mousedown', surClic);
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.removeEventListener('mousedown', surClic);
    };
  }, [ouvert]);

  return (
    <span
      className="astuce"
      ref={ref}
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <button
        type="button"
        className="astuce-btn"
        aria-expanded={ouvert}
        aria-describedby={ouvert ? id : undefined}
        aria-label="Aide"
        onClick={() => setOuvert((v) => !v)}
        onFocus={() => setOuvert(true)}
        onBlur={() => setOuvert(false)}
      >
        ?
      </button>
      {ouvert && (
        <span className={`astuce-bulle${coin === 'droite' ? ' droite' : ''}`} id={id} role="tooltip">
          {texte}
        </span>
      )}
    </span>
  );
}
