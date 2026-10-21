// Prints the next article due as JSON. Exit code 3 when nothing is due.
import { readMap, todayLondon, slugFromUrl } from './csv.mjs';

const today = process.env.ARTICLE_TODAY || todayLondon();
const { rows } = readMap();
const due = rows
  .filter((r) => r.status === 'planned' && (!r.publish_date || r.publish_date <= today))
  .sort((a, b) => Number(a.day) - Number(b.day))[0];

if (!due) {
  console.error(`Nothing is due on ${today} (Europe/London).`);
  process.exit(3);
}

const split = (s, sep) => (s || '').split(sep).map((x) => x.trim()).filter(Boolean);
const published = rows
  .filter((r) => r.status === 'published')
  .map((r) => ({ day: Number(r.day), title: r.title, pillar: r.pillar, slug: slugFromUrl(r.url), url: r.url }));

const out = {
  today,
  row: {
    ...due,
    day: Number(due.day),
    secondary_keywords_list: split(due.secondary_keywords, ';'),
    outline_list: split(due.outline, '|'),
    faq_list: split(due.faq, '||').map((p) => {
      const [q, ...a] = p.split('::');
      return { q: q.trim(), a: a.join('::').trim() };
    }),
  },
  published,
  prices: {
    one_to_one_55_min: 'GBP 15',
    english_through_english_55_min: 'GBP 20',
    exam_preparation_24_hours: 'GBP 320',
    group_course_level: 'GBP 298 (50 deposit, then 124 and 124)',
    note: 'These come from content/FACTS.md section 3. No other pound amount unless the row sources name a third party fee with a URL, cited on the same line.',
  },
};
console.log(JSON.stringify(out, null, 2));
