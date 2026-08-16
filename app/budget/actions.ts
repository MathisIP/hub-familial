'use server';

import { revalidatePath } from 'next/cache';
import {
  ajouterEcheance,
  creerComptes,
  definirPartageCompte,
  modifierCompte,
  modifierEcheance,
  supprimerCompte,
  supprimerEcheance,
  type NouveauCompte,
} from '@/lib/budget/service';
import type { ChampsEcheance } from '@/lib/budget/schema';

/**
 * « 1 240,50 » → 1240.50. Les montants arrivent en texte : on accepte la
 * virgule décimale et les espaces, parce que c'est ainsi qu'on écrit un montant
 * en français. Un champ vide vaut 0.
 */
function versNombre(brut: unknown): number {
  return Number(
    String(brut ?? '')
      .replace(/\s/g, '')
      .replace(',', '.') || '0',
  );
}

/**
 * Résultat d'une action : `null` = pas encore lancée, `{ ok: true }` = réussie,
 * `{ erreur }` = refusée.
 *
 * ⚠ Renvoyer `null` en cas de succès (ce que faisait la 1re version) rendrait
 * « pas encore lancée » et « réussie » indiscernables : l'interface ne saurait
 * jamais quand refermer un formulaire après enregistrement.
 */
export type ResultatAction = { ok?: true; erreur?: string };

/** Les pages du budget ET l'accueil affichent des soldes : les deux à rafraîchir. */
function rafraichir() {
  revalidatePath('/budget');
  revalidatePath('/');
}

function messageErreur(e: unknown, defaut: string): string {
  return e instanceof Error ? e.message : defaut;
}

/** Création des comptes du foyer (initialisation du Budget, ou ajout ultérieur). */
export async function creerComptesAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    const brut = JSON.parse(String(formData.get('lignes') ?? '[]')) as {
      nom: string;
      solde: string;
    }[];

    const entrees: NouveauCompte[] = brut
      .filter((l) => (l.nom ?? '').trim() !== '')
      .map((l) => ({ nom: l.nom, solde: versNombre(l.solde) }));

    await creerComptes(entrees);
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, 'Création impossible.') };
  }
}

/**
 * Renomme un compte et/ou corrige son solde.
 *
 * Le solde saisi est le solde COURANT (celui du relevé bancaire) : le service
 * en déduit le solde initial à rebours. La personne corrige donc ce qu'elle
 * voit, sans avoir à raisonner sur le mode de calcul.
 */
export async function modifierCompteAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await modifierCompte({
      id: String(formData.get('id') ?? ''),
      nom: String(formData.get('nom') ?? ''),
      soldeCourant: versNombre(formData.get('solde')),
    });
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, 'Modification impossible.') };
  }
}

/**
 * Supprime un compte. `confirme` n'est transmis que si la personne a coché la
 * case d'avertissement — sans quoi le service refuse dès qu'il y a un historique.
 */
export async function supprimerCompteAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await supprimerCompte({
      id: String(formData.get('id') ?? ''),
      confirme: formData.get('confirme') === 'oui',
    });
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, 'Suppression impossible.') };
  }
}

/**
 * Règle qui voit un compte (propriétaire du foyer uniquement — le service
 * revérifie le rôle, une action serveur reste une porte ouverte sur le réseau).
 *
 * ⚠ `rafraichir()` ne suffit pas : restreindre un compte change ce que voient
 * les AUTRES membres, dont les pages sont rendues côté serveur à leur prochaine
 * visite. Rien à invalider pour eux ici, mais l'auteur du réglage doit voir
 * l'effet immédiatement sur /budget comme sur l'accueil.
 */
export async function definirPartageAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await definirPartageCompte({
      compteId: String(formData.get('id') ?? ''),
      restreint: formData.get('restreint') === 'oui',
      utilisateurIds: formData.getAll('utilisateurs').map(String).filter(Boolean),
    });
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, 'Réglage impossible.') };
  }
}

/* --------------------------- ÉCHÉANCES ---------------------------
 * Le module affichait des échéances sans qu'aucun écran ne permette d'en créer.
 * Ces trois actions comblent ce manque ; le compte rattaché (facultatif) porte
 * la visibilité de l'échéance. Le service revérifie tout : une action serveur
 * reste une porte ouverte sur le réseau.
 * ---------------------------------------------------------------- */

function champsEcheanceDepuis(formData: FormData): ChampsEcheance {
  return {
    libelle: String(formData.get('libelle') ?? ''),
    dateLabel: String(formData.get('date') ?? ''),
    recurrence: String(formData.get('recurrence') ?? 'Aucune'),
    note: String(formData.get('note') ?? ''),
    compteId: String(formData.get('compteId') ?? ''),
  };
}

export async function ajouterEcheanceAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await ajouterEcheance(champsEcheanceDepuis(formData));
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, "Ajout impossible.") };
  }
}

export async function modifierEcheanceAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await modifierEcheance(String(formData.get('id') ?? ''), champsEcheanceDepuis(formData));
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, 'Modification impossible.') };
  }
}

export async function supprimerEcheanceAction(
  _precedent: ResultatAction | null,
  formData: FormData,
): Promise<ResultatAction | null> {
  try {
    await supprimerEcheance(String(formData.get('id') ?? ''));
    rafraichir();
    return { ok: true };
  } catch (e) {
    return { erreur: messageErreur(e, 'Suppression impossible.') };
  }
}
