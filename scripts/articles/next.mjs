// Usage: node scripts/articles/next.mjs [--max N] [--one]
// Default (weekly batch): prints JSON with EVERY planned row whose publish_date is empty or not after
// today (Europe/London), in day order, at most --max rows (default 7). Each row carries `slug` and
// `slug_exists`; a row whose slug already exists is reported, not fatal. Exit code 3 when nothing is due.
// --one: the old behaviour, the single next row as `row`; exit 4 when its slug already exists.
// Only rows with status 'planned' are ever returned: 'published' and 'skipped' rows are ignored.
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readMap, todayLondon, slugFromUrl, slugify, BLOG_DIR } from './csv.mjs';

const args = process.argv.slice(2);
const one = args.includes('--one');
const mi = args.indexOf('--max');
const max = mi >= 0 ? Number(args[mi + 1]) : 7;
if (!Number.isInteger(max) || max < 1) {
  console.error('Usage: node scripts/articles/next.mjs [--max N] [--one]');
  process.exit(2);
}

const today = process.env.ARTICLE_TODAY || todayLondon();
const { rows } = readMap();
const dueAll = rows
  .filter((r) => r.status === 'planned' && (!r.publish_date || r.publish_date <= today))
  .sort((a, b) => Number(a.day) - Number(b.day));
const due = one ? dueAll.slice(0, 1) : dueAll.slice(0, max);

if (!due.length) {
  console.error(`Nothing is due on ${today} (Europe/London).`);
  process.exit(3);
}

// The Monday of the week that contains `today`: the date every article of the batch carries as pubDate.
const mondayOf = (iso) => {
  const d = new Date(iso + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() - ((d.getUTCDay() + 6) % 7));
  return d.toISOString().slice(0, 10);
};

const split = (s, sep) => (s || '').split(sep).map((x) => x.trim()).filter(Boolean);
const shape = (r) => {
  const slug = slugify(r.title);
  return {
    ...r,
    day: Number(r.day),
    slug,
    slug_exists: existsSync(path.join(BLOG_DIR, `${slug}.md`)),
    secondary_keywords_list: split(r.secondary_keywords, ';'),
    outline_list: split(r.outline, '|'),
    faq_list: split(r.faq, '||').map((p) => {
      const [q, ...a] = p.split('::');
      return { q: q.trim(), a: a.join('::').trim() };
    }),
  };
};

if (one && existsSync(path.join(BLOG_DIR, `${slugify(due[0].title)}.md`))) {
  console.error(`Day ${due[0].day}: the slug "${slugify(due[0].title)}" already exists in src/content/blog/. Mark the day skipped with the reason "slug exists": npm run article:skip ${due[0].day} "slug exists"`);
  process.exit(4);
}

const published = rows
  .filter((r) => r.status === 'published')
  .map((r) => ({ day: Number(r.day), title: r.title, pillar: r.pillar, slug: slugFromUrl(r.url), url: r.url }));

const prices = {
  one_to_one_55_min: 'GBP 15',
  english_through_english_55_min: 'GBP 20',
  exam_preparation_24_hours: 'GBP 320',
  group_course_level: 'GBP 298 (50 deposit, then 124 and 124)',
  note: 'These come from content/FACTS.md section 3. No other pound amount unless the row sources name a third party fee with a URL, cited on the same line.',
};

const out = one
  ? { today, row: shape(due[0]), published, prices }
  : {
      today,
      batch_date: mondayOf(today),
      due_total: dueAll.length,
      returned: due.length,
      note: 'Write the rows in day order. Set pubDate to batch_date for every article. Articles written earlier in this session may be linked from later ones even though they are not in `published` yet.',
      rows: due.map(shape),
      published,
      prices,
    };
console.log(JSON.stringify(out, null, 2));
