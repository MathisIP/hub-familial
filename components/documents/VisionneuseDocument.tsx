'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/components/I18nProvider';
import {
  estImage,
  estPdf,
  formatTaille,
  iconeDocument,
  type Document,
} from '@/lib/documents/schema';

/**
 * VISIONNEUSE DE DOCUMENT — superposition dans l'application.
 * ==========================================================
 * ⚠ POURQUOI ELLE EXISTE (17/08/2026). Les documents s'ouvraient par
 * `<a href="/api/documents/<id>" target="_blank">`. Sur un navigateur de bureau,
 * ça donne un onglet qu'on referme d'un clic. Mais dans une PWA **installée sur
 * l'écran d'accueil iOS** (mode `standalone`), il n'y a pas d'onglets :
 * `target="_blank"` charge le fichier **dans la fenêtre de l'application**, qui
 * n'a ni barre d'adresse ni bouton retour. L'utilisateur était enfermé dans son
 * image — la seule sortie étant de tuer l'app et de la relancer.
 *
 * La visionneuse **ne navigue jamais** : le document s'affiche par-dessus la
 * page, qui reste là, dessous. Le problème disparaît par construction plutôt que
 * d'être contourné.
 *
 * ⚠ RÈGLE DE SÛRETÉ : la sortie ne dépend JAMAIS de l'affichage du contenu.
 * Le bouton de fermeture est dans l'en-tête, rendu avant le document et
 * indépendamment de lui ; la touche Échap et le clic sur le fond ferment aussi.
 * Un fichier illisible, un type inconnu, une image cassée — aucun de ces cas ne
 * peut reproduire le piège qu'on est en train de corriger.
 */
/**
 * Faut-il ouvrir la visionneuse, ou laisser le navigateur suivre le lien ?
 *
 * ⚠ Les liens restent de vrais `<a href>` : on n'intercepte que le clic simple.
 * Ctrl/Cmd+clic et clic du milieu continuent d'ouvrir un onglet, parce que c'est
 * ce qu'un habitué du bureau attend — et parce qu'un `<button>` aurait retiré
 * l'adresse du document aux lecteurs d'écran comme au menu contextuel.
 */
export function clicSimple(e: React.MouseEvent): boolean {
  return !(e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0);
}

export default function VisionneuseDocument({
  doc,
  onFermer,
}: {
  doc: Document;
  onFermer: () => void;
}) {
  const tr = useT();
  const fermerRef = useRef<HTMLButtonElement>(null);
  const [erreur, setErreur] = useState(false);
  const [agrandi, setAgrandi] = useState(false);

  /**
   * iOS ne rend pas les PDF de façon fiable dans une `iframe` : on y obtient
   * souvent un cadre vide ou une seule page qu'on ne peut pas faire défiler.
   * Mieux vaut proposer franchement le téléchargement qu'un aperçu qui a l'air
   * cassé. Le test tolère l'absence de `navigator` (rendu serveur).
   */
  const [surIOS] = useState(
    () => typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent),
  );

  const url = `/api/documents/${doc.id}`;

  // Échap ferme, et la page dessous ne défile plus pendant l'affichage.
  useEffect(() => {
    const surTouche = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onFermer();
    };
    document.addEventListener('keydown', surTouche);
    const defilementInitial = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    // Le focus part sur « fermer » : au clavier comme au lecteur d'écran, la
    // sortie est la première chose atteignable.
    fermerRef.current?.focus();
    return () => {
      document.removeEventListener('keydown', surTouche);
      document.body.style.overflow = defilementInitial;
    };
  }, [onFermer]);

  const image = estImage(doc);
  const pdfAffichable = estPdf(doc) && !surIOS;

  /**
   * ⚠ RENDU EN PORTAIL, DIRECTEMENT DANS `document.body`. Une superposition
   * `position: fixed` n'est pas toujours positionnée par rapport à l'écran :
   * il suffit qu'un ancêtre porte un `transform`, un `filter` ou un `contain`
   * pour qu'il devienne le référentiel, et la superposition se retrouve alors
   * enfermée dans une carte, boutons compris. La feuille de styles du projet
   * contient déjà plusieurs de ces propriétés.
   *
   * Le portail rend la question sans objet : la visionneuse ne dépend plus
   * d'aucun ancêtre, ni aujourd'hui ni après une future retouche de CSS. C'est
   * d'autant plus important ici que l'élément à ne jamais perdre de vue est
   * précisément le bouton de fermeture.
   */
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="visio-fond"
      role="dialog"
      aria-modal="true"
      aria-label={doc.nom}
      // Le clic sur le fond ferme ; celui sur le contenu ne doit pas remonter.
      onClick={(e) => {
        if (e.target === e.currentTarget) onFermer();
      }}
    >
      <div className="visio-cadre">
        <header className="visio-tete">
          <span className="visio-ic" aria-hidden="true">{iconeDocument(doc)}</span>
          <span className="visio-nom" title={doc.nom}>{doc.nom}</span>
          <span className="visio-taille">{formatTaille(doc.taille)}</span>
          <button
            ref={fermerRef}
            type="button"
            className="visio-fermer"
            onClick={onFermer}
            aria-label={tr('G_FERMER')}
          >
            ✕
          </button>
        </header>

        <div className={`visio-corps${image && agrandi ? ' visio-corps-zoom' : ''}`}>
          {image && !erreur && (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img
              className={`visio-image${agrandi ? ' visio-image-zoom' : ''}`}
              src={url}
              alt={doc.nom}
              onError={() => setErreur(true)}
              onClick={() => setAgrandi((v) => !v)}
              title={tr('VISIO_ZOOM')}
            />
          )}

          {pdfAffichable && !erreur && (
            <iframe className="visio-pdf" src={url} title={doc.nom} />
          )}

          {(erreur || (!image && !pdfAffichable)) && (
            <div className="visio-repli">
              <p className="visio-repli-ic" aria-hidden="true">{iconeDocument(doc)}</p>
              <p>{erreur ? tr('VISIO_ERREUR') : tr('VISIO_PAS_APERCU')}</p>
            </div>
          )}
        </div>

        <footer className="visio-pied">
          {/*
            ⚠ Toujours présent, même quand l'aperçu s'affiche : c'est le seul
            moyen d'obtenir le fichier à sa définition d'origine, et le recours
            quand l'aperçu échoue. `?dl=1` demande à la route un
            `Content-Disposition: attachment`, donc l'enregistrement plutôt que
            l'affichage — sur iPhone, la feuille de partage s'ouvre sans que
            l'application soit quittée.
          */}
          <a className="bouton" href={`${url}?dl=1`} download={doc.nom}>
            {tr('VISIO_TELECHARGER')}
          </a>
          <button type="button" className="bouton bouton-primaire" onClick={onFermer}>
            {tr('G_FERMER')}
          </button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
