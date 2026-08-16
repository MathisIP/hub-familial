import { NextResponse, type NextRequest } from 'next/server';
import { apercuValidationCourses, validerCourses } from '@/lib/todo/service';
import { reponseErreur } from '@/lib/api';

/**
 * Valider la liste de courses : prévenir les membres choisis qu'elle est prête.
 *
 * ⚠ Runtime Node : l'envoi passe par `web-push`, qui signe avec les clés VAPID
 * (crypto Node, absente du runtime edge).
 */
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** De quoi préparer l'envoi : nombre d'articles et membres à cocher. */
export async function GET() {
  try {
    return NextResponse.json(await apercuValidationCourses());
  } catch (e) {
    return reponseErreur(e);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { utilisateurs } = (await req.json()) as { utilisateurs?: string[] };
    return NextResponse.json(await validerCourses(utilisateurs ?? []));
  } catch (e) {
    return reponseErreur(e);
  }
}
