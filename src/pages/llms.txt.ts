import { getPosts, postPath } from '../lib/blog';

// Generated at build time so the list of guides is always current.
export async function GET() {
  const posts = await getPosts();
  const GUIDES = posts.length
    ? '## Guides\n\n' + posts.map((p) => `- [${p.data.title}](https://ucraya.uk${postPath(p.id)}): ${p.data.description}`).join('\n') + '\n'
    : '';
  const text = `# Ucraya

> Online English lessons with real tutors, from a London English school founded in 2015.

Ucraya (a trading name of Training Centre Raya London Ltd) teaches English online with qualified tutors: one-to-one lessons, small group level courses and exam preparation. Lessons run on live video; group courses run on Zoom. Payment is by bank transfer after the office confirms a place. The site is in English, Bulgarian, Romanian and Polish. For classroom lessons in London, see https://ucraya.co.uk.

## Key pages

- [Courses](https://ucraya.uk/courses/): general English, one-to-one, group courses, business English, IELTS, B1 test preparation, OET, English for children
- [Prices](https://ucraya.uk/pricing/): the four products in full
- [How it works](https://ucraya.uk/how-it-works/): from enquiry to first lesson
- [Free class and level check](https://ucraya.uk/free-trial/)
- [Placement test](https://ucraya.uk/placement-test/): a rough 12 question guide to your level, not an assessment
- [Tutors](https://ucraya.uk/tutors/): qualifications as shared by the tutors
- [FAQ](https://ucraya.uk/faq/)
- [Guides](https://ucraya.uk/blog/): plain guides for test and interview preparation
- [Contact](https://ucraya.uk/contact/)

## Prices (GBP)

- One-to-one lesson: £15 per 55 minute lesson
- English through English, one-to-one: £20 per 55 minute lesson
- Online group course (A1, A2, B1 or B2): £298 per 12 week level course, with a £50 deposit
- Exam preparation: £320 for 24 hours of tuition. Exam entry fees are separate.

## Lesson facts

- One-to-one lessons are 55 minutes on a live video call, with the timetable agreed with the tutor. Bulgarian speaking tutors are available.
- Group courses run live on Zoom with no more than 12 people: 72 lessons over 12 weeks, four skills.
- Group course payment: £50 deposit to secure a place (part of the £298), then £124 at the start and £124 at the third lesson. All payments are by bank transfer.
- A one-to-one lesson can be rescheduled once with at least 48 hours notice by email, text or phone.
- Free class: join one live group class free of charge to see how we teach.

## Things to know

- We do not run tests. We prepare people for them and cannot promise a result.
- For B1 tests for settlement or citizenship, applicants must check their own route on gov.uk.

${GUIDES}
## Contact

- Email: office@ucraya.co.uk
- Phone and WhatsApp: +44 7459 702621
- Teaching address of the school: Haverstock School, 24 Haverstock Hill, London NW3 2BQ
`;
  return new Response(text, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
