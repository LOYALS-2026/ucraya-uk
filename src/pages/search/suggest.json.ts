// The small index behind the search suggestions (public/js/search.js loads it on first use).
// Short keys keep it small: t title, s slug, p pillar index, k keywords, q the question the guide answers,
// d publication date, r minutes to read, f funnel stage (a awareness, c consideration, d decision).
import { getPosts, pillarSlugOf, readMinutes, isoDay } from '../../lib/blog';
import { pillarsWith } from '../../lib/blog-map';

const STAGE: Record<string, string> = { awareness: 'a', consideration: 'c', decision: 'd' };

export async function GET() {
  const posts = await getPosts();
  const planned = pillarsWith(posts.map((p) => p.data));
  const used = [...new Set(posts.map(pillarSlugOf))];
  const pillars = used.map((slug) => {
    const known = planned.find((p) => p.slug === slug);
    const name = known?.name ?? posts.find((p) => pillarSlugOf(p) === slug)!.data.pillar;
    return { n: name, s: slug };
  });
  const index = new Map(pillars.map((p, i) => [p.s, i]));
  const body = {
    v: 1,
    pillars,
    posts: posts.map((p) => ({
      t: p.data.title,
      s: p.id,
      p: index.get(pillarSlugOf(p)),
      k: [p.data.primaryKeyword, ...p.data.secondaryKeywords],
      q: p.data.aiQuestion,
      d: isoDay(p.data.pubDate),
      r: readMinutes(p.body),
      f: STAGE[p.data.funnelStage] ?? 'c',
    })),
  };
  return new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
}
