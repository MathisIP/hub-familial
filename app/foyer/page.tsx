import LienAccueil from '@/components/LienAccueil';
import LienInvitation from '@/components/foyer/LienInvitation';
import { foyerCourant, utilisateurCourant } from '@/lib/foyer';
import { chargerFoyerMembres } from '@/lib/membres';
import { inviterAction, revoquerAction, retirerAction, renommerAction } from './actions';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon foyer — Hub familial' };

/**
 * Page « Mon foyer » : membres du foyer, invitations (lien à partager) et nom du
 * foyer. La gestion (inviter / retirer / renommer) est réservée au propriétaire.
 */
export default async function PageFoyer() {
  const [foyer, user] = [await foyerCourant(), await utilisateurCourant()];
  const d = await chargerFoyerMembres(foyer.id, user.id);
  const proprio = d.monRole === 'proprietaire';

  return (
    <>
      <LienAccueil />
      <header className="entete">
        <div>
          <h1>Mon foyer</h1>
          <p>Les personnes qui partagent les données de « {d.foyerNom} »</p>
        </div>
      </header>

      {proprio && (
        <section className="compte-bloc">
          <h2 className="bloc-titre">Nom du foyer</h2>
          <form action={renommerAction} className="foyer-inline">
            <input className="champ" name="nom" defaultValue={d.foyerNom} aria-label="Nom du foyer" />
            <button className="bouton" type="submit">Renommer</button>
          </form>
        </section>
      )}

      <section className="compte-bloc">
        <h2 className="bloc-titre">Membres ({d.membres.length})</h2>
        <ul className="foyer-liste">
          {d.membres.map((m) => (
            <li className="foyer-membre" key={m.membreId}>
              <span className="fm-ident">
                <span className="fm-nom">{m.nom || m.email}</span>
                <span className="fm-email">{m.email}</span>
              </span>
              <span className={`puce ${m.role === 'proprietaire' ? 'assigne' : 'categorie'}`}>
                {m.role === 'proprietaire' ? 'Propriétaire' : 'Membre'}
                {m.utilisateurId === user.id ? ' · toi' : ''}
              </span>
              {proprio && m.role !== 'proprietaire' && m.utilisateurId !== user.id && (
                <form action={retirerAction}>
                  <input type="hidden" name="id" value={m.membreId} />
                  <button className="bouton discret rf-danger" type="submit">Retirer</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {proprio && (
        <section className="compte-bloc">
          <h2 className="bloc-titre">Inviter une personne</h2>
          <p className="compte-note">
            Saisis son adresse Google. Un lien d’invitation sera créé : partage-le (SMS, WhatsApp…).
            La personne le suit, se connecte, et rejoint ton foyer.
          </p>
          <form action={inviterAction} className="foyer-inline">
            <input
              className="champ"
              type="email"
              name="email"
              placeholder="adresse@gmail.com"
              required
              aria-label="E-mail à inviter"
            />
            <button className="bouton bouton-primaire" type="submit">Inviter</button>
          </form>

          {d.invitations.length > 0 && (
            <>
              <h3 className="foyer-sous-titre">Invitations en attente</h3>
              <ul className="foyer-liste">
                {d.invitations.map((inv) => (
                  <li className="foyer-membre" key={inv.id}>
                    <span className="fm-ident">
                      <span className="fm-nom">{inv.email}</span>
                      <span className="fm-email">expire le {new Date(inv.expireLe).toLocaleDateString('fr-FR')}</span>
                    </span>
                    <LienInvitation jeton={inv.jeton} />
                    <form action={revoquerAction}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button className="bouton discret rf-danger" type="submit">Annuler</button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <p className="compte-note foyer-aide">
        ⚠ Phase privée : pour que la personne invitée puisse se connecter, son adresse doit aussi
        figurer dans la liste blanche <code>EMAILS_AUTORISES</code> (env). Ce sera automatique une fois
        l’accès basé sur l’abonnement activé.
      </p>
    </>
  );
}
