/**
 * Squelette affiché pendant la préparation d'une page côté serveur.
 *
 * Toutes les pages sont en `force-dynamic` (elles lisent la base à chaque
 * requête) : sans ce fichier, Next.js laissait l'écran figé sur la page
 * précédente jusqu'à ce que le rendu serveur soit terminé — un clic sans aucun
 * retour visuel, qui donne l'impression que l'app est bloquée. Ici, la réponse
 * est immédiate : la coquille apparaît, puis le contenu la remplace.
 *
 * `aria-busy` + le libellé masqué annoncent le chargement aux lecteurs d'écran,
 * pour qui un squelette purement visuel ne veut rien dire.
 */
export default function Chargement() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>
      <div className="sk sk-titre" />
      <div className="sk sk-sous" />
      <div className="sk-grille">
        <div className="sk sk-carte" />
        <div className="sk sk-carte" />
        <div className="sk sk-carte" />
      </div>
    </div>
  );
}
