import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { listerDossier, HubNonConfigure } from '@/lib/google/driveBrowse';

/**
 * GET /api/drive/liste?dossier=<id> — contenu d'un dossier du Drive « Hub Familial »
 * (sous-dossiers + fichiers), lu avec le jeton Drive de l'utilisateur. Sans `dossier`,
 * on part de la racine (DRIVE_HUB_URL).
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const session = await auth();
  const token = session?.accessToken;
  if (!session?.user) {
    return NextResponse.json({ erreur: 'Non connecté.' }, { status: 401 });
  }
  if (!token || session.tokenError) {
    return NextResponse.json(
      { erreur: 'Accès Drive indisponible — reconnecte-toi pour autoriser Google Drive.', reconnexion: true },
      { status: 403 },
    );
  }

  const dossier = req.nextUrl.searchParams.get('dossier') ?? undefined;

  try {
    return NextResponse.json(await listerDossier(token, dossier));
  } catch (e) {
    if (e instanceof HubNonConfigure) {
      return NextResponse.json({ erreur: e.message, config: true }, { status: 400 });
    }
    const msg = (e as { message?: string }).message ?? 'Erreur inconnue.';
    if (/has not been used|is disabled|accessNotConfigured/i.test(msg)) {
      return NextResponse.json(
        { erreur: "L'API Google Drive n'est pas activée dans le projet GCP." },
        { status: 503 },
      );
    }
    if (/insufficient|permission|forbidden|403/i.test(msg)) {
      return NextResponse.json(
        { erreur: 'Autorisation Drive insuffisante — reconnecte-toi pour accorder l’accès.', reconnexion: true },
        { status: 403 },
      );
    }
    return NextResponse.json({ erreur: msg.split('\n')[0] }, { status: 500 });
  }
}
