# Weekly article task

You are a fresh Claude session with no memory. Your job is to write and publish this week's batch of guides for ucraya.uk (up to seven, normally five) in ONE commit and ONE push, then stop. Follow this file exactly.

## What this repo is

ucraya.uk sells online English lessons with real human tutors (one-to-one and small groups) for the London school Training Centre Raya London. The repo is `LOYALS-2026/ucraya-uk` on GitHub, branch `main`. It is an Astro static site; Netlify builds and publishes every push to `main`, so a push is a deploy, and Netlify charges for every deploy. That is why the guides go out once a week, on a Monday morning, in a single push. Work in the clone of this repo (the folder that contains this file's parent, usually `/home/user/ucraya-uk`). Node 22.

The editorial plan is `content/topical-map.csv`: 105 rows (days 1 to 90 are the lesson guides, days 91 to 105 the translation pillar "Translating Bulgarian and UK documents for official use"). Each planned row has a `publish_date`, which is the Monday of its batch: five lesson rows to a Monday, in day order, from 26 October 2026, plus ONE translation guide a Monday (day 91 on 26 October 2026, then one a week in day order), so a normal batch is six rows and never more than the cap of seven. The translation calendar is separate (`schedule.mjs --pillar`). Five Bulgarian guides (days 106 to 110) wait in `content/topical-map-bg-pending.csv` for the owner's decision; they are not in the map and are never written by this task. The owner is not technical and wants no involvement. This repo has nothing to do with LOYALS or loyals-hub.

## Steps

1. Update and install: `git pull --ff-only origin main`, then `npm ci`.
2. Find the batch: `npm run article:next`. It prints JSON: `batch_date` (this week's Monday, the `pubDate` of every article in the batch), `rows` (up to seven due rows in day order, each with its `slug`, `slug_exists`, outline, FAQ and original element), `published` (the articles already live that you may link to) and the lesson prices. Add `-- --max 5` to take fewer. If it exits with code 3 there is nothing due: append `<date> | none | | nothing due` to `content/log.md`, commit only that file with the message `Article log: nothing due [skip ci]`, push, and stop.
3. Read, in this order: `CLAUDE.md`, `content/FACTS.md`, `content/ARTICLE-RULES.md`. FACTS.md is the only source of any claim about Ucraya. Read two published articles in `src/content/blog/` as models for tone and structure.
4. Write the rows ONE AT A TIME, in day order (lowest day first). For EACH row do steps 5 to 8 completely before you start the next row.
5. Read the row and verify time sensitive claims. For every rule, requirement, score, fee or date the article will state about tests, registration or immigration, fetch the official page with WebFetch. Use the sources named in the row's `original_element` and the pillar:
   - nursing pillar: https://www.nmc.org.uk/registration/joining-the-register/english-language-requirements/accepted-english-language-tests/ and https://www.oet.com and https://ielts.org/take-a-test/test-types
   - B1, settlement, citizenship and partner visa pillars: https://www.gov.uk/english-language, https://www.gov.uk/guidance/prove-your-english-language-abilities-with-a-secure-english-language-test-selt, https://www.trinitycollege.com/qualifications/SELT/B1-GESE-grade-5
   - IELTS and work visa pillars: https://ielts.org/take-a-test/test-types, https://ielts.org/take-a-test/test-types/ielts-tests-for-uk-visas-and-immigration and the gov.uk page that holds the rule you are describing
   - translation pillar: the gov.uk page or the receiving body's own page for the document you are describing, if the article states a rule about it; the service itself (who prepares the translation, the quote form, what is and is not said about certification) comes only from `content/FACTS.md` section 11. Never name a price, a statement of accuracy, a language other than Bulgarian and English, or an acceptance promise.
   - Other pillars: the gov.uk or exam body page that holds the rule you are describing.
   - Row notes: If the row has notes, follow them; a cross link sentence goes into the body as a natural sentence with a relative link (for example /translation/certified/), not as a bare URL.
   Record each page you relied on in the article's `sources` list with its title, URL and `checked:` set to the date you fetched it. If an official source contradicts the row, the article follows the source and says the rule was checked on that date. Write a `checked:` date only for a page that WebFetch (or curl through the proxy) actually returned in this session, and quote a fee or number only from such a page. If a page is blocked or will not load, first try WebSearch or curl once. If it still does not load, do not state the rule, fee or number from memory or from the research folder: leave `checked` out of that source, name the page in the text, tell the reader to check it on the day they book, and never write "checked on". If the article cannot work without the figure, skip the row (see "If a row cannot be written" below) and go on to the next one.
6. Write the article to `src/content/blog/<slug>.md` (use the row's `slug`), following `content/ARTICLE-RULES.md`. Use the row's title, outline, FAQ and original element. Set `pubDate` to `batch_date` from step 2 (the Monday the batch goes live), for every article in the batch, not the row's `publish_date` and not a different day. If `slug_exists` is true, the row is a failure with the reason "slug exists". Deliver the original element and label it.
   - Related guides: link earlier articles only (lower day number). Articles you have already written earlier in this session count even though they are not in `published` yet and are not marked published: link them with `/blog/<slug>/` as normal (the checker accepts any article file that exists with a lower day number). That is why you write in day order. Link one to four earlier articles, and the pillar's course page or `/pricing/` when fewer than two exist.
7. Check it: `npm run check:articles -- src/content/blog/<slug>.md` (this one file only). Fix every failure in your own article and run it again until it reports 0 failures. If an older article fails, do not edit it: that is a failure outside your article; skip your row only if it cannot pass because of it. Warnings are for you to read and judge.
8. Note the row's result (written, or skipped with its reason) and move to the next row.
9. After the last row, build and test the whole site ONCE: `npm run build`, then `npm run check`, then `npm run check:articles` (all articles). All three must pass. If one of YOUR articles breaks the build or a check, fix that article, or skip that row and delete only its file, then run the three commands again. Never touch another article or any other file to make them pass. If something other than a batch article fails (for example a site file), do not repair it: go to "If the build fails for a reason outside the batch".
10. Mark each written row published, in day order: `npm run article:publish <day> <slug>`. Skipped rows were already marked with `npm run article:skip`.
11. Append one line per row to `content/log.md`, in day order: `<date> | day <N> | <slug> | published` for a written row, and `<date> | day <N> | <slug or none> | FAILED: <the reason>` for a skipped one, where `<date>` is `today` from step 2.
12. Commit ONCE. Stage only the new articles in `src/content/blog/`, `content/topical-map.csv` and `content/log.md`. The subject is the first line of `npm run article:summary -- --subject`, which reads: `Guides for the week of <Monday date>: <N> published, <M> skipped`. Put the paragraph printed by `npm run article:summary` in the body. If N is 0, add ` [skip ci]` to the subject so nothing builds.
13. Push ONCE: `git pull --rebase origin main`, then `git push origin main`. Never force-push. If the rebase stops on a conflict, run `git rebase --abort` and `git fetch origin`. If the only files that changed upstream are outside your commit, `git rebase origin/main` will work. If upstream also changed `content/topical-map.csv` or `content/log.md`, do not hand edit them: stop, do not push, and finish with a message that says the push failed and why, so a person can merge it. Stop after the push.

## If a row cannot be written

If you cannot finish a good article for a row (a source cannot be read and the article cannot work without it, a claim cannot be verified, a fact is missing from FACTS.md, the checker keeps failing for a reason you cannot honestly fix, the slug already exists), do this for that row and nothing else, then move on to the next row:

1. Delete only that row's half written file: `rm -f src/content/blog/<slug>.md`. Never use `git clean` or `git checkout -- .` during a batch: they would delete the articles you have already written.
2. Mark the row skipped: `npm run article:skip <day> "<one plain sentence saying why>"`. This sets the row to `skipped` with the reason in the `url` column, and `article:next` never returns it again.
3. Remember the reason for the log line in step 11 and the commit paragraph.
4. If a later row in the batch linked to the skipped article, take that link out (and fix the Related guides count) before its check.

A skipped row is revisited only when a person asks for it. If `gh` is installed and signed in, you may open one issue at the end titled "Guides skipped in the week of <Monday>" listing the days and reasons; if it is not, skip that.

## If the build fails for a reason outside the batch

Delete nothing that is not yours. Skip no row for it. Leave the articles in place, do not commit or push the articles, and finish with a message that names the failing file and the error, so a person can fix it. (A broken push would stop the Netlify build and the whole week would be lost.)

## Hard rules

- Never touch any file other than: the new articles in `src/content/blog/`, `content/topical-map.csv` (only through `npm run article:publish` or `npm run article:skip`), and `content/log.md`. Do not edit the site, scripts, FACTS.md, these rules, package files or articles that were already published.
- Do not commit `node_modules`, `dist` or screenshots.
- Never invent a claim. If it is not in FACTS.md or in an official source you read today, it is not in the article.
- Never give immigration, legal or medical advice. Send the reader to the official page and say the rule must be checked on the day.
- Every article in the batch carries the same `pubDate`: `batch_date`. Never a date in the future.
- One commit and one push per week. Stop after the push.
