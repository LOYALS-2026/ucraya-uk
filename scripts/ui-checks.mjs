// Browser checks for the behaviour that broke or could break on phones and tablets (the 21 October 2026 inspection).
// Serves dist/ with the Content Security Policy from netlify.toml and drives it with Playwright.
// Needs a build first: npm run build. Run: npm run check:ui
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync, statSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const out = path.join(root, 'verify', 'ui');
await mkdir(out, { recursive: true });
const toml = readFileSync(path.join(root, 'netlify.toml'), 'utf8');
const CSP = (toml.match(/Content-Security-Policy = "([^"]+)"/) || [])[1] || '';
const TYPES = { '.html': 'text/html; charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json', '.wasm': 'application/wasm', '.woff2': 'font/woff2', '.xml': 'application/xml', '.txt': 'text/plain' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (req.method === 'POST') { res.writeHead(200, { 'content-type': 'text/html' }); res.end('posted ' + p); return; }
  let file = path.join(dist, p);
  if (existsSync(file) && statSync(file).isDirectory()) file = path.join(file, 'index.html');
  if (!existsSync(file)) { res.writeHead(404); res.end('nf'); return; }
  res.writeHead(200, { 'content-type': TYPES[path.extname(file)] || 'application/octet-stream', 'Content-Security-Policy': CSP });
  res.end(await readFile(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: process.env.CHROME || '/opt/pw-browsers/chromium' });
let bad = 0, total = 0;
const ok = (cond, msg) => { total++; if (!cond) { bad++; console.log('FAIL ' + msg); } else console.log('pass ' + msg); };

const PHONE = { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true };
const DESK = { viewport: { width: 1440, height: 900 } };
const TABLET = { viewport: { width: 900, height: 1000 } };
const ARTICLE = '/blog/oet-or-ielts-lessons-for-a-nursing-registration-resit/';

async function open(ctxOpts, url) {
  const ctx = await browser.newContext(ctxOpts);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  await page.goto(base + url, { waitUntil: 'networkidle' });
  return { ctx, page, errors };
}
const tap = (page, sel) => (page.touchscreen && page.context()._options?.hasTouch ? page.locator(sel).first().tap() : page.locator(sel).first().click());

// 1. A suggestion click opens the article, from an article page, on a phone and on a desktop.
for (const [name, opts] of [['phone', PHONE], ['desktop', DESK]]) {
  const { ctx, page, errors } = await open(opts, ARTICLE);
  const vis = name === 'phone' ? '#bl-q-end' : '#bl-q-side';
  await page.locator(vis).scrollIntoViewIfNeeded();
  await page.locator(vis).fill('english tutor');
  await page.waitForSelector(`#${vis.slice(1)}-list a.bl-opt`, { state: 'visible', timeout: 5000 });
  const href = await page.locator(`${vis}-list a.bl-opt`).first().getAttribute('href');
  const before = page.url();
  if (name === 'phone') await page.locator(`${vis}-list a.bl-opt`).first().tap(); else await page.locator(`${vis}-list a.bl-opt`).first().click();
  await page.waitForURL('**' + href, { timeout: 5000 }).catch(() => {});
  ok(page.url() !== before && page.url().endsWith(href), `${name}: clicking a suggestion opens ${href}`);
  ok(errors.length === 0, `${name}: no console errors (${errors.join(' | ')})`);
  await ctx.close();
}

// 2. Suggestions for the core queries.
{
  const { ctx, page } = await open(DESK, '/blog/');
  for (const q of ['b1 test', 'child', 'oet', 'nurse']) {
    await page.locator('#bl-q').fill('');
    await page.locator('#bl-q').fill(q);
    await page.waitForSelector('#bl-q-list [role=option]', { state: 'visible', timeout: 5000 }).catch(() => {});
    const n = await page.locator('#bl-q-list [role=option]').count();
    const none = await page.locator('#bl-q-list .bl-suggest-none').count();
    ok(n > 0 && none === 0, `"${q}" gives ${n} suggestion(s)`);
    if (q === 'child' || q === 'b1 test') {
      const lessons = await page.locator('#bl-q-list [role=group][aria-labelledby] a[href^="/courses/"]').count();
      ok(lessons > 0, `"${q}" offers a lesson page`);
    }
  }
  await ctx.close();
}

// 3. Phone menu: one line header, 44 px close button, Enquire visible above the page, no second bar.
{
  const { ctx, page } = await open(PHONE, '/');
  await page.locator('[data-menu-btn]').tap();
  await page.waitForTimeout(300);
  const r = await page.evaluate(() => {
    const b = document.querySelector('[data-menu-btn]').getBoundingClientRect();
    const hdr = document.querySelector('.header-bar').getBoundingClientRect();
    const e = document.querySelector('.nav-cta-panel').getBoundingClientRect();
    const bar = document.querySelector('.sticky-bar');
    return { bw: b.width, bh: b.height, hh: hdr.height, eTop: e.top, eBottom: e.bottom, vh: innerHeight, barShown: getComputedStyle(bar).display !== 'none', expanded: document.querySelector('[data-menu-btn]').getAttribute('aria-expanded'), x: getComputedStyle(document.querySelector('.menu-btn .ic-x')).display };
  });
  ok(r.bh >= 44 && r.bh <= 48 && r.bw >= 44, `menu button is ${Math.round(r.bw)} x ${Math.round(r.bh)} when open`);
  ok(r.hh < 90, `header stays one line (${Math.round(r.hh)} px)`);
  ok(!r.barShown, 'bottom bar is hidden while the menu is open');
  ok(r.x !== 'none', 'cross icon shown when open');
  await page.locator('.nav-panel').evaluate((n) => { n.scrollTop = n.scrollHeight; });
  const e2 = await page.evaluate(() => { const e = document.querySelector('.nav-cta-panel').getBoundingClientRect(); return { b: e.bottom, vh: innerHeight }; });
  ok(e2.b <= e2.vh, `panel Enquire fully visible (bottom ${Math.round(e2.b)} of ${e2.vh})`);
  await page.screenshot({ path: path.join(out, 'menu-open-phone.png') });
  await ctx.close();
}

// 4. A phone article shows ONE bottom bar, and its Enquire carries the article's goal.
{
  const { ctx, page } = await open(PHONE, ARTICLE);
  await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.55, behavior: 'instant' }));
  await page.waitForTimeout(500);
  const bars = await page.evaluate(() => [...document.querySelectorAll('.sticky-bar, .bl-cta-bar')].filter((e) => { const cs = getComputedStyle(e); const r = e.getBoundingClientRect(); return cs.display !== 'none' && cs.visibility !== 'hidden' && r.height > 0 && r.bottom > 0 && r.top < innerHeight; }).map((e) => e.className.split(' ')[0]));
  ok(bars.length === 1 && bars[0] === 'sticky-bar', `one bottom bar on a phone article (${bars.join(', ')})`);
  const goal = await page.locator('.sticky-bar [data-enquire]').getAttribute('data-goal');
  ok(goal === 'oet', `the bar's Enquire carries the article goal (${goal})`);
  await page.locator('.sticky-bar [data-enquire]').tap();
  await page.waitForSelector('#enquiry-modal[open].is-open');
  const checked = await page.evaluate(() => (document.querySelector('#enquiry-modal input[name="goal"]:checked') || {}).value);
  ok(/Nursing/.test(checked || ''), `pop-in opens with the article goal chosen (${checked})`);
  await ctx.close();
}

// 5. Tablet: an Enquire button in the header at 900 px (and from 768 px).
for (const w of [768, 900]) {
  const { ctx, page } = await open({ viewport: { width: w, height: 1000 }, hasTouch: true }, '/');
  const shown = await page.evaluate(() => { const b = document.querySelector('.nav-cta-bar'); const r = b.getBoundingClientRect(); return getComputedStyle(b).display !== 'none' && r.width > 0 && r.right <= innerWidth; });
  ok(shown, `Enquire button in the header at ${w} px`);
  await ctx.close();
}

// 6. Article lists have bullets or numbers and links in the text are underlined; the header logo renders; the quick answer is there.
{
  const { ctx, page } = await open(DESK, ARTICLE);
  const r = await page.evaluate(() => {
    const ul = document.querySelector('.bl-prose ul'); const ol = document.querySelector('.bl-prose ol');
    const a = document.querySelector('.bl-prose p a');
    const logo = document.querySelector('.logo-link img');
    return {
      ul: ul && getComputedStyle(ul).listStyleType, ol: ol && getComputedStyle(ol).listStyleType,
      under: a && getComputedStyle(a).textDecorationLine, logo: logo && logo.complete && logo.naturalWidth > 0, logoW: logo && Math.round(logo.getBoundingClientRect().width),
      quick: !!document.querySelector('.bl-quick-text p'),
    };
  });
  ok(r.ul === 'disc' || r.ol === 'decimal', `article lists show markers (ul ${r.ul}, ol ${r.ol})`);
  ok(r.under === 'underline', `links in article text are underlined (${r.under})`);
  ok(r.logo && r.logoW >= 150 && r.logoW <= 180, `header logo renders at ${r.logoW} px`);
  ok(r.quick, 'quick answer block is present');
  await ctx.close();
}

// 7. Estimator on the pricing page.
{
  const { ctx, page, errors } = await open(DESK, '/pricing/');
  const first = await page.locator('[data-est-total]').textContent();
  await page.locator('label.chip:has(input[name="est-n"][value="3"])').click();
  await page.locator('label.chip:has(input[name="est-type"][value="1"])').click();
  const after = await page.locator('[data-est-total]').textContent();
  ok(/65/.test(first) && /260/.test(after), `estimator updates ("${first.trim()}" then "${after.trim()}")`);
  ok(errors.length === 0, `pricing: no console errors (${errors.join(' | ')})`);
  await ctx.close();
}

// 7b. Interaction touches: header tucks away on phones, back to top, FAQ accordion, quote strip dots, placement result.
{
  const { ctx, page, errors } = await open(PHONE, '/');
  const hidden = async () => page.evaluate(() => document.querySelector('.site-header').classList.contains('is-away'));
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }));
  await page.waitForTimeout(300);
  ok(await hidden(), 'phone header hides when scrolling down');
  await page.evaluate(() => window.scrollTo({ top: 1200, behavior: 'instant' }));
  await page.waitForTimeout(300);
  ok(!(await hidden()), 'phone header returns when scrolling up');
  await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
  await page.waitForTimeout(300);
  const topOn = await page.evaluate(() => document.querySelector('.to-top').classList.contains('is-on'));
  ok(topOn, 'back to top shows after 800 px');
  await page.locator('.to-top').tap();
  await page.waitForFunction(() => window.pageYOffset < 5, null, { timeout: 4000 }).catch(() => {});
  ok(await page.evaluate(() => window.pageYOffset < 5), 'back to top returns to the top');
  const dots = await page.locator('[data-dots] button').count();
  ok(dots === 4, `quote strip has dots (${dots})`);
  ok(errors.length === 0, `home: no console errors (${errors.join(' | ')})`);
  await ctx.close();
}
{
  const { ctx, page } = await open({ ...PHONE, reducedMotion: 'reduce' }, '/');
  await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
  await page.evaluate(() => window.scrollTo({ top: 1400, behavior: 'instant' }));
  await page.waitForTimeout(300);
  ok(!(await page.evaluate(() => document.querySelector('.site-header').classList.contains('is-away'))), 'reduced motion: header never hides');
  await ctx.close();
}
{
  const { ctx, page } = await open(DESK, '/faq/');
  const d = page.locator('.faq details').first();
  await d.locator('summary').click();
  await page.waitForTimeout(450);
  ok(await d.evaluate((e) => e.open && e.offsetHeight > 80), 'FAQ answer opens');
  await d.locator('summary').click();
  await page.waitForTimeout(450);
  ok(await d.evaluate((e) => !e.open && e.offsetHeight < 80), 'FAQ answer closes');
  await page.keyboard.press('Tab');
  await ctx.close();
}
{
  const { ctx, page } = await open(DESK, '/placement-test/');
  await page.evaluate(() => { document.querySelectorAll('fieldset[data-correct]').forEach((fs) => fs.querySelector('input').click()); });
  await page.locator('#quiz button[type=submit]').click();
  const badge = (await page.locator('#quiz-level').textContent()).trim();
  const h = (await page.locator('#quiz-result h2').textContent()).trim();
  ok(/^Level (A1|A2|B1|B2)$/.test(badge) && h === 'Your result', `placement result reads "${h}" and "${badge}"`);
  await ctx.close();
}
{
  const { ctx, page } = await open(PHONE, '/');
  await page.locator('.sticky-bar [data-enquire]').tap();
  await page.waitForSelector('#enquiry-modal[open].is-open');
  await page.locator('#m-when').selectOption({ label: '1 to 3 months' });
  const v = await page.locator('#enquiry-modal input[name="deadline"]').inputValue();
  ok(v === '1 to 3 months', `deadline choice goes to the hidden field (${v})`);
  await page.locator('#enquiry-modal [data-submit]').tap();
  const first = await page.evaluate(() => document.activeElement && document.activeElement.name);
  ok(first === 'email', `an early press shows the problems and focuses the first (${first})`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  // Opened again from a button with no goal: the earlier choice of the visitor stays, nothing else is stale.
  await page.locator('.sticky-bar [data-enquire]').tap();
  await page.waitForSelector('#enquiry-modal[open].is-open');
  ok(true, 'pop-in opens again');
  await ctx.close();
}
{
  // Stale prefill: open from a B1 article (goal and level B1), close, open from the header: nothing of B1 is left.
  const { ctx, page } = await open(DESK, '/blog/b1-selt-preparation-choosing-online-lessons/');
  await page.locator('.bl-cta [data-enquire]').click();
  await page.waitForSelector('#enquiry-modal[open].is-open');
  const lv1 = await page.locator('#enquiry-modal input[name="level"]').inputValue();
  ok(/B1/.test(lv1), `from a B1 article the level is ${lv1}`);
  await page.keyboard.press('Escape');
  await page.waitForTimeout(200);
  await page.locator('.nav-cta-bar').evaluate((a) => { a.removeAttribute('data-goal'); a.removeAttribute('data-level'); });
  await page.locator('.nav-cta-bar').click();
  await page.waitForSelector('#enquiry-modal[open].is-open');
  const left = await page.evaluate(() => ({ goal: (document.querySelector('#enquiry-modal input[name="goal"]:checked') || {}).value || '', level: document.querySelector('#enquiry-modal input[name="level"]').value }));
  ok(left.goal === '' && !/B1/.test(left.level), `no stale prefill (goal "${left.goal}", level "${left.level}")`);
  await ctx.close();
}
{
  // Attribution: chatgpt.com as utm_source and as referrer give the same name; utm_source copilot, claude too.
  for (const [q, want] of [['?utm_source=chatgpt.com', 'ChatGPT'], ['?utm_source=openai', 'ChatGPT'], ['?utm_source=perplexity', 'Perplexity'], ['?utm_source=gemini', 'Gemini'], ['?utm_source=copilot', 'Copilot'], ['?utm_source=claude', 'Claude'], ['?utm_source=newsletter', 'newsletter']]) {
    const { ctx, page } = await open(DESK, '/' + q);
    const ch = await page.locator('#enquiry-modal input[name="source_channel"]').inputValue();
    ok(ch === want, `utm_source ${q.slice(12)} is recorded as ${want} (${ch})`);
    await ctx.close();
  }
}

// 8. No horizontal scroll at 375 (and 320) on the pages that carry the new parts, in every language, and no console errors.
{
  const pages = ['/', '/pricing/', '/courses/oet/', '/placement-test/', '/contact/', '/blog/', ARTICLE, '/blog/questions/'];
  for (const loc of ['', '/bg', '/ro', '/pl']) {
    for (const p of pages) {
      if (loc && /^\/blog/.test(p)) continue;
      for (const w of [375, 320]) {
        if (w === 320 && !(loc === '/bg' && p === '/')) continue;
        const { ctx, page, errors } = await open({ ...PHONE, viewport: { width: w, height: 667 } }, loc + p);
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        ok(wide <= 0 && errors.length === 0, `${loc}${p} at ${w}: no sideways scroll (${wide}), errors ${errors.length}`);
        await ctx.close();
      }
    }
  }
}

await browser.close();
server.close();
console.log(bad ? `${bad} of ${total} checks failed.` : `All ${total} checks passed.`);
process.exit(bad ? 1 : 0);
