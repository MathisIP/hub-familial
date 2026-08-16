import { NextResponse, type NextRequest } from 'next/server';
import {
  abonner,
  chargerPreferences,
  clePubliqueVapid,
  definirPreferences,
  desabonner,
  pushDisponible,
} from '@/lib/notifications/service';
import { reponseErreur } from '@/lib/api';

/**
 * Abonnement aux notifications et préférences de la personne connectée.
 *
 * ⚠ Runtime Node : `web-push` signe avec les clés VAPID (crypto Node), ce que le
 * runtime edge ne fournit pas.
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** État courant : clé publique VAPID + préférences. */
export async function GET() {
  try {
    return NextResponse.json({
      disponible: pushDisponible(),
      clePublique: clePubliqueVapid(),
      ...(await chargerPreferences()),
    });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** Enregistre un appareil. */
export async function POST(req: NextRequest) {
  try {
    const c = (await req.json()) as {
      endpoint: string;
      p256dh: string;
      auth: string;
      appareil?: string;
    };
    await abonner(c);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** Modifie les préférences (une ou plusieurs catégories). */
export async function PATCH(req: NextRequest) {
  try {
    const c = (await req.json()) as {
      courses?: boolean;
      evenements?: boolean;
      echeances?: boolean;
    };
    await definirPreferences(c);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}

/** Retire un appareil (permission révoquée, ou choix explicite). */
export async function DELETE(req: NextRequest) {
  try {
    const { endpoint } = (await req.json()) as { endpoint: string };
    await desabonner(String(endpoint ?? ''));
    return NextResponse.json({ ok: true });
  } catch (e) {
    return reponseErreur(e);
  }
}
