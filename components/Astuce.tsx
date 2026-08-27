'use client';

import { useEffect, useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { positionBulle } from '@/lib/astuce-position';

/**
 * Info-bulle d'aide contextuelle : un petit « ? » qui explique un champ ou une
 * notion, sans alourdir l'écran.
 *
 * Accessible à dessein : c'est un vrai `<button>` (donc atteignable au clavier),
 * l'aide s'ouvre au survol ET au clic — indispensable sur mobile, où le survol
 * n'existe pas — et se ferme avec Échap ou en cliquant ailleurs.
 *
 * ⚠ LA BULLE EST RENDUE DANS `document.body`, EN PORTAIL. Deux raisons, et la
 * seconde a déjà coûté cher dans ce projet :
 *  · positionnée dans le flux, elle débordait de l'écran dès que son « ? »
 *    se trouvait dans la moitié droite d'un téléphone (cf. lib/astuce-position) ;
 *  · un ancêtre portant `overflow: hidden` la rognerait, et un ancêtre portant
 *    un `transform` — une carte animée au survol — redéfinirait à lui seul le
 *    référentiel de `position: fixed`, ancrant la bulle n'importe où. C'est
 *    exactement le piège qui avait enfermé la visionneuse de documents.
 *
 * ⚠ La prop `coin` a été RETIRÉE. Elle permettait d'aligner la bulle à droite à
 * la main — et n'était posée que sur **deux** des quatorze appels. C'est bien le
 * problème : elle demandait de deviner, à chaque endroit, où le bouton tomberait
 * selon la largeur de l'écran et la longueur du texte une fois traduit. Les
 * douze autres, dont celui du partage des comptes qui a été signalé, débordaient.
 * Le calcul remplace la prédiction.
 */
export default function Astuce({ texte }: { texte: string }) {
  const [ouvert, setOuvert] = useState(false);
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const id = useId();
  const ref = useRef<HTMLSpanElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);
  const bulleRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!ouvert) return;
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && setOuvert(false);
    const surClic = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOuvert(false);
    };
    /*
     * ⚠ On FERME au défilement et au redimensionnement plutôt que de recalculer.
     * La bulle est en coordonnées d'écran : sans cela, elle resterait immobile
     * pendant que son « ? » s'en va, et pointerait une ligne qui n'est plus la
     * bonne — pire qu'une bulle absente. `capture` parce que le défilement peut
     * venir d'un conteneur interne, pas de la fenêtre.
     */
    const surMouvement = () => setOuvert(false);
    document.addEventListener('keydown', surTouche);
    document.addEventListener('mousedown', surClic);
    window.addEventListener('scroll', surMouvement, true);
    window.addEventListener('resize', surMouvement);
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.removeEventListener('mousedown', surClic);
      window.removeEventListener('scroll', surMouvement, true);
      window.removeEventListener('resize', surMouvement);
    };
  }, [ouvert]);

  /*
   * Placement APRÈS le premier rendu de la bulle : sa hauteur dépend du texte,
   * qui dépend de la langue et de la largeur disponible. On ne peut pas la
   * deviner, il faut la mesurer.
   *
   * `useLayoutEffect` et non `useEffect` : le navigateur ne doit jamais peindre
   * la bulle à sa position provisoire, sinon on la voit sauter.
   */
  useLayoutEffect(() => {
    if (!ouvert) {
      setPos(null);
      return;
    }
    const b = btnRef.current;
    const bulle = bulleRef.current;
    if (!b || !bulle) return;
    const r = b.getBoundingClientRect();
    const t = bulle.getBoundingClientRect();
    setPos(
      positionBulle(
        { top: r.top, bottom: r.bottom, left: r.left, width: r.width, height: r.height },
        { width: t.width, height: t.height },
        { largeur: document.documentElement.clientWidth, hauteur: document.documentElement.clientHeight },
      ),
    );
  }, [ouvert, texte]);

  return (
    <span
      className="astuce"
      ref={ref}
      onMouseEnter={() => setOuvert(true)}
      onMouseLeave={() => setOuvert(false)}
    >
      <button
        ref={btnRef}
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
      {ouvert &&
        typeof document !== 'undefined' &&
        createPortal(
          <span
            ref={bulleRef}
            className="astuce-bulle"
            id={id}
            role="tooltip"
            // Invisible tant qu'elle n'est pas placée : le temps d'une mesure,
            // elle serait sinon visible en haut à gauche de l'écran.
            style={pos ? { top: pos.top, left: pos.left } : { top: 0, left: 0, opacity: 0 }}
          >
            {texte}
          </span>,
          document.body,
        )}
    </span>
  );
}
