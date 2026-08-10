import { NextResponse, type NextRequest } from 'next/server';
import { chargerTransactions, type PeriodeHistorique } from '@/lib/budget/service';
import { reponseErreur } from '@/lib/api';

/**
 * GET /api/budget/historique?periode=mois|annee&annee=&mois=
 *
 * L'historique n'est PAS servi avec le tableau de bord : c'est tout l'objet de
 * la refonte. La page reste légère quelle que soit l'ancienneté du foyer, et
 * les opérations anciennes se chargent quand on les demande.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const p = req.nextUrl.searchParams;
    const periode: PeriodeHistorique = p.get('periode') === 'annee' ? 'annee' : 'mois';
    const annee = Number(p.get('annee'));
    const mois = Number(p.get('mois'));
    const selection =
      Number.isFinite(annee) && Number.isFinite(mois) && mois >= 1 && mois <= 12
        ? { annee, mois }
        : undefined;

    return NextResponse.json(await chargerTransactions(periode, selection));
  } catch (e) {
    return reponseErreur(e);
  }
}
