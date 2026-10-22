// Runs after the Astro build and Pagefind.
// 1. Copies sitemap-index.xml to sitemap.xml so both addresses work (Search Console was given /sitemap.xml).
// 2. On a Netlify production build, tells IndexNow (Bing, Yandex, Naver and the engines behind several AI
//    assistants) which pages changed. Google does not use IndexNow; its sitemap is read on its own schedule.
// A failed ping never fails the build.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';

const DIST = process.env.DIST || 'dist';
const HOST = 'ucraya.uk';
const KEY = '0eecb4008632bd5e569866fef5cfaba4'; // IndexNow key; the matching file is public/<key>.txt. Not a secret.

const index = DIST + '/sitemap-index.xml';
if (existsSync(index)) {
  writeFileSync(DIST + '/sitemap.xml', readFileSync(index));
  console.log('postbuild: sitemap.xml written from sitemap-index.xml');
} else {
  console.log('postbuild: no sitemap-index.xml found, nothing copied');
}

const production = process.env.NETLIFY === 'true' && process.env.CONTEXT === 'production';
if (!production) {
  console.log('postbuild: not a Netlify production build, IndexNow ping skipped');
  process.exit(0);
}
try {
  const xml = readFileSync(DIST + '/sitemap-0.xml', 'utf8');
  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]).filter((u) => u.includes(HOST));
  if (!urls.length) { console.log('postbuild: no URLs in sitemap-0.xml'); process.exit(0); }
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: HOST, key: KEY, keyLocation: 'https://' + HOST + '/' + KEY + '.txt', urlList: urls.slice(0, 10000) }),
    signal: controller.signal,
  });
  clearTimeout(timer);
  console.log('postbuild: IndexNow answered ' + res.status + ' for ' + urls.length + ' URLs');
} catch (e) {
  console.log('postbuild: IndexNow ping failed, build continues: ' + (e && e.message));
}
