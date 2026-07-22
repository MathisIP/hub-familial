'use server';

import { signOut } from '@/auth';

/** Déconnexion (action serveur, utilisable depuis un composant client via <form>). */
export async function deconnexion() {
  await signOut({ redirectTo: '/connexion' });
}
