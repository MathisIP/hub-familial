import { NextResponse, type NextRequest } from 'next/server';
import { chargerBudget, ajouterTransaction, changerMois } from '@/lib/budget/service';
import type { NouvelleTransaction } from '@/lib/budget/schema';
import { reponseErreur } from '@/lib/api';

/** GET /api/budget — tableau de bord (lecture seule), en un aller-retour. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    return NextResponse.json(await chargerBudget());
  } catch (e) {
    return reponseErreur(e);
  }
}

/** POST /api/budget — ajoute une transaction (dépense / revenu / virement). */
export async function POST(req: NextRequest) {
  try {
    const corps = (await req.json()) as NouvelleTransaction;
    const ligne = await ajouterTransaction(corps);
    return NextResponse.json({ ok: true, ligne });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** PATCH /api/budget — change le mois affiché { annee, mois }. */
export async function PATCH(req: NextRequest) {
  try {
    const { annee, mois } = (await req.json()) as { annee?: number; mois?: number };
    if (typeof annee !== 'number' || typeof mois !== 'number') {
      return NextResponse.json({ erreur: 'Paramètres { annee, mois } requis.' }, { status: 400 });
    }
    const selection = await changerMois(annee, mois);
    return NextResponse.json({ ok: true, selection });
  } catch (e) {
    return reponseErreur(e);
  }
}
