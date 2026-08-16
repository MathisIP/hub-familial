import { NextResponse, type NextRequest } from 'next/server';
import { idFoyerCourant, utilisateurCourant } from '@/lib/foyer';
import { exporterDonneesFoyer } from '@/lib/rgpd';
import { construireArchive } from '@/lib/rgpd-archive';
import { reponseErreur } from '@/lib/api';

/**
 * GET /api/compte/export — droit à la portabilité (RGPD article 20).
 *
 * Par défaut une **archive ZIP** : le JSON exigé par le règlement, des CSV
 * ouvrables dans un tableur, et les documents rangés comme la personne les a
 * rangés. `?format=json` sert le JSON seul, pour qui veut juste la donnée.
 *
 * ⚠ CETTE ROUTE N'APPELLE PAS `exigerAcces()`, ET C'EST VOLONTAIRE. Les droits
 * RGPD survivent à la fin de l'abonnement : tant que les données existent, la
 * personne peut les réclamer, et le délai légal de réponse est d'un mois. Un
 * ancien client doit donc pouvoir se connecter et récupérer ses affaires sans
 * repayer, et sans passer par une demande manuelle. **Ne pas ajouter de contrôle
 * d'abonnement ici** — ce serait conditionner un droit à un paiement.
 *
 * ⚠ Runtime Node : l'archive s'écrit en flux (`archiver` + streams Node), et
 * les documents se déchiffrent avec la crypto Node.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
/** Une archive avec beaucoup de documents peut être longue à assembler. */
export const maxDuration = 300;

export async function GET(req: NextRequest) {
  try {
    const [foyerId, user] = await Promise.all([idFoyerCourant(), utilisateurCourant()]);
    const jour = new Date().toISOString().slice(0, 10);

    if (req.nextUrl.searchParams.get('format') === 'json') {
      const data = await exporterDonneesFoyer(foyerId, user.id);
      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Content-Disposition': `attachment; filename="nestync-export-${jour}.json"`,
        },
      });
    }

    const archive = await construireArchive(foyerId, user.id);
    return new NextResponse(archive.flux, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': `attachment; filename="${archive.nomFichier}"`,
        // Pas de `Content-Length` : l'archive est produite au fil de l'eau, sa
        // taille n'est pas connue à l'avance.
        'Cache-Control': 'private, no-store',
      },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
