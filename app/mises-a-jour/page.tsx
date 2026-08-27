import CadreSite from '@/components/vitrine-ds/CadreSite';
import { RUBRIQUES, VERSIONS } from '@/lib/mises-a-jour';

/**
 * `/mises-a-jour` — notes de version, PUBLIQUES et indexables.
 *
 * ⚠ PUBLIQUE À DESSEIN. Ce qui bouge dans un produit se lit aussi comme un signe
 * de vitalité : un prospect qui hésite y voit qu'on corrige et qu'on écoute.
 * L'enfermer derrière la connexion en priverait précisément ceux qu'elle
 * rassurerait le plus. Exclue de l'authentification dans `middleware.ts`,
 * déclarée dans `sitemap.ts`, absente des interdictions de `robots.ts`.
 *
 * ⚠ LE CONTENU EST DANS [lib/mises-a-jour.ts], PAS ICI. Publier une version doit
 * être un geste d'écriture, pas de mise en page — sinon on saute l'exercice, et
 * une page de mises à jour qui n'est plus à jour vaut moins que pas de page.
 *
 * ⚠ HABILLÉE PAR `CadreSite`, comme les conditions et les mentions légales.
 * Elle s'adresse aux mêmes visiteurs que la page d'accueil : lui donner
 * l'habillage de l'application montrerait un intérieur auquel un prospect n'a
 * pas accès.
 */
export const metadata = {
  title: 'Mises à jour — Nestync',
  description:
    'Ce qui change dans Nestync, version après version : corrections, nouveautés et améliorations.',
};

export default function PageMisesAJour() {
  return (
    <CadreSite
      surtitre="Journal"
      titre="Mises à jour"
      chapeau="Ce qui change dans Nestync, version après version. Les corrections viennent en grande partie de ce que vous nous remontez."
    >
      <div className="maj-corps">
        {VERSIONS.map((v) => (
          <article className="maj-version" key={v.id} id={v.id}>
            <p className="maj-date">
              {/* ⚠ Le numéro est un LIEN vers l'ancre de sa propre version : on
                  peut ainsi renvoyer quelqu'un vers une publication précise
                  plutôt que vers « la page, quelque part ». */}
              <a className="maj-numero" href={`#${v.id}`}>
                Nº {v.numero}
              </a>
              <time dateTime={v.dateISO}>{v.date}</time>
            </p>
            <h2>{v.titre}</h2>
            <p className="maj-resume">{v.resume}</p>

            {RUBRIQUES.map(({ nature, libelle }) => {
              const lot = v.changements.filter((c) => c.nature === nature);
              // ⚠ Une rubrique vide ne s'affiche pas : un titre « Nouveau »
              // suivi de rien laisserait croire à un contenu qui n'a pas chargé.
              if (lot.length === 0) return null;
              return (
                <section key={nature}>
                  <h3 className={`maj-rubrique ${nature}`}>{libelle}</h3>
                  <ul className="maj-entrees">
                    {lot.map((c) => (
                      <li key={c.titre}>
                        <strong>{c.titre}</strong> {c.texte}
                        {c.detail && (
                          <span className={`maj-detail${c.alerte ? ' alerte' : ''}`}>{c.detail}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </section>
              );
            })}
          </article>
        ))}
      </div>

      <p className="doc-maj">
        Un problème, une idée ? Écrivez-nous depuis la page <a href="/aide">Aide et contact</a> —
        c’est de là que vient l’essentiel de cette liste.
      </p>
    </CadreSite>
  );
}
