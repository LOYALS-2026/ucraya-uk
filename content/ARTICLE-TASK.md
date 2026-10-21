# Daily article task

You are a fresh Claude session with no memory. Your job is to write and publish ONE article for ucraya.uk, then stop. Follow this file exactly.

## What this repo is

ucraya.uk sells online English lessons with real human tutors (one-to-one and small groups) for the London school Training Centre Raya London. The repo is `LOYALS-2026/ucraya-uk` on GitHub, branch `main`. It is an Astro static site; Netlify builds and publishes every push to `main`, so a push is a deploy. Work in the clone of this repo (the folder that contains this file's parent, usually `/home/user/ucraya-uk`). Node 22.

The editorial plan is `content/topical-map.csv`: 90 rows, one article a day. The owner is not technical and wants no involvement. This repo has nothing to do with LOYALS or loyals-hub.

## Steps

1. Update and install: `git pull --ff-only origin main`, then `npm ci`.
2. Find today's article: `npm run article:next`. It prints JSON: the row to write, the already published articles you may link to, and the lesson prices. If it exits with code 3 there is nothing due. Append `<date> | none | | nothing due` to `content/log.md`, commit only that file with the message `Article log: nothing due [skip ci]`, push, and stop.
3. Read, in this order: `CLAUDE.md`, `content/FACTS.md`, `content/ARTICLE-RULES.md`. FACTS.md is the only source of any claim about Ucraya. Read two published articles in `src/content/blog/` as models for tone and structure (the first three were written by hand to the contract).
4. Verify time sensitive claims. For every rule, requirement, score, fee or date your article will state about tests, registration or immigration, fetch the official page with WebFetch. Use the sources named in the row's `original_element` and the pillar:
   - nursing pillar: https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/accepted-english-language-tests/ and https://www.oet.com and https://ielts.org/take-a-test/test-types
   - B1, settlement and citizenship pillar: https://www.gov.uk/english-language, https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt, https://www.trinitycollege.com/qualifications/SELT/B1-GESE-grade-5
   - IELTS pillar: https://ielts.org/take-a-test/test-types and https://ielts.org/take-a-test/test-types/ielts-tests-for-uk-visas-and-immigration
   - Other pillars: the gov.uk or exam body page that holds the rule you are describing.
   Record each page you relied on in the article's `sources` list with its title, URL and `checked:` set to today's date. If an official source contradicts the row, the article follows the source and says the rule was checked on that date. If a page is blocked or will not load, do not state the rule from memory: either leave the claim out and tell the reader to check the named page on the day, or, if the article cannot work without it, treat the day as a failure (see below).
5. Write the article to `src/content/blog/<slug>.md`, following `content/ARTICLE-RULES.md`. Use the row's title, outline, FAQ and original element. Set `pubDate` to the row's `publish_date`. Deliver the original element and label it. Link earlier published articles in Related guides (the JSON lists them).
6. Check it: `npm run check:articles`. Fix every failure and run it again until it reports 0 failures. Warnings are for you to read and judge.
7. Build and test the site: `npm run build`, then `npm run check`. Both must pass. If something other than your article fails, do not repair it: treat it as a failure (see below).
8. Mark the row published: `npm run article:publish <day> <slug>`.
9. Append one line to `content/log.md`: `<date> | day <N> | <slug> | published`.
10. Commit and push. Stage only your article, `content/topical-map.csv` and `content/log.md`. Commit message: `Article day N: <title>`. Then `git pull --rebase origin main` and `git push origin main`. Never force-push.

## If something fails

If you cannot finish a good article (a source cannot be read, a claim cannot be verified, the checker or build fails for a reason outside your article, a fact is missing from FACTS.md), do this and nothing else:

1. Leave the row as `planned`. Do not run `article:publish`. Remove any half written article file with `git checkout -- . && git clean -fd src/content/blog`.
2. Append `<date> | day <N> | <slug or none> | FAILED: <one plain sentence saying why>` to `content/log.md`.
3. Commit only `content/log.md` with the message `Article log: day N not published [skip ci]`, and push. The next day's session will try the same row again.

## Hard rules

- Never touch any file other than: the one new article in `src/content/blog/`, `content/topical-map.csv` (only through `npm run article:publish`), and `content/log.md`. Do not edit the site, scripts, FACTS.md, these rules, package files or the other articles.
- Do not commit `node_modules`, `dist` or screenshots.
- Never invent a claim. If it is not in FACTS.md or in an official source you read today, it is not in the article.
- Never give immigration, legal or medical advice. Send the reader to the official page and say the rule must be checked on the day.
- One article per run. Stop after the push.
