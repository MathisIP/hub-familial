import 'server-only';
import { cache } from 'react';
import { auth } from '@/auth';
import { db, baseDisponible } from '@/lib/db';
import { mouvementsProjet } from '@/lib/db/schema';
import { bilan, type Bilan, type Mouvement, type Recurrence, type Sens } from '@/lib/comptes/schema';

/**
 * COMPTES DU PROJET — accès serveur.
 *
 * ⚠ **La garde n'est PAS celle du foyer.** Partout ailleurs dans Nestync,
 * l'isolation se fait par `foyer_id` : ce qui appartient à un foyer est visible
 * de tous ses membres. Ici non — la comptabilité du projet est celle d'une
 * personne, pas d'un ménage. Un conjoint membre du même foyer ne doit pas y
 * accéder. Le contrôle porte donc sur l'**adresse e-mail** déclarée dans
 * `EMAIL_ADMIN`, et rien d'autre.
 *
 * ⚠ **Sans `EMAIL_ADMIN`, personne n'entre.** L'inverse — ouvrir à tous quand la
 * variable manque — est le défaut qui transforme un oubli de configuration en
 * fuite. On ferme par défaut.
 */

/** L'adresse autorisée, normalisée. `null` si la variable n'est pas posée. */
function adresseAdmin(): string | null {
  const v = (process.env.EMAIL_ADMIN ?? '').trim().toLowerCase();
  return v || null;
}

/** La personne connectée est-elle l'unique titulaire de ces comptes ? */
export const estAdminComptes = cache(async (): Promise<boolean> => {
  const attendue = adresseAdmin();
  if (!attendue) return false; // pas de variable → porte close
  const session = await auth();
  const email = session?.user?.email?.trim().toLowerCase();
  return !!email && email === attendue;
});

/** Convertit une ligne de base en mouvement métier. */
function versMouvement(l: typeof mouvementsProjet.$inferSelect): Mouvement {
  return {
    id: l.id,
    date: l.date,
    libelle: l.libelle,
    categorie: l.categorie,
    sens: l.sens === 'recette' ? 'recette' : ('depense' as Sens),
    montantCentimes: l.montantCentimes,
    recurrence: (l.recurrence === 'mensuel' || l.recurrence === 'annuel'
      ? l.recurrence
      : null) as Recurrence | null,
    fin: l.fin,
    note: l.note,
  };
}

/**
 * Bilan complet du projet.
 *
 * ⚠ Refait le contrôle d'accès lui-même plutôt que de faire confiance à
 * l'appelant : une fonction qui rend des données confidentielles ne doit pas
 * dépendre du fait qu'on ait pensé à la garder en amont.
 */
export async function chargerComptes(): Promise<Bilan | null> {
  if (!(await estAdminComptes())) return null;
  if (!baseDisponible()) return null;
  const lignes = await db().select().from(mouvementsProjet);
  return bilan(lignes.map(versMouvement));
}
