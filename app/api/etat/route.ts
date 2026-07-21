import { NextResponse } from 'next/server';
import { configFoyer, ConfigManquante, type ClasseurId } from '@/lib/config';
import { inspecterClasseur } from '@/lib/google/sheets';

/**
 * GET /api/etat — diagnostic de connexion aux 5 classeurs.
 * Tourne côté serveur : `credentials.json` et les IDs ne quittent jamais la
 * machine. Le client ne reçoit que des titres et des noms d'onglets.
 *
 * `dynamic = force-dynamic` : l'état dépend de l'accès réseau à Google, il ne
 * doit pas être figé au build ni mis en cache.
 */
export const dynamic = 'force-dynamic';

type ResultatClasseur = {
  cle: ClasseurId;
  ok: boolean;
  titre?: string;
  onglets?: string[];
  erreur?: string;
};

export async function GET() {
  let cles: ClasseurId[];
  try {
    cles = Object.keys(configFoyer().classeurs) as ClasseurId[];
  } catch (e) {
    if (e instanceof ConfigManquante) {
      return NextResponse.json(
        { configOk: false, message: e.message, manquantes: e.manquantes, classeurs: [] },
        { status: 200 },
      );
    }
    throw e;
  }

  const classeurs = await Promise.all(
    cles.map(async (cle): Promise<ResultatClasseur> => {
      try {
        const { titre, onglets } = await inspecterClasseur(cle);
        return { cle, ok: true, titre, onglets };
      } catch (e) {
        const err = e as { code?: number | string; message?: string };
        const code = err.code ?? '?';
        return {
          cle,
          ok: false,
          erreur: `${code} — ${(err.message ?? 'erreur inconnue').split('\n')[0]}`,
        };
      }
    }),
  );

  const tousOk = classeurs.every((c) => c.ok);
  return NextResponse.json({ configOk: true, tousOk, classeurs });
}
