# The blog: hub, search and conversion layer

English only. Content lives in `src/content/blog/<slug>.md` (rules in `content/ARTICLE-RULES.md`); the plan in `content/topical-map.csv` and `content/pillars.csv`. Everything below is built at build time; there is no server code.

## Pages
| URL | File | What it is |
|---|---|---|
| `/blog/`, `/blog/page/2/` ... | `src/pages/blog/[...page].astro` | Hub: search box, Start here (the pillar guides), latest guides (12 a page, `paginate()`), By goal. Pages 2 and up show the list only. |
| `/blog/<slug>/` | `src/pages/blog/[slug].astro` | Article: contents, sticky call to action, placement test card, related, previous and next. |
| `/blog/pillar/<slug>/`, `.../page/2/` | `src/pages/blog/pillar/[pillar]/[...page].astro` | Pillar hub (only for pillars with at least one guide): intro, pinned pillar guide, guides in day order, CollectionPage and Course JSON-LD. |
| `/blog/questions/` | `src/pages/blog/questions.astro` | Question bank: every `aiQuestion`. Published ones link and show their short answer; planned ones are plain text with the month. FAQPage JSON-LD only for published ones (newest 200). |
| `/rss.xml`, `/blog/pillar/<slug>/rss.xml` | `src/pages/rss.xml.ts`, `.../[pillar]/rss.xml.ts`, `src/lib/blog-rss.ts` | Feeds, newest 100 items, pillar as category. |
| `/search/suggest.json` | `src/pages/search/suggest.json.ts` | Small index for the suggestions (see below): guides plus the eight course pages and four money pages. |
| `/llms.txt`, `/llms-full.txt` | `src/pages/llms.txt.ts`, `src/pages/llms-full.txt.ts` | For AI crawlers. `llms.txt` is the short site summary (under 350 words) with the blog hub, the question bank, every goal hub, the RSS feed and a link to `llms-full.txt`; `llms-full.txt` lists EVERY published guide with its title, address, goal, publication date, the question it answers and its short answer (the first paragraph). Both are generated at build time, so a new guide appears in them, in the sitemap, on `/blog/questions/` and in the search suggestions with no edit. |

Helpers: `src/lib/blog.ts` (posts, reading time, answer text, related, prev and next) and `src/lib/blog-map.ts` (reads the two CSVs, the public wording of each pillar in `PILLAR_COPY`). The planning notes in `pillars.csv` are never shown on the site.

## How search works
1. **Suggestions** (`public/js/search.js`). On first focus the box loads `/search/suggest.json`. From two characters it shows matching guide titles (with the pillar as a pill), matching lesson pages (the eight courses, prices, placement test, free class and how it works, from `pages` in the index), matching keyword phrases (primary and secondary keywords, and the question each guide answers) and matching pillar names. A guide or page needs at least one typed word (stop words ignored) to start a word in its title, keywords, question or goal, and those that match every word rank first, so "b1 test" and "child" always offer something. Arrow keys move, Enter opens the highlighted line (or runs the full search when none is highlighted), Escape closes. A press outside a box closes only that box's list (an article has two boxes, one hidden by CSS). The list is a `role=listbox` of `role=group` sections whose options are the links themselves. It is a floating glass popover under the field (see `docs/DESIGN.md`, Search popover): one line rows, vertical scroll only, and no wrapper around a search box may clip it.
2. **Full search** (hub only). Enter or the Search button loads Pagefind from `/pagefind/` and shows result cards (title, short answer, pillar, date, read time) with filter chips for goal (pillar) and stage. The URL carries `?q=`, `&pillar=` and `&stage=`, so a search can be shared and Back works. Compact boxes (article sidebar, pillar pages, questions page) send you to `/blog/?q=` instead.
3. **Fallback.** If Pagefind cannot load (for example the browser blocks WebAssembly) or finds nothing for a multi word phrase, the same suggest data answers, with the question as the snippet and no course pages.
4. **No JavaScript.** The form is a plain GET to `/blog/?q=`; the hub then shows "Search needs JavaScript" and the browse sections (goals, latest guides).

## How the index is built
- `package.json`: `build` is `astro build && pagefind --site dist`; `build:blog` builds to `.tmp/dist-blog` (git ignored) for working on the blog without touching the sibling build. Check it with `DIST=.tmp/dist-blog node scripts/check-site.mjs`.
- `pagefind.yml` limits the index to English guides, course pages and the pricing page (`glob`), reads only `<main>` (`root_selector`) and skips forms, nav and anything with `data-pagefind-ignore`. Do NOT put `data-pagefind-body` on any page: once one page has it, Pagefind drops every page without it.
- Each article carries a hidden carrier (`src/components/blog/PagefindMeta.astro`) with meta `answer` (first paragraph), `date`, `readtime`, `pillar`, `kind`, and filters `pillar`, `segment`, `stage`, `money` (money page), `month`, `type`.
- `suggest.json` keys: `t` title, `s` slug, `p` pillar index, `k` keywords, `q` question, `d` date, `r` minutes, `f` stage (a, c, d), and `pages` (`t` title, `u` address, `k` keywords) for the lesson and money pages. About 280 bytes a guide: 139 KB raw and 7 KB gzipped at 500 guides; it is only fetched when the box is used.
- Pagefind needs the filter index loaded before a search for the chip counts to appear; `search.js` does this.

## Content Security Policy (action for netlify.toml)
Pagefind compiles a WebAssembly file. The current policy blocks that, so add `'wasm-unsafe-eval'` to `script-src` (no other change):

`script-src 'self' 'wasm-unsafe-eval' https://www.googletagmanager.com`

Until then search still works through the fallback, with less detail. All scripts are files from this site; there is no inline script.

## Add a pillar
1. Add a row to `content/pillars.csv` and rows to `content/topical-map.csv` (one with cluster `pillar guide`).
2. Add an entry to `PILLAR_COPY` in `src/lib/blog-map.ts` (key is the pillar name as a slug): `short`, `intro`, `goal` (a `data-slug` of the enquiry form goals: oet, selt-b1, ielts, interview, staff, kids, everyday, other) and optionally `level`. Without it the page still builds, with a generic sentence.
3. The pillar page, its feed, its place in By goal and the suggestions appear as soon as one guide for it is published. A pillar named only in an article is picked up too.

## Internal links
Every course page has a "Guides for this goal" strip: the newest three guides of the goal's hub (the newest three overall when the course has no hub) and a link to the hub (`pillarsForCourse` in `blog-map.ts`; a hub is only linked once it has a guide, because hub pages exist only then). Every goal hub links to its course page ("See the course") or prices. The home page has a Guides section with the newest three guides, a link to the hub and one to the question bank; the footer lists the hubs, "All guides" and "Questions we answer". The blog hub's "Start here" row shows only published guides.

## Pagination
12 guides a page (`PAGE_SIZE` in `src/lib/blog.ts`). The hub uses `paginate()` but the URLs are `/blog/page/N/`; pillar pages the same under their own path. Build time with 500 guides: about 32 seconds, 669 pages.

## Enquire buttons and the pop-in form
Every Enquire link in the blog is an `<a>` that works without JavaScript and also carries the data attributes the site's modal reads:
- `data-enquire` (marks it),
- `data-goal` (form goal slug, from the pillar, else from the money page),
- `data-purpose="enquiry"`,
- `data-level` (only where the pillar implies one: `b1` for the B1 pillar).

The `href` goes to the course page form (`/courses/<slug>/#enquiry`) or to `/contact/?goal=<goal>#enquiry`. The article also hands its goal, level and purpose to `Base.astro`, so the site's own Enquire buttons (header, phone bottom bar) open the pop-in prefilled. On phones that bottom bar is the ONLY bar: the slim article bar (after 40% of the page, hidden while the Next step box is on screen) exists from 768 px up.

## Article facts
- A "Quick answer" glass block under the title shows the first paragraph of the guide (the direct answer), lifted out of the body so it is not said twice (`splitQuickAnswer` in `src/lib/blog.ts`). It is `.bl-quick-text`, named in the BlogPosting `speakable`.
- BlogPosting JSON-LD: author and publisher are the Organization (Training Centre Raya London, logo PNG), `dateModified`, `inLanguage` en-GB, `about` (the goal and its hub), `mainEntityOfPage`, `wordCount`, `speakable` (`h1` and `.bl-quick-text`); FAQPage from the front matter stays. Every money page carries a WebPage (or About/Contact page) with `speakable` on the h1 and the first paragraph, added by `Base.astro`.
- Lists show markers and links in the text are underlined.
- Reading time is words divided by 200. The table of contents is the H2 list; it opens on wide screens and is closed on phones (`public/js/blog.js`).
- "Checked against the official pages linked in the article" is printed only when a source has a `checked` date; with sources but no date the line is "Links to the official pages are in the article"; with no sources there is no line.
- The placement test card is inserted before the third H2 of the rendered body (`injectBeforeThirdH2`).

## Weekly batch (how guides get published)
Guides go out once a week, five at a time, on a Monday morning, in ONE commit and ONE push (Netlify charges per deploy). The session follows `content/ARTICLE-TASK.md`.
- **Schedule.** `node scripts/articles/schedule.mjs --weekly 2026-10-26 --per-week 5` gives each planned row without a `publish_date` the Monday of its batch, in day order (days 4 to 8 on 26 October 2026, days 9 to 13 on 2 November, and so on; the last batch may be smaller). It only fills empty dates, so a second run changes nothing. The old daily form, `schedule.mjs <date>`, still exists but is not used. The question bank shows the month of a planned row from this date.
- **Next.** `npm run article:next` prints every planned row whose `publish_date` is not after today (Europe/London), in day order, at most seven (`-- --max N` to change), with `batch_date` (the Monday of the current week), each row's `slug` and `slug_exists` (a clash is reported on that row, it does not stop the batch), the published list and the lesson prices. Exit 3 means nothing is due. `-- --one` gives the old single-row output (and exit 4 on a slug clash).
- **Per article.** `check.mjs`, `mark-published.mjs` and `skip.mjs` still work on one article or one row. The checker accepts these money pages: every course page in `src/lib/routes.ts` (`COURSE_SLUGS`), `/pricing/`, `/free-trial/` and `/placement-test/`. It fails a `pubDate` in the future.
- **Dates on the pages.** Every article of a batch has `pubDate` = the batch Monday. The article page ("Published ..."), the blog cards, the RSS feeds, `llms-full.txt` and the search suggestions all read `pubDate`, so they show that date. No page shows a future date for a guide, because a guide only exists once it is written; "month planned" on the question bank is the only forward looking date and it is labelled as planned.
- **Summary.** `npm run article:summary` reads the `content/log.md` lines for today and prints one paragraph for the commit message (`-- --subject` prints just `Guides for the week of <Monday>: <N> published, <M> skipped`).
- **Pillars.** The 8 pillars of the current map are listed in `docs/STATUS.md`. A pillar missing from `content/pillars.csv` and `PILLAR_COPY` (partner visa, B2 work visa) is still picked up from its first published article (see "Add a pillar").
- **Tests.** `npm run test:articles` covers the weekly schedule (26 October start, idempotence, skipped and already dated rows), `next` in batch mode (day order, cap, exit 3, slug clash), the widened money page list, the future date rule and the summary.
