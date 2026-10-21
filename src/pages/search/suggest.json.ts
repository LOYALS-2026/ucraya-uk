// The small index behind the search suggestions (public/js/search.js loads it on first use).
// Short keys keep it small: t title, s slug, p pillar index, k keywords, q the question the guide answers,
// d publication date, r minutes to read, f funnel stage (a awareness, c consideration, d decision).
// "pages" lists the course pages and the money pages people look for (t title, u address, k keywords) so a search for
// "child" or "b1 test" offers the lesson page as well as guides.
import { getPosts, pillarSlugOf, readMinutes, isoDay } from '../../lib/blog';
import { pillarsWith } from '../../lib/blog-map';
import { messagesEn } from '../../i18n';
import { COURSE_SLUGS, pathFor } from '../../lib/routes';

const STAGE: Record<string, string> = { awareness: 'a', consideration: 'c', decision: 'd' };

// Words a visitor may use for each lesson page (search aids only; nothing here is shown as a claim).
const COURSE_WORDS: Record<string, string[]> = {
  'general-english': ['general english', 'everyday english', 'speaking', 'conversation', 'beginner', 'adult'],
  'one-to-one': ['one to one', 'private lessons', 'tutor', 'individual'],
  'group-courses': ['group', 'class', 'course', 'a1', 'a2', 'b1', 'b2', 'zoom'],
  'business-english': ['business', 'work', 'job', 'interview', 'staff', 'care', 'employer'],
  ielts: ['ielts', 'exam', 'university', 'offer', 'band score'],
  'selt-b1': ['b1', 'b1 test', 'selt', 'settlement', 'citizenship', 'speaking and listening', 'trinity', 'gese'],
  oet: ['oet', 'ielts', 'nurse', 'nurses', 'nursing', 'nmc', 'healthcare', 'registration'],
  kids: ['child', 'children', 'kids', 'school', 'parent', 'son', 'daughter'],
};
const PAGES: { route: string; words: string[] }[] = [
  { route: 'pricing', words: ['prices', 'price', 'cost', 'fees', 'how much', 'payment', 'bank transfer'] },
  { route: 'placement', words: ['placement test', 'level', 'level test', 'a1', 'a2', 'b1', 'b2', 'check my level'] },
  { route: 'trial', words: ['free class', 'free trial', 'try', 'level check'] },
  { route: 'how', words: ['how it works', 'steps', 'booking', 'first lesson'] },
];

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
  const pages = [
    ...COURSE_SLUGS.map((slug) => ({ t: messagesEn.courses.items[slug].name, u: pathFor(`course-${slug}`, 'en'), k: COURSE_WORDS[slug] ?? [] })),
    ...PAGES.map((pg) => ({ t: (messagesEn.meta as Record<string, { title: string }>)[pg.route].title, u: pathFor(pg.route, 'en'), k: pg.words })),
  ];
  const body = {
    v: 2,
    pillars,
    pages,
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
