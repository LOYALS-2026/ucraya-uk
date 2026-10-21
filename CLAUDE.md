# ucraya.uk: standing brief for any Claude session

Read this first. ucraya.uk sells online English lessons with real human tutors (one-to-one and small groups) for the London school Training Centre Raya London (ucraya.co.uk). The owner is Kris, not technical, wants to be involved as little as possible. This repo is NOT related to LOYALS or the loyals-hub repo.

## Where things live
- GitHub `LOYALS-2026/ucraya-uk`, branch `main`. Netlify builds and publishes every push to `main` (domain ucraya.uk, registered at Netlify). Node 22.
- Stack: Astro (static), Tailwind, TypeScript, content collections for the blog. No database, no server code except Netlify Forms for the enquiry form.
- Build: `npm ci && npm run build` (publish dir `dist/`). Checks: `npm run check` (site checker over `dist/`), `npm run check:articles` and `npm run test:articles` (proves the article checker); the Netlify build runs all of the build and the first two.
- `content/FACTS.md` is the ONLY source of claims (prices, names, qualifications, policies, contact). Nothing may be said on the site or in an article that is not in it. `content/topical-map.csv` is the 90 day editorial plan; `content/ARTICLE-RULES.md` and `content/ARTICLE-TASK.md` drive the daily article session.
- Research from ChatGPT (21 Oct 2026) is in `research/`: background, not a source of claims.

## How to work
- Fable plans and reviews; Sonnet 5.5 at high effort builds; Opus 5.5 at high effort checks. Sub-agents return short summaries.
- British English, plain and friendly, no em dashes anywhere (code comments included), no exclamation marks in body copy, no hype.
- Never write: accredited, accreditation, approved centre, official partner, chartered, guaranteed, guarantee, native speaker (as a claim), "15+ years", "12 years", student counts, pass rates, invented quotes or testimonials, prices not in FACTS.md, Google Meet.
- Every page has one h1, a title under 60 characters, a description under 160, a canonical, hreflang links for every locale that has the page, JSON-LD, and works at 375 px with no horizontal scroll.
- Money pages (home, courses, pricing, how it works, free trial, placement test, tutors, reviews, FAQ, about, contact) exist in en, bg, ro and pl. The blog is English only.
- A build that fails leaves the live site alone. Batch pushes; a push is a deploy.
- Keep this file and `docs/STATUS.md` current at the end of every session.
