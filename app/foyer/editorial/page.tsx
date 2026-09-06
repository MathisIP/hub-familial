import VueEditorial from '@/components/editorial/VueEditorial';
import { chargerPostsEditorial } from '@/lib/editorial/service';
import { exigerAcces } from '@/lib/abonnement';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendrier éditorial — Nestync' };

/**
 * CALENDRIER ÉDITORIAL — page privée, VOLONTAIREMENT NON LISTÉE dans le menu
 * (SideBar/MenuPrincipal). Outil de travail sur la promotion de l'app, pas une
 * fonctionnalité du foyer familial : n'importe quel membre du foyer connecté
 * peut y accéder par son URL directe (comme un module normal — `exigerAcces()`
 * suffit), mais rien n'y renvoie depuis la navigation.
 *
 * ⚠ ÉTAT PARTAGÉ ENTRE LES MEMBRES DU FOYER (07/09/2026), pas en `localStorage`
 * comme le prototype HTML d'origine : le calendrier n'a de sens que si les deux
 * personnes qui le tiennent voient les mêmes coches.
 */
export default async function PageEditorial() {
  await exigerAcces();
  const posts = await chargerPostsEditorial();

  return (
    <>
      <header className="entete">
        <div>
          <h1>Calendrier éditorial</h1>
          <p>16 publications du 7 septembre au 3 octobre 2026 — état partagé du foyer.</p>
        </div>
      </header>
      <VueEditorial initial={posts} />
    </>
  );
}
