'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useT } from '@/components/I18nProvider';
import { estIos } from '@/lib/pwa';
import {
  estImage,
  estPdf,
  estTexte,
  TAILLE_APERCU_TEXTE,
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
 *
 * ⚠ LE TEST A ÉTÉ DÉPLACÉ DANS [lib/pwa.ts] ET CORRIGÉ. Il comparait
 * `e.button !== 0` : un clic dont `button` n'est pas renseigné — une tape, une
 * technologie d'assistance — était alors jugé « spécial », l'interception ne se
 * faisait pas, et le lien naviguait. En mode installé, cette seule différence
 * transforme un aperçu en impasse.
 */
export { clicPrincipal as clicSimple } from '@/lib/pwa';

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
   * Le PDF ne s'affiche en `iframe` que là où c'est FIABLE, c'est-à-dire sur un
   * navigateur de bureau.
   *
   * ⚠ LE TEST ÉTAIT UNE EXCLUSION, ET C'ÉTAIT L'ERREUR. Il disait « partout sauf
   * iOS » : toute plateforme non essayée passait donc par l'`iframe` par défaut.
   * Sur **Android**, Chrome ne rend pas un PDF dans un cadre — il le confie au
   * gestionnaire du système, qui prend la fenêtre entière. En application
   * installée, il n'y a alors ni onglet à fermer ni barre d'adresse : la seule
   * sortie est de tuer l'application. Exactement le piège que la visionneuse
   * avait été écrite pour supprimer, revenu par la porte qu'on avait laissée
   * ouverte. Signalé en test le 27/08/2026 ; l'iPhone, lui, allait bien.
   *
   * Une autorisation explicite vaut mieux qu'une interdiction nominative : la
   * prochaine plateforme inconnue tombera du bon côté.
   *
   * Le test tolère l'absence de `navigator` (rendu serveur).
   */
  const [pdfEnCadre] = useState(
    () =>
      typeof navigator !== 'undefined' &&
      !/android|iphone|ipad|ipod|mobile|tablet/i.test(navigator.userAgent),
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

  /*
   * APERÇU D'UN FICHIER TEXTE.
   *
   * ⚠ Le contenu est RÉCUPÉRÉ, pas mis dans une `iframe`. Un cadre déclencherait
   * sur Android le même détournement que les PDF — et sur les autres
   * plateformes, il afficherait le texte sans aucune mise en forme lisible. On
   * le lit soi-même et on le rend dans la page, où il reste sous notre contrôle.
   *
   * ⚠ `textContent` d'un `<pre>` : le texte est INSÉRÉ COMME TEXTE, jamais
   * interprété. Un document déposé par un membre du foyer contenant des balises
   * ne doit rien pouvoir exécuter — React s'en charge, mais la règle mérite
   * d'être écrite là où quelqu'un pourrait être tenté d'un `dangerouslySetInnerHTML`
   * pour « mieux » rendre un Markdown.
   */
  const texte = estTexte(doc);
  const [contenu, setContenu] = useState<string | null>(null);
  const [chargement, setChargement] = useState(false);
  const [telechargement, setTelechargement] = useState(false);

  /**
   * ⚠ SUR IOS UNIQUEMENT : `<a download>` est ignoré par Safari (voir
   * `lib/pwa.ts`). On récupère le fichier nous-mêmes et on passe par
   * `navigator.share()`, qui propose « Enregistrer dans Fichiers » — la vraie
   * façon d'obtenir un enregistrement sur cette plateforme.
   *
   * ⚠ `preventDefault()` DOIT ÊTRE SYNCHRONE, avant tout `await`. Un clic non
   * empêché continue de naviguer pendant qu'on récupère le fichier ; à ce
   * moment-là le `preventDefault()` d'un callback async arrive trop tard, le
   * navigateur a déjà suivi le lien. On empêche donc la navigation dès qu'on
   * sait qu'on est sur iOS, PUIS on décide quoi faire du clic.
   */
  function telecharger(e: React.MouseEvent<HTMLAnchorElement>) {
    if (!estIos()) return; // comportement natif du lien, inchangé partout ailleurs
    e.preventDefault();
    (async () => {
      setTelechargement(true);
      try {
        const fichier = new File(
          [await (await fetch(url)).blob()],
          doc.nom,
          { type: doc.type || 'application/octet-stream' },
        );
        if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [fichier] })) {
          await navigator.share({ files: [fichier] });
        } else {
          // iOS ancien sans partage de fichiers : seul repli possible, ouvrir
          // le document — pire que l'enregistrement direct, mais pas pire que
          // le comportement qu'on corrige.
          window.open(url, '_blank');
        }
      } catch {
        // Annulation par la personne, ou échec réseau : rien à signaler, le
        // fichier reste consultable dans la visionneuse.
      } finally {
        setTelechargement(false);
      }
    })();
  }

  useEffect(() => {
    if (!texte || doc.taille > TAILLE_APERCU_TEXTE) return;
    let annule = false;
    setChargement(true);
    fetch(`/api/documents/${doc.id}`, { cache: 'no-store' })
      .then((r) => {
        if (!r.ok) throw new Error('lecture impossible');
        return r.text();
      })
      .then((t) => {
        if (!annule) setContenu(t);
      })
      .catch(() => {
        if (!annule) setErreur(true);
      })
      .finally(() => {
        if (!annule) setChargement(false);
      });
    // ⚠ `annule` : refermer la visionneuse pendant le chargement ne doit pas
    // provoquer une écriture d'état sur un composant démonté.
    return () => {
      annule = true;
    };
  }, [texte, doc.id, doc.taille]);

  const texteAffichable = texte && doc.taille <= TAILLE_APERCU_TEXTE && !erreur;

  const image = estImage(doc);
  const pdfAffichable = estPdf(doc) && pdfEnCadre;

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

          {texteAffichable && (
            chargement ? (
              <p className="visio-repli">{tr('VISIO_CHARGEMENT')}</p>
            ) : (
              <pre className="visio-texte">{contenu}</pre>
            )
          )}

          {(erreur || (!image && !pdfAffichable && !texteAffichable)) && (
            <div className="visio-repli">
              <p className="visio-repli-ic" aria-hidden="true">{iconeDocument(doc)}</p>
              {/*
                ⚠ TROIS MESSAGES, PAS UN. « Aperçu indisponible pour ce type de
                fichier » serait FAUX pour un PDF sur téléphone : le type n'y est
                pour rien, c'est la plateforme. Une explication fausse pousse à
                chercher un problème dans son fichier — et à réessayer.
              */}
              <p>
                {erreur
                  ? tr('VISIO_ERREUR')
                  : estPdf(doc)
                    ? tr('VISIO_PDF_MOBILE')
                    : texte
                      ? tr('VISIO_TEXTE_LOURD')
                      : tr('VISIO_PAS_APERCU')}
              </p>
            </div>
          )}
        </div>

        <footer className="visio-pied">
          {/*
            ⚠ Toujours présent, même quand l'aperçu s'affiche : c'est le seul
            moyen d'obtenir le fichier à sa définition d'origine, et le recours
            quand l'aperçu échoue. `?dl=1` demande à la route un
            `Content-Disposition: attachment` — respecté par tous les
            navigateurs SAUF Safari iOS, qui l'ignore et ouvre le fichier au
            lieu de l'enregistrer (signalé le 01/09/2026). Sur iOS, `onClick`
            intercepte le clic et passe par `navigator.share()` à la place —
            voir `telecharger()` ci-dessus et `lib/pwa.ts`. Ailleurs, le lien
            suit son comportement natif, inchangé.
          */}
          <a
            className="bouton"
            href={`${url}?dl=1`}
            download={doc.nom}
            onClick={telecharger}
            aria-busy={telechargement}
          >
            {telechargement ? tr('VISIO_TELECHARGEMENT_EN_COURS') : tr('VISIO_TELECHARGER')}
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
