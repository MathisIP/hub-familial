import { NextResponse } from 'next/server';
import { chargerTodo } from '@/lib/todo/service';
import { reponseErreur } from '@/lib/api';

/** GET /api/todo — tâches + courses + listes déroulantes, en un aller-retour. */
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const donnees = await chargerTodo();
    return NextResponse.json(donnees);
  } catch (e) {
    return reponseErreur(e);
  }
}
