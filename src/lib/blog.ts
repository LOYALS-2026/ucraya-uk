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
