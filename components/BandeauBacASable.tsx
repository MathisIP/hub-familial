import 'server-only';
import { db, baseDisponible } from '@/lib/db';
import { bacASable } from '@/lib/db/schema';

/**
 * Bandeau permanent indiquant sur quelle base tourne l'application.
 *
 * ⚠ POURQUOI IL EXISTE. En développement, `npm run dev` lit `DATABASE_URL` — et
 * rien à l'écran ne disait laquelle. On pouvait donc croire manipuler des
 * données fictives tout en modifiant celles d'un foyer client, et ne s'en
 * apercevoir qu'après. Le bandeau lève cette ambiguïté en permanence.
 *
 * Deux états, et c'est le second qui compte :
 *  · **BAC À SABLE** (discret) — la base porte le marqueur, tout est permis ;
 *  · **PRODUCTION** (alarmant) — pas de marqueur : les données sont réelles.
 *
 * ⚠ Ne s'affiche QU'EN DÉVELOPPEMENT (`NODE_ENV !== 'production'`) : les
 * utilisateurs n'ont aucune raison de voir ça, et le rendu en production ne doit
 * pas payer une requête de plus à chaque page.
 */
export default async function BandeauBacASable() {
  if (process.env.NODE_ENV === 'production' || !baseDisponible()) return null;

  let marque = false;
  try {
    marque = (await db().select({ id: bacASable.id }).from(bacASable).limit(1)).length > 0;
  } catch {
    // Base injoignable ou migration pas encore passée : on n'affiche rien plutôt
    // que de faire tomber toutes les pages pour un bandeau d'aide.
    return null;
  }

  return (
    <div className={`bandeau-env ${marque ? 'bac' : 'prod'}`} role="status">
      {marque ? (
        <>🧪 Bac à sable — données fictives</>
      ) : (
        <>⛔ BASE DE PRODUCTION — ce sont de vraies données de clients</>
      )}
    </div>
  );
}
