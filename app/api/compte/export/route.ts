import { NextResponse } from 'next/server';
import { idFoyerCourant, utilisateurCourant } from '@/lib/foyer';
import { exporterDonneesFoyer } from '@/lib/rgpd';
import { reponseErreur } from '@/lib/api';

/**
 * GET /api/compte/export — télécharge les données du foyer visibles par la
 * personne connectée (JSON). Droit à la portabilité (RGPD). Protégé par le
 * middleware (session requise).
 *
 * ⚠ L'export est scopé à la PERSONNE, pas seulement au foyer : livrer tout le
 * budget à n'importe quel membre divulguerait les données des autres (RGPD
 * art. 15(4)). Voir [lib/rgpd.ts].
 */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
    const data = await exporterDonneesFoyer(foyerId, user.id);
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
