import { redirect } from 'next/navigation';
import Vitrine from '@/components/vitrine/Vitrine';
import { auth } from '@/auth';

/**
 * `/` — LE SITE VITRINE, et rien d'autre.
 *
 * ⚠ L'APPLICATION A DÉMÉNAGÉ SUR `/foyer` (25/08/2026). Les deux se
 * partageaient cette adresse : la page devait deviner, à chaque visite, si elle
 * servait un prospect ou un membre. Ce mélange rendait tout ambigu — le
 * `start_url` de la PWA, l'indexation, la charte graphique à appliquer, et
 * jusqu'aux règles du middleware.
 *
 * ⚠ UN MEMBRE CONNECTÉ EST REDIRIGÉ VERS `/foyer`, il ne voit pas la vitrine.
 * Ce n'est pas seulement un confort : c'est ce qui rattrape les installations
 * PWA existantes, dont le `start_url` pointe encore sur `/`. Sans cette
 * redirection, ouvrir l'icône afficherait la page de vente.
 *
 * Route PUBLIQUE (cf. middleware) : le robot de Pinterest et les moteurs
 * arrivent déconnectés et voient donc bien la vitrine.
 */
export const dynamic = 'force-dynamic';

export default async function Accueil() {
  const session = await auth();
  // Échappatoire de développement, identique à celle d'`auth.ts` : sans client
  // OAuth configuré en local, on considère la session comme absente plutôt que
  // de rediriger vers une application qu'on ne peut pas atteindre.
  if (session?.user) redirect('/foyer');
  return <Vitrine />;
}
