/**
 * Synchronise le registre comptable du projet vers la base.
 *
 *   npm run comptes
 *
 * ⚠ Le FICHIER fait autorité. La table `mouvements_projet` est intégralement
 * remplacée à chaque passage : une ligne retirée du fichier disparaît de la
 * base. C'est voulu — deux sources de vérité qui divergent valent moins qu'une
 * seule qu'on sait exacte.
 *
 * Le chemin du fichier vient de `COMPTES_FICHIER` (dans `.env`, hors dépôt) :
 * il pointe vers un dossier personnel qui n'a rien à faire dans le code.
 */
import postgres from 'postgres';
import { readFileSync, existsSync } from 'node:fs';

// --- Environnement -----------------------------------------------------------
for (const ligne of readFileSync('.env', 'utf8').split(/\r?\n/)) {
  const m = ligne.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
}

const FICHIER = process.env.COMPTES_FICHIER;
if (!FICHIER) {
  console.error("✖ COMPTES_FICHIER n'est pas défini dans .env");
  console.error('  Exemple : COMPTES_FICHIER=C:/Users/…/Nestync/Compte/comptes.json');
  process.exit(1);
}
if (!existsSync(FICHIER)) {
  console.error(`✖ Fichier introuvable : ${FICHIER}`);
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error('✖ DATABASE_URL manquant.');
  process.exit(1);
}

// --- Lecture et validation ---------------------------------------------------
let registre;
try {
  registre = JSON.parse(readFileSync(FICHIER, 'utf8'));
} catch (e) {
  console.error(`✖ JSON invalide : ${e.message}`);
  process.exit(1);
}

const SENS = ['depense', 'recette'];
const RECURRENCES = [null, 'mensuel', 'annuel'];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

const erreurs = [];
const vus = new Set();
const mouvements = Array.isArray(registre.mouvements) ? registre.mouvements : [];
if (mouvements.length === 0) erreurs.push('aucun mouvement dans le fichier');

for (const [i, m] of mouvements.entries()) {
  const ou = `ligne ${i + 1} (${m?.id ?? 'sans id'})`;
  if (!m?.id || typeof m.id !== 'string') erreurs.push(`${ou} : id manquant`);
  else if (vus.has(m.id)) erreurs.push(`${ou} : id en double`);
  else vus.add(m.id);

  if (!DATE.test(m?.date ?? '')) erreurs.push(`${ou} : date attendue au format aaaa-mm-jj`);
  if (!m?.libelle) erreurs.push(`${ou} : libellé manquant`);
  if (!SENS.includes(m?.sens)) erreurs.push(`${ou} : sens doit valoir « depense » ou « recette »`);
  if (!RECURRENCES.includes(m?.recurrence ?? null))
    erreurs.push(`${ou} : recurrence doit valoir null, « mensuel » ou « annuel »`);
  if (m?.fin != null && !DATE.test(m.fin)) erreurs.push(`${ou} : fin invalide`);
  if (m?.fin != null && !m?.recurrence) erreurs.push(`${ou} : une fin n'a de sens que sur un récurrent`);
  if (m?.montant != null && typeof m.montant !== 'number')
    erreurs.push(`${ou} : montant doit être un nombre (ou null)`);
  if (typeof m?.montant === 'number' && m.montant < 0)
    erreurs.push(`${ou} : montant négatif — utiliser « sens » pour distinguer dépense et recette`);
}

if (erreurs.length > 0) {
  console.error(`✖ ${erreurs.length} problème(s) — rien n'a été écrit :`);
  for (const e of erreurs) console.error(`   · ${e}`);
  process.exit(1);
}

// --- Écriture ----------------------------------------------------------------
const url = new URL(process.env.DATABASE_URL);
const [hote, ...reste] = url.hostname.split('.');
if (url.hostname.endsWith('.neon.tech') && !url.hostname.includes('-pooler')) {
  url.hostname = [`${hote}-pooler`, ...reste].join('.');
}
const sql = postgres(url.toString(), { prepare: false, max: 3 });

const lignes = mouvements.map((m) => ({
  id: m.id,
  date: m.date,
  libelle: m.libelle,
  categorie: m.categorie ?? '',
  sens: m.sens,
  montant_centimes: m.montant == null ? null : Math.round(m.montant * 100),
  recurrence: m.recurrence ?? null,
  fin: m.fin ?? null,
  note: m.note ?? '',
}));

try {
  await sql.begin(async (tx) => {
    await tx`delete from mouvements_projet`;
    await tx`insert into mouvements_projet ${tx(lignes)}`;
  });
} catch (e) {
  console.error(`✖ Écriture refusée : ${e.message}`);
  await sql.end();
  process.exit(1);
}

const aCompleter = lignes.filter((l) => l.montant_centimes === null).length;
const total = lignes.reduce((t, l) => t + (l.montant_centimes ?? 0), 0);

console.log(`✔ ${lignes.length} mouvement(s) synchronisé(s).`);
if (aCompleter > 0) {
  console.log(`  ⚠ ${aCompleter} ligne(s) sans montant — les totaux sont incomplets.`);
}
console.log(`  Somme des montants unitaires renseignés : ${(total / 100).toFixed(2)} €`);
console.log('  La page /comptes affiche désormais ces valeurs.');
await sql.end();
