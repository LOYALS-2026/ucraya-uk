// Usage: node scripts/articles/mark-published.mjs <day> <slug>
import { existsSync } from 'node:fs';
import path from 'node:path';
import { readMap, writeMap, BLOG_DIR, SITE } from './csv.mjs';

const [day, slug] = process.argv.slice(2);
if (!day || !/^[a-z0-9-]+$/.test(slug || '')) {
  console.error('Usage: node scripts/articles/mark-published.mjs <day> <slug>');
  process.exit(2);
}
if (!existsSync(path.join(BLOG_DIR, `${slug}.md`))) {
  console.error(`No article file src/content/blog/${slug}.md`);
  process.exit(1);
}
const { columns, rows } = readMap();
const row = rows.find((r) => String(r.day) === String(day));
if (!row) {
  console.error(`No row for day ${day}`);
  process.exit(1);
}
row.status = 'published';
row.url = `${SITE}/blog/${slug}/`;
writeMap(columns, rows);
console.log(`Day ${day} marked published: ${row.url}`);
