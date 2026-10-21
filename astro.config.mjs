import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import matter from 'gray-matter';

const slug = (t) => String(t).toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
/** Newest publication or update date of the guides (of one goal when a goal slug is given), as an ISO string. */
function latest(goal) {
  const dir = './src/content/blog';
  if (!existsSync(dir)) return '';
  let best = 0;
  for (const f of readdirSync(dir).filter((n) => n.endsWith('.md'))) {
    const d = matter(readFileSync(`${dir}/${f}`, 'utf8')).data;
    if (d.draft || (goal && slug(d.pillar) !== goal)) continue;
    const t = new Date(d.updatedDate ?? d.pubDate).getTime();
    if (t > best) best = t;
  }
  return best ? new Date(best).toISOString() : '';
}

export default defineConfig({
  site: 'https://ucraya.uk',
  output: 'static',
  trailingSlash: 'always',
  build: { format: 'directory', inlineStylesheets: 'never' },
  i18n: {
    defaultLocale: 'en',
    locales: ['en', 'bg', 'ro', 'pl'],
    routing: { prefixDefaultLocale: false },
  },
  integrations: [
    sitemap({
      filter: (page) => !/\/thank-you\/$/.test(page) && !/\/404\/$/.test(page),
      customPages: ['https://ucraya.uk/llms.txt', 'https://ucraya.uk/llms-full.txt'],
      // Guides carry a lastmod: the updated date, else the publication date. The blog hub, its pages, the question bank and
      // each goal hub carry the newest date of the guides they list.
      serialize(item) {
        const m = /\/blog\/([a-z0-9-]+)\/$/.exec(item.url);
        const file = m && `./src/content/blog/${m[1]}.md`;
        if (file && existsSync(file)) {
          const d = matter(readFileSync(file, 'utf8')).data;
          const when = d.updatedDate ?? d.pubDate;
          if (when) item.lastmod = new Date(when).toISOString();
          return item;
        }
        const hub = /\/blog\/(pillar\/([a-z0-9-]+)\/)?(page\/\d+\/)?$/.exec(item.url) || /\/blog\/questions\/$/.exec(item.url);
        if (hub) {
          const when = latest(hub[2]);
          if (when) item.lastmod = when;
        }
        return item;
      },
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', bg: 'bg', ro: 'ro', pl: 'pl' },
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
