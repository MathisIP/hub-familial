import Link from 'next/link';
import { redirect } from 'next/navigation';
import { utilisateurCourant, foyerCourant } from '@/lib/foyer';
import { maDemande } from '@/lib/membres';
import { inscriptionOuverte } from '@/lib/acces';
import { ESSAI_JOURS } from '@/lib/offres';
import { membres } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';
import CadreSite from '@/components/vitrine-ds/CadreSite';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bienvenue — Nestync' };

/**
 * Page d'atterrissage d'une personne connectée qui n'appartient à AUCUN foyer.
 *
 * Deux situations :
 *  · inscriptions ouvertes → elle peut créer son propre foyer (essai gratuit) ;
 *  · sinon (phase privée)  → elle doit rejoindre un foyer existant, sur
 *    invitation ou en envoyant une demande à son responsable.
 *
 * ⚠ HABILLÉE À LA CHARTE DU SITE (25/08/2026), comme la connexion et
 * « rejoindre un foyer ». C'est la dernière étape du parcours d'arrivée :
 * vitrine → connexion → bienvenue. Quelqu'un qui vient de Pinterest traverse
 * désormais les trois sans changer d'univers visuel — et surtout, **il n'a pas
 * encore de foyer** : lui montrer l'habillage de l'application lui présenterait
 * un intérieur auquel il n'a pas accès.
 */
export default async function PageBienvenue() {
  const user = await utilisateurCourant();

  // Si la personne a (re)trouvé un foyer entre-temps, on ne l'immobilise pas ici.
  const [m] = await db()
    .select({ id: membres.id })
    .from(membres)
    .where(eq(membres.utilisateurId, user.id))
    .limit(1);
  if (m) redirect('/');

  const demande = await maDemande(user.id);
  const ouvert = inscriptionOuverte();
  const prenom = (user.nom ?? '').trim().split(/\s+/)[0];

  return (
    <CadreSite
      surtitre="Première étape"
      /* ⚠ Plus d'emoji dans le titre : la charte les interdit sans exception. L'accueil se
         fait par le prénom, ce qui est plus personnel qu'une main qui salue. */
      titre={prenom ? `Bienvenue, ${prenom}` : 'Bienvenue'}
      chapeau="Votre compte est créé. Il ne reste qu’à rejoindre — ou créer — un foyer."
      large
    >
      {demande?.statut === 'en_attente' ? (
        <div className="nsy-etat">
          <p className="nsy-etat-surtitre">Demande en attente</p>
          <p>
            Votre demande pour rejoindre <strong>{demande.foyerNom}</strong> attend la
            validation du responsable du foyer. Vous recevrez l’accès dès qu’il l’accepte.
          </p>
          <p>
            Prévenez-le : la demande l’attend dans <strong>Réglages → Mon foyer</strong>.
          </p>
        </div>
      ) : (
        <div className="nsy-choix">
          <article className="nsy-choix-carte">
            <p className="nsy-etat-surtitre">Rejoindre un foyer</p>
            <h2>Quelqu’un de votre famille l’utilise déjà</h2>
            <p>
              Indiquez l’adresse e-mail du responsable du foyer : il recevra votre
              demande.
            </p>
            <Link href="/rejoindre-foyer" className="bouton bouton-primaire">
              Demander à rejoindre
            </Link>
            <p className="nsy-choix-note">
              Vous avez reçu un <strong>lien d’invitation</strong> ? Ouvrez-le
              directement, vous rejoindrez le foyer sans attendre.
            </p>
          </article>

          {ouvert ? (
            <article className="nsy-choix-carte">
              <p className="nsy-etat-surtitre">Créer mon foyer</p>
              <h2>Vous êtes le premier de votre famille</h2>
              <p>
                Créez votre foyer et invitez vos proches. L’essai est gratuit pendant{' '}
                {ESSAI_JOURS} jours, sans carte bancaire.
              </p>
              <form
                action={async () => {
                  'use server';
                  // `foyerCourant()` provisionne le foyer + l'essai quand la
                  // politique l'autorise (cf. lib/acces.ts), avec
                  // `onboarding_fait = false` → on enchaîne sur la prise en main.
                  await foyerCourant();
                  redirect('/foyer/demarrage');
                }}
              >
                <button type="submit" className="bouton bouton-primaire">
                  Créer mon foyer
                </button>
              </form>
            </article>
          ) : (
            /* ⚠ Cette carte n'est PAS une erreur : c'est l'état normal tant que
               `INSCRIPTION_OUVERTE` est à false. Elle doit expliquer, pas
               s'excuser — d'où le filet neutre plutôt qu'un ton d'alerte. */
            <article className="nsy-choix-carte discret">
              <p className="nsy-etat-surtitre">Créer un nouveau foyer</p>
              <h2>Pas encore ouvert au public</h2>
              <p>
                Pour l’instant, Nestync se rejoint sur invitation. Vous pouvez découvrir
                le produit et les tarifs en attendant.
              </p>
              <Link href="/" className="bouton">
                Voir la présentation
              </Link>
            </article>
          )}
        </div>
      )}

      <p className="nsy-choix-note">
        Connecté avec <strong>{user.email}</strong>.{' '}
        <Link href="/foyer/compte">Gérer mon compte</Link>
      </p>
    </CadreSite>
  );
}
