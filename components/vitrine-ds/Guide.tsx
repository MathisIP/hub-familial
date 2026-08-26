import type { ReactNode } from 'react';

/**
 * PRIMITIVES DES PAGES DE GUIDE (/test et /test-proche).
 * ======================================================
 * Uniquement de la MISE EN FORME. Le texte, lui, vit en clair dans chaque page :
 * c'est ce qui rend ces pages modifiables sans rien connaître du reste.
 *
 * ⚠ POURQUOI DEUX PAGES ET PAS UNE SEULE PARAMÉTRÉE. Les deux guides partagent
 * beaucoup d'étapes, et la tentation est de n'en écrire qu'un avec des « si
 * proche / si inconnu » un peu partout. Ce serait une erreur : ils ne disent pas
 * la même chose au même public. L'un s'adresse à quelqu'un qui a déjà confiance
 * et veut savoir quoi faire ; l'autre doit d'abord expliquer ce qu'est le
 * produit, pourquoi il est gratuit, et ne jamais nommer personne. Mutualiser le
 * texte les abîmerait tous les deux, et chaque retouche obligerait à vérifier
 * l'effet sur l'autre public. Ce qui est mutualisé ici, c'est l'apparence — la
 * seule chose qui doive effectivement rester identique.
 */

/**
 * Suite d'étapes numérotées.
 *
 * ⚠ La numérotation n'est pas décorative : l'ordre est réel. On ne peut pas
 * créer un foyer sans s'être connecté, ni recevoir l'accès offert sans avoir
 * créé son foyer. Ne pas réutiliser ce composant pour une simple liste — une
 * puce dirait alors la vérité, un numéro mentirait.
 */
export function Etapes({ children }: { children: ReactNode }) {
  return <ol className="nsy-guide-etapes">{children}</ol>;
}

export function Etape({ titre, children }: { titre: string; children: ReactNode }) {
  return (
    <li>
      <h3>{titre}</h3>
      {children}
    </li>
  );
}

/**
 * Encart. Le ton porte la nature de l'information, jamais l'ornement :
 *  · `neutre`  — une précision ;
 *  · `bon`     — ce qu'on obtient, ce qui va bien ;
 *  · `attention` — ce qui coince, ce qu'on risque de rater.
 */
export function Encart({
  ton = 'neutre',
  etiquette,
  children,
}: {
  ton?: 'neutre' | 'bon' | 'attention';
  etiquette: string;
  children: ReactNode;
}) {
  return (
    <div className={`nsy-guide-encart ${ton}`}>
      <span className="nsy-guide-etiq">{etiquette}</span>
      {children}
    </div>
  );
}

/**
 * Reproduction de ce que la personne doit lire à l'écran.
 *
 * ⚠ Montrer le texte exact plutôt que le décrire : « tu dois voir Accès offert »
 * se vérifie d'un coup d'œil, « vérifie que ton abonnement est bien configuré »
 * ne se vérifie pas du tout.
 */
export function Ecran({ statut, detail }: { statut: string; detail?: string }) {
  return (
    <div className="nsy-guide-ecran">
      <span className="nsy-guide-statut">{statut}</span>
      {detail && <span className="nsy-guide-detail">{detail}</span>}
    </div>
  );
}

/** Chemin de navigation dans l'application : « Réglages › Abonnement ». */
export function Chemin({ children }: { children: ReactNode }) {
  return <span className="nsy-guide-chemin">{children}</span>;
}

/** Intertitre mono en capitales, au-dessus d'un titre de section. */
export function Phase({ children }: { children: ReactNode }) {
  return <p className="nsy-guide-phase">{children}</p>;
}
