// Usage: node scripts/articles/schedule.mjs <YYYY-MM-DD>
// Fills publish_date = start + (day - 1) days for rows whose publish_date is empty.
import { readMap, writeMap } from './csv.mjs';

const start = process.argv[2];
if (!/^\d{4}-\d{2}-\d{2}$/.test(start || '') || Number.isNaN(Date.parse(start + 'T00:00:00Z'))) {
  console.error('Usage: node scripts/articles/schedule.mjs <YYYY-MM-DD>');
  process.exit(2);
}
const { columns, rows } = readMap();
const base = Date.parse(start + 'T00:00:00Z');
let changed = 0;
for (const r of rows) {
  if (r.publish_date) continue;
  const d = new Date(base + (Number(r.day) - 1) * 86400000);
  r.publish_date = d.toISOString().slice(0, 10);
  changed++;
}
if (changed) writeMap(columns, rows);
const dates = rows.map((r) => r.publish_date).filter(Boolean).sort();
console.log(`Filled ${changed} dates. First ${dates[0]}, last ${dates[dates.length - 1]}.`);
