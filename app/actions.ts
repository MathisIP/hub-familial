'use server';

import { signOut } from '@/auth';
import { foyerCourant, utilisateurCourant } from '@/lib/foyer';
import { supprimerFoyerEtUtilisateur } from '@/lib/rgpd';

/** Déconnexion (action serveur, utilisable depuis un composant client via <form>). */
export async function deconnexion() {
  // Retour sur la VITRINE publique (`/` sans session) plutôt que sur le formulaire
  // de connexion : on ressort du produit, pas dans une impasse.
  await signOut({ redirectTo: '/' });
}

/**
 * RGPD — effacement du compte : supprime le foyer (cascade sur toutes ses données)
 * et l'utilisateur, PUIS déconnecte. Fait en une seule action pour ne laisser
 * aucune fenêtre où un foyer vide serait re-provisionné.
 */
export async function supprimerCompte() {
  const foyer = await foyerCourant();
  const user = await utilisateurCourant();
  await supprimerFoyerEtUtilisateur(foyer.id, user.id);
  // Retour sur la VITRINE publique (`/` sans session) plutôt que sur le formulaire
  // de connexion : on ressort du produit, pas dans une impasse.
  await signOut({ redirectTo: '/' });
}
