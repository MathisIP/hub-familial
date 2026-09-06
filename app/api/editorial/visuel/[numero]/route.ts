import { NextResponse, type NextRequest } from 'next/server';
import { televerserVisuelPost, fluxVisuelPost } from '@/lib/editorial/service';
import { reponseErreur } from '@/lib/api';

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
