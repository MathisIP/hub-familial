/**
 * Génère les icônes PWA depuis un SVG « maison familiale » (palette rose du thème).
 * Lancement : `node scripts/generer-icones.mjs`
 *
 * Sorties :
 *   public/icon-192.png, public/icon-512.png  → manifest (dont maskable, plein cadre)
 *   app/icon.png                              → favicon (Next App Router, auto)
 *   app/apple-icon.png                        → icône iOS « ajouter à l'écran d'accueil »
 *
 * Design plein cadre (fond rempli) : sûr pour le masquage adaptatif Android.
 * La maison reste dans la zone centrale de sécurité (~66 %).
 */
import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f4cdd8"/>
      <stop offset="1" stop-color="#e39fb1"/>
    </linearGradient>
    <filter id="ombre" x="-20%" y="-20%" width="140%" height="140%">
      <feDropShadow dx="0" dy="6" stdDeviation="10" flood-color="#7a3a4c" flood-opacity="0.18"/>
    </filter>
  </defs>
  <rect width="512" height="512" fill="url(#bg)"/>
  <g filter="url(#ombre)">
    <!-- toit -->
    <path d="M256 150 L392 272 L120 272 Z" fill="#ffffff"/>
    <!-- corps -->
    <rect x="150" y="262" width="212" height="132" rx="18" fill="#ffffff"/>
    <!-- porte -->
    <rect x="230" y="326" width="52" height="68" rx="10" fill="#2e4a7a"/>
    <!-- cœur (gable) -->
    <path d="M256 210
             C 248 196, 224 198, 224 218
             C 224 234, 244 244, 256 256
             C 268 244, 288 234, 288 218
             C 288 198, 264 196, 256 210 Z"
          fill="#e0708c"/>
  </g>
</svg>`;

const cibles = [
  { fichier: 'public/icon-192.png', taille: 192 },
  { fichier: 'public/icon-512.png', taille: 512 },
  { fichier: 'app/icon.png', taille: 256 },
  { fichier: 'app/apple-icon.png', taille: 180 },
];

for (const { fichier, taille } of cibles) {
  const sortie = path.join(RACINE, fichier);
  mkdirSync(path.dirname(sortie), { recursive: true });
  await sharp(Buffer.from(SVG)).resize(taille, taille).png().toFile(sortie);
  console.log(`✓ ${fichier} (${taille}×${taille})`);
}
console.log('Icônes générées.');
