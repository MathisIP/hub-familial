'use client';

import { useActionState, useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  nommerFoyerAction,
  inviterOnboardingAction,
  terminerOnboardingAction,
} from '@/app/foyer/membres/actions';
import LienInvitation from '@/components/foyer/LienInvitation';

/**
 * PRISE EN MAIN — parcours en 3 étapes, affiché une seule fois, à la création
 * d'un foyer. Objectif : que la personne reparte avec un foyer NOMMÉ et, si elle
 * le souhaite, ses proches déjà invités — au lieu d'un « Foyer de X » anonyme.
 *
 * Les étapes 2 et 3 sont sautables : on ne bloque jamais l'entrée dans le produit.
 */
type Invitation = { email: string; jeton: string };

export default function Demarrage({
  nomInitial,
  invitationsInitiales,
}: {
  nomInitial: string;
  invitationsInitiales: Invitation[];
}) {
  const router = useRouter();
  const [etape, setEtape] = useState(1);
  const [invitations, setInvitations] = useState<Invitation[]>(invitationsInitiales);

  // Référence stable : sans cela l'effet enfant se rejouerait à chaque rendu.
  // Dédoublonne par e-mail (une relance remplace l'entrée existante).
  const ajouterInvitation = useCallback((inv: Invitation) => {
    setInvitations((l) => [...l.filter((x) => x.email !== inv.email), inv]);
  }, []);

  return (
    <div className="onb">
      <ol className="onb-fil" aria-label="Progression">
        {['Ton foyer', 'Tes proches', 'C’est parti'].map((titre, i) => (
          <li key={titre} className={`onb-pas${etape === i + 1 ? ' actif' : ''}${etape > i + 1 ? ' fait' : ''}`}>
            <span className="onb-pas-n">{etape > i + 1 ? '✓' : i + 1}</span>
            <span className="onb-pas-t">{titre}</span>
          </li>
        ))}
      </ol>

      {etape === 1 && (
        <EtapeNom nomInitial={nomInitial} onSuivant={() => setEtape(2)} />
      )}

      {etape === 2 && (
        <EtapeInvitations
          invitations={invitations}
          onAjout={ajouterInvitation}
          onSuivant={() => setEtape(3)}
          onRetour={() => setEtape(1)}
        />
      )}

      {etape === 3 && (
        <EtapeFin
          nbInvites={invitations.length}
          onTerminer={async (origineDeclaree) => {
            const fd = new FormData();
            if (origineDeclaree) fd.set('origineDeclaree', origineDeclaree);
            await terminerOnboardingAction(fd);
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/* ----------------------------- Étape 1 : le nom ----------------------------- */
function EtapeNom({ nomInitial, onSuivant }: { nomInitial: string; onSuivant: () => void }) {
  const [etat, action, enCours] = useActionState(nommerFoyerAction, null);

  // Le nom est enregistré côté serveur ; on avance dès qu'il est accepté.
  // (Dans un effet, jamais pendant le rendu : changer d'état en plein rendu
  // provoque des rendus en cascade imprévisibles.)
  useEffect(() => {
    if (etat?.ok) onSuivant();
  }, [etat, onSuivant]);

  return (
    <section className="onb-carte">
      <h2>Comment s’appelle ton foyer ?</h2>
      <p className="onb-sous">
        C’est le nom que verront les personnes que tu invites. « La maison », « Chez les
        Martin », « Notre tribu »… il n’y a pas de mauvaise réponse.
      </p>
      <form action={action} className="onb-form">
        <input
          className="champ onb-champ"
          name="nom"
          defaultValue={nomInitial}
          maxLength={60}
          required
          autoFocus
          aria-label="Nom du foyer"
        />
        {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}
        <button type="submit" className="bouton bouton-primaire" disabled={enCours}>
          {enCours ? 'Enregistrement…' : 'Continuer'}
        </button>
      </form>
    </section>
  );
}

/* ------------------------ Étape 2 : inviter ses proches ---------------------- */
function EtapeInvitations({
  invitations,
  onAjout,
  onSuivant,
  onRetour,
}: {
  invitations: Invitation[];
  onAjout: (inv: Invitation) => void;
  onSuivant: () => void;
  onRetour: () => void;
}) {
  const [etat, action, enCours] = useActionState(inviterOnboardingAction, null);

  // Une invitation vient d'être créée : on la remonte à la liste affichée.
  useEffect(() => {
    if (etat?.invite) onAjout({ email: etat.invite, jeton: '' });
  }, [etat, onAjout]);

  return (
    <section className="onb-carte">
      <h2>Qui partage ce foyer ?</h2>
      <p className="onb-sous">
        Chaque personne invitée verra les mêmes listes, le même budget, le même agenda.
        Tu pourras en ajouter d’autres plus tard — cette étape est facultative.
      </p>

      <form action={action} className="onb-form onb-form-ligne">
        <input
          className="champ"
          type="email"
          name="email"
          placeholder="adresse@exemple.com"
          required
          aria-label="Adresse e-mail à inviter"
        />
        <button type="submit" className="bouton" disabled={enCours}>
          {enCours ? 'Invitation…' : 'Inviter'}
        </button>
      </form>
      {etat?.erreur && <p className="message erreur">{etat.erreur}</p>}

      {invitations.length > 0 && (
        <ul className="onb-invites">
          {invitations.map((inv) => (
            <li key={inv.email}>
              <span className="onb-invite-mail">✉️ {inv.email}</span>
              {inv.jeton && <LienInvitation jeton={inv.jeton} />}
            </li>
          ))}
        </ul>
      )}
      {invitations.length > 0 && (
        <p className="onb-aide">
          Un lien d’invitation a été créé pour chacun. Retrouve-les dans
          <strong> Réglages → Mon foyer</strong> pour les partager par message.
        </p>
      )}

      <div className="onb-actions">
        <button type="button" className="bouton" onClick={onRetour}>Retour</button>
        <button type="button" className="bouton bouton-primaire" onClick={onSuivant}>
          {invitations.length > 0 ? 'Continuer' : 'Passer cette étape'}
        </button>
      </div>
    </section>
  );
}

/* --------------------------- Étape 3 : prise en main -------------------------- */
const MODULES = [
  { e: '💶', n: 'Budget', d: 'comptes, dépenses, échéances' },
  { e: '✅', n: 'To-Do & Courses', d: 'tâches et liste partagée' },
  { e: '🍽️', n: 'Repas', d: 'menu de la semaine et recettes' },
  { e: '📅', n: 'Agenda', d: 'la semaine de toute la famille' },
  { e: '🎉', n: 'Événements', d: 'réceptions, invités, budget' },
  { e: '🎁', n: 'Cadeaux', d: 'idées et budget par occasion' },
  { e: '🗂️', n: 'Documents', d: 'papiers du foyer, rangés et privés' },
];

/**
 * Question facultative, jamais bloquante : « Passer » et « Ouvrir mon tableau
 * de bord » mènent au même endroit, avec ou sans réponse choisie.
 */
const ORIGINES = ['TikTok', 'Instagram', 'Pinterest', 'Threads', 'Autre'];

function EtapeFin({
  nbInvites,
  onTerminer,
}: {
  nbInvites: number;
  onTerminer: (origineDeclaree?: string) => void;
}) {
  const [enCours, setEnCours] = useState(false);
  const [origineDeclaree, setOrigineDeclaree] = useState('');

  return (
    <section className="onb-carte">
      <h2>Tout est prêt 🎉</h2>
      <p className="onb-sous">
        {nbInvites > 0
          ? `${nbInvites} invitation(s) envoyée(s). Voici ce qui t’attend :`
          : 'Voici ce qui t’attend — tu pourras inviter tes proches à tout moment :'}
      </p>

      <ul className="onb-modules">
        {MODULES.map((m) => (
          <li key={m.n}>
            <span aria-hidden="true">{m.e}</span>
            <span><strong>{m.n}</strong> — {m.d}</span>
          </li>
        ))}
      </ul>

      <p className="onb-aide">
        💡 Installe Nestync sur ton téléphone (menu du navigateur →
        « Sur l’écran d’accueil ») pour l’ouvrir comme une vraie application.
        Le thème, la langue et l’effet néon se règlent dans <strong>Réglages</strong>.
      </p>

      <div className="onb-origine">
        <label htmlFor="onb-origine-select">
          Comment as-tu connu Nestync ? <span className="onb-facultatif">(facultatif)</span>
        </label>
        <select
          id="onb-origine-select"
          className="champ"
          value={origineDeclaree}
          onChange={(e) => setOrigineDeclaree(e.target.value)}
        >
          <option value="">— Préférer ne pas répondre —</option>
          {ORIGINES.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className="bouton bouton-primaire onb-final"
        disabled={enCours}
        onClick={() => { setEnCours(true); onTerminer(origineDeclaree || undefined); }}
      >
        {enCours ? 'Ouverture…' : 'Ouvrir mon tableau de bord'}
      </button>
    </section>
  );
}
