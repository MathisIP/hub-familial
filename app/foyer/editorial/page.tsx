import VueEditorial from '@/components/editorial/VueEditorial';
import { chargerPostsEditorial } from '@/lib/editorial/service';
import { instagramConnecte } from '@/lib/editorial/instagram';
import { exigerAcces } from '@/lib/abonnement';
import { idFoyerCourant } from '@/lib/foyer';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Calendrier éditorial — Nestync' };

/** Message affiché au retour de l'autorisation Instagram (`?instagram=…`). */
const RETOURS: Record<string, { texte: string; erreur: boolean }> = {
  ok: { texte: 'Compte Instagram connecté ✓', erreur: false },
  refus: { texte: 'Connexion Instagram annulée.', erreur: true },
  etat: { texte: 'Lien d’autorisation invalide ou expiré, réessaie.', erreur: true },
  echec: { texte: 'La connexion à Instagram a échoué.', erreur: true },
};

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
export default async function PageEditorial({
  searchParams,
}: {
  searchParams: Promise<{ instagram?: string }>;
}) {
  await exigerAcces();
  const foyerId = await idFoyerCourant();
  const [posts, connecte, retourParam] = await Promise.all([
    chargerPostsEditorial(),
    instagramConnecte(foyerId),
    searchParams,
  ]);
  const retour = RETOURS[retourParam.instagram ?? ''];

  return (
    <>
      <header className="entete">
        <div>
          <h1>Calendrier éditorial</h1>
          <p>16 publications du 7 septembre au 3 octobre 2026 — état partagé du foyer.</p>
        </div>
      </header>

      {retour && <p className={`message ${retour.erreur ? 'erreur' : 'info'}`}>{retour.texte}</p>}

      <section className="compte-bloc">
        <h2 className="bloc-titre">Compte Instagram</h2>
        {connecte ? (
          <p className="compte-note">Connecté : @{connecte.nomCompte || '…'}</p>
        ) : (
          <>
            <p className="compte-note">
              Connecte le compte Instagram professionnel pour remplir automatiquement les résultats (vues,
              interactions) de chaque publication.
            </p>
            <a href="/api/editorial/instagram/connexion" className="bouton bouton-primaire">
              Connecter Instagram
            </a>
          </>
        )}
      </section>

      <VueEditorial initial={posts} />
    </>
  );
}
