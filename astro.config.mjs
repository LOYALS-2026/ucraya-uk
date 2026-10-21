import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';
import { readFileSync, existsSync } from 'node:fs';
import matter from 'gray-matter';

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
      // Guides carry a lastmod: the updated date, else the publication date.
      serialize(item) {
        const m = /\/blog\/([a-z0-9-]+)\/$/.exec(item.url);
        const file = m && `./src/content/blog/${m[1]}.md`;
        if (file && existsSync(file)) {
          const d = matter(readFileSync(file, 'utf8')).data;
          const when = d.updatedDate ?? d.pubDate;
          if (when) item.lastmod = new Date(when).toISOString();
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
