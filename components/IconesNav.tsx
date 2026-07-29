import type { ReactNode, SVGProps } from 'react';

/**
 * Jeu d'icônes minimalistes au trait pour la navigation et le pied de page.
 * Toutes tracées en `currentColor` → leur teinte suit le thème (l'élément parent
 * fixe la couleur : `var(--ink2)` au repos, `var(--acc)` quand l'onglet est actif).
 */
function Svg({ children, ...p }: SVGProps<SVGSVGElement> & { children: ReactNode }) {
  return (
    <svg
      viewBox="0 0 24 24"
      width={22}
      height={22}
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...p}
    >
      {children}
    </svg>
  );
}

export const IcHome = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M4 11.5 12 4.5l8 7" /><path d="M6 10v9.5h12V10" /></Svg>
);
export const IcBudget = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3" y="6" width="18" height="12.5" rx="2.6" /><path d="M3 10.5h18" /><circle cx="16.5" cy="14.5" r="1.1" /></Svg>
);
export const IcTodo = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="4" y="4" width="16" height="16" rx="3.6" /><path d="M8.4 12.3l2.4 2.4 4.6-5" /></Svg>
);
export const IcRepas = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M7 3v6.5a1.9 1.9 0 0 1-3.8 0V3" /><path d="M5.1 9.5V21" /><path d="M16.5 3c-1.4 1-2.2 3-2.2 5.6 0 1.8.9 2.8 2.2 2.8" /><path d="M16.5 3v18" /></Svg>
);
export const IcEvenements = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.6" /><path d="M3.5 9.2h17" /><path d="M8 3v3M16 3v3" /><path d="M12 12l.7 1.7 1.8.2-1.4 1.3.4 1.8-1.5-.9-1.5.9.4-1.8-1.4-1.3 1.8-.2z" /></Svg>
);
export const IcCadeaux = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M19.5 11.5V20h-15v-8.5" /><rect x="3" y="7.5" width="18" height="4" rx="1.2" /><path d="M12 7.5V20" /><path d="M12 7.5S10.3 3 8.3 4.2 10 7.5 12 7.5Z" /><path d="M12 7.5S13.7 3 15.7 4.2 14 7.5 12 7.5Z" /></Svg>
);
export const IcAgenda = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3.5" y="5" width="17" height="15" rx="2.6" /><path d="M3.5 9.2h17" /><path d="M8 3v3M16 3v3" /><circle cx="8" cy="13" r="1" /><circle cx="12" cy="13" r="1" /><circle cx="16" cy="13" r="1" /></Svg>
);
export const IcReglages = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09a1.65 1.65 0 0 0-1.08-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09a1.65 1.65 0 0 0 1.51-1.08 1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
  </Svg>
);
export const IcDeconnexion = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M14 4h3.5A2.5 2.5 0 0 1 20 6.5v11a2.5 2.5 0 0 1-2.5 2.5H14" /><path d="M4 12h11" /><path d="M11.5 8.5 15 12l-3.5 3.5" /></Svg>
);
export const IcSoleil = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><circle cx="12" cy="12" r="4" /><path d="M12 2.5v2.4M12 19.1v2.4M2.5 12h2.4M19.1 12h2.4M5.1 5.1l1.7 1.7M17.2 17.2l1.7 1.7M18.9 5.1l-1.7 1.7M6.8 17.2l-1.7 1.7" /></Svg>
);
export const IcLune = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M20 14.2A8 8 0 1 1 9.8 4a6.5 6.5 0 0 0 10.2 10.2Z" /></Svg>
);
/* --- Icônes candidates pour le réglage « néon » --- */
export const IcNeonEtincelle = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M12 3.5c.45 4.6 2.4 6.55 7 7-4.6.45-6.55 2.4-7 7-.45-4.6-2.4-6.55-7-7 4.6-.45 6.55-2.4 7-7Z" /></Svg>
);
export const IcNeonSparkles = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}>
    <path d="M10 3.5c.35 3.3 1.65 4.6 4.95 4.95C11.65 8.8 10.35 10.1 10 13.4c-.35-3.3-1.65-4.6-4.95-4.95C8.35 8.1 9.65 6.8 10 3.5Z" />
    <path d="M17.5 12.5l.55 1.9 1.9.55-1.9.55-.55 1.9-.55-1.9-1.9-.55 1.9-.55z" />
    <path d="M6.5 15.5l.45 1.55 1.55.45-1.55.45-.45 1.55-.45-1.55L4.5 17.5l1.55-.45z" />
  </Svg>
);
export const IcNeonEclair = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M13 2 4.5 13.5H10l-1 8.5 9.5-12H13z" /></Svg>
);
export const IcNeonEtoile = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M12 3.2l2.6 5.3 5.8.85-4.2 4.1 1 5.75L12 16.6l-5.2 2.6 1-5.75-4.2-4.1 5.8-.85z" /></Svg>
);

export const IcMenu = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><rect x="3.5" y="4.5" width="17" height="15" rx="2.6" /><path d="M14.5 4.5v15" /></Svg>
);
export const IcFermer = (p: SVGProps<SVGSVGElement>) => (
  <Svg {...p}><path d="M6 6l12 12M18 6 6 18" /></Svg>
);

/** Table nom → composant, pour piloter la nav par une config de données. */
export const Icones = {
  home: IcHome,
  budget: IcBudget,
  todo: IcTodo,
  repas: IcRepas,
  evenements: IcEvenements,
  cadeaux: IcCadeaux,
  agenda: IcAgenda,
  reglages: IcReglages,
  deconnexion: IcDeconnexion,
} as const;

export type NomIcone = keyof typeof Icones;
