import { NextResponse } from 'next/server';
import { reactiverAbonnement } from '@/lib/abonnement';
import { reponseErreur } from '@/lib/api';

/**
 * POST /api/abonnement/reactiver — annule une résiliation programmée.
 * L'abonnement existant reprend : aucun nouveau paiement, échéance inchangée.
 */
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    await reactiverAbonnement();
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
