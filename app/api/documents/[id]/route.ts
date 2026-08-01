import { NextResponse, type NextRequest } from 'next/server';
import { fluxDocument } from '@/lib/documents/service';
import { reponseErreur } from '@/lib/api';

/**
 * GET /api/documents/<id> — sert le CONTENU d'un document.
 *
 * Le stockage est privé (aucune URL publique) : ce passage par notre API est ce
 * qui garantit qu'un fichier n'est lisible que par SON foyer. `fluxDocument`
 * renvoie `null` si le document appartient à un autre foyer → 404, sans révéler
 * son existence. `?dl=1` force le téléchargement au lieu de l'affichage.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await ctx.params;
    const doc = await fluxDocument(id);
    if (!doc) return NextResponse.json({ erreur: 'Document introuvable.' }, { status: 404 });

    const forcerTelechargement = req.nextUrl.searchParams.get('dl') === '1';
    const disposition = forcerTelechargement ? 'attachment' : 'inline';
    // RFC 5987 : garde les accents du nom de fichier intacts.
    const nomEncode = encodeURIComponent(doc.nom);

    return new Response(doc.flux, {
      headers: {
        'Content-Type': doc.type || 'application/octet-stream',
        'Content-Disposition': `${disposition}; filename*=UTF-8''${nomEncode}`,
        // Privé : jamais mis en cache par un intermédiaire partagé.
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}
