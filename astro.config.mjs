import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import tailwindcss from '@tailwindcss/vite';

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
      i18n: {
        defaultLocale: 'en',
        locales: { en: 'en', bg: 'bg', ro: 'ro', pl: 'pl' },
      },
    }),
  ],
  vite: { plugins: [tailwindcss()] },
});
