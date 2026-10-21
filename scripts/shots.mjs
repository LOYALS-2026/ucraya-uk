// Screenshots of key pages at phone and desktop width into verify/shots/.
// Serves dist/ with a tiny static server. Needs a build first: npm run build
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'verify', 'shots');
await mkdir(out, { recursive: true });

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.xml': 'application/xml', '.txt': 'text/plain', '.woff': 'font/woff', '.woff2': 'font/woff2',
};
const server = http.createServer(async (req, res) => {
  let p = decodeURIComponent((req.url || '/').split('?')[0]);
  let file = path.join(dist, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) {
    res.writeHead(404, { 'content-type': 'text/html' });
    res.end(await readFile(path.join(dist, '404.html')).catch(() => 'Not found'));
    return;
  }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;

const pages = (process.env.PAGES ? process.env.PAGES.split(',') : [
  ['home', '/'], ['pricing', '/pricing/'], ['course-oet', '/courses/oet/'], ['placement', '/placement-test/'],
  ['blog', '/blog/'], ['contact', '/contact/'],
]);
const list = pages.map((p) => (Array.isArray(p) ? p : [p.replace(/\W+/g, '-').replace(/^-|-$/g, '') || 'home', p]));
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let overflow = 0;
for (const width of [375, 1280]) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 500 ? 800 : 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, url] of list) {
    await page.goto(base + url, { waitUntil: 'networkidle' });
    const wide = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (wide > 0) { overflow++; console.log(`HORIZONTAL SCROLL ${wide}px at ${width}: ${url}`); }
    await page.screenshot({ path: path.join(out, `${name}-${width}.png`), fullPage: true });
  }
  // The language dropdown open, and the pop-in enquiry open (viewport shots, not full page).
  await page.goto(base + '/courses/oet/', { waitUntil: 'networkidle' });
  await page.click('details.lang summary');
  await page.waitForTimeout(250);
  await page.screenshot({ path: path.join(out, `lang-open-${width}.png`) });
  await page.keyboard.press('Escape');
  await page.click(width < 768 ? '.sticky-bar [data-enquire]' : '.nav-cta-bar[data-enquire]');
  await page.waitForTimeout(500);
  await page.screenshot({ path: path.join(out, `modal-${width}.png`) });
  const modalFit = await page.evaluate(() => {
    const card = document.querySelector('#enquiry-modal .modal-card');
    const body = document.querySelector('#enquiry-modal .modal-body');
    return { cardBottom: Math.round(card.getBoundingClientRect().bottom), vh: innerHeight, bodyScrolls: body.scrollHeight > body.clientHeight + 1 };
  });
  console.log(`modal at ${width}: ${JSON.stringify(modalFit)}`);
  await ctx.close();
}
await browser.close();
server.close();
console.log(`Screenshots written to verify/shots/. Pages with horizontal scroll: ${overflow}.`);
process.exit(overflow ? 1 : 0);
