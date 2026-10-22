// Reads the editorial plan (content/topical-map.csv and content/pillars.csv) for the blog hub:
// the pillar list, "coming on" dates for guides not yet written, and the question bank.
// Nothing here is a claim about Ucraya: the public wording of each pillar is in PILLAR_COPY.
import { readFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import { slugify } from './seo';

const MAP_FILE = process.env.BLOG_MAP || path.resolve('content/topical-map.csv');
const PILLARS_FILE = process.env.BLOG_PILLARS || path.resolve('content/pillars.csv');

export interface MapRow {
  day: number;
  publishDate: string;
  pillar: string;
  cluster: string;
  funnelStage: string;
  title: string;
  aiQuestion: string;
  moneyPage: string;
  cta: string;
}

export interface PillarInfo {
  name: string;
  slug: string;
  /** Short label for the goal grid. */
  short: string;
  intro: string;
  /** Page the enquiry points at, with a trailing slash. */
  moneyPage: string;
  /** Goal value of the enquiry form (data-goal). */
  goal: string;
  /** Level to prefill, if the pillar implies one. */
  level?: string;
  /** CTA words (from the pillar guide row of the map). */
  cta: string;
  /** Articles planned for the pillar in the map. */
  planned: number;
}

function readCsv(file: string): Record<string, string>[] {
  if (!existsSync(file)) return [];
  const text = readFileSync(file, 'utf8').replace(/^﻿/, '');
  return parse(text, { columns: true, skip_empty_lines: true, relax_column_count: true });
}

const slash = (p: string) => (p.endsWith('/') ? p : p + '/');

let rowsCache: MapRow[] | null = null;
export function mapRows(): MapRow[] {
  if (rowsCache) return rowsCache;
  rowsCache = readCsv(MAP_FILE).map((r) => ({
    day: Number(r.day),
    publishDate: r.publish_date,
    pillar: r.pillar,
    cluster: r.cluster,
    funnelStage: r.funnel_stage,
    title: r.title,
    aiQuestion: r.ai_question,
    moneyPage: slash(r.money_page || '/'),
    cta: r.cta,
  }));
  return rowsCache;
}

/**
 * Public wording per pillar, keyed by the pillar slug. The planning notes in pillars.csv
 * ("Confirm specialist tutors...") are never shown. A new pillar without an entry gets a plain
 * sentence built from its audience (see introFor) and the goal of its money page.
 */
const PILLAR_COPY: Record<string, { short: string; intro: string; goal?: string; level?: string }> = {
  'passing-a-nursing-english-resit': {
    short: 'Nurses retaking OET or IELTS',
    goal: 'oet',
    intro:
      'Guides for nurses who have to retake an English test for registration: how to choose between the Occupational English Test (OET) and the International English Language Testing System (IELTS), what lessons can and cannot do, and how to plan the next attempt.',
  },
  'passing-b1-for-settlement-or-citizenship': {
    short: 'B1 for settlement or citizenship',
    goal: 'selt-b1',
    level: 'b1',
    intro:
      'Plain guides for people preparing for a B1 speaking and listening test for settlement or citizenship. Check your own route on gov.uk first: lessons help you prepare, but the test itself is booked separately.',
  },
  'meeting-an-ielts-offer-deadline': {
    short: 'IELTS for an offer deadline',
    goal: 'ielts',
    intro:
      'Guides for candidates who need an International English Language Testing System (IELTS) score by a university or work deadline: choosing preparation, getting feedback you can use and planning the weeks you have.',
  },
  'succeeding-in-interviews-and-at-work': {
    short: 'Interviews and work English',
    goal: 'interview',
    intro:
      'Guides for professionals with an English-language interview booked, or meetings and presentations ahead: what to practise, how to use one-to-one lessons and how to talk about your experience clearly.',
  },
  'helping-a-child-use-english-at-school': {
    short: 'A child learning English at school',
    goal: 'kids',
    intro:
      'Guides for parents whose child needs English support after feedback from school: choosing a tutor, what to ask before the first lesson and how to follow progress.',
  },
  'communicating-clearly-in-care-work': {
    short: 'Clear English in care work',
    goal: 'staff',
    intro:
      'Guides for care employers and care staff on clear communication at work: handovers, notes, families and everyday workplace English. This is communication practice, not clinical training or registration preparation.',
  },
  'passing-the-partner-visa-english-test': {
    short: 'Partner visa English test',
    goal: 'selt-b1',
    intro:
      'Guides for partners and spouses who need an approved English test for a family visa or its extension: which level your application asks for, how speaking and listening lessons prepare you, and what to check on gov.uk before you book a test.',
  },
  'reaching-b2-english-for-a-uk-work-visa': {
    short: 'B2 English for a work visa',
    goal: 'ielts',
    intro:
      'Guides for Skilled Worker applicants who need to show B2 English: which tests count, how far B1 is from B2 in practice, and how one-to-one lessons and exam preparation fit the weeks you have. Rules change, so every guide points to the official page to check on the day.',
  },
  'translating-bulgarian-and-uk-documents-for-official-use': {
    short: 'Documents for the UK and Bulgaria',
    goal: 'other',
    intro:
      'Guides for Bulgarians in the UK who need a document translated for a UK application, or a UK document translated for use in Bulgaria: registering a birth or marriage, apostilles, university and Nursing and Midwifery Council (NMC) paperwork. The translations are prepared by the school\'s translation partner, in Bulgarian and English. Always check the rules of the office that will receive your document.',
  },
  'choosing-a-tutor-for-everyday-english': {
    short: 'Choosing an online tutor',
    goal: 'everyday',
    intro:
      'Guides to choosing an online English tutor for everyday life: what to compare, what to ask before you book and how to tell whether lessons are working.',
  },
};

const GOAL_BY_COURSE: Record<string, string> = {
  oet: 'oet',
  'selt-b1': 'selt-b1',
  ielts: 'ielts',
  kids: 'kids',
  'business-english': 'interview',
  'general-english': 'everyday',
  'one-to-one': 'everyday',
};

export function goalFromMoneyPage(moneyPage: string): string {
  const m = /\/courses\/([a-z0-9-]+)\/?$/.exec(moneyPage);
  return (m && GOAL_BY_COURSE[m[1]]) || 'everyday';
}

function introFor(name: string, segment: string): string {
  const who = segment ? segment.charAt(0).toLowerCase() + segment.slice(1) : name.toLowerCase();
  return `Guides for ${who}.`;
}

let pillarsCache: PillarInfo[] | null = null;
/** Every pillar of the plan, in the order of pillars.csv (the order of the goals), whether or not it has articles. */
export function allPillars(): PillarInfo[] {
  if (pillarsCache) return pillarsCache;
  const rows = mapRows();
  pillarsCache = readCsv(PILLARS_FILE).map((r) => {
    const slug = slugify(r.pillar);
    const copy = PILLAR_COPY[slug];
    const guide = rows.find((x) => x.pillar === r.pillar && x.cluster === 'pillar guide');
    const moneyPage = slash(r.money_page || '/');
    return {
      name: r.pillar,
      slug,
      short: copy?.short ?? r.pillar,
      intro: copy?.intro ?? introFor(r.pillar, r.segment),
      moneyPage,
      goal: copy?.goal ?? goalFromMoneyPage(moneyPage),
      level: copy?.level,
      cta: guide?.cta || 'Ask about lessons and prices',
      planned: Number(r.target_article_count) || 0,
    };
  });
  return pillarsCache;
}

/** Plan rows that are pillar guides (cluster "pillar guide"), by day. */
export function pillarGuideRows(): MapRow[] {
  return mapRows().filter((r) => r.cluster === 'pillar guide').sort((a, b) => a.day - b.day);
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** "25 October 2026" from a YYYY-MM-DD plan date. */
export function longDate(iso: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return '';
  return `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/** "November 2026" from a YYYY-MM-DD plan date. */
export function monthYear(iso: string): string {
  const m = /^(\d{4})-(\d{2})-/.exec(iso);
  if (!m) return '';
  return `${MONTHS[Number(m[2]) - 1]} ${m[1]}`;
}

/**
 * The plan's pillars plus any pillar that an article names but pillars.csv does not list
 * (so a mistyped or brand new pillar still gets its page instead of vanishing).
 */
export function pillarsWith(items: { pillar: string; moneyPage: string }[]): PillarInfo[] {
  const known = allPillars();
  const out = [...known];
  for (const it of items) {
    const slug = slugify(it.pillar);
    if (out.some((p) => p.slug === slug)) continue;
    const moneyPage = slash(it.moneyPage || '/');
    out.push({ name: it.pillar, slug, short: it.pillar, intro: `Guides on ${it.pillar.toLowerCase()}.`, moneyPage, goal: goalFromMoneyPage(moneyPage), cta: 'Ask about lessons and prices', planned: 0 });
  }
  return out;
}

/** The guide hubs that belong to a course page: pillars whose money page is the course, or whose goal is the course's goal. */
export function pillarsForCourse(slug: string): PillarInfo[] {
  const href = `/courses/${slug}/`;
  const goal = GOAL_BY_COURSE[slug];
  return allPillars().filter((pl) => pl.moneyPage === href || (!!goal && pl.goal === goal));
}
