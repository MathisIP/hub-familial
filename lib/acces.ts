import 'server-only';

/**
 * POLITIQUE D'ACCÈS — remplace la liste blanche `EMAILS_AUTORISES` qui bloquait
 * la connexion elle-même.
 * ==========================================================================
 * Pourquoi ce changement : la liste blanche créait un **blocage circulaire**.
 * Pour rejoindre un foyer (invitation ou demande d'adhésion), il faut d'abord se
 * connecter — or la liste blanche empêchait justement de se connecter. Aucun
 * proche ne pouvait donc entrer sans qu'on édite une variable d'environnement.
 *
 * Nouveau modèle, en deux temps :
 *
 *  1. **Se connecter est ouvert à tous.** Créer une identité ne donne accès à
 *     RIEN par soi-même : c'est seulement ce qui permet d'être invité, de
 *     demander à rejoindre un foyer, et plus tard de s'abonner.
 *
 *  2. **Créer un NOUVEAU foyer** (ce qui déclenche l'essai gratuit) est ce qui
 *     est contrôlé — sinon n'importe qui consommerait un essai avant le
 *     lancement public :
 *       · `INSCRIPTION_OUVERTE=true`  → tout le monde peut créer un foyer
 *         (mode lancement public) ;
 *       · sinon (défaut)              → seules les adresses de `EMAILS_AUTORISES`
 *         le peuvent ; les autres doivent **rejoindre un foyer existant**.
 *
 * Le jour du lancement : passer `INSCRIPTION_OUVERTE=true`. Rien d'autre à toucher.
 */

/** Adresses autorisées à créer un foyer tant que l'inscription n'est pas ouverte. */
function emailsAutorises(): string[] {
  return (process.env.EMAILS_AUTORISES ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/** Vrai si n'importe qui peut créer un foyer (lancement public). */
export function inscriptionOuverte(): boolean {
  return (process.env.INSCRIPTION_OUVERTE ?? '').trim().toLowerCase() === 'true';
}

/**
 * Cette adresse peut-elle créer un NOUVEAU foyer (et donc démarrer un essai) ?
 * Ne concerne PAS l'accès à un foyer existant : un membre invité ou accepté
 * garde toujours son accès, quelle que soit cette politique.
 */
export function peutCreerFoyer(email: string): boolean {
  if (inscriptionOuverte()) return true;
  return emailsAutorises().includes(email.trim().toLowerCase());
}
