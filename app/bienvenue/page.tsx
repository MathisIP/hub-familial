import Link from 'next/link';
import { redirect } from 'next/navigation';
import { utilisateurCourant, foyerCourant } from '@/lib/foyer';
import { maDemande } from '@/lib/membres';
import { inscriptionOuverte } from '@/lib/acces';
import { membres } from '@/lib/db/schema';
import { db } from '@/lib/db';
import { eq } from 'drizzle-orm';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Bienvenue — Nestync' };

/**
 * Page d'atterrissage d'une personne connectée qui n'appartient à AUCUN foyer.
 *
 * Deux situations :
 *  · inscriptions ouvertes → elle peut créer son propre foyer (essai gratuit) ;
 *  · sinon (phase privée)  → elle doit rejoindre un foyer existant, sur
 *    invitation ou en envoyant une demande à son responsable.
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
    <main className="adh">
      <header className="entete">
        <div>
          <h1>Bienvenue{prenom ? `, ${prenom}` : ''} 👋</h1>
          <p>Ton compte est créé. Il ne reste qu’à rejoindre — ou créer — un foyer.</p>
        </div>
      </header>

      {demande?.statut === 'en_attente' ? (
        <div className="adh-ok">
          <p className="adh-ok-ic" aria-hidden="true">⏳</p>
          <h2>Demande en attente</h2>
          <p>
            Ta demande pour rejoindre <strong>{demande.foyerNom}</strong> attend la
            validation du responsable du foyer. Tu recevras l’accès dès qu’il l’accepte.
          </p>
          <p className="adh-aide">
            Préviens-le : la demande l’attend dans <strong>Réglages → Mon foyer</strong>.
          </p>
        </div>
      ) : (
        <div className="bv-choix">
          <article className="bv-carte">
            <span className="bv-ic" aria-hidden="true">🏡</span>
            <h2>Rejoindre un foyer</h2>
            <p>
              Quelqu’un de ta famille utilise déjà Nestync ? Indique l’adresse e-mail
              du responsable du foyer : il recevra ta demande.
            </p>
            <Link href="/rejoindre-foyer" className="bouton bouton-primaire">
              Demander à rejoindre
            </Link>
            <p className="bv-note">
              Tu as reçu un <strong>lien d’invitation</strong> ? Ouvre-le directement,
              tu rejoindras le foyer sans attendre.
            </p>
          </article>

          {ouvert ? (
            <article className="bv-carte">
              <span className="bv-ic" aria-hidden="true">✨</span>
              <h2>Créer mon foyer</h2>
              <p>
                Tu es le premier de ta famille sur Nestync ? Crée ton foyer et invite
                tes proches. L’essai est gratuit pendant 14 jours.
              </p>
              <form
                action={async () => {
                  'use server';
                  // `foyerCourant()` provisionne le foyer + l'essai quand la
                  // politique l'autorise (cf. lib/acces.ts).
                  await foyerCourant();
                  redirect('/');
                }}
              >
                <button type="submit" className="bouton bouton-primaire">
                  Créer mon foyer
                </button>
              </form>
            </article>
          ) : (
            <article className="bv-carte bv-carte-attente">
              <span className="bv-ic" aria-hidden="true">🔒</span>
              <h2>Créer un nouveau foyer</h2>
              <p>
                Les inscriptions ne sont pas encore ouvertes au public : pour l’instant,
                Nestync se rejoint sur invitation.
              </p>
              <p className="bv-note">
                Tu peux découvrir le produit et les tarifs en attendant.
              </p>
              <Link href="/" className="bouton">Voir la présentation</Link>
            </article>
          )}
        </div>
      )}

      <p className="compte-note foyer-aide">
        Connecté avec <strong>{user.email}</strong>.{' '}
        <Link href="/compte">Gérer mon compte</Link>
      </p>
    </main>
  );
}
