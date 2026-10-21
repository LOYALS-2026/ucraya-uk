// Site checker. Run after a build: npm run build && npm run check
// Exits non zero on any failure and prints the first 30.
import { readdirSync, readFileSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dist = path.join(root, 'dist');
const failures = [];
const fail = (page, msg) => failures.push(`${page}: ${msg}`);

if (!existsSync(dist)) {
  console.error('dist/ not found. Run "npm run build" first.');
  process.exit(1);
}

const LOCALES = ['bg', 'ro', 'pl'];
// Pages that exist in English only, by design.
const EN_ONLY = [/^\/privacy\/$/, /^\/terms\/$/, /^\/london\/$/, /^\/blog\//, /^\/404\.html$/];
const BANNED = [
  ['accredited', /\baccredited\b/i],
  ['accreditation', /\baccreditation\b/i],
  ['approved centre', /\bapproved\s+(test\s+)?cent(re|er)s?\b/i],
  ['official partner', /\bofficial\s+partners?\b/i],
  ['chartered', /\bchartered\b/i],
  ['guaranteed', /\bguaranteed\b/i],
  ['guarantee', /\bguarantee(s|ing)?\b/i],
  ['native speaker', /\bnative[\s-]+speakers?\b/i],
  ['15+ years', /\b15\s*\+\s*years\b/i],
  ['12 years', /\b12\s+years\b/i],
  ['Google Meet', /\bgoogle\s+meet\b/i],
];

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = path.join(dir, name);
    if (statSync(p).isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

const files = walk(dist);
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const toUrl = (f) => {
  const rel = '/' + path.relative(dist, f).split(path.sep).join('/');
  return rel.endsWith('/index.html') ? rel.slice(0, -'index.html'.length) : rel;
};

// ---- required files
for (const f of ['llms.txt', 'robots.txt', 'sitemap-index.xml', 'rss.xml']) {
  if (!existsSync(path.join(dist, f))) fail('dist', `missing ${f}`);
}
if (existsSync(path.join(dist, 'robots.txt'))) {
  const robots = readFileSync(path.join(dist, 'robots.txt'), 'utf8');
  for (const bot of ['GPTBot', 'ClaudeBot', 'PerplexityBot', 'Google-Extended']) {
    if (!new RegExp(`User-agent:\\s*${bot}`, 'i').test(robots)) fail('robots.txt', `no rule for ${bot}`);
  }
  if (!/Sitemap:\s*https:\/\/ucraya\.uk\/sitemap-index\.xml/.test(robots)) fail('robots.txt', 'no Sitemap line');
}

// ---- locale parity
const urls = htmlFiles.map(toUrl);
const bySet = { en: new Set() };
for (const l of LOCALES) bySet[l] = new Set();
for (const u of urls) {
  const m = u.match(/^\/(bg|ro|pl)(\/.*)$/) || u.match(/^\/(bg|ro|pl)$/);
  if (m) bySet[m[1]].add(m[2] ?? '/');
  else if (!EN_ONLY.some((re) => re.test(u))) bySet.en.add(u);
}
const moneyPaths = bySet.en;
for (const l of LOCALES) {
  for (const p of moneyPaths) if (!bySet[l].has(p)) fail(`/${l}${p}`, 'missing locale page');
  for (const p of bySet[l]) if (!moneyPaths.has(p)) fail(`/${l}${p}`, 'locale page has no English counterpart');
}

// ---- helpers
const attr = (tag, name) => {
  const m = tag.match(new RegExp(`\\s${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i'));
  return m ? (m[2] ?? m[3]) : null;
};
const idCache = new Map();
function idsOf(file) {
  if (!idCache.has(file)) {
    const h = readFileSync(file, 'utf8');
    idCache.set(file, new Set([...h.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])));
  }
  return idCache.get(file);
}
function resolveInternal(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0]);
  const candidates = [];
  if (clean.endsWith('/')) candidates.push(path.join(dist, clean, 'index.html'));
  else candidates.push(path.join(dist, clean), path.join(dist, clean, 'index.html'));
  return candidates.find((c) => existsSync(c) && statSync(c).isFile()) || null;
}

// ---- per page checks
for (const file of htmlFiles) {
  const url = toUrl(file);
  const html = readFileSync(file, 'utf8');
  const isMoney = !EN_ONLY.some((re) => re.test(url));
  const baseUrl = url.replace(/^\/(bg|ro|pl)(?=\/|$)/, '') || '/';
  const isThanks = baseUrl === '/thank-you/';

  // h1
  const h1s = html.match(/<h1[\s>]/gi) || [];
  if (h1s.length !== 1) fail(url, `expected one h1, found ${h1s.length}`);

  // title and description
  const title = (html.match(/<title>([\s\S]*?)<\/title>/i) || [])[1];
  if (!title) fail(url, 'no title');
  else if (title.length >= 60) fail(url, `title is ${title.length} characters`);
  const metas = [...html.matchAll(/<meta\s[^>]*>/gi)].map((m) => m[0]);
  const descTag = metas.find((t) => attr(t, 'name') === 'description');
  const desc = descTag && attr(descTag, 'content');
  if (!desc) fail(url, 'no meta description');
  else if (desc.length >= 160) fail(url, `description is ${desc.length} characters`);

  // canonical
  const links = [...html.matchAll(/<link\s[^>]*>/gi)].map((m) => m[0]);
  const canon = links.find((t) => attr(t, 'rel') === 'canonical');
  if (!canon) fail(url, 'no canonical');
  else if (!/^https:\/\/ucraya\.uk\//.test(attr(canon, 'href') || '')) fail(url, 'canonical is not on https://ucraya.uk');

  // hreflang
  const alts = links.filter((t) => attr(t, 'rel') === 'alternate' && attr(t, 'hreflang'));
  const langs = new Set(alts.map((t) => attr(t, 'hreflang')));
  if (url !== '/404.html') {
    if (isMoney) {
      for (const l of ['en', 'bg', 'ro', 'pl', 'x-default']) if (!langs.has(l)) fail(url, `missing hreflang ${l}`);
    } else if (!langs.has('en') || !langs.has('x-default')) fail(url, 'missing hreflang en or x-default');
  }

  // JSON-LD
  const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)];
  if (url !== '/404.html' && ld.length === 0) fail(url, 'no JSON-LD');
  for (const b of ld) {
    try {
      JSON.parse(b[1]);
    } catch {
      fail(url, 'JSON-LD does not parse');
    }
  }

  // CSP friendliness: no inline scripts other than JSON-LD, no inline handlers
  for (const m of html.matchAll(/<script\b([^>]*)>/gi)) {
    if (!/\ssrc=/.test(m[1]) && !/application\/ld\+json/.test(m[1])) fail(url, 'inline script found');
  }
  if (/\son(click|load|submit|change|error)\s*=/i.test(html)) fail(url, 'inline event handler found');

  // dashes
  const noStyle = html.replace(/<style[\s\S]*?<\/style>/gi, '');
  if (/[–—]|&mdash;|&ndash;|&#8212;|&#8211;|&#x2014;|&#x2013;/i.test(noStyle)) {
    const i = noStyle.search(/[–—]|&mdash;|&ndash;|&#8212;|&#8211;|&#x2014;|&#x2013;/i);
    fail(url, `em or en dash near "${noStyle.slice(Math.max(0, i - 25), i + 25).replace(/\s+/g, ' ')}"`);
  }

  // banned words (visible text, JSON-LD, titles, meta and alt text)
  const text =
    noStyle
      .replace(/<script(?![^>]*ld\+json)[^>]*>[\s\S]*?<\/script>/gi, ' ')
      .replace(/<[^>]+>/g, ' ') +
    ' ' +
    metas.map((t) => attr(t, 'content') || '').join(' ') +
    ' ' +
    [...html.matchAll(/\s(?:alt|title|aria-label)="([^"]*)"/g)].map((m) => m[1]).join(' ');
  for (const [name, re] of BANNED) {
    const m = text.match(re);
    if (m) {
      const i = text.search(re);
      fail(url, `banned wording "${name}" near "${text.slice(Math.max(0, i - 30), i + 40).replace(/\s+/g, ' ')}"`);
    }
  }

  // links and images
  const refs = [];
  for (const m of html.matchAll(/<(a|img|script|source)\b[^>]*>/gi)) {
    const tag = m[0];
    const v = attr(tag, m[1].toLowerCase() === 'a' ? 'href' : 'src');
    if (v) refs.push({ tag: m[1].toLowerCase(), v });
  }
  for (const l of links) {
    const rel = attr(l, 'rel') || '';
    if (/stylesheet|icon|apple-touch-icon|canonical|alternate/.test(rel)) refs.push({ tag: 'link', v: attr(l, 'href') });
  }
  for (const m of metas) {
    if (/og:image$|twitter:image$/.test(attr(m, 'property') || attr(m, 'name') || '')) refs.push({ tag: 'meta', v: attr(m, 'content') });
  }
  for (const { tag, v } of refs) {
    if (!v) continue;
    if (/^(mailto:|tel:|viber:|javascript:|data:)/i.test(v)) continue;
    let target = v;
    if (/^https?:\/\//i.test(v)) {
      if (!/^https:\/\/ucraya\.uk(\/|$)/.test(v)) continue;
      target = v.replace(/^https:\/\/ucraya\.uk/, '') || '/';
    }
    let [pathPart, hash] = target.split('#');
    if (target.startsWith('#')) pathPart = '';
    let resolved;
    if (pathPart === '') resolved = file;
    else {
      if (!pathPart.startsWith('/')) pathPart = path.posix.join(path.posix.dirname(url.endsWith('/') ? url + 'x' : url), pathPart);
      resolved = resolveInternal(pathPart);
    }
    if (!resolved) {
      fail(url, `${tag} points at a missing file: ${v}`);
      continue;
    }
    if (hash && resolved.endsWith('.html') && !idsOf(resolved).has(hash)) fail(url, `link to missing anchor: ${v}`);
  }
  for (const m of html.matchAll(/<img\b[^>]*>/gi)) {
    if (attr(m[0], 'alt') === null) fail(url, 'image without alt');
  }

  // enquiry form rules (Netlify Forms)
  const forms = [...html.matchAll(/<form\b[^>]*>[\s\S]*?<\/form>/gi)].map((m) => m[0]).filter((f) => /name="enquiry"/.test(f));
  if (baseUrl === '/contact/' && forms.length === 0) fail(url, 'enquiry form missing on the contact page');
  for (const f of forms) {
    const open = f.match(/<form\b[^>]*>/i)[0];
    if (attr(open, 'data-netlify') !== 'true') fail(url, 'form lacks data-netlify="true"');
    if (attr(open, 'netlify-honeypot') !== 'bot-field') fail(url, 'form lacks netlify-honeypot="bot-field"');
    if ((attr(open, 'method') || '').toLowerCase() !== 'post') fail(url, 'form method is not POST');
    const action = attr(open, 'action') || '';
    if (!/\/thank-you\/$/.test(action)) fail(url, `form action is not an extensionless thank-you path: ${action}`);
    if (!/<input[^>]*name="form-name"[^>]*value="enquiry"/.test(f)) fail(url, 'form lacks hidden form-name=enquiry');
    if (!/<input[^>]*name="subject"/.test(f)) fail(url, 'form lacks hidden subject');
    const names = [...f.matchAll(/<(?:input|select|textarea)\b[^>]*\sname="([^"]+)"/g)].map((m) => m[1]);
    for (const n of ['email', 'name', 'phone', 'first-language', 'goal', 'format', 'level', 'preferred-times', 'message', 'consent', 'bot-field']) {
      if (!names.includes(n)) fail(url, `form lacks field ${n}`);
    }
    const firstText = f.match(/<input\b[^>]*type="(?:text|email|tel)"[^>]*>/i);
    if (firstText && !/type="email"/.test(firstText[0])) fail(url, 'the email field is not the first text input');
  }
}

// ---- summary
console.log(`Checked ${htmlFiles.length} HTML pages in dist/.`);
if (failures.length === 0) {
  console.log('0 failures.');
} else {
  console.log(`${failures.length} failure${failures.length === 1 ? '' : 's'}. First ${Math.min(30, failures.length)}:`);
  for (const f of failures.slice(0, 30)) console.log(' - ' + f);
  process.exit(1);
}
