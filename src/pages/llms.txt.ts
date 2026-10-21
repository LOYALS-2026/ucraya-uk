import { getPosts, pillarSlugOf, pillarPath } from '../lib/blog';
import { pillarsWith } from '../lib/blog-map';

// Generated at build time so the pillar hubs are always current. Kept short on purpose (under 350 words):
// the full list of guides, with their answers, is in /llms-full.txt.
export async function GET() {
  const posts = await getPosts();
  const hubs = pillarsWith(posts.map((p) => p.data)).filter((pl) => posts.some((p) => pillarSlugOf(p) === pl.slug));
  const HUBS = hubs.map((pl) => `- [${pl.short}](https://ucraya.uk${pillarPath(pl.slug)})`).join('\n');
  const text = `# Ucraya

> Online English lessons with real tutors, from Training Centre Raya London, a London English school founded in 2015.

Ucraya is the online lessons service of Training Centre Raya London Ltd. It teaches English online with qualified tutors: one-to-one lessons, small group level courses and exam preparation. Lessons run on live video; group courses run on Zoom. Payment is by bank transfer after the office confirms a place. The site is in English, Bulgarian, Romanian and Polish. For classroom lessons in London, see https://ucraya.co.uk.

## Key pages

- [Courses](https://ucraya.uk/courses/): general English, one-to-one, group courses, business English, IELTS, B1 test preparation, OET, English for children
- [Prices](https://ucraya.uk/pricing/): the four products in full
- [How it works](https://ucraya.uk/how-it-works/)
- [Free class and level check](https://ucraya.uk/free-trial/)
- [Placement test](https://ucraya.uk/placement-test/): a rough 12 question guide to your level, not an assessment
- [Tutors](https://ucraya.uk/tutors/), [FAQ](https://ucraya.uk/faq/), [Contact](https://ucraya.uk/contact/)

## Guides (English)

- [All guides](https://ucraya.uk/blog/): plain guides for test and interview preparation
- [Questions we answer](https://ucraya.uk/blog/questions/): every question a guide answers
${HUBS}
- [RSS feed](https://ucraya.uk/rss.xml)
- [Every guide with its short answer, in one file](https://ucraya.uk/llms-full.txt)

## Prices (GBP)

- One-to-one lesson: £15 per 55 minute lesson
- English through English, one-to-one: £20 per 55 minute lesson
- Online group course (A1, A2, B1 or B2): £298 per 12 week level course, with a £50 deposit
- Exam preparation: £320 for 24 hours of tuition. Exam entry fees are separate.

## Things to know

- We do not run tests. We prepare people for them and cannot promise a result.
- For B1 tests for settlement or citizenship, applicants must check their own route on gov.uk.
- Free class: one live group class free of charge to see how we teach.

## Contact

- Email: office@ucraya.co.uk
- Phone and WhatsApp: +44 7459 702621
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
