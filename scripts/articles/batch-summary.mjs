// Usage: node scripts/articles/batch-summary.mjs [--date YYYY-MM-DD] [--subject]
// Reads the lines of content/log.md that start with the date (default: today, Europe/London) and prints
// one paragraph saying what the weekly batch did, for the commit message. With --subject it prints only
// the commit subject: "Guides for the week of <Monday>: <N> published, <M> skipped".
// Log line formats: "<date> | day <N> | <slug> | published" and "<date> | day <N> | <slug or none> | FAILED: <reason>".
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { ROOT, todayLondon } from './csv.mjs';

const args = process.argv.slice(2);
const di = args.indexOf('--date');
const date = di >= 0 ? args[di + 1] : (process.env.ARTICLE_TODAY || todayLondon());
if (!/^\d{4}-\d{2}-\d{2}$/.test(date || '')) {
  console.error('Usage: node scripts/articles/batch-summary.mjs [--date YYYY-MM-DD] [--subject]');
  process.exit(2);
}
const logFile = process.env.ARTICLE_LOG || path.join(ROOT, 'content', 'log.md');
const lines = existsSync(logFile) ? readFileSync(logFile, 'utf8').split(/\r?\n/) : [];

const published = [];
const skipped = [];
for (const l of lines) {
  const parts = l.split('|').map((x) => x.trim());
  if (parts[0] !== date) continue;
  const day = (/^day\s+(\d+)$/i.exec(parts[1] || '') || [])[1];
  if (!day) continue;
  const slug = parts[2] || 'none';
  const outcome = parts.slice(3).join(' | ');
  if (/^published$/i.test(outcome)) published.push({ day: Number(day), slug });
  else if (/^FAILED:/i.test(outcome)) skipped.push({ day: Number(day), slug, reason: outcome.replace(/^FAILED:\s*/i, '') });
}
published.sort((a, b) => a.day - b.day);
skipped.sort((a, b) => a.day - b.day);

const d = new Date(date + 'T00:00:00Z');
d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
const monday = d.toISOString().slice(0, 10);
const subject = `Guides for the week of ${monday}: ${published.length} published, ${skipped.length} skipped`;
if (args.includes('--subject')) {
  console.log(subject);
  process.exit(0);
}
let text = `${subject}.`;
if (published.length) text += ` Published: ${published.map((p) => `day ${p.day} (${p.slug})`).join(', ')}.`;
if (skipped.length) text += ` Skipped: ${skipped.map((s) => `day ${s.day} (${s.reason})`).join('; ')}.`;
if (!published.length && !skipped.length) text = `No log lines for ${date}.`;
console.log(text);
