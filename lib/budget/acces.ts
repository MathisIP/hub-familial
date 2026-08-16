import 'server-only';
import { and, eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { comptes as tComptes, comptesAcces as tAcces, type LigneCompte } from '@/lib/db/schema';
import { ErreurValidation } from '@/lib/erreurs';
import {
  contexteAcces,
  filtrerRestreints,
  PARTAGE_FOYER,
  PARTAGE_RESTREINT,
} from '@/lib/visibilite';

// Réexports : le module Budget est le premier client du socle, beaucoup de code
// importe encore ces symboles depuis ici.
export { contexteAcces, PARTAGE_FOYER, PARTAGE_RESTREINT };

/**
 * VISIBILITÉ DES COMPTES (serveur uniquement)
 * ===========================================
 * Jusqu'ici, appartenir à un foyer donnait accès à tout son budget. Ça ne tient
 * plus dès qu'un foyer dépasse le couple : dans une famille, chaque enfant ne
 * doit voir que son compte ; en colocation, personne n'a à lire les opérations
 * des autres. Un compte porte donc un mode de partage, et les comptes
 * `restreint` ne sont visibles que des personnes explicitement listées.
 *
 * ⚠ AUCUN PRIVILÈGE IMPLICITE. Le propriétaire du foyer ne voit pas davantage
 * que les autres : il RÈGLE les partages sans forcément pouvoir LIRE. Le
 * contraire viderait le cas colocation de son sens — celui qui a créé le foyer
 * lirait les comptes de tous ses colocataires.
 *
 * ⚠ CE N'EST PAS UN FILTRE D'AFFICHAGE. Les soldes, le patrimoine, les KPI du
 * mois et le réel par catégorie sont des agrégats calculés sur l'ensemble du
 * foyer. Masquer un compte impose de tous les recalculer sur les seuls comptes
 * visibles, sinon la personne lit dans les totaux ce qu'on lui cache dans les
 * lignes. C'est la raison d'être de `AccesComptes.noms`, que tout le service
 * pousse jusque dans ses requêtes SQL.
 */

/**
 * Ce qu'une personne a le droit de voir du budget de son foyer.
 *
 * `noms` sert au filtrage des transactions : elles désignent leur compte par son
 * NOM, pas par une clé étrangère (cf. l'avertissement de [lib/budget/service.ts]).
 *
 * `complet` est le raccourci qui rend la fonctionnalité gratuite pour les foyers
 * qui ne l'utilisent pas : quand rien n'est restreint, on saute purement et
 * simplement tous les filtres.
 */
export type AccesComptes = {
  comptes: LigneCompte[];
  noms: string[];
  complet: boolean;
};

/**
 * Identifiants des comptes restreints auxquels cette personne a accès.
 *
 * Exposé séparément pour que les appelants puissent le glisser dans le
 * `Promise.all` qu'ils exécutent déjà : une requête de plus menée EN PARALLÈLE
 * ne coûte pas un aller-retour de plus, alors que la même requête enchaînée
 * après le chargement des comptes en coûterait un — sur le chemin critique de
 * l'accueil (cf. « Performance » dans CLAUDE.md).
 */
export async function comptesAutorises(
  foyerId: string,
  utilisateurId: string,
): Promise<Set<string>> {
  const lignes = await db()
    .select({ compteId: tAcces.compteId })
    .from(tAcces)
    .where(and(eq(tAcces.foyerId, foyerId), eq(tAcces.utilisateurId, utilisateurId)));
  return new Set(lignes.map((l) => l.compteId));
}

/**
 * Croise les comptes du foyer et les autorisations : fonction PURE, aucun accès
 * base. Les appelants ont déjà chargé les comptes, on ne les relit pas.
 *
 * Ajoute `noms` à ce que renvoie le socle : les transactions désignent leur
 * compte par son NOM, pas par une clé étrangère — c'est la particularité du
 * module Budget (cf. l'avertissement de [lib/budget/service.ts]).
 */
export function filtrerComptes(rows: LigneCompte[], autorises: Set<string>): AccesComptes {
  const { visibles, complet } = filtrerRestreints(rows, autorises);
  return { comptes: visibles, noms: visibles.map((c) => c.nom), complet };
}

/**
 * Ce que la personne connectée peut voir. Pour les appelants qui n'ont pas déjà
 * les comptes en main ; les autres préfèrent `comptesAutorises` + `filtrerComptes`.
 */
export async function accesComptes(): Promise<AccesComptes> {
  const { foyerId, utilisateurId } = await contexteAcces();
  const [rows, autorises] = await Promise.all([
    db().select().from(tComptes).where(eq(tComptes.foyerId, foyerId)),
    comptesAutorises(foyerId, utilisateurId),
  ]);
  return filtrerComptes(rows, autorises);
}

/**
 * Refuse une écriture qui désignerait un compte non accessible.
 *
 * ⚠ Indispensable, et pas seulement par symétrie : la saisie envoie un NOM de
 * compte en texte libre. Sans ce contrôle, n'importe quel membre pourrait
 * imputer une opération à un compte qu'il ne voit pas — et en déduire
 * l'existence par la réponse du serveur.
 *
 * Le message reste volontairement identique à celui d'un compte inexistant :
 * distinguer « interdit » de « inconnu », c'est déjà confirmer l'existence.
 */
export function exigerComptesAccessibles(noms: (string | undefined)[], acces: AccesComptes): void {
  const permis = new Set(acces.noms);
  for (const nom of noms) {
    const n = (nom ?? '').trim();
    if (n !== '' && !permis.has(n)) {
      throw new ErreurValidation(`Compte inconnu : « ${n} ».`);
    }
  }
}
