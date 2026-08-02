// Création des nouveaux logos depuis une image issue de Procreate

import sharp from 'sharp';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { mkdirSync } from 'node:fs';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));

// On indique le chemin direct vers le fichier
const cheminDuLogo = path.join(RACINE, 'Logo_Nestync.png');

// On défini les cibles
const cibles = [
    { fichier: 'public/icon-192.png', taille: 192},
    { fichier: 'public/icon-512.png', taille: 512},
    { fichier: 'app/icon.png', taille: 256},
    { fichier: 'app/apple-icon.png', taille: 180},
];

// Boucle de génération
for (const { fichier, taille } of cibles) { 
  const sortie = path.join(RACINE, fichier); 
  mkdirSync(path.dirname(sortie), { recursive: true }); 
  
  // On passe directement le chemin du fichier à Sharp au lieu du "Buffer.from(SVG)"
  await sharp(cheminDuLogo)
    .resize(taille, taille)
    .png()
    .toFile(sortie); 
    
  console.log(`✓ ${fichier} (${taille}×${taille})`); 
} 

console.log('Icônes générées avec succès depuis le PNG !');