/**
 * Helpers monétaires partagés (purs, sans dépendance). Utilisés par les modules
 * qui manipulent des montants (Cadeaux, Événements). Le module Budget garde les
 * siens historiques ; ceux-ci sont la version réutilisable pour les nouveaux.
 */

/** « 5 691,86 € » / « 40,00 € » / « 80 » → nombre. Vide/illisible → 0. */
export function parseEuro(v: unknown): number {
  if (typeof v === 'number') return v;
  let x = (v == null ? '' : String(v)).replace(/[^\d,.\-]/g, '');
  if (x.includes(',') && x.includes('.')) x = x.replace(/\./g, '').replace(',', '.');
  else if (x.includes(',')) x = x.replace(',', '.');
  const n = parseFloat(x);
  return Number.isFinite(n) ? n : 0;
}

const FMT = new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR' });
export function formatEuro(n: number): string {
  return FMT.format(n);
}

/** jj/mm/aaaa ou aaaa-mm-jj → ISO, sinon null. */
export function versISO(texte: string): string | null {
  const t = (texte ?? '').trim();
  let m = t.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`;
  m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
  return null;
}

export function aujourdhuiISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Jours entiers d'ici une date ISO (négatif = passé). */
export function joursJusqua(iso: string): number {
  const [a, m, j] = iso.split('-').map(Number);
  const cible = new Date(a, m - 1, j).getTime();
  const now = new Date();
  const auj = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  return Math.round((cible - auj) / 86400000);
}
