import LienInvitation from '@/components/foyer/LienInvitation';
import { foyerCourantOuBienvenue, utilisateurCourant } from '@/lib/foyer';
import { chargerFoyerMembres, demandesEnAttente } from '@/lib/membres';
import {
  inviterAction,
  revoquerAction,
  retirerAction,
  renommerAction,
  accepterDemandeAction,
  refuserDemandeAction,
} from './actions';
import { t, locale } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Mon foyer — Nestync' };

/**
 * Page « Mon foyer » : membres du foyer, invitations (lien à partager) et nom du
 * foyer. La gestion (inviter / retirer / renommer) est réservée au propriétaire.
 */
export default async function PageFoyer() {
  const [foyer, user, langue] = [
    await foyerCourantOuBienvenue(),
    await utilisateurCourant(),
    await langueCourante(),
  ];
  const d = await chargerFoyerMembres(foyer.id, user.id);
  const proprio = d.monRole === 'proprietaire';
  // Réservé au propriétaire : `demandesEnAttente` refuserait un simple membre.
  const demandes = proprio ? await demandesEnAttente(foyer.id, user.id) : [];

  return (
    <>
      <header className="entete">
        <div>
          <h1>{t('NAV_MON_FOYER', langue)}</h1>
          <p>{t('FOY_SOUS_A', langue)} « {d.foyerNom} »</p>
        </div>
      </header>

      {proprio && (
        <section className="compte-bloc">
          <h2 className="bloc-titre">{t('FOY_NOM_TITRE', langue)}</h2>
          <form action={renommerAction} className="foyer-inline">
            <input className="champ" name="nom" defaultValue={d.foyerNom} aria-label={t('FOY_NOM_TITRE', langue)} />
            <button className="bouton" type="submit">{t('FOY_RENOMMER', langue)}</button>
          </form>
        </section>
      )}

      <section className="compte-bloc">
        <h2 className="bloc-titre">{t('FOY_MEMBRES', langue)} ({d.membres.length})</h2>
        <ul className="foyer-liste">
          {d.membres.map((m) => (
            <li className="foyer-membre" key={m.membreId}>
              <span className="fm-ident">
                <span className="fm-nom">{m.nom || m.email}</span>
                <span className="fm-email">{m.email}</span>
              </span>
              <span className={`puce ${m.role === 'proprietaire' ? 'assigne' : 'categorie'}`}>
                {m.role === 'proprietaire' ? t('FOY_PROPRIETAIRE', langue) : t('FOY_MEMBRE', langue)}
                {m.utilisateurId === user.id ? ` · ${t('FOY_TOI', langue)}` : ''}
              </span>
              {proprio && m.role !== 'proprietaire' && m.utilisateurId !== user.id && (
                <form action={retirerAction}>
                  <input type="hidden" name="id" value={m.membreId} />
                  <button className="bouton discret rf-danger" type="submit">{t('FOY_RETIRER', langue)}</button>
                </form>
              )}
            </li>
          ))}
        </ul>
      </section>

      {proprio && (
        <section className="compte-bloc">
          <h2 className="bloc-titre">{t('FOY_INVITER_TITRE', langue)}</h2>
          <p className="compte-note">{t('FOY_INVITER_NOTE', langue)}</p>
          <form action={inviterAction} className="foyer-inline">
            <input
              className="champ"
              type="email"
              name="email"
              placeholder="adresse@gmail.com"
              required
              aria-label={t('FOY_INVITER_TITRE', langue)}
            />
            <button className="bouton bouton-primaire" type="submit">{t('FOY_INVITER_BTN', langue)}</button>
          </form>

          {d.invitations.length > 0 && (
            <>
              <h3 className="foyer-sous-titre">{t('FOY_INVIT_ATTENTE', langue)}</h3>
              <ul className="foyer-liste">
                {d.invitations.map((inv) => (
                  <li className="foyer-membre" key={inv.id}>
                    <span className="fm-ident">
                      <span className="fm-nom">{inv.email}</span>
                      <span className="fm-email">
                        {t('FOY_EXPIRE', langue)} {new Date(inv.expireLe).toLocaleDateString(locale(langue))}
                      </span>
                    </span>
                    <LienInvitation jeton={inv.jeton} />
                    <form action={revoquerAction}>
                      <input type="hidden" name="id" value={inv.id} />
                      <button className="bouton discret rf-danger" type="submit">{t('G_ANNULER', langue)}</button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}

          {/* Demandes reçues : quelqu'un a frappé à la porte du foyer. */}
          {demandes.length > 0 && (
            <>
              <h3 className="foyer-sous-titre">
                {t('FOY_DEMANDES', langue)}
                <span className="foyer-badge">{demandes.length}</span>
              </h3>
              <ul className="foyer-liste">
                {demandes.map((dem) => (
                  <li className="foyer-membre" key={dem.id}>
                    <span className="fm-ident">
                      <span className="fm-nom">{dem.nom || dem.email}</span>
                      <span className="fm-email">{dem.email}</span>
                      {dem.message && <span className="fm-message">« {dem.message} »</span>}
                    </span>
                    <form action={accepterDemandeAction}>
                      <input type="hidden" name="id" value={dem.id} />
                      <button className="bouton bouton-primaire" type="submit">
                        {t('FOY_ACCEPTER', langue)}
                      </button>
                    </form>
                    <form action={refuserDemandeAction}>
                      <input type="hidden" name="id" value={dem.id} />
                      <button className="bouton discret rf-danger" type="submit">
                        {t('FOY_REFUSER', langue)}
                      </button>
                    </form>
                  </li>
                ))}
              </ul>
            </>
          )}
        </section>
      )}

      <p className="compte-note foyer-aide">{t('FOY_AIDE_A', langue)}</p>
    </>
  );
}
