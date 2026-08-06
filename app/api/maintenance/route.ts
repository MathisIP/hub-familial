import { NextResponse, type NextRequest } from 'next/server';
import { menagePeriodique } from '@/lib/maintenance';
import { reponseErreur } from '@/lib/api';

/**
 * GET /api/maintenance — ménage périodique (durées de conservation RGPD).
 *
 * Déclenchée une fois par jour par la tâche planifiée Vercel (`crons` dans
 * [vercel.json]). Vercel appelle en GET avec l'en-tête
 * `Authorization: Bearer <CRON_SECRET>`.
 *
 * ⚠ ROUTE PUBLIQUE au sens du middleware (aucune session ne peut exister pour une
 * tâche planifiée) : c'est donc `CRON_SECRET` **seul** qui la protège. Sans lui
 * configuré, la route **refuse de s'exécuter** plutôt que de s'ouvrir à tous —
 * un endpoint de suppression accessible sans authentification serait une porte
 * ouverte, et un défaut de configuration ne doit jamais se traduire par une
 * baisse de protection.
 */
export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const attendu = process.env.CRON_SECRET;
  if (!attendu) {
    return NextResponse.json(
      { erreur: 'CRON_SECRET non configuré : ménage désactivé par sécurité.' },
      { status: 503 },
    );
  }
  if (req.headers.get('authorization') !== `Bearer ${attendu}`) {
    return NextResponse.json({ erreur: 'Non autorisé.' }, { status: 401 });
  }

  try {
    const rapport = await menagePeriodique();
    // Journalisé pour être lisible dans les journaux Vercel : c'est la seule
    // trace de ce que le ménage a fait, et elle sert au registre.
    console.log('[maintenance]', JSON.stringify(rapport));
    return NextResponse.json(rapport);
  } catch (e) {
    return reponseErreur(e);
  }
}
