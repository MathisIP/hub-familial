/**
 * Erreurs métier neutres (sans dépendance à Next). La couche HTTP (`lib/api.ts`)
 * les traduit en codes de statut ; les services les lèvent sans connaître HTTP.
 */

/** Saisie invalide (faute de l'appelant) → 400 côté HTTP. */
export class ErreurValidation extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ErreurValidation';
  }
}
