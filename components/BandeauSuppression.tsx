import { db } from '@/lib/db';
import { foyers } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import { idFoyerCourant } from '@/lib/foyer';
import { t, locale } from '@/lib/i18n';
import { langueCourante } from '@/lib/langue';

/**
 * Prévient les membres restants qu'un foyer est en cours de suppression.
 *
 * ⚠ SECOND CANAL, ET LE PLUS FIABLE. Le courriel envoyé au moment de la
 * demande peut se perdre, atterrir en indésirable ou viser une adresse
 * abandonnée. Ce bandeau, lui, s'affiche à chaque ouverture de l'application :
 * quelqu'un qui utilise Nestync pendant ces sept jours ne peut pas manquer
 * l'information. Ne pas le retirer en le prenant pour un doublon du courriel.
 *
 * Silencieux hors délai de grâce, et silencieux pour qui n'a pas de foyer —
 * cette composante est rendue dans une disposition partagée, elle ne doit
 * jamais faire échouer une page.
 */
export default async function BandeauSuppression() {
  let prevue: Date | null = null;
  let langue;
  try {
    const [foyerId, l] = await Promise.all([idFoyerCourant(), langueCourante()]);
    langue = l;
    const [f] = await db()
      .select({ le: foyers.suppressionPrevueLe })
      .from(foyers)
      .where(eq(foyers.id, foyerId))
      .limit(1);
    prevue = f?.le ?? null;
  } catch {
    return null;
  }
  if (!prevue || !langue) return null;

  return (
    <div className="bandeau-suppression" role="status">
      <strong>
        {t('SUPPR_BANDEAU', langue)} {prevue.toLocaleDateString(locale(langue))}.
      </strong>{' '}
      {t('SUPPR_BANDEAU_B', langue)}
    </div>
  );
}
