// Usage: node scripts/articles/skip.mjs <day> "<reason>"
// Marks a planned row as skipped and keeps the reason in the url column, prefixed "skipped: ".
// next.mjs never returns a skipped row. A skipped row is revisited only when a person asks.
import { readMap, writeMap } from './csv.mjs';

const [day, ...rest] = process.argv.slice(2);
const reason = rest.join(' ').replace(/[\r\n]+/g, ' ').trim();
if (!/^\d+$/.test(day || '') || !reason) {
  console.error('Usage: node scripts/articles/skip.mjs <day> "<reason>"');
  process.exit(2);
}
const { columns, rows } = readMap();
const row = rows.find((r) => String(r.day) === String(day));
if (!row) {
  console.error(`No row for day ${day}`);
  process.exit(1);
}
if (row.status === 'published') {
  console.error(`Day ${day} is already published; it cannot be skipped.`);
  process.exit(1);
}
row.status = 'skipped';
row.url = `skipped: ${reason}`;
writeMap(columns, rows);
console.log(`Day ${day} marked skipped (${reason}).`);
