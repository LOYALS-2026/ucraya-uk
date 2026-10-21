import type { APIContext } from 'astro';
import { getPosts, pillarSlugOf, pillarPath } from '../../../../lib/blog';
import { pillarsWith } from '../../../../lib/blog-map';
import { feed } from '../../../../lib/blog-rss';

export async function getStaticPaths() {
  const posts = await getPosts();
  const used = new Set(posts.map(pillarSlugOf));
  return pillarsWith(posts.map((p) => p.data)).filter((p) => used.has(p.slug)).map((p) => ({ params: { pillar: p.slug }, props: { name: p.name, intro: p.intro } }));
}

export async function GET(context: APIContext) {
  const { name, intro } = context.props as { name: string; intro: string };
  const slug = context.params.pillar as string;
  const posts = (await getPosts()).filter((p) => pillarSlugOf(p) === slug);
  return feed({
    title: `Ucraya guides: ${name}`,
    description: intro,
    site: context.site,
    self: `${pillarPath(slug)}rss.xml`,
    posts,
  });
}
