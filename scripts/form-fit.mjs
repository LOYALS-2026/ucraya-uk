// Proves the pop-in rules in a real browser: iPhone SE size (375x667, scale 2), desktop, all four locales.
//  1. every visible field of the pop-in is on screen without scrolling,
//  2. no input, select or textarea has a computed font size under 16px (iPhone Safari would zoom),
//  3. the pop-in opens from the header/bar Enquire button with the goal prefilled, and Escape closes it,
//  4. the inline and pop-in forms have identical field names.
// Needs a build first: npm run build
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const dist = path.join(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), 'dist');
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.woff': 'font/woff' };
const server = http.createServer(async (req, res) => {
  let file = path.join(dist, decodeURIComponent((req.url || '/').split('?')[0]));
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream' });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' });
let bad = 0;
const fail = (m) => { bad++; console.log('FAIL ' + m); };

const setups = [
  { name: 'iphone-se', ctx: { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true } },
  { name: 'desktop-720', ctx: { viewport: { width: 1280, height: 720 } } },
];
for (const set of setups) {
  for (const loc of ['', '/bg', '/ro', '/pl']) {
    const ctx = await browser.newContext(set.ctx);
    const page = await ctx.newPage();
    await page.goto(`${base}${loc}/courses/oet/`, { waitUntil: 'networkidle' });
    const phone = set.ctx.viewport.width < 768;
    await page.click(phone ? '.sticky-bar [data-enquire]' : '.nav-cta-bar[data-enquire]');
    await page.waitForSelector('#enquiry-modal[open].is-open');
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const dlg = document.querySelector('#enquiry-modal');
      const vh = innerHeight, vw = innerWidth;
      const out = { off: [], small: [], names: [], goal: null, hOverflow: document.documentElement.scrollWidth - innerWidth };
      for (const el of dlg.querySelectorAll('input, select, textarea, button')) {
        const cs = getComputedStyle(el);
        if (el.tagName !== 'BUTTON' && parseFloat(cs.fontSize) < 16) out.small.push(el.name || el.id);
        if (el.type === 'hidden' || el.closest('.hp')) continue;
        const b = el.getBoundingClientRect();
        if (b.width === 0 && b.height === 0) continue;
        if (b.top < -0.5 || b.bottom > vh + 0.5 || b.left < -0.5 || b.right > vw + 0.5) out.off.push((el.name || el.id || el.tagName) + ' bottom=' + Math.round(b.bottom));
      }
      out.goal = (dlg.querySelector('input[name="goal"]:checked') || {}).value || null;
      out.names = [...dlg.querySelectorAll('input, select, textarea')].map((e) => e.name).filter(Boolean).sort();
      const inline = document.querySelector('form.enq-inline');
      out.inlineNames = inline ? [...inline.querySelectorAll('input, select, textarea')].map((e) => e.name).filter(Boolean).sort() : [];
      out.focused = document.activeElement && (document.activeElement.name || document.activeElement.className);
      return out;
    });
    const tag = `${set.name} ${loc || '/en'}`;
    if (r.off.length) fail(`${tag}: fields not fully on screen: ${r.off.join(', ')}`);
    if (r.small.length) fail(`${tag}: font under 16px: ${r.small.join(', ')}`);
    if (r.hOverflow > 0) fail(`${tag}: horizontal scroll ${r.hOverflow}px`);
    if (!r.goal || !/Nursing/.test(r.goal)) fail(`${tag}: goal not prefilled (${r.goal})`);
    if (r.inlineNames.length && JSON.stringify(r.names) !== JSON.stringify(r.inlineNames)) fail(`${tag}: field names differ between pop-in and inline form`);
    // every input on the whole page, not just the pop-in
    const small = await page.evaluate(() => [...document.querySelectorAll('input, select, textarea')].filter((e) => e.type !== 'hidden' && parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.name || e.id));
    if (small.length) fail(`${tag}: page inputs under 16px: ${small.join(', ')}`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(150);
    if (await page.evaluate(() => document.querySelector('#enquiry-modal').open)) fail(`${tag}: Escape did not close the pop-in`);
    console.log(`${tag}: ok=${!r.off.length && !r.small.length} focus=${r.focused}`);
    await ctx.close();
  }
}
// The translation quote form is long (it has file fields), so it is not asked to fit one screen. It must still: use 16px or larger
// fonts, never scroll sideways, lay out in one column on a phone and two on a desktop, and keep the same field names in every locale.
const TQ_PAGES = ['/translation/', '/translation/certified/', '/translation/specialist/'];
let tqNames = null;
for (const set of setups) {
  for (const loc of ['', '/bg', '/ro', '/pl']) {
    const ctx = await browser.newContext(set.ctx);
    const page = await ctx.newPage();
    for (const p of TQ_PAGES) {
      await page.goto(`${base}${loc}${p}`, { waitUntil: 'networkidle' });
      const r = await page.evaluate(() => {
        const f = document.querySelector('form[name="translation-quote"]');
        const els = [...f.querySelectorAll('input, select, textarea')].filter((e) => e.type !== 'hidden' && !e.closest('.hp') && !e.closest('[hidden]'));
        const small = els.filter((e) => parseFloat(getComputedStyle(e).fontSize) < 16).map((e) => e.name || e.id);
        const tall = els.filter((e) => e.type !== 'checkbox' && e.getBoundingClientRect().height < 40).map((e) => e.name || e.id);
        const email = f.querySelector('input[name="email"]').getBoundingClientRect(), name = f.querySelector('input[name="name"]').getBoundingClientRect();
        const names = [...f.querySelectorAll('input, select, textarea')].map((e) => e.name).filter(Boolean).sort();
        return { small, tall, twoCols: Math.abs(email.top - name.top) < 4, names, hOverflow: document.documentElement.scrollWidth - innerWidth, file: f.querySelector('input[type="file"]').getBoundingClientRect().width, formW: f.getBoundingClientRect().width };
      });
      const tag = `${set.name} ${loc || '/en'}${p}`;
      if (r.small.length) fail(`${tag}: translation form font under 16px: ${r.small.join(', ')}`);
      if (r.tall.length) fail(`${tag}: translation form controls under 40px tall: ${r.tall.join(', ')}`);
      if (r.hOverflow > 0) fail(`${tag}: horizontal scroll ${r.hOverflow}px`);
      const phone = set.ctx.viewport.width < 768;
      if (phone && r.twoCols) fail(`${tag}: two columns on a phone`);
      if (!phone && !r.twoCols) fail(`${tag}: single column on a desktop`);
      if (r.file < 200) fail(`${tag}: file field only ${Math.round(r.file)}px wide`);
      if (!tqNames) tqNames = JSON.stringify(r.names);
      else if (JSON.stringify(r.names) !== tqNames) fail(`${tag}: translation form field names differ from the first page checked`);
    }
    console.log(`${set.name} ${loc || '/en'} translation form: checked`);
    await ctx.close();
  }
}
await browser.close();
server.close();
console.log(bad ? `${bad} problem(s).` : 'Pop-in fits the screen, fonts are 16px or more, field names match; translation form fonts, columns and field names are right.');
process.exit(bad ? 1 : 0);
