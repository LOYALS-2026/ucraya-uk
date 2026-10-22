// Usage: node scripts/articles/check.mjs [file]
// Checks one article (or every file in src/content/blog/) against the article contract.
// Prints a readable list of failures and exits 1 when there are any.
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import path from 'node:path';
import matter from 'gray-matter';
import { ROOT, BLOG_DIR, readMap, slugify, todayLondon } from './csv.mjs';

export const PRICE_ALLOW = [15, 20, 298, 320, 50, 124, 248];
// The course pages are read from src/lib/routes.ts (COURSE_SLUGS), so a new course page is accepted at once.
const routesSrc = readFileSync(path.join(ROOT, 'src', 'lib', 'routes.ts'), 'utf8');
const slugBlock = /export const COURSE_SLUGS\s*=\s*\[([\s\S]*?)\]/.exec(routesSrc);
const COURSE_PATHS = [...(slugBlock ? slugBlock[1].matchAll(/'([a-z0-9-]+)'/g) : [])].map((m) => `/courses/${m[1]}/`);
COURSE_PATHS.push('/courses/');
// The pricing page, the free class, the placement test and the translation pages are money pages too (the plan uses the first three).
export const MONEY_PAGES = [...new Set([...COURSE_PATHS, '/pricing/', '/free-trial/', '/placement-test/', '/translation/', '/translation/certified/', '/translation/specialist/'])];

const FIELDS = ['title', 'description', 'pubDate', 'updatedDate', 'lang', 'day', 'pillar', 'cluster', 'segment',
  'funnelStage', 'moneyPage', 'cta', 'aiQuestion', 'primaryKeyword', 'secondaryKeywords', 'faq', 'sources',
  'draft', 'author'];
const REQUIRED = FIELDS.filter((f) => !['updatedDate', 'sources'].includes(f));

const BANNED = [
  'accredited', 'accreditation', 'approved centre', 'approved center', 'approved test centre', 'official partner',
  'chartered', 'guaranteed', 'guarantee', 'native speaker', 'native-speaker', 'native speaking', '15+ years',
  '12 years', 'pass rate', 'google meet', 'discord', 'specialist tutor', 'specialist oet', 'specialist ielts',
];
const BANNED_FILE = ['unconfirmed', 'placeholder', 'lorem', 'todo', 'tbc', 'to confirm', 'fixme'];
const WARN_PHRASES = ['free trial', 'free level check', 'free 20', 'free assessment', 'money back', 'refund',
  'center', 'color', 'organize', 'recognize', 'program ', 'favorite'];

const ACRONYMS = {
  OET: 'Occupational English Test',
  IELTS: 'International English Language Testing System',
  SELT: 'Secure English Language Test',
  NMC: 'Nursing and Midwifery Council',
  GESE: 'Graded Examinations in Spoken English',
  CEFR: 'Common European Framework',
  UKVI: 'UK Visas and Immigration',
  TEFL: 'Teaching English as a Foreign Language',
  CELTA: 'Certificate in English Language Teaching to Adults',
  CQC: 'Care Quality Commission',
  GCSE: 'General Certificate of Secondary Education',
  CV: 'curriculum vitae',
};

// Hosts whose published figures an article may quote (only if the page was fetched that session
// and the same URL is in the front matter sources with a checked date).
export const FEE_HOSTS = ['gov.uk', 'nmc.org.uk', 'oet.com', 'ielts.org', 'trinitycollege.com', 'britishcouncil.org',
  'idp.com', 'cambridgeenglish.org', 'languagecert.org', 'pearsonpte.com'];
const hostAllowed = (url) => {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '');
    return FEE_HOSTS.some((d) => h === d || h.endsWith('.' + d));
  } catch { return false; }
};
const ACRONYM_OK = ['UK', 'GBP', 'A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'CV', 'NHS', 'PDF', 'ID', 'USA', 'EU', 'FAQ', 'VAT', 'ESOL', 'AM', 'PM', 'GMT', 'BST'];
const TESTWORDS = '(?:oet|ielts|selt|b1|gese|trinity|cambridge|pte|toefl|duolingo|test|tests|exam|exams|examination|examinations)';
const CLAIM_PATTERNS = [
  [new RegExp(`\\b(?:we|ucraya|our\\s+(?:school|tutors?|team|centre|center))\\s+(?:run|runs|administer|administers|host|hosts|conduct|conducts|offer|offers|provide|provides|deliver|delivers)\\s+(?:the\\s+|a\\s+|an\\s+|your\\s+|official\\s+)?(?:[a-z0-9-]+\\s+){0,2}${TESTWORDS}\\b`, 'i'), 'a claim that Ucraya runs, offers or administers a test'],
  [/\bour\s+(?:own\s+)?(?:test|tests|exam|exams)\b/i, 'a claim of "our test"'],
  [/\b(?:ucraya|we|the school|our school)\s+(?:is|are|['’]re)\s+(?:\w+\s+){0,3}?(?:approved|authori[sz]ed|recogni[sz]ed|certified|licen[sc]ed|endorsed|official)\b/i, 'a claim that Ucraya is approved, authorised, recognised or official'],
  [/\b(?:ucraya|we|the school|our school)\b[^.?!\n]{0,50}?\b(?:approved|authori[sz]ed|licen[sc]ed)\s+(?:[a-z]+\s+){0,2}(?:provider|centre|center|partner)\b/i, 'a claim that Ucraya is an approved or authorised provider, centre or partner'],
  [/\bofficial\s+(?:partner|provider|centre|center)\b/i, 'a claim of being an official partner or provider'],
];

const TUTORS = ['Stefani Dimitrova', 'Avgustina Angelova', 'Elena Petrova', 'Elitsa Georgieva', 'Lena Vlahova',
  'Liubomira Srebrina', 'Mira Srebrina', 'Maria Naldzhieva', 'Stella Atanasova', 'Vyara Yordanova',
  'Angelina Meshekusheva', 'Lili Dimitrova'];

export { slugify };

const isDate = (v) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(v + 'T00:00:00Z'))
  && new Date(v + 'T00:00:00Z').toISOString().slice(0, 10) === v;
const dateStr = (v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v));

function plainText(md) {
  return md
    .replace(/\]\((?:[^)]*)\)/g, ']')
    .replace(/[\[\]]/g, '')
    .replace(/^\s*\|?[\s:|-]+\|?\s*$/gm, ' ')
    .replace(/[|#*>_`]/g, ' ')
    .replace(/^\s*[-+]\s+/gm, ' ')
    .replace(/^\s*\d+\.\s+/gm, ' ');
}
const wordCount = (md) => (plainText(md).match(/[A-Za-z0-9£][A-Za-z0-9£'’.,%/-]*/g) || []).length;

export function checkArticle(file, ctx) {
  const today = ctx.today || todayLondon();
  const fails = [];
  const warns = [];
  const fail = (m) => fails.push(m);
  const warn = (m) => warns.push(m);
  const name = path.basename(file, '.md');
  const raw = readFileSync(file, 'utf8');
  let fm;
  let body;
  try {
    const parsed = matter(raw);
    fm = parsed.data;
    body = parsed.content.replace(/^\s+/, '');
  } catch (e) {
    return { fails: [`front matter does not parse: ${e.message}`], warns };
  }

  // ---- file name and slug
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(name)) fail(`file name "${name}" must be letters, digits and hyphens only`);
  if (name.length > 60) fail(`slug is ${name.length} characters, the maximum is 60`);
  if (typeof fm.title === 'string' && slugify(fm.title) !== name) {
    fail(`slug "${name}" does not match the title (expected "${slugify(fm.title)}")`);
  }

  // ---- front matter
  for (const k of Object.keys(fm)) if (!FIELDS.includes(k)) fail(`unknown front matter field "${k}"`);
  for (const k of REQUIRED) if (fm[k] === undefined || fm[k] === null || fm[k] === '') fail(`front matter field "${k}" is missing`);
  const str = (k) => (typeof fm[k] === 'string' ? fm[k] : '');
  if (fm.title !== undefined && (typeof fm.title !== 'string' || fm.title.length > 59)) fail(`title must be a string of at most 59 characters (the site cuts page titles at 60) (is ${String(fm.title).length})`);
  if (fm.description !== undefined && (typeof fm.description !== 'string' || fm.description.length > 160)) fail(`description must be a string of at most 160 characters (is ${String(fm.description).length})`);
  if (fm.pubDate !== undefined && !isDate(dateStr(fm.pubDate))) fail(`pubDate "${fm.pubDate}" is not a valid YYYY-MM-DD date`);
  else if (fm.pubDate !== undefined && dateStr(fm.pubDate) > today) fail(`pubDate ${dateStr(fm.pubDate)} is in the future (today is ${today}); use the batch Monday from npm run article:next`);
  if (fm.updatedDate !== undefined && !isDate(dateStr(fm.updatedDate))) fail(`updatedDate "${fm.updatedDate}" is not a valid YYYY-MM-DD date`);
  if (fm.lang !== 'en') fail('lang must be "en"');
  if (!Number.isInteger(fm.day) || fm.day < 1 || fm.day > 90) fail('day must be a whole number from 1 to 90');
  if (!['awareness', 'consideration', 'decision'].includes(fm.funnelStage)) fail('funnelStage must be awareness, consideration or decision');
  if (fm.draft !== false) fail('draft must be false');
  if (fm.author !== 'The Ucraya team') fail('author must be "The Ucraya team"');
  if (typeof fm.moneyPage !== 'string' || !MONEY_PAGES.includes(fm.moneyPage)) {
    fail(`moneyPage "${fm.moneyPage}" must be one of: ${MONEY_PAGES.join(', ')} (with the trailing slash)`);
  }
  for (const k of ['pillar', 'cluster', 'segment', 'cta', 'aiQuestion', 'primaryKeyword']) {
    if (fm[k] !== undefined && typeof fm[k] !== 'string') fail(`${k} must be a string`);
  }
  if (!Array.isArray(fm.secondaryKeywords) || !fm.secondaryKeywords.length || fm.secondaryKeywords.some((x) => typeof x !== 'string')) {
    fail('secondaryKeywords must be a list of strings');
  }
  if (!Array.isArray(fm.faq) || fm.faq.length !== 3) {
    fail(`faq must hold exactly three {q, a} pairs (has ${Array.isArray(fm.faq) ? fm.faq.length : 'none'})`);
  } else {
    fm.faq.forEach((p, i) => {
      if (!p || typeof p.q !== 'string' || typeof p.a !== 'string' || !p.q.trim() || !p.a.trim()) fail(`faq pair ${i + 1} needs non-empty q and a`);
      else if (Object.keys(p).some((k) => !['q', 'a'].includes(k))) fail(`faq pair ${i + 1} may only have q and a`);
    });
  }
  if (fm.sources !== undefined) {
    if (!Array.isArray(fm.sources)) fail('sources must be a list');
    else fm.sources.forEach((s, i) => {
      if (!s || typeof s.title !== 'string' || !/^https:\/\//.test(s.url || '')) {
        fail(`sources entry ${i + 1} needs a title and an https url`);
      } else if (s.checked !== undefined) {
        if (!isDate(dateStr(s.checked))) fail(`sources entry ${i + 1}: checked must be YYYY-MM-DD`);
        else if (dateStr(s.checked) > today) fail(`sources entry ${i + 1}: checked ${dateStr(s.checked)} is in the future (today is ${today})`);
      }
    });
  } else {
    warn('no sources listed; a rule, fee or number about a test needs a source page fetched in this session');
  }

  // ---- match the topical map row
  const row = ctx.rows.find((r) => Number(r.day) === fm.day);
  if (row) {
    const same = (label, a, b) => { if (a !== b) fail(`${label} "${a}" differs from the topical map ("${b}")`); };
    same('pillar', fm.pillar, row.pillar);
    same('cluster', fm.cluster, row.cluster);
    same('segment', fm.segment, row.segment);
    same('funnelStage', fm.funnelStage, row.funnel_stage);
    same('aiQuestion', fm.aiQuestion, row.ai_question);
    same('primaryKeyword', fm.primaryKeyword, row.primary_keyword);
    same('moneyPage', fm.moneyPage, row.money_page.replace(/\/?$/, '/'));
    same('cta', fm.cta, row.cta);
    // Weekly batches: every article carries the batch Monday, which is never before the row's publish_date.
    if (row.publish_date && fm.pubDate !== undefined && dateStr(fm.pubDate) < row.publish_date) {
      warn(`pubDate ${dateStr(fm.pubDate)} is earlier than the map's publish_date ${row.publish_date}`);
    }
  } else if (Number.isInteger(fm.day)) fail(`no row for day ${fm.day} in content/topical-map.csv`);

  // ---- text-wide rules (front matter and body)
  const whole = raw;
  if (/[\u2014\u2013]/.test(whole)) {
    const n = whole.split('\n').findIndex((l) => /[\u2014\u2013]/.test(l)) + 1;
    fail(`em or en dash found (line ${n}); use a comma, a colon or a new sentence`);
  }
  if (/!/.test(whole)) fail('exclamation mark found');
  const lower = whole.toLowerCase();
  for (const w of BANNED) if (lower.includes(w)) fail(`banned word or phrase: "${w}"`);
  for (const w of BANNED_FILE) {
    if (new RegExp(`(^|[^a-z])${w.replace(/ /g, '\\s+')}([^a-z]|$)`, 'i').test(whole)) fail(`forbidden word: "${w}"`);
  }
  for (const w of WARN_PHRASES) if (lower.includes(w)) warn(`check "${w.trim()}" against FACTS.md / British spelling`);
  const bodyNoLinks = body.replace(/\]\([^)]*\)/g, ']');
  if (/\[(?![^\]\n]*\]\()/.test(body)) fail('a "[" placeholder or bracket found that is not a link');
  if (/\{\{|\}\}|<<|>>|\bXX+\b/.test(bodyNoLinks)) fail('template marker found in the body');

  // ---- claims about tests, outcomes and people
  const prose = [body, str('description'), ...(Array.isArray(fm.faq) ? fm.faq.flatMap((p) => [p && p.q, p && p.a]) : [])]
    .filter((x) => typeof x === 'string').join('\n');
  const sentencesAll = prose.replace(/\r/g, '').split(/(?<=[.?!][”"']?)\s+|\n+/);
  for (const [re, label] of CLAIM_PATTERNS) {
    const m = re.exec(prose);
    if (m) fail(`${label}: "${m[0]}". Ucraya does not run or administer tests and is not an approved provider`);
  }
  for (const m of prose.matchAll(/(\d+(?:\.\d+)?\s?(?:%|per\s?cent|percent))/gi)) {
    const win = prose.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60);
    if (/\b(pass(?:ed|es|ing)?|success(?:ful)?|rates?|scores?|scored|results?)\b/i.test(win)) {
      fail(`a percentage next to pass, success, rate, score or results: "${win.replace(/\s+/g, ' ').trim()}". Pass rates and outcome figures are not allowed`);
    }
  }
  if (/\b(?:assured|guaranteed?|guarantees|definitely|certain to|will pass|success rate|years of experience)\b/i.test(prose)) {
    fail(`outcome or hype wording found: "${(/\b(?:assured|guaranteed?|guarantees|definitely|certain to|will pass|success rate|years of experience)\b/i.exec(prose))[0]}"`);
  }
  for (const m of prose.matchAll(/\bpromis(?:e|es|ed|ing)\b/gi)) {
    const before = prose.slice(Math.max(0, m.index - 25), m.index).toLowerCase();
    if (!/(?:\bnot|\bnever|n't|\bcannot|\bno|\bwithout)\s+(?:\w+\s+)?$/.test(before)) {
      fail(`"${m[0]}" is used as a promise of an outcome; only a negated form such as "we cannot promise" is allowed`);
    }
  }
  if (/[^\s|][ \t]+-[ \t]+[^\s|-]|--/.test(prose.replace(/\|[\s:|-]+\|/g, ' '))) {
    fail('a spaced hyphen or double hyphen is used as a dash; use a comma, a colon or a new sentence');
  }
  if (/\b(?:microsoft teams|skype|meet by google|hangouts)\b/i.test(prose)) fail('a video platform other than Zoom (groups) or "a live video call" is named; see FACTS section 3');
  // quotations of more than six words attributed to a person or student
  sentencesAll.forEach((sent, idx) => {
    for (const q of sent.matchAll(/[“"]([^”"]{10,})[”"]/g)) {
      const words = (q[1].match(/[A-Za-z0-9'’]+/g) || []).length;
      if (words <= 6) continue;
      const outside = sent.replace(/[“"][^”"]*[”"]/g, ' ');
      const prev = (sentencesAll[idx - 1] || '').replace(/[“"][^”"]*[”"]/g, ' ');
      const after = sent.slice(q.index + q[0].length);
      const next = (sentencesAll[idx + 1] || '').replace(/[“"][^”"]*[”"]/g, ' ').slice(0, 80);
      const attributed = /\b(said|says|told|wrote|writes|explained|added|asked|replied|according to|recalls?|recalled|commented|reviewer|review|testimonial)\b/i.test(outside + ' ' + prev)
        || /\b(student|learner|client|customer|parent|nurse|candidate|mother|father|teacher|tutor)\b/i.test(outside + ' ' + prev + ' ' + next)
        || /^[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s*,/.test(next.trim())
        || /^\s*,?\s*-?\s*[A-Z][a-z]+(?:\s[A-Z][a-z]+)?\s*(?:,|$)/.test(after)
        || /\b[A-Z][a-z]+\s+[A-Z][a-z]+\b/.test(outside.replace(/^[A-Z][a-z]+\s/, ''));
      if (!attributed) continue;
      const ctxText = prev + ' ' + sent;
      const okTutor = TUTORS.some((t) => ctxText.includes(t)) && /(school'?s?\s+(site|website)|ucraya\.co\.uk)/i.test(ctxText);
      if (!okTutor) fail(`a quotation of ${words} words is attributed to a person or student: "${sent.slice(0, 90)}". Only a tutor named in FACTS section 7, with the sentence saying it is from the school site, is allowed`);
    }
  });
  // results about students, learners or clients presented as real cases
  for (const block of body.split(/\n\s*\n/)) {
    if (/made up|imagined/i.test(block)) continue;
    for (const sent of block.split(/(?<=[.?!])\s+/)) {
      if (/\b(students?|learners?|clients?|customers?)\b/i.test(sent) && /\b(passed|achieved|got|scored|reached|gained)\b/i.test(sent)) {
        fail(`a past result about a student, learner or client appears without "made up example" or "imagined" in the paragraph: "${sent.slice(0, 90)}"`);
      }
    }
  }
  // acronyms not on the allow list need a bracketed expansion beside them
  {
    const known = new Set([...Object.keys(ACRONYMS), ...ACRONYM_OK]);
    const seen = new Set();
    for (const m of plainText(body).matchAll(/\b[A-Z]{2,6}\b/g)) {
      const a = m[0];
      if (known.has(a) || seen.has(a)) continue;
      seen.add(a);
      if (!new RegExp(`\\(\\s*${a}\\s*\\)|\\b${a}\\s*\\(`).test(body)) fail(`${a} is not on the acronym list and has no bracketed explanation at first use`);
    }
  }

  // ---- pounds
  const citedUrls = new Set((Array.isArray(fm.sources) ? fm.sources : [])
    .filter((x) => x && typeof x.url === 'string' && x.checked !== undefined && isDate(dateStr(x.checked))).map((x) => x.url));
  const lines = body.split('\n');
  lines.forEach((l, i) => {
    const urls = [...l.matchAll(/\]\((https?:\/\/[^)\s]+)\)/g)].map((m) => m[1]);
    const cited = urls.some((u) => hostAllowed(u) && citedUrls.has(u));
    for (const m of l.matchAll(/(?:£|GBP\s?)\s?([\d,]+(?:\.\d+)?)/g)) {
      const v = parseFloat(m[1].replace(/,/g, ''));
      if (!PRICE_ALLOW.includes(v) && !cited) {
        fail(`line ${i + 1}: pound amount ${m[0].trim()} is not in FACTS section 3, and the line has no link to an official page (${FEE_HOSTS.join(', ')}) that is also in sources with a checked date`);
      }
    }
    if (/\b(pounds|quid)\b/i.test(l) && /\d/.test(l) && !cited) warn(`line ${i + 1}: amount written in words; use the GBP sign and an allowed price`);
  });

  // ---- structure
  const blocks = body.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const first = blocks[0] || '';
  if (!first) fail('the body is empty');
  else if (/^(#|[-*+]\s|\d+\.\s|\||>)/.test(first)) fail('the first block must be a plain paragraph, not a heading, list, table or quote');
  else {
    const n = wordCount(first);
    if (n > 60) fail(`the first paragraph is ${n} words; the limit is 60`);
    if (n < 15) fail(`the first paragraph is only ${n} words; it must answer the question`);
  }
  const headings = [];
  lines.forEach((l, i) => { const m = /^(#{1,6})\s+(.*?)\s*#*\s*$/.exec(l); if (m) headings.push({ level: m[1].length, text: m[2], line: i + 1 }); });
  if (headings.some((h) => h.level === 1)) fail('the body must not contain an H1 (the page title is the H1)');
  const h2 = headings.filter((h) => h.level === 2);
  if (h2.length < 5 || h2.length > 7) fail(`the body has ${h2.length} H2 sections; it needs five to seven including "Related guides"`);
  if (!h2.length || h2[h2.length - 1].text.toLowerCase() !== 'related guides') fail('the last H2 must be "Related guides"');
  if (headings.some((h, i) => h.level > 2 && !headings.slice(0, i).some((x) => x.level === 2))) fail('an H3 or deeper appears before any H2');
  for (const h of headings) {
    if (/\bday\s*\d+/i.test(h.text)) fail(`heading "${h.text}" mentions a day number; write natural headings`);
    if (/faq|frequently asked|common questions|questions and answers|call to action|^cta\b/i.test(h.text)) {
      fail(`heading "${h.text}" looks like an FAQ or CTA section; the site renders those itself`);
    }
  }
  const ctaText = (fm.cta || '').toLowerCase();
  if (ctaText) {
    for (const b of blocks) {
      const t = b.replace(/[*_>#\s]+/g, ' ').replace(/\]\([^)]*\)/g, ']').replace(/[\[\]]/g, '').trim().toLowerCase().replace(/[.:]$/, '');
      if (t === ctaText) fail(`a CTA block was found ("${fm.cta}"); the site renders the CTA box itself`);
    }
  }
  for (const b of blocks) {
    if (/^\*{0,2}(q|question)\s*[:.]/i.test(b)) { fail('a question-and-answer block appears in the body; the FAQ belongs in the front matter'); break; }
  }

  // ---- length
  const wc = wordCount(body);
  if (wc < 900 || wc > 1400) fail(`the body is ${wc} words; it must be 900 to 1,400`);

  // ---- links
  const relIdx = h2.length ? h2[h2.length - 1].line - 1 : lines.length;
  const mainText = lines.slice(0, relIdx).join('\n');
  const relText = lines.slice(relIdx).join('\n');
  const linkRe = /\[([^\]]+)\]\(([^)\s]+)\)/g;
  const allLinks = [...body.matchAll(linkRe)].map((m) => ({ text: m[1], href: m[2] }));
  for (const { href } of allLinks) {
    if (/^https?:\/\/(www\.)?ucraya\.uk/i.test(href)) fail(`use relative links for the site, not ${href}`);
    if (/^\/blog\//.test(href)) {
      const m = /^\/blog\/([a-z0-9-]+)\/$/.exec(href);
      if (!m) fail(`blog link "${href}" must look like /blog/<slug>/`);
      else if (m[1] === name) fail('an article must not link to itself');
      else if (!existsSync(path.join(BLOG_DIR, `${m[1]}.md`))) fail(`link ${href} points at an article that does not exist`);
      else if (Number.isInteger(ctx.days[m[1]]) && Number.isInteger(fm.day) && ctx.days[m[1]] >= fm.day) {
        fail(`link ${href} points at an article that is published later (day ${ctx.days[m[1]]}); link only earlier articles`);
      }
    } else if (href.startsWith('/')) {
      if (!MONEY_PAGES.includes(href) && !['/', '/contact/', '/about/', '/tutors/', '/faq/', '/how-it-works/', '/free-trial/', '/placement-test/', '/reviews/', '/blog/'].includes(href)) {
        fail(`internal link "${href}" is not a known page`);
      }
    } else if (!/^https:\/\//.test(href)) fail(`link "${href}" must be https or a site path`);
  }
  if (fm.moneyPage && !new RegExp(`\\]\\(${fm.moneyPage.replace(/[/]/g, '\\/')}\\)`).test(mainText)) {
    fail(`the body (outside Related guides) must link once to the money page ${fm.moneyPage}`);
  }
  const relLinks = [...relText.matchAll(linkRe)].map((m) => m[2]);
  const relBlog = relLinks.filter((h) => h.startsWith('/blog/'));
  if (relLinks.length < 2 || relLinks.length > 4) fail(`Related guides has ${relLinks.length} links; it needs two to four`);
  const others = ctx.blogSlugs.filter((s) => s !== name && Number.isInteger(ctx.days[s]) && ctx.days[s] < fm.day).length;
  if (relBlog.length < Math.min(2, others)) fail(`Related guides links ${relBlog.length} other article(s) but ${others} earlier article(s) exist; link at least ${Math.min(2, others)}`);
  if (others < 2 && !relLinks.some((h) => MONEY_PAGES.includes(h))) fail('with fewer than two other articles, Related guides must also link a course page');

  // ---- acronyms explained at first use (first use in the body)
  const textForAcr = plainText(lines.slice(0, relIdx).join('\n'));
  for (const [a, expansion] of Object.entries(ACRONYMS)) {
    const m = new RegExp(`\\b${a}\\b`).exec(textForAcr);
    if (!m) continue;
    const win = textForAcr.slice(Math.max(0, m.index - 120), m.index + a.length + 120).toLowerCase();
    if (!win.includes(expansion.toLowerCase())) fail(`${a} is used without being explained at first use (expected "${expansion}" next to it)`);
  }

  // ---- quotes attributed to named people
  const sentences = body.split(/(?<=[.?!])\s+|\n+/);
  for (const s of sentences) {
    if (/\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\s+(?:said|says|told|explained|added)\b|\b(?:said|says)\s+[A-Z][a-z]+\s+[A-Z][a-z]+/.test(s)) {
      const tutor = TUTORS.some((t) => s.includes(t));
      if (!(tutor && /own words/i.test(s) && /school'?s? (site|website)|ucraya\.co\.uk/i.test(s))) {
        fail(`a quote or statement is attributed to a named person: "${s.slice(0, 80)}". Only a tutor named in FACTS section 7, marked as their own words from the school site, is allowed`);
      }
    }
    if (/[“"][^”"]{12,}[”"]\s*(?:,|\.)?\s*(?:said|says|wrote|according to)/i.test(s)) fail(`an attributed quotation was found: "${s.slice(0, 80)}"`);
  }
  if (/\b(testimonial|our students say|a student told us|one of our students)\b/i.test(body)) {
    fail('testimonials and student stories are not allowed unless taken from FACTS section 6; a worked example must say "a made up example"');
  }

  return { fails, warns };
}

export function loadContext() {
  const blogSlugs = existsSync(BLOG_DIR) ? readdirSync(BLOG_DIR).filter((f) => f.endsWith('.md')).map((f) => f.slice(0, -3)) : [];
  const days = {};
  for (const s of blogSlugs) {
    try { days[s] = matter(readFileSync(path.join(BLOG_DIR, `${s}.md`), 'utf8')).data.day; } catch { days[s] = undefined; }
  }
  const { rows } = readMap();
  return { rows, blogSlugs, days };
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('check.mjs')) {
  const arg = process.argv[2];
  const ctx = loadContext();
  const files = arg
    ? [path.resolve(arg)]
    : ctx.blogSlugs.sort().map((s) => path.join(BLOG_DIR, `${s}.md`));
  if (!files.length) { console.log('No articles to check.'); process.exit(0); }
  let total = 0;
  for (const f of files) {
    if (!existsSync(f)) { console.error(`No such file: ${f}`); process.exit(2); }
    const { fails, warns } = checkArticle(f, ctx);
    const rel = path.relative(ROOT, f);
    if (!fails.length) console.log(`PASS ${rel}`);
    else { console.log(`FAIL ${rel}`); fails.forEach((m) => console.log(`  - ${m}`)); }
    warns.forEach((m) => console.log(`  (warning) ${m}`));
    total += fails.length;
  }
  console.log(`\n${files.length} file(s) checked, ${total} failure(s).`);
  process.exit(total ? 1 : 0);
}
