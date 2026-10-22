// Usage:
//   node scripts/articles/schedule.mjs --weekly <Monday YYYY-MM-DD> [--per-week 5]
//       Weekly batches: gives every planned row with an empty publish_date the Monday of its batch,
//       in day order, <per-week> rows to a Monday (the last batch may be smaller). Safe to run again:
//       rows that already have a publish_date are never touched.
//   node scripts/articles/schedule.mjs --pillar "<pillar name>" --weekly <Monday YYYY-MM-DD> [--per-week N]
//       The same, for the rows of ONE pillar only, on their own calendar (a pillar listed in
//       SEPARATE_SCHEDULE_PILLARS in csv.mjs, such as the translation pillar, is scheduled this way: one row
//       a Monday, in day order, alongside the five lesson rows). Idempotent too. The plain --weekly run
//       leaves those pillars alone, so the lesson calendar never moves when they are added.
//   node scripts/articles/schedule.mjs <YYYY-MM-DD>
//       Old daily mode: publish_date = start + (day - 1) days for rows whose publish_date is empty.
import { readMap, writeMap, SEPARATE_SCHEDULE_PILLARS } from './csv.mjs';

const isDay = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s || '') && !Number.isNaN(Date.parse(s + 'T00:00:00Z'))
  && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s;
const usage = () => {
  console.error('Usage: node scripts/articles/schedule.mjs [--pillar "<name>"] --weekly <Monday YYYY-MM-DD> [--per-week N]\n   or: node scripts/articles/schedule.mjs <YYYY-MM-DD>');
  process.exit(2);
};
const addDays = (start, n) => new Date(Date.parse(start + 'T00:00:00Z') + n * 86400000).toISOString().slice(0, 10);

const args = process.argv.slice(2);
const weekly = args.includes('--weekly');
const { columns, rows } = readMap();
let changed = 0;

if (weekly) {
  const start = args[args.indexOf('--weekly') + 1];
  const pi = args.indexOf('--per-week');
  const perWeek = pi >= 0 ? Number(args[pi + 1]) : 5;
  if (!isDay(start) || !Number.isInteger(perWeek) || perWeek < 1) usage();
  if (new Date(start + 'T00:00:00Z').getUTCDay() !== 1) {
    console.error(`${start} is not a Monday.`);
    process.exit(2);
  }
  const pi2 = args.indexOf('--pillar');
  const pillar = pi2 >= 0 ? args[pi2 + 1] : null;
  if (pi2 >= 0 && !pillar) usage();
  if (pillar && !rows.some((r) => r.pillar === pillar)) {
    console.error(`No row has the pillar "${pillar}".`);
    process.exit(2);
  }
  // With --pillar: only that pillar. Without it: every pillar except those kept on their own calendar.
  const inScope = (r) => (pillar ? r.pillar === pillar : !SEPARATE_SCHEDULE_PILLARS.includes(r.pillar));
  const todo = rows.filter((r) => r.status === 'planned' && !r.publish_date && inScope(r)).sort((a, b) => Number(a.day) - Number(b.day));
  todo.forEach((r, i) => { r.publish_date = addDays(start, Math.floor(i / perWeek) * 7); changed++; });
} else {
  const start = args[0];
  if (!isDay(start)) usage();
  for (const r of rows) {
    if (r.publish_date || SEPARATE_SCHEDULE_PILLARS.includes(r.pillar)) continue;
    r.publish_date = addDays(start, Number(r.day) - 1);
    changed++;
  }
}
if (changed) writeMap(columns, rows);
const dates = rows.filter((r) => r.status === 'planned').map((r) => r.publish_date).filter(Boolean).sort();
console.log(`Filled ${changed} dates. First planned ${dates[0] || 'none'}, last planned ${dates[dates.length - 1] || 'none'}.`);
