'use client';

import { useActionState } from 'react';
import Link from 'next/link';
import { demanderAdhesionAction } from '@/app/foyer/actions';

type Etat = { ok?: string; erreur?: string } | null;

/**
 * Formulaire « rejoindre un foyer existant » : le demandeur saisit l'e-mail du
 * RESPONSABLE du foyer (celui qui paie l'abonnement). Une demande part chez lui ;
 * il l'accepte ou la refuse depuis « Mon foyer ».
 */
export default function FormulaireAdhesion({ monEmail }: { monEmail: string }) {
  const [etat, action, enCours] = useActionState<Etat, FormData>(
    async (_precedent, formData) => demanderAdhesionAction(formData),
    null,
  );

  if (etat?.ok) {
    return (
      <div className="adh-ok">
        <p className="adh-ok-ic" aria-hidden="true">📨</p>
        <h2>Demande envoyée</h2>
        <p>
          Le responsable du foyer <strong>{etat.ok}</strong> a reçu ta demande. Dès qu’il
          l’accepte, tu retrouveras ici toutes les données du foyer.
        </p>
        <p className="adh-aide">
          Préviens-le : la demande l’attend dans <strong>Réglages → Mon foyer</strong>.
        </p>
        <Link href="/" className="bouton bouton-primaire">Retour à l’accueil</Link>
      </div>
    );
  }

  return (
    <form className="adh-form" action={action}>
      <label className="reglage-champ">
        <span className="reglage-lbl">Adresse e-mail du responsable du foyer</span>
        <input
          className="champ"
          type="email"
          name="email"
          required
          placeholder="prenom.nom@exemple.com"
          autoComplete="off"
        />
        <span className="reglage-aide">
          C’est l’adresse avec laquelle il s’est inscrit (celle qui porte l’abonnement).
          La tienne, <strong>{monEmail}</strong>, sera transmise avec la demande.
        </span>
      </label>

      <label className="reglage-champ">
        <span className="reglage-lbl">Message (facultatif)</span>
        <input
          className="champ"
          name="message"
          maxLength={500}
          placeholder="C’est moi, Lou 👋"
        />
      </label>

      {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

      <div className="reglage-actions">
        <button type="submit" className="bouton bouton-primaire" disabled={enCours}>
          {enCours ? 'Envoi…' : 'Envoyer ma demande'}
        </button>
        <Link href="/" className="bouton">Annuler</Link>
      </div>
    </form>
  );
}
