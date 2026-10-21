import type { APIContext } from 'astro';
import { getPosts } from '../lib/blog';
import { feed } from '../lib/blog-rss';

export async function GET(context: APIContext) {
  return feed({
    title: 'Ucraya guides',
    description: 'Plain guides for learners preparing for tests, interviews and everyday English.',
    site: context.site,
    self: '/rss.xml',
    posts: await getPosts(),
  });
}
