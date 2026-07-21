import { NextResponse, type NextRequest } from 'next/server';
import { auth } from '@/auth';
import { importerDansDrive, type FichierAImporter } from '@/lib/google/driveImport';

/**
 * POST /api/drive/import — téléverse les fichiers envoyés (multipart) dans le
 * dossier « À classer » du Drive de l'utilisateur, avec SON jeton (scope Drive).
 */
export const dynamic = 'force-dynamic';
export const maxDuration = 60; // téléversements potentiellement lents

export async function POST(req: NextRequest) {
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

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return NextResponse.json({ erreur: 'Envoi invalide.' }, { status: 400 });
  }

  const entrees = form.getAll('fichiers').filter((e): e is File => e instanceof File);
  if (entrees.length === 0) {
    return NextResponse.json({ erreur: 'Aucun fichier.' }, { status: 400 });
  }

  const fichiers: FichierAImporter[] = await Promise.all(
    entrees.map(async (f) => ({
      nom: f.name || 'document',
      type: f.type,
      donnees: Buffer.from(await f.arrayBuffer()),
    })),
  );

  try {
    const resultats = await importerDansDrive(token, fichiers);
    const reussis = resultats.filter((r) => r.ok).length;
    return NextResponse.json({ ok: true, reussis, total: resultats.length, resultats });
  } catch (e) {
    const msg = (e as { message?: string }).message ?? 'Erreur inconnue.';
    // API Drive non activée → message ciblé.
    if (/has not been used|is disabled|accessNotConfigured/i.test(msg)) {
      return NextResponse.json(
        { erreur: "L'API Google Drive n'est pas activée dans le projet GCP." },
        { status: 503 },
      );
    }
    return NextResponse.json({ erreur: msg.split('\n')[0] }, { status: 500 });
  }
}
