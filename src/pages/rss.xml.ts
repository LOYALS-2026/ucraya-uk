import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getPosts, postPath } from '../lib/blog';

export async function GET(context: APIContext) {
  const posts = await getPosts();
  return rss({
    title: 'Ucraya guides',
    description: 'Plain guides for learners preparing for tests, interviews and everyday English.',
    site: context.site ?? 'https://ucraya.uk',
    items: posts.map((p) => ({
      title: p.data.title,
      description: p.data.description,
      pubDate: p.data.pubDate,
      link: postPath(p.id),
    })),
    xmlns: { atom: 'http://www.w3.org/2005/Atom' },
    customData: '<language>en-gb</language><atom:link href="https://ucraya.uk/rss.xml" rel="self" type="application/rss+xml" />',
  });
}
