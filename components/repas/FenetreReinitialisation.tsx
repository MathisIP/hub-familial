'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT, useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_JOUR } from '@/lib/i18n';
import { JOURS, MOMENTS, type Moment } from '@/lib/repas/schema';

/**
 * FENÊTRE DE RÉINITIALISATION DU PLANNING — components/repas/VueRepas.tsx.
 * ==========================================================================
 * ⚠ AJOUTÉE LE 02/09/2026, signalée depuis le planning : vider un menu
 * demandait de reprendre chaque champ jour par jour, ce qui devient long
 * depuis que chaque jour porte deux moments (midi/soir).
 *
 * ⚠ TROIS CRITÈRES INDÉPENDANTS, PAS UN SEUL « TOUT ». « Tout » coche tous
 * les jours ET tous les moments — ce n'est pas un cas à part, juste l'état
 * où les deux listes sont pleines. Une case « jour spécifique » à côté d'un
 * bouton « Tout » créerait deux façons différentes de dire la même chose.
 *
 * ⚠ « REMETTRE LE NOMBRE DE PERSONNES » EST UN CHOIX SÉPARÉ, PAS COCHÉ PAR
 * DÉFAUT. Le nombre de personnes est un réglage du foyer, pas une
 * planification qu'on referait chaque semaine — le vider par réflexe en même
 * temps que les recettes perdrait un réglage qu'on n'a pas demandé de
 * changer (voir `reinitialiserSemaine`, lib/repas/service.ts).
 *
 * ⚠ RENDUE EN PORTAIL DANS `document.body`, réutilise le style `.fr-*` posé
 * par FicheRecette.tsx (voir le commentaire dans globals.css).
 */
export default function FenetreReinitialisation({
  occupe,
  onFermer,
  onConfirmerAction,
}: {
  occupe: boolean;
  onFermer: () => void;
  onConfirmerAction: (criteres: { jours?: string[]; moments?: Moment[]; remettrePersonnes?: boolean }) => void;
}) {
  const tr = useT();
  const langue = useLangue();
  const [joursCoches, setJoursCoches] = useState<Set<string>>(new Set(JOURS));
  const [momentsCoches, setMomentsCoches] = useState<Set<Moment>>(new Set(MOMENTS));
  const [remettrePersonnes, setRemettrePersonnes] = useState(false);

  const tout = joursCoches.size === JOURS.length && momentsCoches.size === MOMENTS.length;

  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  if (typeof document === 'undefined') return null;

  function basculerJour(jour: string) {
    setJoursCoches((s) => {
      const suivant = new Set(s);
      if (suivant.has(jour)) suivant.delete(jour);
      else suivant.add(jour);
      return suivant;
    });
  }

  function basculerMoment(moment: Moment) {
    setMomentsCoches((s) => {
      const suivant = new Set(s);
      if (suivant.has(moment)) suivant.delete(moment);
      else suivant.add(moment);
      return suivant;
    });
  }

  function basculerTout() {
    if (tout) {
      setJoursCoches(new Set());
      setMomentsCoches(new Set());
    } else {
      setJoursCoches(new Set(JOURS));
      setMomentsCoches(new Set(MOMENTS));
    }
  }

  function confirmer() {
    if (joursCoches.size === 0 || momentsCoches.size === 0) return;
    onConfirmerAction({
      // ⚠ Un tableau complet équivaut à « tous », mais le service traite les
      // deux cas différemment (voir `reinitialiserSemaine`) : on envoie
      // `undefined` quand tout est coché, pour rester sur son chemin le plus
      // simple (aucune clause de filtre) plutôt que de lister 7 jours.
      jours: joursCoches.size === JOURS.length ? undefined : [...joursCoches],
      moments: momentsCoches.size === MOMENTS.length ? undefined : ([...momentsCoches] as Moment[]),
      remettrePersonnes,
    });
  }

  return createPortal(
    <div className="fr-fond" role="dialog" aria-modal="true" aria-label={tr('REPAS_REINIT_TITRE')} onClick={onFermer}>
      <div className="fr-fiche" onClick={(e) => e.stopPropagation()}>
        <header className="fr-tete">
          <h2 className="fr-nom">{tr('REPAS_REINIT_TITRE')}</h2>
          <button className="bouton discret fr-fermer" onClick={onFermer} aria-label={tr('G_FERMER')}>
            ✕
          </button>
        </header>

        <label className="reinit-tout">
          <input type="checkbox" checked={tout} onChange={basculerTout} disabled={occupe} />
          <strong>{tr('REPAS_REINIT_TOUT')}</strong>
        </label>

        <div className="reinit-bloc">
          <p className="fr-soustitre">{tr('REPAS_MOMENT_LABEL')}</p>
          <div className="reinit-cases">
            {MOMENTS.map((m) => (
              <label className="reinit-case" key={m}>
                <input
                  type="checkbox"
                  checked={momentsCoches.has(m)}
                  onChange={() => basculerMoment(m)}
                  disabled={occupe}
                />
                {m === 'midi' ? `☀️ ${tr('REPAS_MOMENT_MIDI')}` : `🌙 ${tr('REPAS_MOMENT_SOIR')}`}
              </label>
            ))}
          </div>
        </div>

        <div className="reinit-bloc">
          <p className="fr-soustitre">{tr('REPAS_REINIT_JOURS')}</p>
          <div className="reinit-cases">
            {JOURS.map((j) => (
              <label className="reinit-case" key={j}>
                <input
                  type="checkbox"
                  checked={joursCoches.has(j)}
                  onChange={() => basculerJour(j)}
                  disabled={occupe}
                />
                {tEnum(CLE_JOUR, j, langue)}
              </label>
            ))}
          </div>
        </div>

        <label className="reinit-personnes">
          <input
            type="checkbox"
            checked={remettrePersonnes}
            onChange={(e) => setRemettrePersonnes(e.target.checked)}
            disabled={occupe}
          />
          {tr('REPAS_REINIT_PERSONNES')}
        </label>

        <div className="fr-poser-champs">
          <button type="button" className="bouton discret" onClick={onFermer} disabled={occupe}>
            {tr('G_ANNULER')}
          </button>
          <button
            type="button"
            className="bouton bouton-action"
            onClick={confirmer}
            disabled={occupe || joursCoches.size === 0 || momentsCoches.size === 0}
          >
            {tr('REPAS_REINIT_CONFIRMER')}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
