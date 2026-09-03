'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Combobox from '@/components/Combobox';
import Liste from '@/components/Liste';
import ChampDate from '@/components/ChampDate';
import { useT, useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_PRIORITE, CLE_JOUR } from '@/lib/i18n';
import { JOURS } from '@/lib/repas/schema';
import { JOURS_MOIS, type Parametres } from '@/lib/todo/schema';

/**
 * FENÊTRE D'AJOUT D'UNE TÂCHE — popup, ouverte depuis un bouton (+).
 * =====================================================================
 * ⚠ AJOUTÉE LE 02/09/2026. Le formulaire (6 champs) restait auparavant
 * déplié en permanence en haut de l'onglet Tâches — signalé comme prenant
 * trop de place à l'écran avant même d'avoir une tâche à ajouter. Le
 * formulaire lui-même n'a pas changé, seul son mode de présentation :
 * masqué par défaut, dans une fenêtre, à la demande.
 *
 * ⚠ RENDUE EN PORTAIL DANS `document.body`, réutilise le style `.fr-*` posé
 * par FicheRecette.tsx (voir le commentaire dans globals.css) — même piège
 * de `position: fixed` enfermé par un ancêtre en `transform`, même remède.
 */
export default function FormulaireTache({
  params,
  occupe,
  onFermer,
  onAjouterAction,
}: {
  params: Parametres;
  occupe: boolean;
  onFermer: () => void;
  onAjouterAction: (corps: {
    tache: string;
    assigne: string;
    priorite: string;
    categorie: string;
    echeanceLabel: string;
    recurrence: string;
    recurrenceJour: string;
  }) => void;
}) {
  const tr = useT();
  const langue = useLangue();
  const [titre, setTitre] = useState('');
  const [assigne, setAssigne] = useState('');
  const [priorite, setPriorite] = useState('');
  const [categorie, setCategorie] = useState('');
  const [echeance, setEcheance] = useState('');
  const [recurrence, setRecurrence] = useState('');
  const [recurrenceJour, setRecurrenceJour] = useState('');

  // Échap ferme, comme partout ailleurs dans l'application.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  if (typeof document === 'undefined') return null;

  const rec = (recurrence || 'Aucune').toLowerCase();

  function changerRecurrence(v: string) {
    setRecurrence(v);
    // Le jour choisi n'a de sens que pour LA récurrence pour laquelle il a été
    // saisi : en changer sans le vider laisserait par exemple « Lundi »
    // attaché à une récurrence devenue mensuelle, où « Lundi » ne veut rien dire.
    setRecurrenceJour('');
  }

  function soumettre(e: React.FormEvent) {
    e.preventDefault();
    if (!titre.trim()) return;
    onAjouterAction({
      tache: titre.trim(),
      assigne,
      priorite,
      categorie,
      echeanceLabel: echeance,
      // ⚠ `'Aucune'` et non `''` : le service ne comble le défaut que sur
      // `null`/`undefined`, pas sur une chaîne vide (même remarque que
      // l'ancien formulaire déplié).
      recurrence: recurrence || 'Aucune',
      recurrenceJour,
    });
  }

  return createPortal(
    <div
      className="fr-fond"
      role="dialog"
      aria-modal="true"
      aria-label={tr('TODO_NOUVELLE_TACHE')}
      // Le clic sur le fond ferme ; celui sur la fenêtre ne doit pas remonter.
      onClick={onFermer}
    >
      <div className="fr-fiche" onClick={(e) => e.stopPropagation()}>
        <header className="fr-tete">
          <h2 className="fr-nom">{tr('TODO_NOUVELLE_TACHE')}</h2>
          <button className="bouton discret fr-fermer" onClick={onFermer} aria-label={tr('G_FERMER')}>
            ✕
          </button>
        </header>

        <form className="ajout ajout-modal" onSubmit={soumettre}>
          <input
            className="champ"
            placeholder={tr('TODO_NOUVELLE_TACHE')}
            value={titre}
            onChange={(e) => setTitre(e.target.value)}
            aria-label={tr('TODO_NOUVELLE_TACHE')}
            autoFocus
          />
          {/* Les membres du foyer d'abord, puis les noms déjà employés.
              `note` dit qu'on peut assigner quelqu'un d'extérieur — la liste
              ressemble sinon à un choix fermé. */}
          <Combobox
            value={assigne}
            onChange={setAssigne}
            options={params.personnes}
            placeholder={tr('TODO_QUI')}
            ariaLabel={tr('TODO_QUI')}
            note={tr('TODO_QUI_AUTRE')}
          />
          <Liste
            valeur={priorite}
            onChange={setPriorite}
            options={params.priorites.map((p) => ({ valeur: p, libelle: tEnum(CLE_PRIORITE, p, langue) }))}
            placeholder={tr('TODO_PRIORITE')}
            ariaLabel={tr('TODO_PRIORITE')}
          />
          {/* Catégorie en saisie LIBRE : la liste est dérivée des tâches
              existantes, donc vide dans un foyer qui démarre. Un sélecteur
              fermé y bloquerait la première saisie. */}
          <Combobox
            value={categorie}
            onChange={setCategorie}
            options={params.categories}
            placeholder={tr('TODO_CATEGORIE')}
            ariaLabel={tr('TODO_CATEGORIE')}
          />
          {/* ⚠ Champ TEXTE et non `type="date"` : l'échéance est stockée en
              « jj/mm/aaaa », format hérité du classeur d'origine. */}
          <ChampDate
            className="champ champ-echeance"
            placeholder={tr('TODO_ECHEANCE_PH')}
            value={echeance}
            onChange={setEcheance}
            ariaLabel={tr('TODO_ECHEANCE')}
          />
          <Liste
            valeur={recurrence}
            onChange={changerRecurrence}
            options={params.recurrences.map((r) => ({ valeur: r, libelle: r }))}
            placeholder={tr('TODO_RECURRENCE')}
            ariaLabel={tr('TODO_RECURRENCE')}
          />
          {rec === 'hebdomadaire' && (
            <Liste
              valeur={recurrenceJour}
              onChange={setRecurrenceJour}
              options={JOURS.map((j) => ({ valeur: j, libelle: tEnum(CLE_JOUR, j, langue) }))}
              placeholder={tr('TODO_RECURRENCE_JOUR_SEMAINE')}
              ariaLabel={tr('TODO_RECURRENCE_JOUR_SEMAINE')}
            />
          )}
          {rec === 'mensuelle' && (
            <Liste
              valeur={recurrenceJour}
              onChange={setRecurrenceJour}
              options={JOURS_MOIS.map((j) => ({ valeur: j, libelle: j }))}
              placeholder={tr('TODO_RECURRENCE_JOUR_MOIS')}
              ariaLabel={tr('TODO_RECURRENCE_JOUR_MOIS')}
            />
          )}
          <button className="bouton" type="submit" disabled={occupe || !titre.trim()}>
            {tr('G_AJOUTER')}
          </button>
        </form>
      </div>
    </div>,
    document.body,
  );
}
