/**
 * Diagnostic d'accès Google Sheets — `npm run diag`.
 * Vérifie que le compte de service ouvre les 5 classeurs et liste leurs onglets
 * réels (utiles car ils dépendent de la langue active). À relancer après tout
 * changement de partage, de clé ou de langue dans les Sheets.
 *
 * Volontairement en .mjs autonome (pas de TypeScript, pas de Next) : c'est un
 * outil d'exploitation, il doit tourner même si le build de l'app est cassé.
 */
import { google } from 'googleapis';
import { config as chargerEnv } from 'dotenv';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const RACINE = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
chargerEnv({ path: path.join(RACINE, '.env') });

const CHEMIN_CLE = process.env.GOOGLE_CREDENTIALS_PATH
  ? path.resolve(RACINE, process.env.GOOGLE_CREDENTIALS_PATH)
  : path.join(RACINE, 'credentials.json');

const CIBLES = [
  ['Budget', process.env.BUDGET_SHEET_ID],
  ['ToDo', process.env.TODO_SHEET_ID],
  ['Repas', process.env.REPAS_SHEET_ID],
  ['Cadeaux', process.env.CADEAUX_SHEET_ID],
  ['Evenements', process.env.EVENEMENTS_SHEET_ID],
];

async function main() {
  let compte = '(inconnu)';
  try {
    compte = JSON.parse(readFileSync(CHEMIN_CLE, 'utf8')).client_email;
  } catch {
    console.error(`✖ Clé introuvable ou illisible : ${CHEMIN_CLE}`);
    process.exit(1);
  }
  console.log(`Compte de service : ${compte}\n`);

  const auth = new google.auth.GoogleAuth({
    keyFile: CHEMIN_CLE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
  });
  const sheets = google.sheets({ version: 'v4', auth });

  let ok = 0;
  for (const [nom, id] of CIBLES) {
    if (!id) {
      console.log(`[${nom}] ABSENT du .env`);
      continue;
    }
    try {
      const rep = await sheets.spreadsheets.get({
        spreadsheetId: id,
        fields: 'properties.title,sheets.properties.title',
      });
      const onglets = rep.data.sheets.map((s) => s.properties.title).join(' | ');
      console.log(`[${nom}] OK → "${rep.data.properties.title}"`);
      console.log(`   ${onglets}`);
      ok++;
    } catch (e) {
      const code = e.code ?? e.response?.status ?? '?';
      console.log(`[${nom}] ÉCHEC (${code}) : ${e.message.split('\n')[0]}`);
    }
  }
  console.log(`\n===> ${ok}/${CIBLES.length} classeurs accessibles.`);
  process.exit(ok === CIBLES.length ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
