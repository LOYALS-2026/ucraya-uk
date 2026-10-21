import rss from '@astrojs/rss';
import { postPath, type Post } from './blog';

/** Items in a feed: the newest ones only, so a very large blog keeps small feeds. */
export const FEED_LIMIT = 100;

export function feed(opts: { title: string; description: string; site: URL | string | undefined; self: string; posts: Post[] }) {
  const site = opts.site ?? 'https://ucraya.uk';
  return rss({
    title: opts.title,
    description: opts.description,
    site,
    items: opts.posts.slice(0, FEED_LIMIT).map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: postPath(p.id),
      categories: [p.data.pillar],
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: `<language>en-gb</language><atom:link href="https://ucraya.uk${opts.self}" rel="self" type="application/rss+xml" />`,
  });
}
