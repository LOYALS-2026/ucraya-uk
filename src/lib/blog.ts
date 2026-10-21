import { getCollection, type CollectionEntry } from 'astro:content';
import { slugify } from './seo';

export type Post = CollectionEntry<'blog'>;

/** Published posts, newest first. Drafts are left out of production builds. */
export async function getPosts(): Promise<Post[]> {
  const all = await getCollection('blog', ({ data }) => (import.meta.env.PROD ? !data.draft : true));
  return all.sort((a, b) => b.data.pubDate.getTime() - a.data.pubDate.getTime());
}

export interface Pillar { name: string; slug: string; count: number }

export function pillarsOf(posts: Post[]): Pillar[] {
  const map = new Map<string, Pillar>();
  for (const p of posts) {
    const slug = slugify(p.data.pillar);
    const cur = map.get(slug);
    if (cur) cur.count++;
    else map.set(slug, { name: p.data.pillar, slug, count: 1 });
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export const pillarPath = (slug: string) => `/blog/pillar/${slug}/`;
export const postPath = (id: string) => `/blog/${id}/`;

export function formatDate(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
}

/** moneyPage values may come without a trailing slash. */
export function moneyHref(path: string): string {
  const p = path.startsWith('/') ? path : '/' + path;
  return p.endsWith('/') ? p : p + '/';
}

// ---------------------------------------------------------------------------------------------
// Blog hub helpers (search, pillars, reading time, enquiry links). English only.
// ---------------------------------------------------------------------------------------------

export const PAGE_SIZE = 12;

export const pillarSlugOf = (p: Post) => slugify(p.data.pillar);

/** Oldest first within a pillar: the order the guides are meant to be read in. */
export function byDay(a: Post, b: Post): number {
  return a.data.day - b.data.day;
}

/** Plain text of a markdown body: links reduced to their words, markup removed. */
export function plainText(md: string): string {
  return md
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/^\s*\|.*\|\s*$/gm, ' ')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/^\s*[-*]\s+/gm, '')
    .replace(/[*_`>]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function readMinutes(body: string | undefined): number {
  const words = plainText(body ?? '').split(' ').filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}

/** First paragraph of the body (the direct answer), as plain text. */
export function answerOf(body: string | undefined): string {
  const md = (body ?? '').replace(/^\s+/, '');
  const first = md.split(/\n\s*\n/).find((blk) => blk.trim() && !/^#{1,6}\s/.test(blk.trim()) && !/^\s*[|>-]/.test(blk)) ?? '';
  return plainText(first);
}

export const STAGE_LABEL: Record<string, string> = {
  awareness: 'Just starting',
  consideration: 'Comparing options',
  decision: 'Ready to choose',
};

export const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/** Where an Enquire button goes without JavaScript. Pages that carry their own form go straight to it. */
export function enquirePath(moneyPage: string, goal: string): string {
  const mp = moneyHref(moneyPage);
  if (mp.startsWith('/courses/')) return mp + '#enquiry';
  // No second query parameter: the form's purpose defaults to enquiry, and the level travels in data-level.
  return `/contact/?goal=${goal}#enquiry`;
}

/** The card offering the placement test; placed after the second H2 of every guide. */
export const PLACEMENT_CARD_HTML =
  '<aside class="bl-inline-card" data-pagefind-ignore aria-label="Placement test">' +
  '<p class="bl-inline-title">Not sure of your level?</p>' +
  '<p>Take the 3 minute placement test. It gives a rough level from A1 to B2 and shows which lessons to ask about. It is a guide, not an assessment.</p>' +
  '<p><a class="btn btn-secondary" href="/placement-test/">Take the 3 minute placement test</a></p>' +
  '</aside>';

/** Inserts `card` before the third H2 of rendered markdown (after the second section), else at the end. */
export function injectBeforeThirdH2(html: string, card: string): string {
  const idx = [...html.matchAll(/<h2[\s>]/g)].map((m) => m.index as number);
  if (idx.length >= 3) return html.slice(0, idx[2]) + card + html.slice(idx[2]);
  return html + card;
}

/** Guides to read next: same pillar by closeness of day, then the newest from other pillars. */
export function relatedTo(post: Post, all: Post[], n = 3): Post[] {
  const slug = pillarSlugOf(post);
  const same = all
    .filter((p) => p.id !== post.id && pillarSlugOf(p) === slug)
    .sort((a, b) => Math.abs(a.data.day - post.data.day) - Math.abs(b.data.day - post.data.day) || a.data.day - b.data.day)
    .slice(0, n);
  if (same.length >= n) return same;
  const used = new Set([post.id, ...same.map((p) => p.id)]);
  const other = all.filter((p) => !used.has(p.id)).slice(0, n - same.length);
  return [...same, ...other];
}

/** Previous and next guide inside the pillar (by day). */
export function prevNext(post: Post, all: Post[]): { prev?: Post; next?: Post } {
  const slug = pillarSlugOf(post);
  const list = all.filter((p) => pillarSlugOf(p) === slug).sort(byDay);
  const i = list.findIndex((p) => p.id === post.id);
  return { prev: i > 0 ? list[i - 1] : undefined, next: i >= 0 && i < list.length - 1 ? list[i + 1] : undefined };
}

/** Page URL for page n of a paginated list. */
export const pageUrl = (base: string, n: number) => (n <= 1 ? base : `${base}page/${n}/`);
