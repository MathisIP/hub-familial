'use client';

import { useActionState , useState} from 'react';
import Liste from '@/components/Liste';
import { envoyerAideAction } from '@/app/aide/actions';

/**
 * Formulaire de contact de la page d'aide.
 *
 * `defautEmail` / `defautNom` sont pré-remplis quand la personne est connectée :
 * lui redemander qui elle est alors qu'on le sait est une friction gratuite.
 * Les champs restent modifiables — on peut écrire depuis une autre adresse.
 */
export default function FormulaireContact({
  defautEmail = '',
  defautNom = '',
}: {
  defautEmail?: string;
  defautNom?: string;
}) {
  const [sujet, setSujet] = useState('question');
  const [etat, action, enCours] = useActionState(envoyerAideAction, null);

  if (etat?.ok) {
    return (
      <div className="aide-envoye" role="status">
        <p className="aide-envoye-titre">Message envoyé ✓</p>
        <p>
          On te répond à l’adresse indiquée, en général sous quelques jours — et
          au plus tard sous 30 jours pour une demande concernant tes données.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="aide-form">
      {/* Piège à robots : masqué à l'œil ET aux lecteurs d'écran, jamais rempli
          par un humain. Une alternative au captcha, qui ferait entrer un tiers
          et son traçage dans une page qu'on veut sobre. */}
      <div className="aide-piege" aria-hidden="true">
        <label htmlFor="site">Ne pas remplir</label>
        <input id="site" name="site" type="text" tabIndex={-1} autoComplete="off" />
      </div>

      <div className="aide-duo">
        <label className="aide-champ">
          <span className="aide-lbl">Ton nom</span>
          <input className="champ" name="nom" defaultValue={defautNom} autoComplete="name" />
        </label>
        <label className="aide-champ">
          <span className="aide-lbl">Ton adresse e-mail *</span>
          <input
            className="champ"
            name="email"
            type="email"
            required
            defaultValue={defautEmail}
            autoComplete="email"
          />
        </label>
      </div>

      <label className="aide-champ">
        <span className="aide-lbl">De quoi s’agit-il ?</span>
        <Liste
          name="sujet"
          valeur={sujet}
          onChange={setSujet}
          options={[
            { valeur: 'question', libelle: 'Une question sur l’application' },
            { valeur: 'probleme', libelle: 'Quelque chose ne fonctionne pas' },
            { valeur: 'donnees', libelle: 'Mes données personnelles (accès, effacement…)' },
            { valeur: 'facturation', libelle: 'Abonnement ou facturation' },
            /*
              ⚠ Cet objet n'est pas une nuance de « problème ». Il désigne le
              canal de réclamation préalable, sans lequel un consommateur ne peut
              pas saisir le médiateur de la consommation. Le libellé nomme donc
              ce qui est en jeu — « litige, remboursement » — plutôt que d'être
              formulé en interne : quelqu'un qui cherche à faire valoir un droit
              doit le reconnaître du premier coup d'œil.
            */
            { valeur: 'reclamation', libelle: 'Une réclamation (litige, remboursement)' },
            { valeur: 'autre', libelle: 'Autre chose' },
          ]}
        />
      </label>

      <label className="aide-champ">
        <span className="aide-lbl">Ton message *</span>
        <textarea className="champ aide-message" name="message" rows={6} required minLength={10} />
      </label>

      {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

      <div className="aide-actions">
        <button type="submit" className="bouton bouton-primaire" disabled={enCours}>
          {enCours ? 'Envoi…' : 'Envoyer'}
        </button>
        {/*
          ⚠ Le texte annonçait « conservés le temps de traiter la demande, puis
          effacés », ce qui n'était déjà pas la durée réelle (un an) et l'est
          encore moins depuis qu'une réclamation est gardée plus longtemps.
          L'article 13 du RGPD demande une durée, pas une intention.
        */}
        <p className="aide-rgpd">
          Ton nom, ton adresse et ton message ne servent qu’à te répondre. Ils sont
          conservés un an — dix-huit mois s’il s’agit d’une réclamation, le temps qu’un
          recours reste possible — puis effacés. Tu recevras une copie de ton message par
          courriel.
        </p>
      </div>
    </form>
  );
}
