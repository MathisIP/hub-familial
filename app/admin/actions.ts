'use server';

import { revalidatePath } from 'next/cache';
import {
  activerScenario,
  dupliquerScenario,
  enregistrerParams,
  reinitialiserScenario,
  renommerScenario,
  supprimerScenario,
} from '@/lib/admin/scenarios';
import { normaliserParams } from '@/lib/admin/parametres';

/**
 * ACTIONS DE LA CONSOLE — écriture des scénarios.
 *
 * ⚠ **CHAQUE FONCTION DU SERVICE REVÉRIFIE `EMAIL_ADMIN`.** Une action serveur
 * est une route publique dont l'adresse est devinable : la protection de la page
 * qui l'affiche ne la protège pas. C'est pour cela que le contrôle vit dans
 * `lib/admin/scenarios.ts` et non ici.
 *
 * ⚠ Ces actions écrivent dans `admin_scenarios` et **nulle part ailleurs**. Une
 * hypothèse ne doit jamais atteindre `mouvements_projet`, sous peine de rendre
 * faux le solde réel de /comptes sans que rien ne le signale.
 */

const CHEMINS = ['/admin', '/admin/modele', '/admin/paliers'];
const rafraichir = () => CHEMINS.forEach((c) => revalidatePath(c));

export async function actionEnregistrerParams(id: string, brut: unknown) {
  await enregistrerParams(id, normaliserParams(brut));
  rafraichir();
}

export async function actionRenommer(id: string, nom: string, note: string) {
  await renommerScenario(id, nom, note);
  rafraichir();
}

export async function actionDupliquer(id: string) {
  const copie = await dupliquerScenario(id);
  if (copie) await activerScenario(copie);
  rafraichir();
}

export async function actionActiver(id: string) {
  await activerScenario(id);
  rafraichir();
}

export async function actionSupprimer(id: string) {
  // ⚠ Le service refuse de supprimer le dernier scénario : se retrouver sans
  // aucun ferait repartir les hypothèses de zéro, la perte silencieuse que
  // cette table existe pour empêcher.
  await supprimerScenario(id);
  rafraichir();
}

export async function actionReinitialiser(id: string) {
  await reinitialiserScenario(id);
  rafraichir();
}
