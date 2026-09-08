import { NextResponse, type NextRequest } from 'next/server';
import { televerserVisuelPost, fluxVisuelPost } from '@/lib/editorial/service';
import { reponseErreur } from '@/lib/api';

/**
 * ⚠ PLUS APPELÉE PAR L'INTERFACE DEPUIS LE 08/09/2026. Le calendrier ne
 * téléverse plus d'image : les médias finaux (reel monté, images du carrousel)
 * sont désignés par un LIEN vers un dossier externe — une vidéo de reel dépasse
 * de loin la limite de requête de Vercel, et l'image unique qu'on pouvait
 * déposer ici ne servait à rien.
 *
 * Conservée pour que les visuels déjà déposés restent lisibles : la colonne
 * `editorial_posts.visuel` peut encore porter une clé de stockage, et supprimer
 * cette route rendrait ces fichiers définitivement inatteignables sans rien
 * faire gagner.
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

/** GET /api/editorial/visuel/<numero> — sert le visuel d'un post (stockage privé). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ numero: string }> }) {
  try {
    const { numero } = await ctx.params;
    const flux = await fluxVisuelPost(Number(numero));
    if (!flux) return NextResponse.json({ erreur: 'Visuel introuvable.' }, { status: 404 });
    return new Response(flux.flux, {
      headers: {
        'Content-Type': flux.type || 'application/octet-stream',
        'Cache-Control': 'private, max-age=0, must-revalidate',
      },
    });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** POST /api/editorial/visuel/<numero> — téléverse (remplace) le visuel d'un post. */
export async function POST(req: NextRequest, ctx: { params: Promise<{ numero: string }> }) {
  try {
    const { numero } = await ctx.params;
    let form: FormData;
    try {
      form = await req.formData();
    } catch {
      return NextResponse.json({ erreur: 'Envoi invalide.' }, { status: 400 });
    }
    const fichier = form.get('fichier');
    if (!(fichier instanceof File)) {
      return NextResponse.json({ erreur: 'Aucun fichier.' }, { status: 400 });
    }
    const donnees = Buffer.from(await fichier.arrayBuffer());
    await televerserVisuelPost(Number(numero), donnees);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
