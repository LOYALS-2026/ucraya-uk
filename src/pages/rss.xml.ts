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
    customData: '<language>en-gb</language>',
  });
}
