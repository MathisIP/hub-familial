import { NextResponse } from 'next/server';
import { idFoyerCourant } from '@/lib/foyer';
import { exporterDonneesFoyer } from '@/lib/rgpd';
import { reponseErreur } from '@/lib/api';

/**
 * GET /api/compte/export — télécharge toutes les données du foyer (JSON).
 * Droit à la portabilité (RGPD). Protégé par le middleware (session requise).
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const foyerId = await idFoyerCourant();
    const data = await exporterDonneesFoyer(foyerId);
    const json = JSON.stringify(data, null, 2);
    const jour = new Date().toISOString().slice(0, 10);
    return new NextResponse(json, {
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="nestync-export-${jour}.json"`,
      },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
