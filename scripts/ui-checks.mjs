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
let lastPost = null;
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent((req.url || '/').split('?')[0]);
  if (req.method === 'POST') {
    // Keep the last post (body as latin1 text) so a check can see what a form really sent, files included.
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => { lastPost = { url: p, type: req.headers['content-type'] || '', body: Buffer.concat(chunks).toString('latin1') }; res.writeHead(200, { 'content-type': 'text/html' }); res.end('posted ' + p); });
    return;
  }
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
  ok(r.logo && r.logoW >= 195 && r.logoW <= 205, `header logo (the original artwork) renders at ${r.logoW} px on desktop`);
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

// 9. Floating dock (owner feedback, 21 Oct evening): the footer strip is gone; from 768 px an Enquire and WhatsApp dock appears after scrolling,
// never over the back to top button, hides at the footer and while a search list is open; on a phone it is never drawn.
{
  for (const [w, h] of [[1280, 800], [900, 900]]) {
    const { ctx, page, errors } = await open({ viewport: { width: w, height: h } }, '/courses/oet/');
    const dockState = () => page.evaluate(() => {
      const c = document.querySelector('[data-dock-cta]'); const cs = getComputedStyle(c); const r = c.getBoundingClientRect(); const t = document.querySelector('.to-top').getBoundingClientRect();
      const e = c.querySelector('[data-enquire]'); const wa = c.querySelector('.btn-whatsapp');
      return { shown: cs.visibility === 'visible' && Number(cs.opacity) > 0.95, on: c.classList.contains('is-on'), r, t, enq: !!e, goal: e && e.getAttribute('data-goal'), eh: e && e.getBoundingClientRect().height, wh: wa && wa.getBoundingClientRect().height, wa: !!wa, right: innerWidth - r.right };
    });
    ok(!(await page.evaluate(() => !!document.querySelector('.footer-strip'))), `${w}: the footer strip is gone`);
    ok(!(await dockState()).shown, `${w}: no dock at the top of the page`);
    await page.evaluate(() => window.scrollTo({ top: 900, behavior: 'instant' }));
    await page.waitForFunction(() => { const c = document.querySelector('[data-dock-cta]'); return c.classList.contains('is-on') && Number(getComputedStyle(c).opacity) > 0.95; }, null, { timeout: 5000 }).catch(() => {});
    const d = await dockState();
    ok(d.shown && d.enq && d.wa, `${w}: an Enquire control and WhatsApp show in the dock after scrolling`);
    ok(d.eh >= 43.5 && d.wh >= 43.5, `${w}: dock buttons are 44 px tall (${Math.round(d.eh)}, ${Math.round(d.wh)})`);
    ok(d.goal === 'oet', `${w}: the dock's Enquire carries the page goal (${d.goal})`);
    ok(d.t.left >= d.r.right, `${w}: the dock sits left of the back to top button without overlap`);
    ok(Math.round(d.t.right) <= w - 23 && d.t.right > d.r.right, `${w}: dock and back to top sit 24 px from the right edge`);
    await page.locator('[data-dock-cta] [data-enquire]').click();
    await page.waitForSelector('#enquiry-modal[open].is-open');
    const goal = await page.evaluate(() => (document.querySelector('#enquiry-modal input[name="goal"]:checked') || {}).value || '');
    ok(/OET/i.test(goal), `${w}: the dock's Enquire opens the pop-in with the course goal (${goal})`);
    const covered = await page.evaluate(() => { const c = document.querySelector('[data-dock-cta]'); const r = c.getBoundingClientRect(); const el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return !!(el && el.closest('[data-dock-cta]')); });
    ok(!covered, `${w}: the pop-in is above the dock`);
    await page.keyboard.press('Escape');
    await page.waitForTimeout(250);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }));
    await page.waitForFunction(() => !document.querySelector('[data-dock-cta]').classList.contains('is-on'), null, { timeout: 5000 }).catch(() => {});
    ok(!(await dockState()).on, `${w}: the dock steps aside when the footer is on screen`);
    ok(errors.length === 0, `${w}: dock page has no console errors (${errors.join(' | ')})`);
    await ctx.close();
  }
  // the dock must not cover the slim article bar or the search list on an article
  {
    const { ctx, page } = await open({ viewport: { width: 1280, height: 800 } }, ARTICLE);
    await page.evaluate(() => window.scrollTo({ top: document.documentElement.scrollHeight * 0.45, behavior: 'instant' }));
    await page.waitForFunction(() => document.querySelector('[data-bl-cta]').classList.contains('is-on'), null, { timeout: 5000 }).catch(() => {});
    await page.waitForTimeout(600);
    const o = await page.evaluate(() => { const b = document.querySelector('[data-bl-cta]').getBoundingClientRect(); const c = document.querySelector('[data-dock-cta]'); const r = c.getBoundingClientRect(); return { on: c.classList.contains('is-on'), overlap: r.bottom > b.top && r.top < b.bottom, barTop: b.top, dockBottom: r.bottom }; });
    ok(o.on && !o.overlap, `article: the dock sits above the slim bar (dock bottom ${Math.round(o.dockBottom)}, bar top ${Math.round(o.barTop)})`);
    await page.locator('#bl-q-side').fill('english');
    await page.waitForSelector('#bl-q-side-list a.bl-opt', { state: 'visible', timeout: 5000 });
    await page.waitForFunction(() => !document.querySelector('[data-dock-cta]').classList.contains('is-on'), null, { timeout: 3000 }).catch(() => {});
    ok(!(await page.evaluate(() => document.querySelector('[data-dock-cta]').classList.contains('is-on'))), 'article: the dock hides while a search list is open');
    await ctx.close();
  }
  {
    const { ctx, page } = await open(PHONE, '/courses/oet/');
    await page.evaluate(() => window.scrollTo({ top: 1500, behavior: 'instant' }));
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => { const c = document.querySelector('[data-dock-cta]'); const cs = getComputedStyle(c); return { display: cs.display, on: c.classList.contains('is-on') }; });
    ok(r.display === 'none' && !r.on, `375: the dock is absent on a phone (display ${r.display})`);
    await ctx.close();
  }
}

// 10. Search popover: a floating glass list under the field, never clipped, never scrolling sideways (article sidebar, article end, hub, pillar page).
{
  const cases = [
    ['article 375', PHONE, ARTICLE, '#bl-q-end'], ['article 768', { viewport: { width: 768, height: 900 } }, ARTICLE, '#bl-q-end'], ['article 1280', { viewport: { width: 1280, height: 800 } }, ARTICLE, '#bl-q-side'],
    ['hub 1280', { viewport: { width: 1280, height: 800 } }, '/blog/', '#bl-q'], ['hub 375', PHONE, '/blog/', '#bl-q'],
    ['pillar 1280', { viewport: { width: 1280, height: 800 } }, '/blog/pillar/passing-a-nursing-english-resit/', '#bl-q'], ['pillar 375', PHONE, '/blog/pillar/passing-a-nursing-english-resit/', '#bl-q'],
  ];
  for (const [label, opts, url, box] of cases) {
    for (const q of ['english', 'b1']) {
      const { ctx, page, errors } = await open(opts, url);
      await page.locator(box).scrollIntoViewIfNeeded();
      await page.locator(box).fill(q);
      await page.waitForSelector(`${box}-list a.bl-opt`, { state: 'visible', timeout: 5000 });
      await page.waitForTimeout(250);
      const r = await page.evaluate((box) => {
        const list = document.querySelector(box + '-list'); const field = list.parentElement; const f = field.getBoundingClientRect(); const l = list.getBoundingClientRect(); const cs = getComputedStyle(list);
        const clip = []; for (let n = field; n && n !== document.body && n !== document.documentElement; n = n.parentElement) { const c = getComputedStyle(n); if (c.overflowX !== 'visible' || c.overflowY !== 'visible') clip.push((n.className || n.tagName) + ' ' + c.overflowX + '/' + c.overflowY); }
        const side = document.querySelector('.bl-side'); const rows = [...list.querySelectorAll('.bl-opt')];
        return { fw: f.width, lw: l.width, ll: l.left - f.left, sideways: list.scrollWidth - list.clientWidth, ox: cs.overflowX, oy: cs.overflowY, h: l.height, vh: innerHeight, clip, radius: cs.borderTopLeftRadius, blur: cs.backdropFilter || cs.webkitBackdropFilter, sideOverflow: side ? getComputedStyle(side).overflow : 'visible', rows: rows.length, oneLine: rows.every((a) => a.getBoundingClientRect().height < 80), inView: l.left >= 0 && l.right <= innerWidth, pageX: document.documentElement.scrollWidth - innerWidth };
      }, box);
      ok(Math.abs(r.lw - r.fw) < 1 && Math.abs(r.ll) < 1, `${label} "${q}": the list is as wide as the input plus the button (${Math.round(r.lw)} / ${Math.round(r.fw)})`);
      ok(r.sideways <= 0 && r.ox === 'hidden' && r.oy === 'auto', `${label} "${q}": no sideways scroll in the list (${r.sideways}, ${r.ox}/${r.oy})`);
      ok(r.clip.length === 0 && r.sideOverflow === 'visible', `${label} "${q}": nothing around the list clips it (${r.clip.join('; ') || 'none'})`);
      ok(r.h <= r.vh * 0.6 + 1 && r.inView && r.pageX <= 0, `${label} "${q}": at most 60% of the screen and inside it (${Math.round(r.h)} of ${r.vh})`);
      ok(r.radius === '16px' && /blur/.test(r.blur || ''), `${label} "${q}": 16 px radius and glass blur (${r.radius}, ${r.blur})`);
      ok(r.rows > 0 && r.oneLine, `${label} "${q}": ${r.rows} compact rows (at most two lines)`);
      if (q === 'english' && label === 'article 1280') {
        await page.screenshot({ path: path.join(out, 'search-popover-1280.png') });
        await page.keyboard.press('Escape');
        ok(await page.evaluate((b) => document.querySelector(b + '-list').hidden, box), `${label}: Escape closes the list`);
        await page.locator(box).fill('english');
        await page.waitForSelector(`${box}-list a.bl-opt`, { state: 'visible', timeout: 5000 });
        await page.mouse.click(300, 400);
        ok(await page.evaluate((b) => document.querySelector(b + '-list').hidden, box), `${label}: a press outside closes the list`);
      }
      ok(errors.length === 0, `${label} "${q}": no console errors (${errors.join(' | ')})`);
      await ctx.close();
    }
  }
}

// 11. Hero: headline without hyphenation and with a fixed break, reveal, living lesson, tilt, calm under reduced motion and with no JavaScript.
{
  for (const [name, opts] of [['375', PHONE], ['1280', { viewport: { width: 1280, height: 800 } }]]) {
    const { ctx, page, errors } = await open(opts, '/');
    await page.waitForTimeout(1200);
    const h = await page.evaluate(() => {
      const h1 = document.querySelector('.hero h1'); const cs = getComputedStyle(h1);
      const words = [...h1.querySelectorAll('.rw')].map((w) => { const r = w.getClientRects(); return { t: w.textContent, lines: r.length, h: w.getBoundingClientRect().height, op: getComputedStyle(w).opacity }; });
      const fs = parseFloat(cs.fontSize);
      const tops = [...new Set(words.map((w) => 0))];
      const rects = [...h1.querySelectorAll('.rw')].map((w) => Math.round(w.getBoundingClientRect().top));
      return { hy: cs.hyphens, wrap: cs.textWrap || cs.textWrapStyle, text: h1.textContent.replace(/\s+/g, ' ').trim(), fs, split: words.some((w) => w.lines > 1 || w.h > fs * 1.5), shown: words.every((w) => w.op === '1'), lines: new Set(rects).size, firstLineWords: words.filter((w, i) => rects[i] === rects[0]).map((w) => w.t).join(' '), lead: [...document.querySelectorAll('.hero .lead .rw')].every((w) => getComputedStyle(w).opacity === '1') };
    });
    ok(h.hy === 'none' && /balance/.test(h.wrap || ''), `${name}: headline has hyphens none and balanced wrapping (${h.hy}, ${h.wrap})`);
    ok(h.text === 'Online English lessons with real tutors' && !h.split, `${name}: headline text is whole and no word is split ("${h.text}")`);
    ok(h.lines === 2 && h.firstLineWords === 'Online English lessons', `${name}: headline reads "Online English lessons" then "with real tutors" (${h.lines} lines, first: ${h.firstLineWords})`);
    ok(h.shown && h.lead, `${name}: the words have risen in after 1.2 seconds`);
    const l = await page.evaluate(() => { const r = document.querySelector('[data-lesson]'); return { live: !!document.querySelector('.live-pill'), chips: document.querySelectorAll('.lesson-chip').length, speaker: r.dataset.speaker, text: r.querySelector('[data-cap-text]').textContent, w: Math.round(r.getBoundingClientRect().width), vis: r.getBoundingClientRect().width > 200 }; });
    ok(l.live && l.chips === 3 && l.vis, `${name}: the lesson window shows with a LIVE pill and three chips (${l.w} px wide)`);
    await page.locator('[data-lesson]').scrollIntoViewIfNeeded();
    const seen = new Set(); const speakers = new Set();
    for (let i = 0; i < 9; i++) { await page.waitForTimeout(1000); const s = await page.evaluate(() => { const r = document.querySelector('[data-lesson]'); return [r.dataset.speaker, r.querySelector('[data-cap-text]').textContent]; }); speakers.add(s[0]); if (s[1]) seen.add(s[1]); }
    ok(speakers.has('tutor') && speakers.has('student') && seen.size >= 3, `${name}: the speaker alternates and the caption changes (${[...speakers].join(', ')}; ${seen.size} different captions)`);
    if (name === '1280') {
      await page.mouse.move(900, 300);
      await page.mouse.move(1150, 560, { steps: 4 });
      await page.waitForTimeout(500);
      const tr = await page.evaluate(() => document.querySelector('[data-tilt]').style.transform);
      const m = /rotateX\(([-\d.]+)deg\) rotateY\(([-\d.]+)deg\)/.exec(tr || '');
      ok(m && Math.abs(Number(m[1])) <= 4 && Math.abs(Number(m[2])) <= 4 && (Number(m[1]) !== 0 || Number(m[2]) !== 0), `${name}: the window tilts towards the pointer, at most 4 degrees (${tr})`);
      await page.mouse.move(5, 5);
      await page.waitForTimeout(400);
      ok((await page.evaluate(() => document.querySelector('[data-tilt]').style.transform)) === '', `${name}: the tilt resets when the pointer leaves`);
    } else {
      ok((await page.evaluate(() => document.querySelector('[data-tilt]').style.transform)) === '', `${name}: no tilt on a touch screen`);
    }
    await page.screenshot({ path: path.join(out, `hero-${name}.png`) });
    ok(errors.length === 0, `${name}: hero has no console errors (${errors.join(' | ')})`);
    await ctx.close();
  }
  // Calm under reduced motion: nothing moves, the caption shows the first line only, the LIVE pill is static
  {
    const { ctx, page } = await open({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' }, '/');
    await page.waitForTimeout(4500);
    const r = await page.evaluate(() => { const l = document.querySelector('[data-lesson]'); const dot = getComputedStyle(document.querySelector('.live-dot')); const rw = getComputedStyle(document.querySelector('.hero h1 .rw')); return { text: l.querySelector('[data-cap-text]').textContent, live: l.classList.contains('is-live'), speaker: l.dataset.speaker, dotAnim: dot.animationName, rwAnim: rw.animationName, op: rw.opacity }; });
    ok(r.text === 'Tell me about your last shift at work.' && !r.live && r.speaker === 'tutor', `reduced motion: the caption shows the first line only ("${r.text}")`);
    ok(r.dotAnim === 'none' && r.rwAnim === 'none' && r.op === '1', `reduced motion: LIVE pill and headline do not animate (${r.dotAnim}, ${r.rwAnim})`);
    await page.mouse.move(900, 300); await page.mouse.move(1150, 560, { steps: 3 }); await page.waitForTimeout(300);
    ok((await page.evaluate(() => document.querySelector('[data-tilt]').style.transform)) === '', 'reduced motion: no tilt');
    await ctx.close();
  }
  // No JavaScript: the hero is complete and still
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, javaScriptEnabled: false });
    const page = await ctx.newPage();
    await page.goto(base + '/', { waitUntil: 'networkidle' });
    await page.waitForTimeout(1200);
    const r = await page.evaluate(() => ({ h1: document.querySelector('.hero h1').textContent.replace(/\s+/g, ' ').trim(), cap: document.querySelector('[data-cap-text]').textContent, live: !!document.querySelector('.live-pill'), op: getComputedStyle(document.querySelector('.hero h1 .rw')).opacity }));
    ok(r.h1 === 'Online English lessons with real tutors' && r.cap.length > 10 && r.live && r.op === '1', 'no JavaScript: headline, first caption line and LIVE pill are all there');
    await ctx.close();
  }
}

// 8. No horizontal scroll at 375 (and 320) on the pages that carry the new parts, in every language, and no console errors.
{
  const pages = ['/', '/pricing/', '/courses/oet/', '/placement-test/', '/contact/', '/translation/', '/translation/certified/', '/translation/specialist/', '/translation/thank-you/', '/blog/', ARTICLE, '/blog/questions/'];
  for (const loc of ['', '/bg', '/ro', '/pl']) {
    for (const p of pages) {
      if (loc && /^\/blog/.test(p)) continue;
      for (const w of [375, 320]) {
        if (w === 320 && !(loc === '/bg' && (p === '/' || p === '/translation/'))) continue;
        const { ctx, page, errors } = await open({ ...PHONE, viewport: { width: w, height: 667 } }, loc + p);
        const wide = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
        ok(wide <= 0 && errors.length === 0, `${loc}${p} at ${w}: no sideways scroll (${wide}), errors ${errors.length}`);
        await ctx.close();
      }
    }
  }
}

// 11. The original logo: header width on phone and tablet, the optimised files are under 60 KB, the footer shows the white version,
// and the structured data logo is the black PNG.
{
  for (const [w, want] of [[375, 150], [768, 200]]) {
    const { ctx, page } = await open({ viewport: { width: w, height: 800 } }, '/');
    const r = await page.evaluate(() => { const i = document.querySelector('.logo-link img'); const a = document.querySelector('.logo-link'); const b = document.querySelector('.header-bar'); return { w: Math.round(i.getBoundingClientRect().width), ok: i.complete && i.naturalWidth > 0, label: a.getAttribute('aria-label'), bar: Math.round(b.getBoundingClientRect().height), wrap: document.documentElement.scrollWidth - innerWidth }; });
    ok(r.ok && Math.abs(r.w - want) <= 2 && r.label === 'Training Centre Raya London, home' && r.wrap <= 0, `${w}: header logo ${r.w} px (want ${want}), label "${r.label}", bar ${r.bar} px, no sideways scroll`);
    await ctx.close();
  }
  const { statSync } = await import('node:fs');
  for (const f of ['raya-black-300.png', 'raya-black-400.png', 'raya-black-600.png', 'raya-white-480.png', 'raya-white-720.png']) {
    const kb = statSync(path.join(dist, 'brand', f)).size / 1024;
    ok(kb < 60, `${f} is ${kb.toFixed(1)} KB (under 60)`);
  }
  const { ctx, page } = await open(DESK, '/');
  await page.locator('.footer-logo').scrollIntoViewIfNeeded();
  await page.waitForTimeout(400);
  const f = await page.evaluate(() => { const i = document.querySelector('.footer-logo img'); const bg = getComputedStyle(document.querySelector('.footer-logo')).backgroundColor; return { src: i.currentSrc.split('/').pop(), ok: i.complete && i.naturalWidth > 0, bg }; });
  ok(f.ok && /raya-white/.test(f.src) && (f.bg === 'rgba(0, 0, 0, 0)' || f.bg === 'transparent'), `footer uses the white lettering logo on the dark footer (${f.src}, tile ${f.bg})`);
  const ld = await page.evaluate(() => [...document.querySelectorAll('script[type="application/ld+json"]')].map((s) => JSON.parse(s.textContent)).find((d) => d.logo));
  ok(ld && ld.logo === 'https://ucraya.uk/raya/original/raya-original-vector-black-1259.png', `Organization JSON-LD logo is the black PNG (${ld && ld.logo})`);
  await ctx.close();
}

// 12. Translation quote form: required fields, the "other" language box, the file checks, and a real multipart post.
for (const [name, opts] of [['desktop', DESK], ['phone', PHONE]]) {
  const { ctx, page, errors } = await open(opts, '/translation/certified/');
  const form = page.locator('form[name="translation-quote"]');
  await form.locator('[data-submit]').scrollIntoViewIfNeeded();
  await form.locator('[data-submit]').click();
  await page.waitForTimeout(150);
  const e1 = await page.evaluate(() => [...document.querySelectorAll('form[name="translation-quote"] .err:not([hidden])')].map((x) => x.id));
  const focused = await page.evaluate(() => document.activeElement && document.activeElement.name);
  ok(['tq-err-email', 'tq-err-name', 'tq-err-from', 'tq-err-to', 'tq-err-doctype', 'tq-err-consent'].every((id) => e1.includes(id)) && focused === 'email', `${name}: an empty send shows every message and focuses the email (${e1.join(', ')}; focus ${focused})`);
  // other language box
  ok(await form.locator('[data-other]').isHidden(), `${name}: the other language box is hidden at first`);
  await form.locator('select[name="from_language"]').selectOption('Other');
  ok(await form.locator('[data-other]').isVisible(), `${name}: choosing Other shows the other language box`);
  await form.locator('select[name="from_language"]').selectOption('Bulgarian');
  ok(await form.locator('[data-other]').isHidden(), `${name}: and hides it again`);
  // files: too big, then a type we cannot read
  const big = { name: 'scan.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(9 * 1000 * 1000, 1) };
  await form.locator('input[name="file_1"]').setInputFiles(big);
  await page.waitForTimeout(100);
  const t1 = await page.locator('#tq-err-files').textContent();
  ok(!(await page.locator('#tq-err-files').isHidden()) && /9(\.0)? MB/.test(t1) && /8 MB/.test(t1), `${name}: 9 MB of files is refused in words ("${t1}")`);
  await form.locator('input[name="file_1"]').setInputFiles({ name: 'run.exe', mimeType: 'application/octet-stream', buffer: Buffer.from('x') });
  await page.waitForTimeout(100);
  const t2 = await page.locator('#tq-err-files').textContent();
  ok(/run\.exe/.test(t2), `${name}: a file type we cannot read is named ("${t2}")`);
  await form.locator('input[name="file_1"]').setInputFiles({ name: 'birth.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 test') });
  await form.locator('input[name="file_2"]').setInputFiles({ name: 'photo.jpg', mimeType: 'image/jpeg', buffer: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
  // a valid send
  await form.locator('input[name="email"]').fill('someone@example.com');
  await form.locator('input[name="name"]').fill('Test Person');
  await form.locator('select[name="to_language"]').selectOption('English');
  await form.locator('select[name="document_type"]').selectOption('Birth or marriage certificate');
  await form.locator('input[name="consent"]').check();
  const hidden = await page.evaluate(() => Object.fromEntries([...document.querySelectorAll('form[name="translation-quote"] input[type="hidden"]')].map((i) => [i.name, i.value])));
  ok(hidden.source_channel && hidden.device && hidden.landing_page && hidden.visit_started && hidden.enquiry_page === '/translation/certified/' && hidden.subject === 'Translation quote request via ucraya.uk: %{submissionId}' && hidden['form-name'] === 'translation-quote', `${name}: attribution fields are filled and the subject is the fixed one (${hidden.source_channel}, ${hidden.device}, ${hidden.landing_page})`);
  lastPost = null;
  await Promise.all([page.waitForURL('**/translation/thank-you/', { timeout: 5000 }).catch(() => {}), form.locator('[data-submit]').click()]);
  await page.waitForTimeout(200);
  const body = lastPost ? lastPost.body : '';
  const ctype = lastPost ? lastPost.type : '';
  ok(lastPost && lastPost.url === '/translation/thank-you/' && /multipart\/form-data/.test(ctype) && /name="from_language"\r\n\r\nBulgarian/.test(body) && /name="form-name"\r\n\r\ntranslation-quote/.test(body) && /name="file_1"; filename="birth\.pdf"/.test(body) && /name="file_2"; filename="photo\.jpg"/.test(body) && /name="file_3"; filename=""/.test(body), `${name}: the form posts multipart to the thank you page with both files (${ctype.split(';')[0]})`);
  ok(errors.length === 0, `${name}: no console errors on the translation page`);
  await ctx.close();
}
for (const loc of ['/bg', '/ro', '/pl']) {
  const { ctx, page } = await open(DESK, loc + '/translation/');
  const r = await page.evaluate(() => { const f = document.querySelector('form[name="translation-quote"]'); return { action: f.getAttribute('action'), enc: f.enctype, opts: f.querySelector('select[name="from_language"]').options.length, first: f.querySelector('select[name="from_language"]').options[1].value + '|' + f.querySelector('select[name="from_language"]').options[1].textContent, lang: f.querySelector('input[name="site_language"]').value }; });
  ok(r.action === `${loc}/translation/thank-you/` && /multipart/.test(r.enc) && r.opts === 16 && /^Bulgarian\|/.test(r.first) && r.lang === loc.slice(1), `${loc}: the translation form posts to its own thank you page, sends English option values (${r.first})`);
  await ctx.close();
}

await browser.close();
server.close();
console.log(bad ? `${bad} of ${total} checks failed.` : `All ${total} checks passed.`);
process.exit(bad ? 1 : 0);
