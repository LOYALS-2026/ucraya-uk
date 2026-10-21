// Usage: npm run test:articles
// Proves the article checker rejects each bad fixture for the right reason, accepts the good ones,
// and that skip.mjs and next.mjs behave. Fixtures live in scripts/articles/tests/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { checkArticle } from './check.mjs';
import { slugify, readMap, writeMap } from './csv.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const fixtures = path.join(here, 'tests');
const work = mkdtempSync(path.join(tmpdir(), 'ucraya-article-test-'));
let passed = 0;
let failed = 0;
const report = (ok, label, extra = '') => {
  if (ok) passed++; else failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} ${label}${ok ? '' : ' ' + extra}`);
};

// fixture file -> text that every failure must contain (null = must pass with no failure)
const EXPECT = {
  'good.md': null,
  'good-fee.md': null,
  'bad-test-claim.md': 'claim',
  'bad-percentage.md': 'percentage',
  'bad-assured.md': 'outcome or hype wording',
  'bad-promise.md': 'promise',
  'bad-quote.md': 'attributed to a person or student',
  'bad-student-story.md': 'past result about a student',
  'bad-pound.md': 'pound amount',
  'bad-pound-unchecked.md': 'pound amount',
  'bad-title-long.md': 'at most 59',
};

const onDisk = readdirSync(fixtures).filter((f) => f.endsWith('.md'));
for (const f of onDisk) if (!(f in EXPECT)) report(false, `${f} has no expectation in test.mjs`);
for (const f of Object.keys(EXPECT)) if (!onDisk.includes(f)) report(false, `${f} is missing from tests/`);

for (const [file, expected] of Object.entries(EXPECT)) {
  if (!onDisk.includes(file)) continue;
  const raw = readFileSync(path.join(fixtures, file), 'utf8');
  const fm = matter(raw).data;
  const tmp = path.join(work, `${slugify(fm.title)}.md`);
  writeFileSync(tmp, raw);
  const row = {
    day: String(fm.day), pillar: fm.pillar, cluster: fm.cluster, segment: fm.segment, funnel_stage: fm.funnelStage,
    ai_question: fm.aiQuestion, primary_keyword: fm.primaryKeyword, money_page: fm.moneyPage.replace(/\/$/, ''),
    cta: fm.cta, publish_date: '',
  };
  const { fails } = checkArticle(tmp, { rows: [row], blogSlugs: [], days: {}, today: '2026-10-21' });
  if (expected === null) report(fails.length === 0, `${file} is accepted`, JSON.stringify(fails));
  else {
    const right = fails.length > 0 && fails.every((m) => m.toLowerCase().includes(expected.toLowerCase()));
    report(right, `${file} is rejected for "${expected}"`, JSON.stringify(fails));
  }
}

// ---- skip.mjs and next.mjs on a scratch map
const columns = ['day', 'publish_date', 'pillar', 'cluster', 'segment', 'funnel_stage', 'title', 'primary_keyword',
  'secondary_keywords', 'ai_question', 'search_intent', 'money_page', 'cta', 'outline', 'original_element', 'faq',
  'language', 'word_count', 'status', 'url'];
const mkRow = (day, title, status) => Object.fromEntries(columns.map((c) => [c, ''])
  .map(([c]) => [c, c === 'day' ? String(day) : c === 'title' ? title : c === 'status' ? status : c === 'publish_date' ? '2026-10-20' : 'x']));
const mapFile = path.join(work, 'map.csv');
const blogDir = path.join(work, 'blog');
mkdirSync(blogDir, { recursive: true });
writeMap(columns, [mkRow(1, 'First title', 'planned'), mkRow(2, 'Second title', 'planned')], mapFile);
const env = { ...process.env, ARTICLE_MAP: mapFile, ARTICLE_BLOG: blogDir, ARTICLE_TODAY: '2026-10-21' };
const run = (script, ...args) => spawnSync('node', [path.join(here, script), ...args], { env, encoding: 'utf8' });

let r = run('skip.mjs', '1', 'source would not load');
const after = readMap(mapFile).rows;
report(r.status === 0 && after[0].status === 'skipped' && after[0].url === 'skipped: source would not load', 'skip.mjs marks the row skipped with the reason in url', r.stderr);
r = run('next.mjs');
report(r.status === 0 && JSON.parse(r.stdout).row.day === 2, 'next.mjs ignores a skipped row and returns the next planned one', r.stderr + r.stdout.slice(0, 80));
writeFileSync(path.join(blogDir, 'second-title.md'), '---\n---\n');
r = run('next.mjs');
report(r.status === 4, 'next.mjs exits 4 when the slug already exists', `exit ${r.status}`);
r = run('skip.mjs', '2');
report(r.status === 2, 'skip.mjs needs a reason', `exit ${r.status}`);

rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
