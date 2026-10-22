// Reads and writes content/topical-map.csv (20 columns plus `notes`, the last). Column order and the file's
// CRLF line endings are preserved; fields are quoted only when RFC 4180 needs it.
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { parse } from 'csv-parse/sync';

export const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
// ARTICLE_MAP and ARTICLE_BLOG let the tests point the scripts at a scratch copy.
export const MAP_PATH = process.env.ARTICLE_MAP || path.join(ROOT, 'content', 'topical-map.csv');
export const BLOG_DIR = process.env.ARTICLE_BLOG || path.join(ROOT, 'src', 'content', 'blog');
export const SITE = 'https://ucraya.uk';
// Pillars scheduled on their own calendar (one row a Monday) with `schedule.mjs --pillar "<name>" --weekly ...`.
// The plain `--weekly` run (five lesson rows a Monday) leaves them alone, so the lesson calendar never moves.
export const SEPARATE_SCHEDULE_PILLARS = ['Translating Bulgarian and UK documents for official use'];

export function readMap(file = MAP_PATH) {
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  const records = parse(text, { columns: false, skip_empty_lines: true, relax_column_count: false });
  const columns = records[0];
  const rows = records.slice(1).map((r) => Object.fromEntries(columns.map((c, i) => [c, r[i]])));
  return { columns, rows };
}

function field(v) {
  const s = v == null ? '' : String(v);
  return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function writeMap(columns, rows, file = MAP_PATH) {
  const lines = [columns.map(field).join(',')];
  for (const r of rows) lines.push(columns.map((c) => field(r[c])).join(','));
  writeFileSync(file, lines.join('\r\n') + '\r\n', 'utf8');
}

// Today in Europe/London as YYYY-MM-DD.
export function todayLondon(now = new Date()) {
  const p = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

export function slugFromUrl(url) {
  const m = /\/blog\/([a-z0-9-]+)\/?$/.exec(url || '');
  return m ? m[1] : '';
}

export function slugify(title) {
  let s = title.toLowerCase().replace(/['’]/g, '').replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  if (s.length <= 60) return s;
  const cut = s.slice(0, 61);
  const i = cut.lastIndexOf('-');
  return (i > 0 ? cut.slice(0, i) : s.slice(0, 60)).replace(/-+$/, '');
}
