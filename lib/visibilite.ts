import 'server-only';
import { idFoyerCourant, utilisateurCourant } from '@/lib/foyer';
import { ErreurValidation } from '@/lib/erreurs';

/**
 * VISIBILITÉ PAR PERSONNE — socle commun aux modules (serveur uniquement).
 * =======================================================================
 * Appartenir à un foyer donnait accès à tout son contenu. Ça ne tient plus dès
 * qu'un foyer dépasse le couple : dans une famille, chaque enfant ne doit voir
 * que son compte ; en colocation, personne n'a à lire les affaires des autres.
 *
 * ⚠ DEUX FORMES, IRRÉDUCTIBLES L'UNE À L'AUTRE.
 *
 *  · **Liste blanche** — « seules ces personnes voient » : comptes bancaires,
 *    agendas rattachés, dossiers de documents. La ressource porte un mode
 *    `partage` et une table de liaison nomme les autorisés. C'est ce que ce
 *    fichier outille.
 *
 *  · **Liste noire** — « tout le monde SAUF » : les cadeaux, qui doivent rester
 *    visibles du foyer entier et masqués au seul destinataire. Une liste blanche
 *    y serait un contresens : un cadeau « visible par A, B, C » disparaîtrait
 *    pour la personne qui rejoint le foyer, alors que l'intention est de le lui
 *    montrer. La surprise doit survivre à l'arrivée d'un nouveau membre. Cette
 *    forme se traite avec une simple colonne `masque_a` (cf. lib/cadeaux).
 *
 * ⚠ CE N'EST JAMAIS UN FILTRE D'AFFICHAGE. Soldes, patrimoine, KPI, totaux par
 * occasion sont des agrégats calculés sur tout le foyer : masquer un élément
 * impose de les recalculer sur le périmètre visible, sinon la personne lit dans
 * les totaux ce qu'on lui cache dans les listes.
 *
 * ⚠ ET LES ÉCRITURES SE VERROUILLENT SYMÉTRIQUEMENT. Pouvoir modifier ce qu'on
 * ne voit pas en révèle l'existence par la réponse du serveur. Les messages de
 * refus restent donc identiques à ceux d'une ressource inexistante.
 *
 * Pourquoi une table de liaison PAR MODULE plutôt qu'une table polymorphe
 * unique : les clés étrangères, donc les cascades. C'est ce qui garantit qu'une
 * ressource supprimée n'abandonne pas d'autorisations orphelines — vérifié en
 * base. Une colonne `ressource_id` sans contrainte perdrait cette propriété, et
 * il faudrait la remplacer par du ménage manuel dans chaque chemin de
 * suppression. Le SQL mutualisé n'aurait été que trois lignes ; la logique
 * partagée, elle, est ici.
 */

export const PARTAGE_FOYER = 'foyer';
export const PARTAGE_RESTREINT = 'restreint';

/** Toute ressource dont la visibilité se règle en liste blanche. */
export type Restreignable = { id: string; partage: string };

/**
 * Ce qu'une personne a le droit de voir d'un ensemble de ressources.
 *
 * `complet` est le raccourci qui rend la fonctionnalité **gratuite pour les
 * foyers qui ne l'utilisent pas** : quand rien n'est restreint, les appelants
 * sautent purement et simplement tous les filtres — y compris sur le chemin
 * critique de l'accueil (cf. « Performance » dans CLAUDE.md).
 */
export type Acces<T extends Restreignable> = {
  visibles: T[];
  ids: Set<string>;
  complet: boolean;
};

/** Foyer + utilisateur courants. Les deux sont mémoïsés par requête (`cache()`). */
export async function contexteAcces(): Promise<{ foyerId: string; utilisateurId: string }> {
  const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
  return { foyerId, utilisateurId: user.id };
}

/**
 * Croise des ressources et les autorisations de la personne. Fonction **PURE**,
 * aucun accès base : les appelants ont déjà chargé leurs lignes, on ne les relit
 * pas. La requête d'autorisations, elle, se glisse dans le `Promise.all` que
 * l'appelant exécute déjà — une requête menée en parallèle ne coûte pas un
 * aller-retour de plus, la même enchaînée après en coûterait un.
 */
export function filtrerRestreints<T extends Restreignable>(
  rows: T[],
  autorises: Set<string>,
): Acces<T> {
  const visibles = rows.filter((r) => r.partage !== PARTAGE_RESTREINT || autorises.has(r.id));
  return {
    visibles,
    ids: new Set(visibles.map((r) => r.id)),
    complet: visibles.length === rows.length,
  };
}

/**
 * Refuse une écriture visant une ressource non accessible.
 *
 * Le message est volontairement celui d'une ressource **inexistante** :
 * distinguer « interdit » de « inconnu », c'est déjà confirmer l'existence.
 */
export function exigerAcces(condition: boolean, quoi = 'Élément'): void {
  if (!condition) throw new ErreurValidation(`${quoi} introuvable.`);
}

/**
 * Valide une liste d'identifiants reçue du client contre les membres du foyer.
 *
 * ⚠ Indispensable partout où l'on enregistre « qui a le droit » : la route
 * reçoit des identifiants arbitraires, et rien n'empêcherait sinon d'autoriser
 * quelqu'un d'un autre foyer.
 *
 * Refuse une liste vide en mode restreint : un élément que plus personne ne voit
 * n'est pas privé, il est perdu — y compris pour celui qui vient de le régler.
 */
export function retenirMembres(
  recus: string[],
  membresDuFoyer: Set<string>,
  restreint: boolean,
): string[] {
  const retenus = [...new Set(recus)].filter((id) => membresDuFoyer.has(id));
  if (restreint && retenus.length === 0) {
    throw new ErreurValidation(
      'Choisis au moins une personne, sinon plus personne ne verrait cet élément.',
    );
  }
  return retenus;
}
