/**
 * APERÇU / TEST DES AVIS DE RECONDUCTION (article L. 215-1).
 * =========================================================
 *   npm run avis:apercu                 → écrit apercu-avis.html, n'envoie RIEN
 *   npm run avis:apercu -- moi@ex.fr    → envoie réellement les deux avis
 *
 * ⚠ Le script importe la **vraie** fonction, il ne recopie pas son texte. Un
 * aperçu qui aurait sa propre copie du message finirait par montrer autre chose
 * que ce qui part vraiment — on relirait alors un texte qui n'existe plus.
 *
 * Deux modules sont détournés à la résolution :
 *   · `server-only`, fourni par Next et non résoluble en Node nu (et ici sans
 *     objet : un script de terminal EST le serveur) ;
 *   · `@/lib/email`, remplacé en mode aperçu par une capture — c'est ce qui
 *     permet de lire le message sans qu'aucun courriel ne parte.
 */
import { registerHooks } from 'node:module';
import { writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const cible = process.argv[2] || '';
const fichier = (n: string) =>
  pathToFileURL(new URL(n, import.meta.url).pathname.slice(1)).href;

registerHooks({
  resolve(spec, ctx, next) {
    if (spec === 'server-only') return { url: fichier('_vide.cjs'), shortCircuit: true };
    if (!cible && (spec === '@/lib/email' || spec.endsWith('/lib/email')))
      return { url: fichier('_email-capture.cjs'), shortCircuit: true };
    return next(spec, ctx);
  },
});

// ⚠ `chargerEnv()` doit être APPELÉ : importer `_env.mjs` ne fait que définir la
// fonction. L'oubli est silencieux — les variables restent absentes et l'envoi
// se contente de dire « non configuré », ce qu'on lit comme une clé manquante.
const { chargerEnv } = await import('./_env.mjs');
chargerEnv();

// Ces deux-là vivent dans Vercel, pas dans le .env local : l'aperçu ne doit pas
// échouer pour ça. On ne recouvre jamais une valeur déjà posée.
process.env.SITE_URL ||= 'https://www.nestync.app';
process.env.EMAIL_EXPEDITEUR ||= 'contact@nestync.app';
process.env.EMAIL_EXPEDITEUR_NOM ||= 'Nestync';

const { OFFRES, formatPrix } = await import('../lib/offres.ts');
const annuel = OFFRES.find((o) => o.id === 'annuel')!;
const montant = formatPrix(annuel.prix);
const fin = new Date(Date.now() + 45 * 86400_000);

const { envoyerAvisReconduction } = await import('../lib/email/messages.ts');

// ⚠ Le lien de résiliation suit SITE_URL. En local il pointe vers localhost, ce
// qui est correct mais se relit plus tard comme un défaut de production : on le
// dit, plutôt que de laisser le doute.
if (cible && /localhost|127\.0\.0\.1/.test(process.env.SITE_URL!)) {
  console.log(`⚠ SITE_URL = ${process.env.SITE_URL} — le lien de résiliation`);
  console.log('  pointera vers ta machine. Normal en local ; en production');
  console.log("  c'est la variable posée dans Vercel qui s'applique.");
  console.log();
}

for (const type of ['legal', 'rappel'] as const) {
  const ok = await envoyerAvisReconduction(cible || 'exemple@nestync.app', 'Mathis', fin, montant, type);
  if (cible) console.log(`${type.padEnd(7)} → ${ok ? 'envoyé' : 'ÉCHEC (BREVO_API_KEY ?)'}`);
}

if (cible) {
  console.log(`\nRegarde ta boîte : ${cible}`);
} else {
  // La capture passe par `globalThis` : c'est le seul canal entre le module
  // détourné (chargé par le crochet de résolution) et ce script.
  const pris = (globalThis as unknown as { __avis: { sujet: string; texte: string }[] })
    .__avis;
  const echap = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const legendes = [
    "à 45 jours — <strong>c'est l'avis légal</strong>, celui qui satisfait L. 215-1",
    'à 7 jours — filet de sécurité, hors fenêtre légale',
  ];
  const page =
    `<!doctype html><meta charset="utf-8"><title>Avis de reconduction</title><style>
body{font:15px/1.6 system-ui;background:#E7E9E4;color:#141C26;margin:0;padding:32px}
h1{font-size:20px;margin:0 0 8px}
.m{background:#fff;border:1px solid #CDD1CB;max-width:660px;margin:0 0 8px}
.t{border-bottom:1px solid #CDD1CB;padding:14px 18px;font-size:13px;color:#454E5C}
.o{font-weight:600;color:#141C26;font-size:15px;margin-top:6px}
.c{padding:18px;white-space:pre-wrap}
.n{max-width:660px;font-size:13px;color:#454E5C;border-left:2px solid #4338CA;padding-left:12px;margin:0 0 28px}
</style><h1>Avis de reconduction — aperçu</h1>
<p class="n">Abonnement annuel à ${montant}. Textes produits par la vraie fonction.</p>` +
    pris
      .map(
        (m, i) =>
          `<div class="m"><div class="t">De : Nestync &lt;contact@nestync.app&gt;<br>À : toi
<div class="o">${echap(m.sujet)}</div></div><div class="c">${echap(m.texte)}</div></div>
<p class="n">${legendes[i]}</p>`,
      )
      .join('');
  writeFileSync('apercu-avis.html', page);
  console.log('écrit : apercu-avis.html');
}
