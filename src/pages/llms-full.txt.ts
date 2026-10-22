import { getPosts, postPath, pillarSlugOf, pillarPath, answerOf, isoDay } from '../lib/blog';

// The whole catalogue of guides in one plain file for AI crawlers: title, address, goal, the question each guide answers and
// its direct answer (the first paragraph). Generated at build time, so every new guide appears here by itself.
export async function GET() {
  const posts = await getPosts();
  const byPillar = new Map<string, typeof posts>();
  for (const p of posts) {
    const k = pillarSlugOf(p);
    byPillar.set(k, [...(byPillar.get(k) ?? []), p]);
  }
  const sections = [...byPillar.entries()].map(([slug, list]) => {
    const name = list[0].data.pillar;
    const items = list
      .sort((a, b) => a.data.day - b.data.day)
      .map((p) => [
        `### ${p.data.title}`,
        `URL: https://ucraya.uk${postPath(p.id)}`,
        `Goal: ${p.data.pillar}`,
        `Published: ${isoDay(p.data.pubDate)}${p.data.updatedDate ? ` (updated ${isoDay(p.data.updatedDate)})` : ''}`,
        `Question answered: ${p.data.aiQuestion}`,
        `Short answer: ${answerOf(p.body)}`,
      ].join('\n'))
      .join('\n\n');
    return `## ${name}\n\nAll guides on this goal: https://ucraya.uk${pillarPath(slug)}\n\n${items}`;
  });
  const text = `# Ucraya guides: full catalogue

> Plain English guides from Ucraya, the online lessons service of Training Centre Raya London. ${posts.length} ${posts.length === 1 ? 'guide' : 'guides'}, grouped by goal. Each entry gives the question the guide answers and its short answer. Read the guide for the detail and the official sources it links to.

Site summary: https://ucraya.uk/llms.txt
Browse: https://ucraya.uk/blog/ and https://ucraya.uk/blog/questions/
Feed: https://ucraya.uk/rss.xml

## Translation

Ucraya also takes document translation requests for the school's translation partner. No price is published: every job is quoted free and paid by bank transfer before the work starts.

- Document translation: https://ucraya.uk/translation/
- Certified document translation for official use (tell us which body will receive it and we confirm what we can provide before you pay): https://ucraya.uk/translation/certified/
- Specialist and business translation, priced per document or per page: https://ucraya.uk/translation/specialist/

${sections.join('\n\n')}
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
