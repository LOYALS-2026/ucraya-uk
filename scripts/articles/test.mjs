// Usage: npm run test:articles
// Proves the article checker rejects each bad fixture for the right reason, accepts the good ones,
// and that skip.mjs and next.mjs behave. Fixtures live in scripts/articles/tests/.
import { readFileSync, writeFileSync, mkdirSync, rmSync, readdirSync, copyFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import matter from 'gray-matter';
import { checkArticle, MONEY_PAGES } from './check.mjs';
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

// ---- the money page list and the future date rule
{
  const raw = readFileSync(path.join(fixtures, 'good.md'), 'utf8');
  const fm = matter(raw).data;
  const mk = (text, name) => {
    const f = path.join(work, name);
    writeFileSync(f, text);
    return f;
  };
  const rowFor = (money) => ({
    day: String(fm.day), pillar: fm.pillar, cluster: fm.cluster, segment: fm.segment, funnel_stage: fm.funnelStage,
    ai_question: fm.aiQuestion, primary_keyword: fm.primaryKeyword, money_page: money.replace(/\/$/, ''), cta: fm.cta, publish_date: '',
  });
  for (const page of ['/free-trial/', '/placement-test/', '/pricing/', '/courses/oet/', '/courses/selt-b1/', '/courses/ielts/', '/courses/kids/', '/courses/business-english/', '/courses/one-to-one/', '/courses/group-courses/', '/courses/general-english/']) {
    report(MONEY_PAGES.includes(page), `${page} is an allowed money page`);
  }
  for (const page of ['/free-trial/', '/placement-test/']) {
    const text = raw.replace('moneyPage: "/courses/oet/"', `moneyPage: "${page}"`).replace('[OET lessons page](/courses/oet/)', `[page](${page})`);
    const { fails } = checkArticle(mk(text, `${slugify(fm.title)}.md`), { rows: [rowFor(page)], blogSlugs: [], days: {}, today: '2026-10-21' });
    report(fails.length === 0, `an article with money page ${page} is accepted`, JSON.stringify(fails));
  }
  const text = raw.replace('moneyPage: "/courses/oet/"', 'moneyPage: "/not-a-page/"');
  const bad = checkArticle(mk(text, `${slugify(fm.title)}.md`), { rows: [rowFor('/courses/oet/')], blogSlugs: [], days: {}, today: '2026-10-21' });
  report(bad.fails.some((m) => m.includes('moneyPage "/not-a-page/" must be one of')), 'an unknown money page is rejected', JSON.stringify(bad.fails));
  const future = checkArticle(mk(raw, `${slugify(fm.title)}.md`), { rows: [rowFor('/courses/oet/')], blogSlugs: [], days: {}, today: '2026-10-20' });
  report(future.fails.some((m) => m.includes('is in the future')), 'a pubDate in the future is rejected', JSON.stringify(future.fails));
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
r = run('next.mjs', '--one');
report(r.status === 0 && JSON.parse(r.stdout).row.day === 2, 'next.mjs --one ignores a skipped row and returns the next planned one', r.stderr + r.stdout.slice(0, 80));
writeFileSync(path.join(blogDir, 'second-title.md'), '---\n---\n');
r = run('next.mjs', '--one');
report(r.status === 4, 'next.mjs --one exits 4 when the slug already exists', `exit ${r.status}`);
r = run('skip.mjs', '2');
report(r.status === 2, 'skip.mjs needs a reason', `exit ${r.status}`);

// ---- weekly schedule: day order, five to a Monday from 26 October 2026, idempotent
const wcols = columns;
const wrows = [];
for (let d = 1; d <= 13; d++) {
  const rw = mkRow(d, `Title number ${d}`, d <= 3 ? 'published' : 'planned');
  rw.publish_date = d <= 3 ? `2026-10-${21 + d}` : '';
  wrows.push(rw);
}
// a skipped row and a row that already has a date must be left alone
wrows[5].status = 'skipped';
wrows[6].publish_date = '2026-12-07';
const weeklyMap = path.join(work, 'weekly.csv');
writeMap(wcols, wrows, weeklyMap);
const wenv = { ...env, ARTICLE_MAP: weeklyMap };
const wrun = (script, ...args) => spawnSync('node', [path.join(here, script), ...args], { env: wenv, encoding: 'utf8' });
r = wrun('schedule.mjs', '--weekly', '2026-10-27', '--per-week', '5');
report(r.status === 2, 'schedule --weekly refuses a start that is not a Monday', `exit ${r.status}`);
r = wrun('schedule.mjs', '--weekly', '2026-10-26', '--per-week', '5');
const w1 = readMap(weeklyMap).rows;
const dateOf = (d) => w1.find((x) => x.day === String(d)).publish_date;
report(r.status === 0 && dateOf(4) === '2026-10-26', 'schedule --weekly: the first planned day gets 26 October 2026', r.stderr + r.stdout);
report([4, 5, 8, 9, 10].every((d) => dateOf(d) === '2026-10-26') && [11, 12, 13].every((d) => dateOf(d) === '2026-11-02'), 'schedule --weekly: batches of five in day order (skipped and already dated rows do not count), then the next Monday', JSON.stringify(w1.map((x) => [x.day, x.publish_date])));
report(dateOf(7) === '2026-12-07', 'schedule --weekly leaves a row that already has a date alone');
report(w1.filter((x) => x.publish_date === '2026-11-02').length === 3, 'schedule --weekly: the last batch may be smaller (three here)');
report(w1.find((x) => x.day === '6').publish_date === '' && w1.find((x) => x.day === '6').status === 'skipped', 'schedule --weekly does not date a skipped row');
const bytes1 = readFileSync(weeklyMap, 'utf8');
r = wrun('schedule.mjs', '--weekly', '2026-10-26', '--per-week', '5');
report(r.status === 0 && readFileSync(weeklyMap, 'utf8') === bytes1 && /Filled 0 dates/.test(r.stdout), 'schedule --weekly is idempotent (a second run changes nothing)', r.stdout);
r = wrun('schedule.mjs', '--weekly', '2026-11-30', '--per-week', '5');
report(r.status === 0 && readFileSync(weeklyMap, 'utf8') === bytes1, 'schedule --weekly with another start still changes nothing once all rows have dates');

// ---- the real map: day 4 starts on 26 October 2026, five to a Monday
{
  const real = readMap();
  const planned = real.rows.filter((x) => x.status === 'planned').sort((a, b) => Number(a.day) - Number(b.day));
  report(planned.length > 0 && planned.every((x) => /^\d{4}-\d{2}-\d{2}$/.test(x.publish_date)), 'every planned row in content/topical-map.csv has a publish_date');
  const firstFive = planned.slice(0, 5).map((x) => x.publish_date);
  report(firstFive.every((x) => x === '2026-10-26'), 'the first five planned rows are dated 2026-10-26', firstFive.join(','));
  const mondays = [...new Set(planned.map((x) => x.publish_date))];
  report(mondays.every((x) => new Date(x + 'T00:00:00Z').getUTCDay() === 1), 'every planned publish_date is a Monday');
  const perDate = Object.values(planned.reduce((a, x) => ((a[x.publish_date] = (a[x.publish_date] || 0) + 1), a), {}));
  report(perDate.every((n) => n <= 5), 'no Monday holds more than five rows');
  report(real.rows.every((x) => x.money_page.endsWith('/')), 'every money_page in the map has a trailing slash');
}

// ---- next.mjs in batch mode
const bcols = columns;
const brows = [];
for (let d = 1; d <= 12; d++) {
  const rw = mkRow(d, `Batch title ${d}`, d === 1 ? 'published' : 'planned');
  rw.publish_date = d <= 6 ? '2026-10-26' : d <= 11 ? '2026-11-02' : '2026-11-09';
  brows.push(rw);
}
brows[2].status = 'skipped';
const batchMap = path.join(work, 'batch.csv');
writeMap(bcols, brows, batchMap);
const benv = { ...env, ARTICLE_MAP: batchMap };
const brun = (today, ...args) => spawnSync('node', [path.join(here, 'next.mjs'), ...args], { env: { ...benv, ARTICLE_TODAY: today }, encoding: 'utf8' });
r = brun('2026-10-25');
report(r.status === 3, 'next.mjs exits 3 when nothing is due (before the first Monday)', `exit ${r.status}`);
r = brun('2026-10-26');
let out = r.status === 0 ? JSON.parse(r.stdout) : null;
report(out && out.rows.map((x) => x.day).join() === '2,4,5,6' && out.batch_date === '2026-10-26', 'next.mjs returns every due row in day order, skipping skipped and published rows', r.stderr + (out ? out.rows.map((x) => x.day) : ''));
report(out && out.rows[0].slug === 'batch-title-2' && out.rows[0].slug_exists === false && Array.isArray(out.published) && out.prices && out.rows[0].faq_list, 'next.mjs rows carry slug, slug_exists, the lists, the published list and the prices');
r = brun('2026-11-04');
out = JSON.parse(r.stdout);
report(out.rows.map((x) => x.day).join() === '2,4,5,6,7,8,9' && out.due_total === 9 && out.returned === 7 && out.batch_date === '2026-11-02', 'next.mjs caps a batch at 7 rows by default and reports the total due', out.rows.map((x) => x.day).join());
r = brun('2026-11-04', '--max', '3');
out = JSON.parse(r.stdout);
report(out.rows.map((x) => x.day).join() === '2,4,5', 'next.mjs --max limits the batch', out.rows.map((x) => x.day).join());
writeFileSync(path.join(blogDir, 'batch-title-4.md'), '---\n---\n');
r = spawnSync('node', [path.join(here, 'next.mjs')], { env: { ...benv, ARTICLE_TODAY: '2026-10-26', ARTICLE_BLOG: blogDir }, encoding: 'utf8' });
out = JSON.parse(r.stdout);
report(r.status === 0 && out.rows.length === 4 && out.rows.find((x) => x.day === 4).slug_exists === true && out.rows.find((x) => x.day === 5).slug_exists === false, 'a row whose slug already exists is flagged on that row and does not stop the batch', `exit ${r.status}`);

// ---- batch-summary.mjs
{
  const logFile = path.join(work, 'log.md');
  writeFileSync(logFile, [
    '# Article log', '',
    '2026-10-21 | days 1 to 3 | a, b, c | written by hand',
    '2026-10-26 | day 4 | slug-four | published',
    '2026-10-26 | day 5 | slug-five | published',
    '2026-10-26 | day 6 | none | FAILED: official page would not load',
    '2026-11-02 | day 9 | slug-nine | published', ''].join('\n'));
  const sum = (...args) => spawnSync('node', [path.join(here, 'batch-summary.mjs'), ...args], { env: { ...env, ARTICLE_LOG: logFile }, encoding: 'utf8' });
  r = sum('--date', '2026-10-26', '--subject');
  report(r.status === 0 && r.stdout.trim() === 'Guides for the week of 2026-10-26: 2 published, 1 skipped', 'batch-summary --subject gives the commit subject', r.stdout);
  r = sum('--date', '2026-10-26');
  report(/Published: day 4 \(slug-four\), day 5 \(slug-five\)\./.test(r.stdout) && /Skipped: day 6 \(official page would not load\)\./.test(r.stdout), 'batch-summary prints one paragraph with the published and skipped rows', r.stdout);
  r = sum('--date', '2026-12-01');
  report(r.status === 0 && /No log lines/.test(r.stdout), 'batch-summary says so when there are no log lines for the day', r.stdout);
}

rmSync(work, { recursive: true, force: true });
console.log(`\n${passed} passed, ${failed} failed.`);
process.exit(failed ? 1 : 0);
