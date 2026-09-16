'use client';

import { useEffect, useState } from 'react';
import { definirFuseauAction } from '@/app/foyer/agenda/actions';

/**
 * FUSEAU DU FOYER + AVERTISSEMENT DE DÉCALAGE — pied de la page Agenda.
 * =====================================================================
 * ⚠ EN BAS DE PAGE, SOUS LES ÉVÉNEMENTS, À DESSEIN (demande utilisateur du
 * 16/09/2026). C'est un réglage qu'on touche une fois dans la vie du foyer :
 * en haut, il repousserait l'agenda — le contenu qu'on vient réellement voir —
 * et occuperait la place chaque jour pour servir une fois.
 *
 * ⚠ L'AVERTISSEMENT NE PROMET PAS DE CORRIGER GOOGLE. Si l'agenda Google d'un
 * membre est réglé sur un autre fuseau, il y verra d'autres heures — l'événement
 * est pourtant au bon moment, Google l'affiche simplement selon SON réglage.
 * Aucun code de notre côté ne peut changer ça, mais le dire évite exactement
 * l'incompréhension qui a fait remonter le bug : deux écrans, deux heures, et
 * l'impression que l'app se trompe.
 */
export default function FuseauFoyer({
  fuseau,
  proprietaire,
}: {
  fuseau: string;
  /** Seul le propriétaire peut changer un réglage qui vaut pour tout le foyer. */
  proprietaire: boolean;
}) {
  const [ouvert, setOuvert] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [occupe, setOccupe] = useState(false);

  /*
   * ⚠ LU APRÈS LE MONTAGE, jamais pendant le rendu. Le serveur n'a pas accès au
   * fuseau du navigateur : le lire directement produirait un HTML différent
   * côté serveur et côté client, donc une erreur d'hydratation. On accepte que
   * l'avertissement apparaisse un souffle après l'affichage.
   */
  const [fuseauNavigateur, setFuseauNavigateur] = useState('');
  useEffect(() => {
    try {
      setFuseauNavigateur(Intl.DateTimeFormat().resolvedOptions().timeZone ?? '');
    } catch {
      // Navigateur sans API de fuseau : on n'affiche simplement pas l'écart.
    }
  }, []);

  const ecart = !!fuseauNavigateur && fuseauNavigateur !== fuseau;

  async function enregistrer(formData: FormData) {
    setOccupe(true);
    setErreur(null);
    const r = await definirFuseauAction(formData);
    setOccupe(false);
    if (r.erreur) setErreur(r.erreur);
    else setOuvert(false);
  }

  return (
    <section className="ag-fuseau">
      <p className="ag-fuseau-ligne">
        Heures affichées en <strong>{fuseau}</strong>.
        {proprietaire && !ouvert && (
          <button type="button" className="bouton discret ag-fuseau-btn" onClick={() => setOuvert(true)}>
            Changer
          </button>
        )}
      </p>

      {ecart && (
        <p className="ag-fuseau-note">
          Cet appareil est réglé sur <strong>{fuseauNavigateur}</strong>. Les heures de Nestync suivent le fuseau du
          foyer, pas celui de l’appareil — c’est ce qui garantit que tout le monde voie la même heure. Si ton
          application Google Agenda est réglée différemment, elle y affichera d’autres heures pour les mêmes
          événements&nbsp;: le rendez-vous, lui, est bien au même moment.
        </p>
      )}

      {ouvert && (
        <form action={enregistrer} className="ag-fuseau-form">
          {/* Champ libre plutôt qu'une liste des ~600 fuseaux IANA : la valeur
              est validée côté serveur, et un champ pré-rempli se corrige plus
              vite qu'une longue liste ne se parcourt. */}
          <input
            className="champ"
            name="fuseau"
            defaultValue={fuseau}
            placeholder="Europe/Paris"
            aria-label="Fuseau horaire du foyer"
            list="fuseaux-courants"
          />
          <datalist id="fuseaux-courants">
            {fuseauNavigateur && <option value={fuseauNavigateur} />}
            <option value="Europe/Paris" />
            <option value="Europe/Brussels" />
            <option value="Europe/Zurich" />
            <option value="America/Guadeloupe" />
            <option value="America/Martinique" />
            <option value="America/Cayenne" />
            <option value="Indian/Reunion" />
            <option value="Pacific/Noumea" />
            <option value="America/Montreal" />
          </datalist>
          <button className="bouton" type="submit" disabled={occupe}>
            Enregistrer
          </button>
          <button type="button" className="bouton discret" onClick={() => setOuvert(false)} disabled={occupe}>
            Annuler
          </button>
        </form>
      )}

      {erreur && <p className="message erreur">{erreur}</p>}
    </section>
  );
}
