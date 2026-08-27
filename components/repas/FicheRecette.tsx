'use client';

import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import Liste from '@/components/Liste';
import { useT, useLangue } from '@/components/I18nProvider';
import { tEnum, CLE_CATEGORIE_PLAT, CLE_TYPE_RECETTE, CLE_CHAUD_FROID, CLE_JOUR } from '@/lib/i18n';
import { formatQuantite, type JourRepas, type Recette } from '@/lib/repas/schema';

/** Service d'un menu de jour, et la catégorie de recette qui lui correspond. */
const SERVICES = [
  { cle: 'entree' as const, cat: 'Entrée' },
  { cle: 'plat' as const, cat: 'Plat' },
  { cle: 'dessert' as const, cat: 'Dessert' },
];

/**
 * FICHE D'UNE RECETTE — ce qu'on lit en cuisinant.
 *
 * Ingrédients, instructions, et de quoi la poser sur un jour de la semaine sans
 * quitter l'écran.
 *
 * ⚠ RENDUE EN PORTAIL DANS `document.body`. Un ancêtre portant un `transform` —
 * une carte animée au survol — redéfinit à lui seul le référentiel de
 * `position: fixed` et enfermerait la fiche dans la carte. C'est le piège qui
 * avait déjà enfermé la visionneuse de documents, et il ne se voit qu'à
 * l'exécution.
 *
 * ⚠ LES QUANTITÉS SONT CELLES DE LA RECETTE, pas celles d'un jour. La fiche dit
 * « pour N personnes » juste au-dessus : c'est la recette qu'on lit, pas un
 * service. Les mettre à l'échelle d'un jour donnerait deux vérités selon
 * l'endroit d'où l'on ouvre la fiche.
 */
export default function FicheRecette({
  recette,
  semaine,
  occupe,
  onFermer,
  onAjouterAction,
  onModifier,
}: {
  recette: Recette;
  semaine: JourRepas[];
  occupe: boolean;
  onFermer: () => void;
  /** Pose la recette sur un jour et un service. */
  onAjouterAction: (jour: string, service: 'entree' | 'plat' | 'dessert') => void;
  onModifier: () => void;
}) {
  const tr = useT();
  const langue = useLangue();

  /*
   * Service proposé d'après la CATÉGORIE de la recette : un dessert va au
   * dessert. Sans catégorie, le plat — c'est le service le plus courant, et
   * celui qu'on corrige le plus facilement si on se trompe.
   */
  const serviceParDefaut =
    SERVICES.find((s) => s.cat === recette.categorie)?.cle ?? 'plat';

  const [jour, setJour] = useState(semaine[0]?.jour ?? '');
  const [service, setService] = useState<'entree' | 'plat' | 'dessert'>(serviceParDefaut);
  const [pose, setPose] = useState(false);

  // Échap ferme, comme partout ailleurs dans l'application.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => e.key === 'Escape' && onFermer();
    document.addEventListener('keydown', surTouche);
    return () => document.removeEventListener('keydown', surTouche);
  }, [onFermer]);

  if (typeof document === 'undefined') return null;

  /** Ce qui occupe déjà ce service, ce jour-là — pour prévenir avant d'écraser. */
  const occupePar = semaine.find((j) => j.jour === jour)?.[service] ?? '';

  return createPortal(
    <div
      className="fr-fond"
      role="dialog"
      aria-modal="true"
      aria-label={recette.nom}
      // Le clic sur le fond ferme ; celui sur la fiche ne doit pas remonter.
      onClick={onFermer}
    >
      <div className="fr-fiche" onClick={(e) => e.stopPropagation()}>
        <header className="fr-tete">
          <h2 className="fr-nom">{recette.nom}</h2>
          <button className="bouton discret fr-fermer" onClick={onFermer} aria-label={tr('G_FERMER')}>
            ✕
          </button>
        </header>

        <p className="fr-meta">
          {recette.categorie && (
            <span className="puce cat-plat">{tEnum(CLE_CATEGORIE_PLAT, recette.categorie, langue)}</span>
          )}
          {recette.type && <span className="puce categorie">{tEnum(CLE_TYPE_RECETTE, recette.type, langue)}</span>}
          {recette.chaudFroid && (
            <span className="puce categorie">{tEnum(CLE_CHAUD_FROID, recette.chaudFroid, langue)}</span>
          )}
          <span className="puce assigne">
            {recette.personnes} {tr('REPAS_PERS')}
          </span>
          {recette.favoriBebe && <span className="puce bebe-favori">{tr('REPAS_BADGE_FAVORI')}</span>}
          {recette.bebePasGoute && <span className="puce bebe-agouter">{tr('REPAS_BADGE_AGOUTER')}</span>}
        </p>

        <section className="fr-bloc">
          <h3 className="fr-soustitre">{tr('FR_INGREDIENTS')}</h3>
          {recette.ingredients.length === 0 ? (
            <p className="fr-vide">{tr('FR_SANS_INGREDIENT')}</p>
          ) : (
            <ul className="fr-ingredients">
              {recette.ingredients.map((i, k) => (
                <li key={k}>
                  <span className="i-art">{i.article}</span>
                  {i.quantite != null && (
                    <span className="i-qte">
                      {formatQuantite(i.quantite)} {i.unite}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="fr-bloc">
          <h3 className="fr-soustitre">{tr('FR_INSTRUCTIONS')}</h3>
          {/* ⚠ `white-space: pre-wrap` en CSS : les instructions se saisissent
              ligne par ligne, et les afficher en un seul paragraphe rendrait
              illisible ce qu'on lit justement en cuisinant, les mains prises. */}
          {recette.note.trim() ? (
            <p className="fr-note">{recette.note}</p>
          ) : (
            <p className="fr-vide">{tr('FR_SANS_INSTRUCTION')}</p>
          )}
        </section>

        <section className="fr-bloc fr-poser">
          <h3 className="fr-soustitre">{tr('FR_POSER')}</h3>
          <div className="fr-poser-champs">
            <Liste
              valeur={jour}
              onChange={(v) => {
                setJour(v);
                setPose(false);
              }}
              options={semaine.map((j) => ({ valeur: j.jour, libelle: tEnum(CLE_JOUR, j.jour, langue) }))}
              disabled={occupe}
              ariaLabel={tr('FR_JOUR')}
            />
            <Liste
              valeur={service}
              onChange={(v) => {
                setService(v as 'entree' | 'plat' | 'dessert');
                setPose(false);
              }}
              options={[
                { valeur: 'entree', libelle: tEnum(CLE_CATEGORIE_PLAT, 'Entrée', langue) },
                { valeur: 'plat', libelle: tEnum(CLE_CATEGORIE_PLAT, 'Plat', langue) },
                { valeur: 'dessert', libelle: tEnum(CLE_CATEGORIE_PLAT, 'Dessert', langue) },
              ]}
              disabled={occupe}
              ariaLabel={tr('FR_SERVICE')}
            />
            <button
              type="button"
              className="bouton bouton-action"
              disabled={occupe || !jour}
              onClick={() => {
                onAjouterAction(jour, service);
                setPose(true);
              }}
            >
              {tr('FR_AJOUTER')}
            </button>
          </div>

          {/*
            ⚠ ON PRÉVIENT AVANT D'ÉCRASER, on n'empêche pas. Remplacer le plat du
            mardi est une intention parfaitement normale ; le faire sans savoir
            qu'il y en avait un ne l'est pas. Le nom de ce qui sera remplacé est
            la seule information qui permette de décider.
          */}
          {occupePar && occupePar !== recette.nom && !pose && (
            <p className="fr-avertit">
              {tr('FR_REMPLACE')} <strong>{occupePar}</strong>
            </p>
          )}
          {pose && <p className="fr-pose">{tr('FR_POSEE')}</p>}
        </section>

        <footer className="fr-pied">
          <button className="bouton discret" onClick={onModifier} disabled={occupe}>
            {tr('G_MODIFIER')}
          </button>
          <button className="bouton" onClick={onFermer}>
            {tr('G_FERMER')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
