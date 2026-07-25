import { NextResponse, type NextRequest } from 'next/server';
import { chargerBudget, ajouterTransaction } from '@/lib/budget/service';
import type { NouvelleTransaction, SelectionMois } from '@/lib/budget/schema';
import { reponseErreur } from '@/lib/api';

/** GET /api/budget — dashboard recalculé. Mois via ?annee=&mois= (défaut = mois courant). */
export const dynamic = 'force-dynamic';

function selectionDepuis(req: NextRequest): SelectionMois | undefined {
  const a = Number(req.nextUrl.searchParams.get('annee'));
  const m = Number(req.nextUrl.searchParams.get('mois'));
  if (Number.isFinite(a) && Number.isFinite(m) && m >= 1 && m <= 12) return { annee: a, mois: m };
  return undefined;
}

export async function GET(req: NextRequest) {
  try {
    return NextResponse.json(await chargerBudget(selectionDepuis(req)));
  } catch (e) {
    return reponseErreur(e);
  }
}

/** POST /api/budget — ajoute une transaction (dépense / revenu / virement). */
export async function POST(req: NextRequest) {
  try {
    const corps = (await req.json()) as NouvelleTransaction;
    const id = await ajouterTransaction(corps);
    return NextResponse.json({ ok: true, id });
  } catch (e) {
    return reponseErreur(e);
  }
}
